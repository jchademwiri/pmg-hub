import { db } from './client';
import {
  income,
  expenses,
  leads,
  divisions,
  ledger,
  clients,
  snapshots,
  expenseCategories,
} from './schema/index';
import type { Client } from './schema/clients';
import type { ExpenseCategory } from './schema/expense-categories';
import { sql, eq, desc, asc, and } from 'drizzle-orm';

// ── Existing queries (unchanged) ─────────────────────────────────────────────

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

// ── NEW: Period-specific financial summary ────────────────────────────────────

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

/**
 * Returns financial summary for a specific SQL date range.
 * startExpr / endExpr are raw SQL expressions e.g.:
 *   startExpr = "DATE_TRUNC('month', NOW())"
 *   endExpr   = "DATE_TRUNC('month', NOW()) + INTERVAL '1 month'"
 */
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
  const pmgShare = revenue * 0.2;
  const profitPool = revenue - expTotal - pmgShare;
  return {
    revenue,
    expenses: expTotal,
    pmgShare,
    profitPool,
    salary: profitPool * 0.35,
    reinvest: profitPool * 0.3,
    reserve: profitPool * 0.3,
    flex: profitPool * 0.05,
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

/** Year-to-date summary (Jan 1 → now) */
export async function getYTDSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod("DATE_TRUNC('year', NOW())", "NOW() + INTERVAL '1 day'");
}

/** Same Jan–month-day range but for the previous year */
export async function getPreviousYearYTDSummary(): Promise<PeriodSummary> {
  return getFinancialSummaryForPeriod(
    "DATE_TRUNC('year', NOW()) - INTERVAL '1 year'",
    "NOW() - INTERVAL '1 year' + INTERVAL '1 day'",
  );
}

// ── Ledger Period Queries ───────────────────────────────────────────────────

export async function getLedgerEntriesCurrentMonth(allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex'): Promise<{
  total: number;
  entries: { date: string; description: string | null; amount: number }[];
}> {
  const conditions = [
    sql`${ledger.date} >= DATE_TRUNC('month', NOW())`,
    sql`${ledger.date} < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`
  ];
  if (allocationType) {
    conditions.push(eq(ledger.allocationType, allocationType));
  }

  const result = await db
    .select({
      date: sql<string>`${ledger.date}::text`,
      description: ledger.description,
      amount: ledger.amount,
    })
    .from(ledger)
    .where(and(...conditions))
    .orderBy(desc(ledger.date));
    
  const entries = result.map((r) => ({
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
  }));
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  return { total, entries };
}

export async function getLedgerTotalByAllocation(allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex'): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${ledger.amount}), '0')` })
    .from(ledger)
    .where(eq(ledger.allocationType, allocationType));
  return Number(result[0]?.total ?? 0);
}

export async function getLedgerEntriesPreviousMonth(allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex'): Promise<{
  total: number;
  entries: { date: string; description: string | null; amount: number }[];
}> {
  const conditions = [
    sql`${ledger.date} >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'`,
    sql`${ledger.date} < DATE_TRUNC('month', NOW())`
  ];
  if (allocationType) {
    conditions.push(eq(ledger.allocationType, allocationType));
  }

  const result = await db
    .select({
      date: sql<string>`${ledger.date}::text`,
      description: ledger.description,
      amount: ledger.amount,
    })
    .from(ledger)
    .where(and(...conditions))
    .orderBy(desc(ledger.date));
    
  const entries = result.map((r) => ({
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
  }));
  return { total: entries.reduce((sum, e) => sum + e.amount, 0), entries };
}

export async function getLedgerEntriesYTD(allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex'): Promise<{
  total: number;
  entries: { date: string; description: string | null; amount: number }[];
}> {
  const conditions = [sql`${ledger.date} >= DATE_TRUNC('year', NOW())`];
  if (allocationType) {
    conditions.push(eq(ledger.allocationType, allocationType));
  }

  const result = await db
    .select({
      date: sql<string>`${ledger.date}::text`,
      description: ledger.description,
      amount: ledger.amount,
    })
    .from(ledger)
    .where(and(...conditions))
    .orderBy(desc(ledger.date));
    
  const entries = result.map((r) => ({
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
  }));
  return { total: entries.reduce((sum, e) => sum + e.amount, 0), entries };
}

