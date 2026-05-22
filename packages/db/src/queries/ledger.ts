import { db } from '../client';
import { ledger } from '../schema/index';
import { sql, eq, desc, and } from 'drizzle-orm';

export type LedgerEntryRow = {
  id: string;
  date: string;
  amount: string;
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share';
  entryType: 'spend' | 'transfer' | 'adjustment';
  description: string | null;
  createdAt: Date | null;
  createdBy: string | null;
};

export async function getLedgerEntriesCurrentMonth(allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'): Promise<{
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

export async function getLedgerTotalByAllocation(allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${ledger.amount}), '0')` })
    .from(ledger)
    .where(eq(ledger.allocationType, allocationType));
  return Number(result[0]?.total ?? 0);
}

export async function getLedgerEntriesPreviousMonth(allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'): Promise<{
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

export async function getLedgerEntriesYTD(allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'): Promise<{
  total: number;
  entries: { date: string; description: string | null; amount: number }[];
}> {
  const conditions = [sql`${ledger.date} >= DATE_TRUNC('year', NOW() - INTERVAL '2 months') + INTERVAL '2 months'`];
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
    .where(sql`${ledger.date} >= DATE_TRUNC('year', NOW() - INTERVAL '2 months') + INTERVAL '2 months'`)
    .groupBy(ledger.allocationType);
    
  const map: Record<string, number> = {};
  for (const row of result) map[row.allocationType] = Number(row.total);
  return map;
}

export async function getAllLedgerEntries(
  filters?: { allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'; entryType?: 'spend' | 'transfer' | 'adjustment' },
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
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share';
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
    entryType: row.entryType,
    description: row.description,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export async function updateLedgerEntry(id: string, data: Partial<{
  amount: number;
  date: string;
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share';
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

export async function getLedgerByAllocation(allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share') {
  return await db.select().from(ledger).where(eq(ledger.allocationType, allocationType)).orderBy(desc(ledger.date));
}
