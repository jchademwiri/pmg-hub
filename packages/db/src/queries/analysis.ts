import { sql, eq, and, gte, lt, lte, desc, inArray } from 'drizzle-orm';
import { db } from '../client';
import { invoices, income, quotations, divisions, clients, expenses } from '../schema';

function getFinancialYearRange(year: number) {
  return {
    start: `${year}-03-01`,
    end: `${year + 1}-03-01`, // Use < end instead of <=
  };
}

function getYTDRange(year: number, currentDateStr: string) {
  // currentDateStr is YYYY-MM-DD
  const currentMonth = parseInt(currentDateStr.slice(5, 7), 10);
  const currentDay = parseInt(currentDateStr.slice(8, 10), 10);

  // Create an end date for the target year that matches the month and day
  let endMonth = currentMonth;
  let endDay = currentDay;
  let targetEndYear = year;

  // If the current date is Jan or Feb, it falls into the NEXT calendar year of the FY
  if (currentMonth < 3) {
    targetEndYear = year + 1;
  }

  // Handle leap year Feb 29 edge cases
  if (endMonth === 2 && endDay === 29) {
    const isLeapYear =
      (targetEndYear % 4 === 0 && targetEndYear % 100 !== 0) || targetEndYear % 400 === 0;
    if (!isLeapYear) endDay = 28;
  }

  const endMonthStr = String(endMonth).padStart(2, '0');
  const endDayStr = String(endDay).padStart(2, '0');

  return {
    start: `${year}-03-01`,
    end: `${targetEndYear}-${endMonthStr}-${endDayStr}`, // inclusive
  };
}

