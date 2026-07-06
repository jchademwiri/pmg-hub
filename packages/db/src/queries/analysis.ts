import { sql, eq, and, gte, lt, lte, desc, inArray } from 'drizzle-orm';
import { db } from '../client';
import { invoices, income, quotations, divisions } from '../schema';

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
    const isLeapYear = (targetEndYear % 4 === 0 && targetEndYear % 100 !== 0) || (targetEndYear % 400 === 0);
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

  // 3. Average Invoice Size & Transaction Size (Full FY)
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
        inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue'])
      )
    );

  const [priorInvoices] = await db
    .select({
      sum: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      count: sql<number>`count(${invoices.id})`,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.invoiceDate, priorFY.start),
        lt(invoices.invoiceDate, priorFY.end),
        inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue'])
      )
    );

  const currentAvgInvoice = currentInvoices && currentInvoices.count > 0 ? Number(currentInvoices.sum) / Number(currentInvoices.count) : 0;
  const priorAvgInvoice = priorInvoices && priorInvoices.count > 0 ? Number(priorInvoices.sum) / Number(priorInvoices.count) : 0;

  const [currentIncome] = await db
    .select({
      sum: sql<number>`coalesce(sum(${income.amount}), 0)`,
      count: sql<number>`count(${income.id})`,
    })
    .from(income)
    .where(and(gte(income.date, currentFY.start), lt(income.date, currentFY.end)));

  const currentAvgTransaction = currentIncome && currentIncome.count > 0 ? Number(currentIncome.sum) / Number(currentIncome.count) : 0;

  // 4. Pipeline Valuations
  // Outstanding AR: issued, partially_paid, overdue
  const [ar] = await db
    .select({
      totalInvoiced: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      totalWrittenOff: sql<number>`coalesce(sum(${invoices.writeOffAmount}), 0)`,
    })
    .from(invoices)
    .where(inArray(invoices.status, ['issued', 'partially_paid', 'overdue']));

  // To get actual outstanding we need to subtract payments, but for pipeline a quick estimation is fine,
  // or we can just fetch the paymentAllocations.
  // We'll calculate total allocations for these active invoices.
  const [arAllocations] = await db
    .select({ totalAllocated: sql<number>`coalesce(sum(amount), 0)` })
    .from(sql`payment_allocations pa`)
    .innerJoin(invoices, sql`pa.invoice_id = ${invoices.id}`)
    .where(inArray(invoices.status, ['issued', 'partially_paid', 'overdue']));

  const outstandingAR = Math.max(0, Number(ar?.totalInvoiced || 0) - Number(arAllocations?.totalAllocated || 0));

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
  // Estimate 30% win rate for pending quotes
  const pipelinePotential = outstandingAR + acceptedQuotesVal + (pendingQuotesVal * 0.3);

  return {
    ytd: {
      currentRevenue: currentYtdAmount,
      priorRevenue: priorYtdAmount,
      growthRatePercent: yoyGrowth,
    },
    averages: {
      currentAvgInvoice,
      priorAvgInvoice,
      currentAvgTransaction,
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

  const results = allDivisions.map(div => {
    const i = incomeByDiv.find(x => x.divisionId === div.id);
    const q = quotesByDiv.find(x => x.divisionId === div.id);
    
    const totalCount = Number(q?.totalCount || 0);
    const wonCount = Number(q?.wonCount || 0);
    const conversionRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;
    
    return {
      id: div.id,
      name: div.name,
      totalIncome: Number(i?.totalIncome || 0),
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
  
  const results = await Promise.all(years.map(async (y) => {
    const fy = getFinancialYearRange(y);
    
    const [inc] = await db
      .select({ 
        sum: sql<number>`coalesce(sum(${income.amount}), 0)`,
        count: sql<number>`count(${income.id})`
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
        count: sql<number>`count(${invoices.id})`
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.invoiceDate, fy.start),
          lt(invoices.invoiceDate, fy.end),
          inArray(invoices.status, ['issued', 'partially_paid', 'paid', 'overdue'])
        )
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
  }));

  return results;
}

export async function getThreeYearMonthlyRevenue(currentYear: number) {
  
  // Create a template for the 12 months (March = month 3 ... Feb = month 2)
  const monthNames = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  
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
      monthIndex: idx + 3 > 12 ? (idx + 3) - 12 : idx + 3, // 3 to 12, then 1, 2
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
      const resultRow = results.find(r => r.monthIndex === mo);
      if (resultRow) {
        resultRow[fy] += amount;
      }
    }
  }

  return results;
}
