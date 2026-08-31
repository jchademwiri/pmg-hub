import { db } from '../client';
import {
  income,
  expenses,
  leads,
  divisions,
  clients,
  ledger,
  type AllocationType,
} from '../schema/index';
import { sql, eq, and, desc, asc } from 'drizzle-orm';
import { getActiveRates } from './distribution-settings';
import type { ActiveRates } from './distribution-settings';

export type PeriodSummary = {
  revenue: number;
  expenses: number;
  pmgShare: number;
  profitPool: number;
};

export async function getTotalRevenue(): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${income.amount}), '0')` })
    .from(income);
  return Number(result[0]!.total);
}

export async function getTotalExpenses(): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
    .from(expenses);
  return Number(result[0]!.total);
}

export async function getRevenueByDivision(): Promise<
  { divisionId: string; divisionName: string; total: number }[]
> {
  const result: { divisionId: string; divisionName: string; total: string }[] = await db
    .select({
      divisionId: divisions.id,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .groupBy(divisions.id, divisions.name)
    .orderBy(desc(sql`SUM(${income.amount})`));
  return result.map((row) => ({
    divisionId: row.divisionId,
    divisionName: row.divisionName,
    total: Number(row.total),
  }));
}

export async function getExpensesByDivision(): Promise<
  { divisionId: string; divisionName: string; total: number }[]
> {
  const result: { divisionId: string; divisionName: string; total: string }[] = await db
    .select({
      divisionId: divisions.id,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
    })
    .from(expenses)
    .innerJoin(divisions, eq(expenses.divisionId, divisions.id))
    .groupBy(divisions.id, divisions.name)
    .orderBy(desc(sql`SUM(${expenses.amount})`));
  return result.map((row) => ({
    divisionId: row.divisionId,
    divisionName: row.divisionName,
    total: Number(row.total),
  }));
}

export async function getMonthlyRevenueByDivision(
  months = 6,
): Promise<{ month: string; divisionName: string; total: number }[]> {
  const result: { month: string; divisionName: string; total: string }[] = await db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .where(
      sql`${income.date} >= DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) - INTERVAL '${sql.raw(String(months - 1))} months'`,
    )
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(sql`TO_CHAR(${income.date}, 'YYYY-MM') ASC`, asc(divisions.name));
  return result.map((r) => ({
    month: r.month,
    divisionName: r.divisionName,
    total: Number(r.total),
  }));
}

export async function getMonthlyFinancials(): Promise<
  { month: string; revenue: number; expenses: number }[]
> {
  const result = await db.execute(sql`
    WITH rev AS (
      SELECT TO_CHAR(date::date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS revenue
      FROM income WHERE EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::int = EXTRACT(YEAR FROM (timezone('Africa/Johannesburg', now()) - INTERVAL '2 months'))::int
      GROUP BY TO_CHAR(date::date, 'YYYY-MM')
    ),
    exp AS (
      SELECT TO_CHAR(date::date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses WHERE EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::int = EXTRACT(YEAR FROM (timezone('Africa/Johannesburg', now()) - INTERVAL '2 months'))::int
      GROUP BY TO_CHAR(date::date, 'YYYY-MM')
    )
    SELECT COALESCE(rev.month, exp.month) AS month,
           COALESCE(rev.revenue, 0) AS revenue,
           COALESCE(exp.expenses, 0) AS expenses
    FROM rev FULL OUTER JOIN exp ON rev.month = exp.month
    ORDER BY month ASC
  `);
  return (result.rows as { month: string; revenue: string; expenses: string }[]).map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
    expenses: Number(r.expenses),
  }));
}

export async function getLeadsByStatus(): Promise<{ status: string; count: number }[]> {
  const result: { status: string; count: string }[] = await db
    .select({ status: leads.status, count: sql<string>`COUNT(*)` })
    .from(leads)
    .groupBy(leads.status)
    .orderBy(desc(sql`COUNT(*)`));
  return result.map((row) => ({ status: row.status, count: Number(row.count) }));
}

export async function getMoMSnapshot(): Promise<{
  currentRevenue: number;
  previousRevenue: number;
  currentExpenses: number;
  previousExpenses: number;
}> {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', timezone('Africa/Johannesburg', now()))
                         AND date <  DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) + INTERVAL '1 month'
                         THEN amount END), 0) AS current_revenue,
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) - INTERVAL '1 month'
                         AND date <  DATE_TRUNC('month', timezone('Africa/Johannesburg', now()))
                         THEN amount END), 0) AS previous_revenue
    FROM income
  `);
  const expResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', timezone('Africa/Johannesburg', now()))
                         AND date <  DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) + INTERVAL '1 month'
                         THEN amount END), 0) AS current_expenses,
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) - INTERVAL '1 month'
                         AND date <  DATE_TRUNC('month', timezone('Africa/Johannesburg', now()))
                         THEN amount END), 0) AS previous_expenses
    FROM expenses
  `);
  const inc = result.rows[0] as { current_revenue: string; previous_revenue: string };
  const exp = expResult.rows[0] as { current_expenses: string; previous_expenses: string };
  return {
    currentRevenue: Number(inc.current_revenue),
    previousRevenue: Number(inc.previous_revenue),
    currentExpenses: Number(exp.current_expenses),
    previousExpenses: Number(exp.previous_expenses),
  };
}

export async function getFinancialSummaryForPeriod(
  startExpr: string,
  endExpr: string,
  rates?: ActiveRates,
): Promise<PeriodSummary> {
  // Use provided rates or fetch current active rates
  const effectiveRates = rates ?? (await getActiveRates());
  const revResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM income
    WHERE date >= ${sql.raw(startExpr)} AND date < ${sql.raw(endExpr)}
  `);
  const expResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE date >= ${sql.raw(startExpr)} AND date < ${sql.raw(endExpr)}
  `);
  const revenue = Number((revResult.rows[0] as { total: string }).total);
  const expTotal = Number((expResult.rows[0] as { total: string }).total);
  const pmgShare = revenue * effectiveRates.pmg_share;
  const profitPool = revenue - expTotal - pmgShare;
  return {
    revenue,
    expenses: expTotal,
    pmgShare,
    profitPool,
  };
}

/** Current month summary */
export async function getCurrentMonthSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('month', timezone('Africa/Johannesburg', now()))",
    "DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) + INTERVAL '1 month'",
  );
}

/** Previous month summary */
export async function getPreviousMonthSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) - INTERVAL '1 month'",
    "DATE_TRUNC('month', timezone('Africa/Johannesburg', now()))",
  );
}

/** Year-to-date summary (Mar 1 → now) */
export async function getYTDSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('year', timezone('Africa/Johannesburg', now()) - INTERVAL '2 months') + INTERVAL '2 months'",
    "timezone('Africa/Johannesburg', now()) + INTERVAL '1 day'",
  );
}

/** Same Mar 1–month-day range but for the previous year */
export async function getPreviousYearYTDSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('year', timezone('Africa/Johannesburg', now()) - INTERVAL '2 months') - INTERVAL '1 year' + INTERVAL '2 months'",
    "timezone('Africa/Johannesburg', now()) - INTERVAL '1 year' + INTERVAL '1 day'",
  );
}

/**
/**
 * Returns total expenses grouped by category for the given financial year,
 * ordered by total descending.
 */
export async function getExpensesByCategoryForYear(
  year: number,
): Promise<{ category: string; total: number }[]> {
  const result: { category: string; total: string }[] = await db
    .select({
      category: expenses.category,
      total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
    })
    .from(expenses)
    .where(
      sql`EXTRACT(YEAR FROM (${expenses.date}::date - INTERVAL '2 months'))::int = ${Number(year)}`,
    )
    .groupBy(expenses.category)
    .orderBy(desc(sql`SUM(${expenses.amount})`));
  return result.map((r) => ({ category: r.category, total: Number(r.total) }));
}

/**
 * Returns the union of distinct financial years from income.date,
 * expenses.date, and invoice dates, sorted descending.
 */
export async function getDistinctYears(): Promise<number[]> {
  const result = await db.execute(sql`
    SELECT year FROM (
      SELECT DISTINCT EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::integer AS year FROM income
      UNION
      SELECT DISTINCT EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::integer AS year FROM expenses
      UNION
      SELECT DISTINCT EXTRACT(YEAR FROM (invoice_date::date - INTERVAL '2 months'))::integer AS year FROM invoices
    ) combined
    ORDER BY year DESC
  `);
  return (result.rows as { year: number }[]).map((r) => Number(r.year));
}

/**
 * Returns monthly revenue and expenses for the given financial year,
 * ordered by month ascending. month format is 'YYYY-MM'.
 */
export async function getMonthlyFinancialsForYear(
  year: number,
): Promise<{ month: string; revenue: number; expenses: number }[]> {
  const result = await db.execute(sql`
    WITH rev AS (
      SELECT TO_CHAR(date::date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS revenue
      FROM income
      WHERE EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::int = ${Number(year)}
      GROUP BY TO_CHAR(date::date, 'YYYY-MM')
    ),
    exp AS (
      SELECT TO_CHAR(date::date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::int = ${Number(year)}
      GROUP BY TO_CHAR(date::date, 'YYYY-MM')
    )
    SELECT COALESCE(rev.month, exp.month) AS month,
           COALESCE(rev.revenue, 0) AS revenue,
           COALESCE(exp.expenses, 0) AS expenses
    FROM rev FULL OUTER JOIN exp ON rev.month = exp.month
    ORDER BY 1 ASC
  `);
  return (result.rows as { month: string; revenue: string; expenses: string }[]).map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
    expenses: Number(r.expenses),
  }));
}

/**
 * Returns monthly received income and client-facing invoice totals for the
 * given financial year, ordered by month ascending. Month format is 'YYYY-MM'.
 */
export async function getMonthlyRevenueVsInvoicedForYear(
  year: number,
): Promise<{ month: string; received: number; invoiced: number }[]> {
  const result = await db.execute(sql`
    WITH received AS (
      SELECT TO_CHAR(date::date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS received
      FROM income
      WHERE EXTRACT(YEAR FROM (date::date - INTERVAL '2 months'))::int = ${Number(year)}
      GROUP BY TO_CHAR(date::date, 'YYYY-MM')
    ),
    invoiced AS (
      SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') AS month, COALESCE(SUM(total), 0) AS invoiced
      FROM invoices
      WHERE EXTRACT(YEAR FROM (invoice_date::date - INTERVAL '2 months'))::int = ${Number(year)}
        AND status IN ('issued', 'partially_paid', 'paid', 'overdue')
      GROUP BY TO_CHAR(invoice_date::date, 'YYYY-MM')
    )
    SELECT COALESCE(received.month, invoiced.month) AS month,
           COALESCE(received.received, 0) AS received,
           COALESCE(invoiced.invoiced, 0) AS invoiced
    FROM received FULL OUTER JOIN invoiced ON received.month = invoiced.month
    ORDER BY 1 ASC
  `);
  return (result.rows as { month: string; received: string; invoiced: string }[]).map((r) => ({
    month: r.month,
    received: Number(r.received),
    invoiced: Number(r.invoiced),
  }));
}

/**
 * Returns the cumulative outstanding Accounts Receivable balance as of each
 * month-end in the given financial year, ordered by month ascending.
 * Month format is 'YYYY-MM'. Unlike `getMonthlyRevenueVsInvoicedForYear`
 * (which returns per-month flows), this is a running balance built up across
 * the months within the fiscal year: it starts at 0 in March and grows/shrinks
 * as that year's invoices are billed and collected. Invoices are scoped to
 * the same financial year as `getMonthlyRevenueVsInvoicedForYear`'s "invoiced"
 * series, so all three chart metrics (Cash Receipts, Revenue, AR) stay
 * consistently scoped to "this fiscal year" rather than mixing in prior-year
 * carryover for AR alone.
 */
export async function getMonthlyARBalanceForYear(
  year: number,
): Promise<{ month: string; ar: number }[]> {
  const result = await db.execute(sql`
    WITH month_ends AS (
      SELECT (gs + INTERVAL '1 month' - INTERVAL '1 day')::date AS month_end
      FROM generate_series(
        make_date(${Number(year)}, 3, 1),
        make_date(${Number(year)} + 1, 2, 1),
        INTERVAL '1 month'
      ) AS gs
    ),
    invoice_base AS (
      SELECT id, invoice_date::date AS invoice_date, total::numeric AS total
      FROM invoices
      -- 'paid' is deliberately excluded, unlike the "invoiced" (Revenue) status set —
      -- a fully paid invoice can still carry a stray credit note applied after the
      -- fact, which would otherwise show up here as a negative balance and wash out
      -- real outstanding AR from other invoices. Matches getAgingReport's status set.
      WHERE status IN ('issued', 'partially_paid', 'overdue')
        AND EXTRACT(YEAR FROM (invoice_date::date - INTERVAL '2 months'))::int = ${Number(year)}
    )
    SELECT
      TO_CHAR(me.month_end, 'YYYY-MM') AS month,
      COALESCE(SUM(
        CASE WHEN ib.invoice_date <= me.month_end THEN
          ib.total
          - COALESCE((
              SELECT SUM(pa.amount) FROM payment_allocations pa
              JOIN income inc ON inc.id = pa.income_id
              WHERE pa.invoice_id = ib.id AND inc.date::date <= me.month_end
            ), 0)
          - COALESCE((
              SELECT SUM(ca.amount) FROM credit_applications ca
              WHERE ca.invoice_id = ib.id AND ca.applied_at::date <= me.month_end
            ), 0)
        ELSE 0 END
      ), 0) AS ar
    FROM month_ends me
    CROSS JOIN invoice_base ib
    GROUP BY me.month_end
    ORDER BY me.month_end
  `);
  return (result.rows as { month: string; ar: string }[]).map((r) => ({
    month: r.month,
    ar: Number(r.ar),
  }));
}

/**
 * Pre-close integrity check: count expenses with no category for a given period.
 */
export async function getUncategorizedExpensesCount(period: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(expenses)
    .where(
      sql`TO_CHAR(${expenses.date}, 'YYYY-MM') = ${period} AND (${expenses.category} IS NULL OR ${expenses.category} = '')`,
    );
  return result[0]?.count ?? 0;
}

/**
 * Pre-close integrity check: count draft invoices for a given fiscal year.
 */
export async function getDraftInvoicesCount(year: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS count FROM invoices
    WHERE status = 'draft'
    AND EXTRACT(YEAR FROM (invoice_date::date - INTERVAL '2 months'))::int = ${Number(year)}
  `);
  return (result.rows[0] as { count: number })?.count ?? 0;
}

/**
 * Pre-close integrity check: return total income and total expenses for a period.
 * Used for variance check between revenue and expense entries.
 */
export async function getPeriodTotals(
  period: string,
): Promise<{ income: number; expenses: number }> {
  const incResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${income.amount}), '0')` })
    .from(income)
    .where(sql`TO_CHAR(${income.date}, 'YYYY-MM') = ${period}`);
  const expResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
    .from(expenses)
    .where(sql`TO_CHAR(${expenses.date}, 'YYYY-MM') = ${period}`);
  return {
    income: Number(incResult[0]?.total ?? 0),
    expenses: Number(expResult[0]?.total ?? 0),
  };
}

/**
 * Returns individual income rows for a specific YYYY-MM period,
 * joined with division and client names.
 */
export async function getIncomeByPeriod(period: string): Promise<
  {
    date: string;
    divisionName: string;
    clientName: string;
    description: string | null;
    amount: number;
  }[]
> {
  const result = await db
    .select({
      date: sql<string>`${income.date}::text`,
      divisionName: divisions.name,
      clientName: clients.businessName,
      description: income.description,
      amount: income.amount,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .leftJoin(clients, eq(income.clientId, clients.id))
    .where(sql`TO_CHAR(${income.date}, 'YYYY-MM') = ${period}`)
    .orderBy(desc(income.date));
  return result.map((r) => ({
    date: r.date,
    divisionName: r.divisionName,
    clientName: r.clientName ?? '—',
    description: r.description,
    amount: Number(r.amount),
  }));
}

/**
 * Returns individual expense rows for a specific YYYY-MM period,
 * joined with division and client names.
 */
export async function getExpensesByPeriod(period: string): Promise<
  {
    date: string;
    divisionName: string;
    category: string;
    clientName: string;
    description: string | null;
    amount: number;
  }[]
> {
  const result = await db
    .select({
      date: sql<string>`${expenses.date}::text`,
      divisionName: divisions.name,
      category: expenses.category,
      clientName: clients.businessName,
      description: expenses.description,
      amount: expenses.amount,
    })
    .from(expenses)
    .innerJoin(divisions, eq(expenses.divisionId, divisions.id))
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .where(sql`TO_CHAR(${expenses.date}, 'YYYY-MM') = ${period}`)
    .orderBy(desc(expenses.date));
  return result.map((r) => ({
    date: r.date,
    divisionName: r.divisionName,
    category: r.category,
    clientName: r.clientName ?? '—',
    description: r.description,
    amount: Number(r.amount),
  }));
}

/**
 * Returns ledger entries for a specific period (YYYY-MM) and optional allocation type.
 */
export async function getLedgerEntriesByPeriod(
  period: string,
  allocationType?: AllocationType,
): Promise<{
  total: number;
  entries: { date: string; description: string | null; amount: number; entryType: string }[];
}> {
  const conditions = [sql`TO_CHAR(${ledger.date}, 'YYYY-MM') = ${period}`];
  if (allocationType) {
    conditions.push(eq(ledger.allocationType, allocationType));
  }
  const result = await db
    .select({
      date: sql<string>`${ledger.date}::text`,
      description: ledger.description,
      amount: ledger.amount,
      entryType: ledger.entryType,
    })
    .from(ledger)
    .where(and(...conditions))
    .orderBy(desc(ledger.date));
  const entries = result.map((r) => ({
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
    entryType: r.entryType,
  }));
  return { total: entries.reduce((sum, e) => sum + e.amount, 0), entries };
}

/**
 * Returns monthly revenue per division for the given financial year,
 * ordered by month ascending then division name ascending.
 */
export async function getMonthlyRevenueByDivisionForYear(
  year: number,
): Promise<{ month: string; divisionName: string; total: number }[]> {
  const result: { month: string; divisionName: string; total: string }[] = await db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .where(sql`EXTRACT(YEAR FROM (${income.date} - INTERVAL '2 months')) = ${year}`)
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(sql`TO_CHAR(${income.date}, 'YYYY-MM') ASC`, asc(divisions.name));
  return result.map((r) => ({
    month: r.month,
    divisionName: r.divisionName,
    total: Number(r.total),
  }));
}