export async function getAnalysisOverview(year: number, currentDateStr: string) {
  const currentFY = getFinancialYearRange(year);
  const priorFY = getFinancialYearRange(year - 1);

  const currentYTD = getYTDRange(year, currentDateStr);
  const priorYTD = getYTDRange(year - 1, currentDateStr);

  // 1. Current YTD Revenue
  const [currentYtdRev] = await db
    .select({ total: sql<number>`coalesce(sum(${income.amount}), 0)` })
    .from(income)
    .where(and(gte(income.date, currentYTD.start), lte(income.date, currentYTD.end)));

  // 2. Prior YTD Revenue
  const [priorYtdRev] = await db
    .select({ total: sql<number>`coalesce(sum(${income.amount}), 0)` })
    .from(income)
    .where(and(gte(income.date, priorYTD.start), lte(income.date, priorYTD.end)));

  const currentYtdAmount = Number(currentYtdRev?.total || 0);
  const priorYtdAmount = Number(priorYtdRev?.total || 0);

  let yoyGrowth = 0;
  if (priorYtdAmount > 0) {
    yoyGrowth = ((currentYtdAmount - priorYtdAmount) / priorYtdAmount) * 100;
  } else if (currentYtdAmount > 0) {
    yoyGrowth = 100; // 100% growth if prior was 0 and current > 0
  }

  // 3. Average Invoice Size & Transaction Size (Month over Month & FY)
  const cYr = parseInt(currentDateStr.slice(0, 4), 10);
  const cMo = parseInt(currentDateStr.slice(5, 7), 10);
  const activeFY = cMo < 3 ? cYr - 1 : cYr;

  let targetYr: number;
  let targetMo: number;

  if (year === activeFY) {
    targetYr = cYr;
    targetMo = cMo;
  } else if (year < activeFY) {
    targetYr = year + 1;
    targetMo = 2;
  } else {
    targetYr = year;
    targetMo = 3;
  }

  const curMonthStart = `${targetYr}-${String(targetMo).padStart(2, '0')}-01`;
  let nextMo = targetMo + 1;
  let nextYr = targetYr;
  if (nextMo > 12) {
    nextMo = 1;
    nextYr += 1;
  }
  const curMonthEnd = `${nextYr}-${String(nextMo).padStart(2, '0')}-01`;

  let prevMo = targetMo - 1;
  let prevYr = targetYr;
  if (prevMo < 1) {
    prevMo = 12;
    prevYr -= 1;
  }
  const prevMonthStart = `${prevYr}-${String(prevMo).padStart(2, '0')}-01`;
  const prevMonthEnd = curMonthStart;

  // Full FY Invoices
  const [currentInvoices] = await db
    .select({
      sum: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      count: sql<number>`count(${invoices.id})`,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.invoiceDate, currentFY.start),
        lt(invoices.invoiceDate, currentFY.end),
        inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue']),
      ),
    );

  // Current Month Invoices
  const [curMonthInvoices] = await db
    .select({
      sum: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      count: sql<number>`count(${invoices.id})`,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.invoiceDate, curMonthStart),
        lt(invoices.invoiceDate, curMonthEnd),
        inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue']),
      ),
    );

  // Prior Month Invoices
  const [prevMonthInvoices] = await db
    .select({
      sum: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      count: sql<number>`count(${invoices.id})`,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.invoiceDate, prevMonthStart),
        lt(invoices.invoiceDate, prevMonthEnd),
        inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue']),
      ),
    );

  const currentAvgInvoice =
    currentInvoices && currentInvoices.count > 0
      ? Number(currentInvoices.sum) / Number(currentInvoices.count)
      : 0;
  const prevAvgInvoice =
    prevMonthInvoices && prevMonthInvoices.count > 0
      ? Number(prevMonthInvoices.sum) / Number(prevMonthInvoices.count)
      : 0;
  const curAvgInvoice =
    curMonthInvoices && curMonthInvoices.count > 0
      ? Number(curMonthInvoices.sum) / Number(curMonthInvoices.count)
      : currentAvgInvoice;

  let invoiceMomGrowth = 0;
  if (prevAvgInvoice > 0) {
    invoiceMomGrowth = ((curAvgInvoice - prevAvgInvoice) / prevAvgInvoice) * 100;
  } else if (curAvgInvoice > 0) {
    invoiceMomGrowth = 100;
  }

  // Full FY Income
  const [currentIncome] = await db
    .select({
      sum: sql<number>`coalesce(sum(${income.amount}), 0)`,
      count: sql<number>`count(${income.id})`,
    })
    .from(income)
    .where(and(gte(income.date, currentFY.start), lt(income.date, currentFY.end)));

  // Current Month Income
  const [curMonthIncome] = await db
    .select({
      sum: sql<number>`coalesce(sum(${income.amount}), 0)`,
      count: sql<number>`count(${income.id})`,
    })
    .from(income)
    .where(and(gte(income.date, curMonthStart), lt(income.date, curMonthEnd)));

  // Prior Month Income
  const [prevMonthIncome] = await db
    .select({
      sum: sql<number>`coalesce(sum(${income.amount}), 0)`,
      count: sql<number>`count(${income.id})`,
    })
    .from(income)
    .where(and(gte(income.date, prevMonthStart), lt(income.date, prevMonthEnd)));

  const currentAvgTransaction =
    currentIncome && currentIncome.count > 0
      ? Number(currentIncome.sum) / Number(currentIncome.count)
      : 0;
  const prevAvgTransaction =
    prevMonthIncome && prevMonthIncome.count > 0
      ? Number(prevMonthIncome.sum) / Number(prevMonthIncome.count)
      : 0;
  const curAvgTransaction =
    curMonthIncome && curMonthIncome.count > 0
      ? Number(curMonthIncome.sum) / Number(curMonthIncome.count)
      : currentAvgTransaction;

  let transactionMomGrowth = 0;
  if (prevAvgTransaction > 0) {
    transactionMomGrowth = ((curAvgTransaction - prevAvgTransaction) / prevAvgTransaction) * 100;
  } else if (curAvgTransaction > 0) {
    transactionMomGrowth = 100;
  }

  // 4. Pipeline Valuations
  // Outstanding AR: issued, partially_paid, overdue
  const [ar] = await db
    .select({
      totalInvoiced: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      totalWrittenOff: sql<number>`coalesce(sum(${invoices.writeOffAmount}), 0)`,
    })
    .from(invoices)
    .where(inArray(invoices.status, ['issued', 'partially_paid', 'overdue']));

  const [arAllocations] = await db
    .select({ totalAllocated: sql<number>`coalesce(sum(amount), 0)` })
    .from(sql`payment_allocations pa`)
    .innerJoin(invoices, sql`pa.invoice_id = ${invoices.id}`)
    .where(inArray(invoices.status, ['issued', 'partially_paid', 'overdue']));

  const outstandingAR = Math.max(
    0,
    Number(ar?.totalInvoiced || 0) - Number(arAllocations?.totalAllocated || 0),
  );

  const [sentQuotes] = await db
    .select({ sum: sql<number>`coalesce(sum(${quotations.total}), 0)` })
    .from(quotations)
    .where(eq(quotations.status, 'sent'));

  const [acceptedQuotes] = await db
    .select({ sum: sql<number>`coalesce(sum(${quotations.total}), 0)` })
    .from(quotations)
    .where(eq(quotations.status, 'accepted'));

  const pendingQuotesVal = Number(sentQuotes?.sum || 0);
  const acceptedQuotesVal = Number(acceptedQuotes?.sum || 0);

  // Pipeline potential strictly counts Outstanding AR + Accepted Quotes as requested
  const pipelinePotential = outstandingAR + acceptedQuotesVal;

  return {
    ytd: {
      currentRevenue: currentYtdAmount,
      priorRevenue: priorYtdAmount,
      growthRatePercent: yoyGrowth,
    },
    averages: {
      currentAvgInvoice: curAvgInvoice,
      priorAvgInvoice: prevAvgInvoice,
      invoiceMomGrowth,
      currentAvgTransaction: curAvgTransaction,
      priorAvgTransaction: prevAvgTransaction,
      transactionMomGrowth,
    },
    pipeline: {
      outstandingAR,
      pendingQuotes: pendingQuotesVal,
      acceptedQuotes: acceptedQuotesVal,
      totalPotential: pipelinePotential,
    },
  };
}