export async function getLedgerByAllocationYTD(): Promise<Record<string, number>> {
  const result = await db
    .select({
      allocationType: ledger.allocationType,
      total: sql<string>`COALESCE(SUM(${ledger.amount}), '0')`,
    })
    .from(ledger)
    .where(sql`${ledger.date} >= DATE_TRUNC('year', NOW())`)
    .groupBy(ledger.allocationType);
    
  const map: Record<string, number> = {};
  for (const row of result) map[row.allocationType] = Number(row.total);
  return map;
}

// ── NEW: Division revenue by period for interactive chart ─────────────────────

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
      sql`${income.date} >= DATE_TRUNC('month', NOW()) AND ${income.date} < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`,
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
      sql`${income.date} >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND ${income.date} < DATE_TRUNC('month', NOW())`,
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
    .where(sql`${income.date} >= DATE_TRUNC('year', NOW())`)
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(sql`TO_CHAR(${income.date}, 'YYYY-MM') ASC`, asc(divisions.name));
  return result.map((r) => ({
    month: r.month,
    divisionName: r.divisionName,
    total: Number(r.total),
  }));
}

// ── Income management query helpers ──────────────────────────────────────────

export type IncomeRow = {
  id: string;
  date: string;
  divisionId: string;
  divisionName: string;
  clientId: string | null;
  clientName: string | null;
  description: string | null;
  amount: string; // numeric from DB — caller converts with Number()
};

/**
 * Returns all income rows joined to divisions (INNER) and clients (LEFT),
 * with optional filters for divisionId and month (YYYY-MM), sorted by date DESC.
 */
