import { db } from '../client';
import { snapshots } from '../schema/index';
import { getFinancialSummaryForPeriod, type PeriodSummary } from './general';
import { eq, desc } from 'drizzle-orm';

export type SnapshotRow = {
  id: string;
  period: string;
  revenue: string;
  expenses: string;
  pmgShare: string;
  profitPool: string;
  createdBy: string | null;
  status: string;
  notes: string | null;
  closedAt: Date;
  createdAt: Date;
};

/**
 * Returns all snapshot rows ordered by period descending.
 */
export async function getAllSnapshots(): Promise<SnapshotRow[]> {
  return db.select().from(snapshots).orderBy(desc(snapshots.period));
}

/**
 * Returns all snapshot rows including any unclosed months up to and including
 * the current month (marked with status: 'open'), ordered by period descending.
 */
export async function getAllSnapshotsWithOpenMonths(): Promise<SnapshotRow[]> {
  const closedSnapshots = await db.select().from(snapshots).orderBy(desc(snapshots.period));

  const now = new Date();
  const sastDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const currentPeriod = `${sastDate.getFullYear()}-${String(sastDate.getMonth() + 1).padStart(2, '0')}`;

  const closedPeriods = new Set(closedSnapshots.map((s) => s.period));
  const openPeriods: string[] = [];

  if (closedSnapshots.length > 0) {
    const newestPeriod = closedSnapshots[0]!.period;
    let [y, m] = newestPeriod.split('-').map(Number);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    while (true) {
      const p = `${y}-${String(m).padStart(2, '0')}`;
      if (p > currentPeriod) break;
      if (!closedPeriods.has(p)) {
        openPeriods.push(p);
      }
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  } else {
    openPeriods.push(currentPeriod);
  }

  if (!closedPeriods.has(currentPeriod) && !openPeriods.includes(currentPeriod)) {
    openPeriods.push(currentPeriod);
  }

  const openRows: SnapshotRow[] = await Promise.all(
    openPeriods.map(async (period) => {
      const startExpr = `DATE_TRUNC('month', TIMESTAMP '${period}-01')`;
      const endExpr = `DATE_TRUNC('month', TIMESTAMP '${period}-01') + INTERVAL '1 month'`;
      const summary = await getFinancialSummaryForPeriod(startExpr, endExpr);
      return {
        id: `open-${period}`,
        period,
        revenue: String(summary.revenue),
        expenses: String(summary.expenses),
        pmgShare: String(summary.pmgShare),
        profitPool: String(summary.profitPool),
        createdBy: null,
        status: 'open',
        notes: null,
        closedAt: new Date(),
        createdAt: new Date(),
      };
    }),
  );

  const all = [...openRows, ...closedSnapshots];
  all.sort((a, b) => b.period.localeCompare(a.period));
  return all;
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
export async function insertSnapshot(
  period: string,
  summary: PeriodSummary,
  opts?: { createdBy?: string; notes?: string },
): Promise<SnapshotRow> {
  const rows = await db
    .insert(snapshots)
    .values({
      period,
      revenue: String(summary.revenue),
      expenses: String(summary.expenses),
      pmgShare: String(summary.pmgShare),
      profitPool: String(summary.profitPool),
      createdBy: opts?.createdBy ?? null,
      notes: opts?.notes ?? null,
    })
    .returning();
  return rows[0]!;
}

/**
 * Returns true if a snapshot already exists for the given period.
 */
export async function isPeriodLocked(period: string): Promise<boolean> {
  const result = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.period, period))
    .limit(1);
  return result.length > 0;
}