export async function getDivisionQuotesMetrics(year: number) {
  const currentFY = getFinancialYearRange(year);

  // Aggregate Income by division
  const incomeByDiv = await db
    .select({
      divisionId: income.divisionId,
      totalIncome: sql<number>`coalesce(sum(${income.amount}), 0)`,
    })
    .from(income)
    .where(and(gte(income.date, currentFY.start), lt(income.date, currentFY.end)))
    .groupBy(income.divisionId);

  // Aggregate Invoices by division
  const invoicesByDiv = await db
    .select({
      divisionId: invoices.divisionId,
      totalInvoiced: sql<number>`coalesce(sum(${invoices.total}), 0)`,
    })
    .from(invoices)
    .where(and(gte(invoices.invoiceDate, currentFY.start), lt(invoices.invoiceDate, currentFY.end)))
    .groupBy(invoices.divisionId);

  // Aggregate Quotes by division
  const quotesByDiv = await db
    .select({
      divisionId: quotations.divisionId,
      totalQuoteValue: sql<number>`coalesce(sum(${quotations.total}), 0)`,
      totalCount: sql<number>`count(${quotations.id})`,
      wonCount: sql<number>`sum(case when ${quotations.status} in ('accepted', 'converted') then 1 else 0 end)`,
    })
    .from(quotations)
    .where(and(gte(quotations.quoteDate, currentFY.start), lt(quotations.quoteDate, currentFY.end)))
    .groupBy(quotations.divisionId);

  // Fetch all divisions
  const allDivisions = await db.select().from(divisions).where(eq(divisions.isActive, true));

  const results = allDivisions.map((div) => {
    const i = incomeByDiv.find((x) => x.divisionId === div.id);
    const q = quotesByDiv.find((x) => x.divisionId === div.id);
    const inv = invoicesByDiv.find((x) => x.divisionId === div.id);

    const totalCount = Number(q?.totalCount || 0);
    const wonCount = Number(q?.wonCount || 0);
    const conversionRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;

    return {
      id: div.id,
      name: div.name,
      totalIncome: Number(i?.totalIncome || 0),
      totalInvoiced: Number(inv?.totalInvoiced || 0),
      totalQuoteValue: Number(q?.totalQuoteValue || 0),
      quoteCount: totalCount,
      wonCount: wonCount,
      conversionRate,
    };
  });

  return results;
}

