import { db } from "./client";
import { income, expenses, leads, divisions } from "./schema/index";
import { sql, eq, desc } from "drizzle-orm";

export async function getTotalRevenue(): Promise<number> {
  const result = await db
    .select({
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income);
  return Number(result[0].total);
}

export async function getTotalExpenses(): Promise<number> {
  const result = await db
    .select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`,
    })
    .from(expenses);
  return Number(result[0].total);
}

export async function getRevenueByDivision(): Promise<
  { divisionName: string; total: number }[]
> {
  const result = await db
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

export async function getExpensesByDivision(): Promise<
  { divisionName: string; total: number }[]
> {
  const result = await db
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

export async function getLeadsByStatus(): Promise<
  { status: string; count: number }[]
> {
  const result = await db
    .select({
      status: leads.status,
      count: sql<string>`COUNT(*)`,
    })
    .from(leads)
    .groupBy(leads.status)
    .orderBy(desc(sql`COUNT(*)`));
  return result.map((row) => ({ status: row.status, count: Number(row.count) }));
}