export async function getAllIncome(
  filters?: { divisionId?: string; month?: string; clientId?: string },
  pageObj?: { page: number; pageSize: number },
): Promise<{ data: IncomeRow[]; total: number; sum: number }> {
  const conditions = [];
  if (filters?.divisionId) {
    conditions.push(eq(income.divisionId, filters.divisionId));
  }
  if (filters?.clientId) {
    conditions.push(eq(income.clientId, filters.clientId));
  }
  if (filters?.month) {
    conditions.push(sql`TO_CHAR(${income.date}, 'YYYY-MM') = ${filters.month}`);
  }

  const query = db
    .select({
      id: income.id,
      date: sql<string>`${income.date}::text`,
      divisionId: income.divisionId,
      divisionName: divisions.name,
      clientId: income.clientId,
      clientName: clients.name,
      description: income.description,
      amount: income.amount,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .leftJoin(clients, eq(income.clientId, clients.id))
    .orderBy(desc(income.date));

  let finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

  const countQuery = db
    .select({
      count: sql<number>`count(*)::int`,
      sum: sql<number>`COALESCE(SUM(${income.amount}), 0)::numeric`,
    })
    .from(income);
  if (conditions.length > 0) countQuery.where(and(...conditions));

  const [totalRes] = await countQuery;
  const total = totalRes?.count ?? 0;
  const sumAmount = Number(totalRes?.sum ?? 0);

  if (pageObj) {
    finalQuery = finalQuery
      .limit(pageObj.pageSize)
      .offset((pageObj.page - 1) * pageObj.pageSize) as any;
  }

  const data = await finalQuery;
  return { data, total, sum: sumAmount };
}

/**
 * Returns a single income row by id (with division and client joined),
 * or null if no row with that id exists.
 */
export async function getIncomeById(id: string): Promise<IncomeRow | null> {
  const result = await db
    .select({
      id: income.id,
      date: sql<string>`${income.date}::text`,
      divisionId: income.divisionId,
      divisionName: divisions.name,
      clientId: income.clientId,
      clientName: clients.name,
      description: income.description,
      amount: income.amount,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .leftJoin(clients, eq(income.clientId, clients.id))
    .where(eq(income.id, id));

  return result[0] ?? null;
}

/**
 * Returns distinct YYYY-MM strings for months that have at least one income
 * entry, sorted descending.
 */
export async function getDistinctIncomeMonths(): Promise<string[]> {
  const result = await db
    .selectDistinct({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
    })
    .from(income)
    .orderBy(sql`TO_CHAR(${income.date}, 'YYYY-MM') DESC`);

  return result.map((r) => r.month);
}

/**
 * Returns all divisions as { id, name }[], sorted by name ascending.
 */
export async function getAllDivisions(): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: divisions.id, name: divisions.name })
    .from(divisions)
    .orderBy(asc(divisions.name));
}

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
 * Returns all divisions with aggregated financial stats and lead count,
 * sorted by name ascending.
 */
export async function getDivisionsWithStats(): Promise<DivisionRow[]> {
  const result = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.is_active AS "isActive",
      COALESCE(SUM(i.amount), 0)::numeric AS "totalIncome",
      COALESCE(SUM(e.amount), 0)::numeric AS "totalExpenses",
      (COALESCE(SUM(i.amount), 0) - COALESCE(SUM(e.amount), 0))::numeric AS "netProfit",
      COALESCE(COUNT(l.id), 0)::integer AS "leadCount"
    FROM divisions d
    LEFT JOIN income i ON i.division_id = d.id
    LEFT JOIN expenses e ON e.division_id = d.id
    LEFT JOIN leads l ON l.division_id = d.id
    GROUP BY d.id, d.name, d.is_active
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
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    totalIncome: Number(row.totalIncome),
    totalExpenses: Number(row.totalExpenses),
    netProfit: Number(row.netProfit),
    leadCount: Number(row.leadCount),
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
      d.is_active AS "isActive",
      COALESCE(SUM(i.amount), 0)::numeric AS "totalIncome",
      COALESCE(SUM(e.amount), 0)::numeric AS "totalExpenses",
      (COALESCE(SUM(i.amount), 0) - COALESCE(SUM(e.amount), 0))::numeric AS "netProfit",
      COALESCE(COUNT(l.id), 0)::integer AS "leadCount"
    FROM divisions d
    LEFT JOIN income i ON i.division_id = d.id
    LEFT JOIN expenses e ON e.division_id = d.id
    LEFT JOIN leads l ON l.division_id = d.id
    WHERE d.id = ${id}
    GROUP BY d.id, d.name, d.is_active
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
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    totalIncome: Number(row.totalIncome),
    totalExpenses: Number(row.totalExpenses),
    netProfit: Number(row.netProfit),
    leadCount: Number(row.leadCount),
  };
}

/**
 * Sets isActive to the given value for the division with the given id.
 */
export async function setDivisionActive(id: string, isActive: boolean): Promise<void> {
  await db.update(divisions).set({ isActive, updatedAt: new Date() }).where(eq(divisions.id, id));
}

/**
 * Returns all clients as { id, name, businessName }[], sorted by name ascending.
 */
export async function getAllClients(): Promise<
  { id: string; name: string; businessName: string | null }[]
> {
  return db
    .select({ id: clients.id, name: clients.name, businessName: clients.businessName })
    .from(clients)
    .orderBy(asc(clients.name));
}

export type ClientWithIncomeCount = {
  id: string;
  name: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  incomeCount: number;
};

/**
 * Returns all clients joined with a count of their associated income entries,
 * ordered by client name ascending.
 */
export async function getClientsWithIncomeCount(): Promise<ClientWithIncomeCount[]> {
  const result = await db
    .select({
      id: clients.id,
      name: clients.name,
      businessName: clients.businessName,
      email: clients.email,
      phone: clients.phone,
      isActive: clients.isActive,
      createdAt: clients.createdAt,
      incomeCount: sql<number>`CAST(COUNT(${income.id}) AS INTEGER)`,
    })
    .from(clients)
    .leftJoin(income, eq(income.clientId, clients.id))
    .groupBy(clients.id)
    .orderBy(asc(clients.name));

  return result;
}

/**
 * Returns a single client row by primary key, or null if no matching row exists.
 */
export async function getClientById(id: string): Promise<Client | null> {
  const result = await db.select().from(clients).where(eq(clients.id, id));

  return result[0] ?? null;
}

