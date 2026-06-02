import { db } from '../client';
import { divisions, income, expenses, leads } from '../schema/index';
import { sql, eq, asc } from 'drizzle-orm';

export type DivisionRow = {
  id: string;
  name: string;
  isActive: boolean;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  leadCount: number;
};

/**
 * Returns all divisions as { id, name }[], sorted by name ascending.
 */
export async function getAllDivisions(): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: divisions.id, name: divisions.name })
    .from(divisions)
    .orderBy(asc(divisions.name));
}

/**
 * Returns all divisions with aggregated financial stats and lead count,
 * sorted by name ascending.
 */
export async function getDivisionsWithStats(): Promise<DivisionRow[]> {
  const result = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.is_active                            AS "isActive",
      COALESCE(i.total_income,   0)::numeric AS "totalIncome",
      COALESCE(e.total_expenses, 0)::numeric AS "totalExpenses",
      (COALESCE(i.total_income, 0) - COALESCE(e.total_expenses, 0))::numeric AS "netProfit",
      COALESCE(l.lead_count,     0)::integer AS "leadCount"
    FROM divisions d
    LEFT JOIN (
      SELECT division_id, SUM(amount) AS total_income
      FROM income
      GROUP BY division_id
    ) i ON i.division_id = d.id
    LEFT JOIN (
      SELECT division_id, SUM(amount) AS total_expenses
      FROM expenses
      GROUP BY division_id
    ) e ON e.division_id = d.id
    LEFT JOIN (
      SELECT division_id, COUNT(*) AS lead_count
      FROM leads
      GROUP BY division_id
    ) l ON l.division_id = d.id
    ORDER BY d.name ASC
  `);

  return (
    result.rows as Array<{
      id: string;
      name: string;
      isActive: boolean;
      totalIncome: string;
      totalExpenses: string;
      netProfit: string;
      leadCount: string;
    }>
  ).map((row) => ({
    id:            row.id,
    name:          row.name,
    isActive:      row.isActive,
    totalIncome:   Number(row.totalIncome),
    totalExpenses: Number(row.totalExpenses),
    netProfit:     Number(row.netProfit),
    leadCount:     Number(row.leadCount),
  }));
}

/**
 * Returns a single division with stats by id, or null if not found.
 */
export async function getDivisionWithStatsById(id: string): Promise<DivisionRow | null> {
  const result = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.is_active                            AS "isActive",
      COALESCE(i.total_income,   0)::numeric AS "totalIncome",
      COALESCE(e.total_expenses, 0)::numeric AS "totalExpenses",
      (COALESCE(i.total_income, 0) - COALESCE(e.total_expenses, 0))::numeric AS "netProfit",
      COALESCE(l.lead_count,     0)::integer AS "leadCount"
    FROM divisions d
    LEFT JOIN (
      SELECT division_id, SUM(amount) AS total_income
      FROM income
      WHERE division_id = ${id}
      GROUP BY division_id
    ) i ON i.division_id = d.id
    LEFT JOIN (
      SELECT division_id, SUM(amount) AS total_expenses
      FROM expenses
      WHERE division_id = ${id}
      GROUP BY division_id
    ) e ON e.division_id = d.id
    LEFT JOIN (
      SELECT division_id, COUNT(*) AS lead_count
      FROM leads
      WHERE division_id = ${id}
      GROUP BY division_id
    ) l ON l.division_id = d.id
    WHERE d.id = ${id}
  `);

  const row = result.rows[0] as
    | {
        id: string;
        name: string;
        isActive: boolean;
        totalIncome: string;
        totalExpenses: string;
        netProfit: string;
        leadCount: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id:            row.id,
    name:          row.name,
    isActive:      row.isActive,
    totalIncome:   Number(row.totalIncome),
    totalExpenses: Number(row.totalExpenses),
    netProfit:     Number(row.netProfit),
    leadCount:     Number(row.leadCount),
  };
}

/**
 * Sets isActive to the given value for the division with the given id.
 */
export async function setDivisionActive(id: string, isActive: boolean): Promise<void> {
  await db.update(divisions).set({ isActive, updatedAt: new Date() }).where(eq(divisions.id, id));
}

/**
 * Returns monthly revenue per division for the last N months.
 * Used by the interactive division area chart.
 */
export async function getDivisionRevenueSeries(
  months: number,
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

/**
 * Returns revenue per division for the current month only.
 */
export async function getDivisionRevenueCurrentMonth(): Promise<
  { month: string; divisionName: string; total: number }[]
> {
  const result: { month: string; divisionName: string; total: string }[] = await db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .where(
      sql`${income.date} >= DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) AND ${income.date} < DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) + INTERVAL '1 month'`,
    )
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(asc(divisions.name));
  return result.map((r) => ({
    month: r.month,
    divisionName: r.divisionName,
    total: Number(r.total),
  }));
}

/**
 * Returns revenue per division for the previous month only.
 */
export async function getDivisionRevenuePreviousMonth(): Promise<
  { month: string; divisionName: string; total: number }[]
> {
  const result: { month: string; divisionName: string; total: string }[] = await db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .where(
      sql`${income.date} >= DATE_TRUNC('month', timezone('Africa/Johannesburg', now())) - INTERVAL '1 month' AND ${income.date} < DATE_TRUNC('month', timezone('Africa/Johannesburg', now()))`,
    )
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(asc(divisions.name));
  return result.map((r) => ({
    month: r.month,
    divisionName: r.divisionName,
    total: Number(r.total),
  }));
}

/**
 * Returns revenue per division for year-to-date.
 */
export async function getDivisionRevenueYTD(): Promise<
  { month: string; divisionName: string; total: number }[]
> {
  const result: { month: string; divisionName: string; total: string }[] = await db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .where(sql`${income.date} >= DATE_TRUNC('year', timezone('Africa/Johannesburg', now()) - INTERVAL '2 months') + INTERVAL '2 months'`)
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(sql`TO_CHAR(${income.date}, 'YYYY-MM') ASC`, asc(divisions.name));
  return result.map((r) => ({
    month: r.month,
    divisionName: r.divisionName,
    total: Number(r.total),
  }));
}
