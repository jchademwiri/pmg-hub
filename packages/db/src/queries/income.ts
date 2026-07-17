import { db } from '../client';
import { income, divisions, clients, paymentAllocations, invoices } from '../schema/index';
import { sql, eq, desc, and } from 'drizzle-orm';
import { getMonthPeriodDates } from './billing';

export type IncomeRow = {
  id: string;
  date: string;
  divisionId: string;
  divisionName: string;
  clientId: string | null;
  clientName: string | null;
  description: string | null;
  amount: string; // numeric from DB - caller converts with Number()
};

/**
 * Returns all income rows joined to divisions (INNER) and clients (LEFT),
 * with optional filters for divisionId and month (YYYY-MM), sorted by date DESC.
 */
export async function getAllIncome(
  filters?: {
    divisionId?: string;
    month?: string;
    year?: number;
    clientId?: string;
    monthPeriod?: 'current' | 'previous' | 'past3' | 'past6';
  },
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
  if (filters?.year) {
    conditions.push(
      sql`${income.date} >= ${`${filters.year}-03-01`}`,
      sql`${income.date} < ${`${filters.year + 1}-03-01`}`
    );
  }
  if (filters?.monthPeriod) {
    const { startDate, endDate } = getMonthPeriodDates(filters.monthPeriod);
    conditions.push(
      sql`${income.date} >= ${startDate}`,
      sql`${income.date} <= ${endDate}`
    );
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
 * Returns a monthly summary of income and its allocations.
 */
export type MonthlyIncomeSummary = {
  month: string;
  count: number;
  totalReceived: number;
  totalAllocated: number;
};

export async function getIncomeMonthlySummaries(
  year: number,
  divisionId?: string,
  clientId?: string
): Promise<MonthlyIncomeSummary[]> {
  const conditions = [];

  const start = `${year}-03-01`;
  const end = `${year + 1}-03-01`;
  conditions.push(sql`${income.date} >= ${start} AND ${income.date} < ${end}`);

  if (divisionId) {
    conditions.push(eq(income.divisionId, divisionId));
  }
  
  if (clientId) {
    conditions.push(eq(income.clientId, clientId));
  }

  // 1. Get income sums
  const incomeQuery = db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
      totalReceived: sql<number>`COALESCE(SUM(${income.amount}), 0)::numeric`,
    })
    .from(income)
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`);

  // 2. Get allocation sums
  const allocQuery = db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      totalAllocated: sql<number>`COALESCE(SUM(${paymentAllocations.amount}), 0)::numeric`,
    })
    .from(paymentAllocations)
    .innerJoin(income, eq(paymentAllocations.incomeId, income.id))
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`);

  const [incomeResults, allocResults] = await Promise.all([incomeQuery, allocQuery]);

  const allocMap = new Map(allocResults.map(r => [r.month, Number(r.totalAllocated)]));

  return incomeResults.map((r) => ({
    month: r.month,
    count: Number(r.count),
    totalReceived: Number(r.totalReceived),
    totalAllocated: allocMap.get(r.month) || 0,
  }));
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
 * Returns all payment allocations for a given income/payment entry.
 */
export async function getIncomeAllocations(incomeId: string): Promise<{
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: string;
  createdAt: Date;
}[]> {
  return await db
    .select({
      id: paymentAllocations.id,
      invoiceId: paymentAllocations.invoiceId,
      invoiceNumber: invoices.documentNumber,
      amount: paymentAllocations.amount,
      createdAt: paymentAllocations.createdAt,
    })
    .from(paymentAllocations)
    .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
    .where(eq(paymentAllocations.incomeId, incomeId));
}