/**
 * Sets isActive to the given value for the client with the given id.
 */
export async function setClientActive(id: string, isActive: boolean): Promise<void> {
  await db.update(clients).set({ isActive, updatedAt: new Date() }).where(eq(clients.id, id));
}

// ── Expense management query helpers ─────────────────────────────────────────

export type ExpenseRow = {
  id: string;
  date: string; // ISO date string e.g. "2026-03-15"
  divisionId: string;
  divisionName: string;
  clientId: string | null;
  clientName: string | null;
  category: string;
  description: string | null;
  amount: string; // numeric from DB — caller converts with Number()
  createdAt: Date;
  updatedAt: Date | null;
};

/**
 * Returns all expense rows joined to divisions (INNER),
 * with optional filters for divisionId, category, and month (YYYY-MM),
 * sorted by date DESC.
 */
export async function getAllExpenses(
  filters?: { divisionId?: string; category?: string; month?: string },
  pageObj?: { page: number; pageSize: number },
): Promise<{ data: ExpenseRow[]; total: number; sum: number }> {
  const conditions = [];
  if (filters?.divisionId) {
    conditions.push(eq(expenses.divisionId, filters.divisionId));
  }
  if (filters?.category) {
    conditions.push(eq(expenses.category, filters.category));
  }
  if (filters?.month) {
    conditions.push(sql`TO_CHAR(${expenses.date}, 'YYYY-MM') = ${filters.month}`);
  }

  const query = db
    .select({
      id: expenses.id,
      date: sql<string>`${expenses.date}::text`,
      divisionId: expenses.divisionId,
      divisionName: divisions.name,
      clientId: expenses.clientId,
      clientName: clients.name,
      category: expenses.category,
      description: expenses.description,
      amount: expenses.amount,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
    })
    .from(expenses)
    .innerJoin(divisions, eq(expenses.divisionId, divisions.id))
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .orderBy(desc(expenses.date));

  let finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

  const countQuery = db
    .select({
      count: sql<number>`count(*)::int`,
      sum: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::numeric`,
    })
    .from(expenses);
  if (conditions.length > 0) countQuery.where(and(...conditions));

  const [totalRes] = await countQuery;
  const total = totalRes?.count ?? 0;
  const sumAmount = Number(totalRes?.sum ?? 0);

  if (pageObj) {
    finalQuery = finalQuery
      .limit(pageObj.pageSize)
      .offset((pageObj.page - 1) * pageObj.pageSize) as any;
  }

  const data = await finalQuery;
  return { data, total, sum: sumAmount };
}

/**
 * Returns a single expense row by id (with division joined),
 * or null if no row with that id exists.
 */
export async function getExpenseById(id: string): Promise<ExpenseRow | null> {
  const result = await db
    .select({
      id: expenses.id,
      date: sql<string>`${expenses.date}::text`,
      divisionId: expenses.divisionId,
      divisionName: divisions.name,
      clientId: expenses.clientId,
      clientName: clients.name,
      category: expenses.category,
      description: expenses.description,
      amount: expenses.amount,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
    })
    .from(expenses)
    .innerJoin(divisions, eq(expenses.divisionId, divisions.id))
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .where(eq(expenses.id, id));

  return result[0] ?? null;
}

/**
 * Returns distinct YYYY-MM strings for months that have at least one expense
 * entry, sorted ascending.
 */
export async function getDistinctExpenseMonths(): Promise<string[]> {
  const result = await db
    .selectDistinct({
      month: sql<string>`TO_CHAR(${expenses.date}, 'YYYY-MM')`,
    })
    .from(expenses)
    .orderBy(sql`TO_CHAR(${expenses.date}, 'YYYY-MM') ASC`);

  return result.map((r) => r.month);
}

// ── Leads management query helpers ───────────────────────────────────────────

export type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  serviceInterest: string | null;
  status: string;
  divisionId: string | null;
  divisionName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

/**
 * Returns all lead rows LEFT JOINed to divisions,
 * with optional filters for status, divisionId, and source,
 * sorted by createdAt DESC.
 */
export async function getAllLeads(filters?: {
  status?: string;
  divisionId?: string;
  source?: string;
}): Promise<LeadRow[]> {
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as 'new' | 'contacted' | 'converted' | 'lost'));
  }
  if (filters?.divisionId) {
    conditions.push(eq(leads.divisionId, filters.divisionId));
  }
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source));
  }

  const query = db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      message: leads.message,
      source: leads.source,
      serviceInterest: leads.serviceInterest,
      status: leads.status,
      divisionId: leads.divisionId,
      divisionName: divisions.name,
      notes: leads.notes,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(divisions, eq(leads.divisionId, divisions.id))
    .orderBy(desc(leads.createdAt));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

/**
 * Returns a single lead row by id (LEFT JOINed to divisions),
 * or null if no row with that id exists.
 */
export async function getLeadById(id: string): Promise<LeadRow | null> {
  const result = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      message: leads.message,
      source: leads.source,
      serviceInterest: leads.serviceInterest,
      status: leads.status,
      divisionId: leads.divisionId,
      divisionName: divisions.name,
      notes: leads.notes,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(divisions, eq(leads.divisionId, divisions.id))
    .where(eq(leads.id, id));

  return result[0] ?? null;
}

/**
 * Returns lead counts grouped by status in a single round-trip using
 * conditional aggregation (CASE WHEN).
 */
export async function getLeadCountsByStatus(): Promise<{
  all: number;
  new: number;
  contacted: number;
  converted: number;
  lost: number;
}> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)                                              AS all,
      COUNT(*) FILTER (WHERE status = 'new')               AS new,
      COUNT(*) FILTER (WHERE status = 'contacted')         AS contacted,
      COUNT(*) FILTER (WHERE status = 'converted')         AS converted,
      COUNT(*) FILTER (WHERE status = 'lost')              AS lost
    FROM leads
  `);
  const row = result.rows[0] as {
    all: string;
    new: string;
    contacted: string;
    converted: string;
    lost: string;
  };
  return {
    all: Number(row.all),
    new: Number(row.new),
    contacted: Number(row.contacted),
    converted: Number(row.converted),
    lost: Number(row.lost),
  };
}

/**
 * Returns distinct non-null source strings from the leads table,
 * sorted alphabetically ascending.
 */
export async function getDistinctLeadSources(): Promise<string[]> {
  const result = await db
    .selectDistinct({ source: leads.source })
    .from(leads)
    .where(sql`${leads.source} IS NOT NULL`)
    .orderBy(asc(leads.source));

  return result.map((r) => r.source as string);
}

// ── Snapshot query helpers ────────────────────────────────────────────────────

export type SnapshotRow = {
  id: string;
  period: string;
  revenue: string;
  expenses: string;
  pmgShare: string;
  profitPool: string;
  salary: string;
  reinvest: string;
  reserve: string;
  flex: string;
  createdAt: Date;
};

/**
 * Returns all snapshot rows ordered by period descending.
 */
export async function getAllSnapshots(): Promise<SnapshotRow[]> {
  return db.select().from(snapshots).orderBy(desc(snapshots.period));
}

/**
 * Returns the snapshot for the given period, or null if none exists.
 */
export async function getSnapshotByPeriod(period: string): Promise<SnapshotRow | null> {
  const result = await db.select().from(snapshots).where(eq(snapshots.period, period));

  return result[0] ?? null;
}

/**
 * Inserts a new snapshot row and returns the inserted row.
 */
export async function insertSnapshot(period: string, summary: PeriodSummary): Promise<SnapshotRow> {
  const rows = await db
    .insert(snapshots)
    .values({
      period,
      revenue: String(summary.revenue),
      expenses: String(summary.expenses),
      pmgShare: String(summary.pmgShare),
      profitPool: String(summary.profitPool),
      salary: String(summary.salary),
      reinvest: String(summary.reinvest),
      reserve: String(summary.reserve),
      flex: String(summary.flex),
    })
    .returning();
  return rows[0]!;
}

// ── Reporting & Insights query helpers ───────────────────────────────────────

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

// ── Expense category query helpers ────────────────────────────────────────────

/**
 * Returns all expense categories ordered by name ascending.
 */
export async function getAllExpenseCategories(): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .orderBy(asc(expenseCategories.name));
}

