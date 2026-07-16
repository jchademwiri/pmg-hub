import { db } from '../client';
import { expenses, divisions, clients, expenseCategories } from '../schema/index';
import { ExpenseCategory } from '../schema/expense-categories';
import { sql, eq, desc, asc, and } from 'drizzle-orm';

export type ExpenseRow = {
  id: string;
  date: string; // ISO date string e.g. "2026-03-15"
  divisionId: string;
  divisionName: string;
  clientId: string | null;
  clientName: string | null;
  category: string;
  description: string | null;
  amount: string; // numeric from DB - caller converts with Number()
  createdAt: Date;
  updatedAt: Date | null;
};

/**
 * Returns all expense rows joined to divisions (INNER),
 * with optional filters for divisionId, category, and month (YYYY-MM),
 * sorted by date DESC.
 */
export async function getAllExpenses(
  filters?: { divisionId?: string; category?: string; month?: string; year?: number },
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
  if (filters?.year) {
    conditions.push(
      sql`${expenses.date} >= ${`${filters.year}-03-01`}`,
      sql`${expenses.date} < ${`${filters.year + 1}-03-01`}`
    );
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

export type MonthlyExpenseSummary = {
  month: string;
  count: number;
  totalExpenses: number;
  totalCategorized: number;
  totalUncategorized: number;
};

/**
 * Returns a monthly summary of expenses for a given financial year.
 * Aggregates count, total spent, categorized, and uncategorized sums.
 */
export async function getExpenseMonthlySummaries(
  year: number,
  divisionId?: string,
  category?: string
): Promise<MonthlyExpenseSummary[]> {
  const conditions = [
    sql`${expenses.date} >= ${`${year}-03-01`}`,
    sql`${expenses.date} < ${`${year + 1}-03-01`}`
  ];

  if (divisionId) conditions.push(eq(expenses.divisionId, divisionId));
  if (category) conditions.push(eq(expenses.category, category));

  const result = await db
    .select({
      month: sql<string>`TO_CHAR(${expenses.date}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
      totalExpenses: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::numeric`,
      totalCategorized: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.category} != 'Uncategorized' THEN ${expenses.amount} ELSE 0 END), 0)::numeric`,
      totalUncategorized: sql<number>`COALESCE(SUM(CASE WHEN ${expenses.category} = 'Uncategorized' THEN ${expenses.amount} ELSE 0 END), 0)::numeric`,
    })
    .from(expenses)
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(${expenses.date}, 'YYYY-MM')`)
    .orderBy(desc(sql`TO_CHAR(${expenses.date}, 'YYYY-MM')`));

  return result.map(r => ({
    month: r.month,
    count: r.count,
    totalExpenses: Number(r.totalExpenses),
    totalCategorized: Number(r.totalCategorized),
    totalUncategorized: Number(r.totalUncategorized),
  }));
}
