import { db } from '../client';
import {
  income,
  expenses,
  leads,
  divisions,
} from '../schema/index';
import { sql, eq, desc, asc } from 'drizzle-orm';
import { ACCOUNT_RATES } from '../accounts';

export type PeriodSummary = {
  revenue: number;
  expenses: number;
  pmgShare: number;
  profitPool: number;
  salary: number;
  reinvest: number;
  reserve: number;
  flex: number;
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

export async function getRevenueByDivision(): Promise<{ divisionName: string; total: number }[]> {
  const result: { divisionName: string; total: string }[] = await db
    .select({
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .groupBy(divisions.name)
    .orderBy(desc(sql`SUM(${income.amount})`));
  return result.map((row) => ({ divisionName: row.divisionName, total: Number(row.total) }));
}

export async function getExpensesByDivision(): Promise<{ divisionName: string; total: number }[]> {
  const result: { divisionName: string; total: string }[] = await db
    .select({
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
    })
    .from(expenses)
    .innerJoin(divisions, eq(expenses.divisionId, divisions.id))
    .groupBy(divisions.name)
    .orderBy(desc(sql`SUM(${expenses.amount})`));
  return result.map((row) => ({ divisionName: row.divisionName, total: Number(row.total) }));
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
      sql`${income.date} >= DATE_TRUNC('month', NOW()) - INTERVAL '${sql.raw(String(months - 1))} months'`,
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
      SELECT TO_CHAR(date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS revenue
      FROM income WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())
      GROUP BY TO_CHAR(date, 'YYYY-MM')
    ),
    exp AS (
      SELECT TO_CHAR(date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())
      GROUP BY TO_CHAR(date, 'YYYY-MM')
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
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW())
                         AND date <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
                         THEN amount END), 0) AS current_revenue,
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                         AND date <  DATE_TRUNC('month', NOW())
                         THEN amount END), 0) AS previous_revenue
    FROM income
  `);
  const expResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW())
                         AND date <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
                         THEN amount END), 0) AS current_expenses,
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                         AND date <  DATE_TRUNC('month', NOW())
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
): Promise<PeriodSummary> {
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
  const pmgShare = revenue * ACCOUNT_RATES.pmg_share;
  const profitPool = revenue - expTotal - pmgShare;
  return {
    revenue,
    expenses: expTotal,
    pmgShare,
    profitPool,
    salary: profitPool * ACCOUNT_RATES.salary,
    reinvest: profitPool * ACCOUNT_RATES.reinvest,
    reserve: profitPool * ACCOUNT_RATES.reserve,
    flex: profitPool * ACCOUNT_RATES.flex,
  };
}

/** Current month summary */
export async function getCurrentMonthSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('month', NOW())",
    "DATE_TRUNC('month', NOW()) + INTERVAL '1 month'",
  );
}

/** Previous month summary */
export async function getPreviousMonthSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('month', NOW()) - INTERVAL '1 month'",
    "DATE_TRUNC('month', NOW())",
  );
}

/** Year-to-date summary (Mar 1 → now) */
export async function getYTDSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('year', NOW() - INTERVAL '2 months') + INTERVAL '2 months'",
    "NOW() + INTERVAL '1 day'"
  );
}

/** Same Mar 1–month-day range but for the previous year */
export async function getPreviousYearYTDSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('year', NOW() - INTERVAL '2 months') - INTERVAL '1 year' + INTERVAL '2 months'",
    "NOW() - INTERVAL '1 year' + INTERVAL '1 day'"
  );
}

/**
 * Returns total expenses grouped by category for the given calendar year,
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
    .where(sql`EXTRACT(YEAR FROM ${expenses.date}) = ${year}`)
    .groupBy(expenses.category)
    .orderBy(desc(sql`SUM(${expenses.amount})`));
  return result.map((r) => ({ category: r.category, total: Number(r.total) }));
}

/**
 * Returns the union of distinct calendar years from income.date and
 * expenses.date, sorted descending.
 */
export async function getDistinctYears(): Promise<number[]> {
  const result = await db.execute(sql`
    SELECT year FROM (
      SELECT DISTINCT EXTRACT(YEAR FROM date)::integer AS year FROM income
      UNION
      SELECT DISTINCT EXTRACT(YEAR FROM date)::integer AS year FROM expenses
    ) combined
    ORDER BY year DESC
  `);
  return (result.rows as { year: number }[]).map((r) => Number(r.year));
}

/**
 * Returns monthly revenue and expenses for the given calendar year,
 * ordered by month ascending. month format is 'YYYY-MM'.
 */
export async function getMonthlyFinancialsForYear(
  year: number,
): Promise<{ month: string; revenue: number; expenses: number }[]> {
  const result = await db.execute(sql`
    WITH rev AS (
      SELECT TO_CHAR(date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS revenue
      FROM income
      WHERE EXTRACT(YEAR FROM date) = ${year}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
    ),
    exp AS (
      SELECT TO_CHAR(date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE EXTRACT(YEAR FROM date) = ${year}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
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
 * Returns monthly revenue per division for the given calendar year,
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
    .where(sql`EXTRACT(YEAR FROM ${income.date}) = ${year}`)
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(sql`TO_CHAR(${income.date}, 'YYYY-MM') ASC`, asc(divisions.name));
  return result.map((r) => ({
    month: r.month,
    divisionName: r.divisionName,
    total: Number(r.total),
  }));
}