export async function getThreeYearYoYComparison(currentYear: number) {
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const results = await Promise.all(
    years.map(async (y) => {
      const fy = getFinancialYearRange(y);

      const [inc] = await db
        .select({
          sum: sql<number>`coalesce(sum(${income.amount}), 0)`,
          count: sql<number>`count(${income.id})`,
        })
        .from(income)
        .where(and(gte(income.date, fy.start), lt(income.date, fy.end)));

      // Actually need expenses from ledger or expenses table
      // The audit plan mentions "Total Expenses & Profit Pool".
      // I'll query `expenses` table
      const { expenses } = await import('../schema/expenses');
      const [exp] = await db
        .select({ sum: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
        .from(expenses)
        .where(and(gte(expenses.date, fy.start), lt(expenses.date, fy.end)));

      const [inv] = await db
        .select({
          sum: sql<number>`coalesce(sum(${invoices.total}), 0)`,
          count: sql<number>`count(${invoices.id})`,
        })
        .from(invoices)
        .where(
          and(
            gte(invoices.invoiceDate, fy.start),
            lt(invoices.invoiceDate, fy.end),
            inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue']),
          ),
        );

      const [quo] = await db
        .select({
          count: sql<number>`count(${quotations.id})`,
          wonCount: sql<number>`sum(case when ${quotations.status} in ('accepted', 'converted') then 1 else 0 end)`,
        })
        .from(quotations)
        .where(and(gte(quotations.quoteDate, fy.start), lt(quotations.quoteDate, fy.end)));

      const totalIncome = Number(inc?.sum || 0);
      const totalExpenses = Number(exp?.sum || 0);
      const totalInvoiced = Number(inv?.sum || 0);
      const countQuotes = Number(quo?.count || 0);
      const wonQuotes = Number(quo?.wonCount || 0);

      return {
        year: y,
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        totalInvoiced,
        averageInvoice: Number(inv?.count || 0) > 0 ? totalInvoiced / Number(inv!.count) : 0,
        averageTransaction: Number(inc?.count || 0) > 0 ? totalIncome / Number(inc!.count) : 0,
        quotesIssued: countQuotes,
        quoteConversionRate: countQuotes > 0 ? (wonQuotes / countQuotes) * 100 : 0,
      };
    }),
  );

  return results;
}

export async function getThreeYearMonthlyRevenue(currentYear: number) {
  // Create a template for the 12 months (March = month 3 ... Feb = month 2)
  const monthNames = [
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
    'Jan',
    'Feb',
  ];

  // We fetch all income for the last 3 years
  const startFY = getFinancialYearRange(currentYear - 2).start;
  const endFY = getFinancialYearRange(currentYear).end;

  const rawIncome = await db
    .select({
      amount: income.amount,
      date: income.date, // YYYY-MM-DD
    })
    .from(income)
    .where(and(gte(income.date, startFY), lt(income.date, endFY)));

  // Group into memory since SQLite/PG variations make grouped date parts complex
  const results = monthNames.map((m, idx) => {
    return {
      month: m,
      monthIndex: idx + 3 > 12 ? idx + 3 - 12 : idx + 3, // 3 to 12, then 1, 2
      [currentYear]: 0,
      [currentYear - 1]: 0,
      [currentYear - 2]: 0,
    };
  });

  for (const row of rawIncome) {
    const yr = parseInt(row.date.slice(0, 4), 10);
    const mo = parseInt(row.date.slice(5, 7), 10);
    const amount = Number(row.amount);

    // Determine the FY it belongs to
    // If month < 3, it belongs to the PREVIOUS calendar year's FY
    const fy = mo < 3 ? yr - 1 : yr;

    if (fy === currentYear || fy === currentYear - 1 || fy === currentYear - 2) {
      const resultRow = results.find((r) => r.monthIndex === mo);
      if (resultRow) {
        resultRow[fy] += amount;
      }
    }
  }

  return results;
}

export async function getClientConcentration(year: number) {
  const { start, end } = getFinancialYearRange(year);

  // Get total income per client
  const clientIncomeRaw = await db
    .select({
      clientId: income.clientId,
      totalIncome: sql<number>`coalesce(sum(${income.amount}), 0)`.mapWith(Number),
    })
    .from(income)
    .where(and(gte(income.date, start), lt(income.date, end)))
    .groupBy(income.clientId);

  // Get total invoiced per client
  const clientInvoicedRaw = await db
    .select({
      clientId: invoices.clientId,
      totalInvoiced: sql<number>`coalesce(sum(${invoices.total}), 0)`.mapWith(Number),
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.invoiceDate, start),
        lt(invoices.invoiceDate, end),
        inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue']),
      ),
    )
    .groupBy(invoices.clientId);

  // Get total expenses per client
  const clientExpensesRaw = await db
    .select({
      clientId: expenses.clientId,
      totalExpenses: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number),
    })
    .from(expenses)
    .where(and(gte(expenses.date, start), lt(expenses.date, end)))
    .groupBy(expenses.clientId);

  const allClients = await db.select().from(clients);

  const incomeMap = new Map(clientIncomeRaw.map((r) => [r.clientId, r.totalIncome]));
  const invoicedMap = new Map(clientInvoicedRaw.map((r) => [r.clientId, r.totalInvoiced]));
  const expenseMap = new Map(clientExpensesRaw.map((r) => [r.clientId, r.totalExpenses]));

  let overallTotalRevenue = 0;
  for (const client of allClients) {
    const incAmt = incomeMap.get(client.id) || 0;
    const invAmt = invoicedMap.get(client.id) || 0;
    overallTotalRevenue += Math.max(incAmt, invAmt);
  }

  const results = allClients.map((client) => {
    const totalInc = incomeMap.get(client.id) || 0;
    const totalInv = invoicedMap.get(client.id) || 0;
    const totalExp = expenseMap.get(client.id) || 0;
    const netProfit = totalInc - totalExp;
    const clientRevenue = Math.max(totalInc, totalInv);
    const percentage = overallTotalRevenue > 0 ? (clientRevenue / overallTotalRevenue) * 100 : 0;

    return {
      id: client.id,
      name: client.name,
      totalIncome: totalInc,
      totalInvoiced: totalInv,
      totalExpenses: totalExp,
      netProfit,
      percentage,
    };
  });

  // Filter out clients with no income/invoiced/expenses and sort by invoiced desc, then income desc
  return results
    .filter((r) => r.totalIncome > 0 || r.totalInvoiced > 0 || r.totalExpenses > 0)
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced || b.totalIncome - a.totalIncome);
}