/**
 * Returns a single expense category by primary key, or null if not found.
 */
export async function getExpenseCategoryById(id: string): Promise<ExpenseCategory | null> {
  const result = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));

  return result[0] ?? null;
}

// ── Ledger History ────────────────────────────────────────────────────────────

export type LedgerEntryRow = {
  id: string;
  date: string;
  amount: string;
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex';
  entryType: 'spend' | 'transfer' | 'adjustment';
  description: string | null;
  createdAt: Date | null;
  createdBy: string | null;
};

export async function getAllLedgerEntries(
  filters?: { allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex'; entryType?: 'spend' | 'transfer' | 'adjustment' },
  pageObj?: { page: number; pageSize: number }
): Promise<{ data: LedgerEntryRow[]; total: number; sum: number }> {
  const conditions = [];
  if (filters?.allocationType) conditions.push(eq(ledger.allocationType, filters.allocationType));
  if (filters?.entryType) conditions.push(eq(ledger.entryType, filters.entryType));

  let query = db
    .select({
      id: ledger.id,
      date: sql<string>`${ledger.date}::text`,
      amount: ledger.amount,
      allocationType: ledger.allocationType,
      entryType: ledger.entryType,
      description: ledger.description,
      createdAt: ledger.createdAt,
      createdBy: ledger.createdBy,
    })
    .from(ledger)
    .orderBy(desc(ledger.date), desc(ledger.createdAt)) as any;

  if (conditions.length > 0) query = query.where(and(...conditions));

  const countQuery = db
    .select({
      count: sql<number>`count(*)::int`,
      sum: sql<number>`COALESCE(SUM(${ledger.amount}), 0)::numeric`,
    })
    .from(ledger);
  if (conditions.length > 0) countQuery.where(and(...conditions));

  const [totalRes] = await countQuery;
  const total = totalRes?.count ?? 0;
  const sumAmount = Number(totalRes?.sum ?? 0);

  if (pageObj) {
    query = query.limit(pageObj.pageSize).offset((pageObj.page - 1) * pageObj.pageSize);
  }

  const data = await query;
  return { data, total, sum: sumAmount };
}

export async function getLedgerById(id: string): Promise<LedgerEntryRow | null> {
  const result = await db
    .select({
      id: ledger.id,
      date: sql<string>`${ledger.date}::text`,
      amount: ledger.amount,
      allocationType: ledger.allocationType,
      entryType: ledger.entryType,
      description: ledger.description,
      createdAt: ledger.createdAt,
      createdBy: ledger.createdBy,
    })
    .from(ledger)
    .where(eq(ledger.id, id));

  return result[0] ?? null;
}

export async function insertLedgerEntry(data: {
  amount: number;
  date: string;
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex';
  entryType: 'spend' | 'transfer' | 'adjustment';
  description?: string;
  createdBy?: string;
}): Promise<LedgerEntryRow> {
  const result = await db
    .insert(ledger)
    .values({
      amount: String(data.amount),
      date: data.date,
      allocationType: data.allocationType,
      entryType: data.entryType,
      description: data.description ?? null,
      createdBy: data.createdBy ?? null,
    })
    .returning();
  const row = result[0]!;
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    allocationType: row.allocationType,
    entryType: row.entryType, // No need for casting, inferred correctly
    description: row.description,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export async function updateLedgerEntry(id: string, data: Partial<{
  amount: number;
  date: string;
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex';
  entryType: 'spend' | 'transfer' | 'adjustment';
  description?: string;
}>): Promise<void> {
  const updates: Record<string, any> = {};
  if (data.amount !== undefined) updates.amount = String(data.amount);
  if (data.date !== undefined) updates.date = data.date;
  if (data.allocationType !== undefined) updates.allocationType = data.allocationType;
  if (data.entryType !== undefined) updates.entryType = data.entryType;
  if (data.description !== undefined) updates.description = data.description;
  
  await db.update(ledger).set(updates).where(eq(ledger.id, id));
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  await db.delete(ledger).where(eq(ledger.id, id));
}
