import { db } from '../client';
import { snapshots } from '../schema/index';
import type { PeriodSummary } from './general';
import { eq, desc } from 'drizzle-orm';

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