export async function getMonthlyFinancialsBreakdownForYear(year: number) {
  const MONTH_NAMES = [
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
    'Jan',
    'Feb',
  ];
  const months: { period: string; monthLabel: string }[] = [];

  // Financial year months: March year to February year+1
  for (let i = 0; i < 12; i += 1) {
    const mName = MONTH_NAMES[i];
    const calYear = i < 10 ? year : year + 1;
    const calMonth = i < 10 ? i + 3 : i - 9;
    const period = `${calYear}-${String(calMonth).padStart(2, '0')}`;
    const monthLabel = `${mName} ${calYear}`;
    months.push({ period, monthLabel });
  }

  // Get monthly income
  const incomeRows = await db.execute(sql`
    SELECT TO_CHAR(date::date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS total
    FROM income
    WHERE EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::int = ${Number(year)}
    GROUP BY TO_CHAR(date::date, 'YYYY-MM')
  `);

  // Get monthly invoiced
  const invoicedRows = await db.execute(sql`
    SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') AS month, COALESCE(SUM(total), 0) AS total
    FROM invoices
    WHERE EXTRACT(YEAR FROM (invoice_date::date - INTERVAL '2 months'))::int = ${Number(year)}
      AND status IN ('issued', 'partially_paid', 'paid', 'overdue')
    GROUP BY TO_CHAR(invoice_date::date, 'YYYY-MM')
  `);

  // Get monthly expenses
  const expenseRows = await db.execute(sql`
    SELECT TO_CHAR(date::date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::int = ${Number(year)}
    GROUP BY TO_CHAR(date::date, 'YYYY-MM')
  `);

  const incomeMap = new Map((incomeRows.rows as any[]).map((r) => [r.month, Number(r.total)]));
  const invoicedMap = new Map((invoicedRows.rows as any[]).map((r) => [r.month, Number(r.total)]));
  const expenseMap = new Map((expenseRows.rows as any[]).map((r) => [r.month, Number(r.total)]));

  let prevIncome = 0;
  return months.map(({ period, monthLabel }, idx) => {
    const received = incomeMap.get(period) || 0;
    const invoiced = invoicedMap.get(period) || 0;
    const expensesAmt = expenseMap.get(period) || 0;
    const netProfit = received - expensesAmt;

    let momGrowth: number | null = null;
    if (idx > 0) {
      if (prevIncome > 0) {
        momGrowth = ((received - prevIncome) / prevIncome) * 100;
      } else if (received > 0) {
        momGrowth = 100;
      } else {
        momGrowth = 0;
      }
    }
    prevIncome = received;

    return {
      period,
      monthLabel,
      invoiced,
      received,
      expenses: expensesAmt,
      netProfit,
      momGrowth,
    };
  });
}
