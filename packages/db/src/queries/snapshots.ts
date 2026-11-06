import { db } from '../client';
import { snapshots } from '../schema/index';
import { getFinancialSummaryForPeriod, type PeriodSummary } from './general';
import { eq, desc, sql } from 'drizzle-orm';

export type SnapshotRow = {
  id: string;
  period: string;
  revenue: string;
  invoicedRevenue?: string;
  income?: string;
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
  const rows = await db.select().from(snapshots).orderBy(desc(snapshots.period));
  const invoicedResult = await db.execute(sql`
    SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') AS period, COALESCE(SUM(total), 0) AS invoiced
    FROM invoices
    WHERE status IN ('issued', 'partially_paid', 'paid', 'overdue', 'written_off')
    GROUP BY TO_CHAR(invoice_date::date, 'YYYY-MM')
  `);
  const invoicedMap = new Map(
    (invoicedResult.rows as { period: string; invoiced: string }[]).map((r) => [
      r.period,
      String(r.invoiced),
    ]),
  );
  return rows.map((row) => ({
    ...row,
    invoicedRevenue: invoicedMap.get(row.period) ?? '0.00',
    income: row.revenue,
  }));
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

  // Determine fiscal year start period (March of current fiscal year)
  const cYr = sastDate.getFullYear();
  const cMo = sastDate.getMonth() + 1;
  const fyStartYear = cMo < 3 ? cYr - 1 : cYr;
  const fyStartPeriod = `${fyStartYear}-03`;

  // Start from either fyStartPeriod or the earliest closed snapshot (whichever is earlier)
  let earliestPeriod = fyStartPeriod;
  if (closedSnapshots.length > 0) {
    const oldestClosed = closedSnapshots[closedSnapshots.length - 1]!.period;
    if (oldestClosed < earliestPeriod) {
      earliestPeriod = oldestClosed;
    }
  }

  // Iterate month by month from earliestPeriod to currentPeriod
  let [y, m] = earliestPeriod.split('-').map(Number);
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

  const invoicedResult = await db.execute(sql`
    SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') AS period, COALESCE(SUM(total), 0) AS invoiced
    FROM invoices
    WHERE status IN ('issued', 'partially_paid', 'paid', 'overdue', 'written_off')
    GROUP BY TO_CHAR(invoice_date::date, 'YYYY-MM')
  `);
  const invoicedMap = new Map(
    (invoicedResult.rows as { period: string; invoiced: string }[]).map((r) => [
      r.period,
      String(r.invoiced),
    ]),
  );

  const all = [...openRows, ...closedSnapshots];
  all.sort((a, b) => b.period.localeCompare(a.period));
  return all.map((row) => ({
    ...row,
    invoicedRevenue: invoicedMap.get(row.period) ?? '0.00',
    income: row.revenue,
  }));
}

/**
 * Returns the snapshot for the given period, or null if none exists.
 */
export async function getSnapshotByPeriod(period: string): Promise<SnapshotRow | null> {
  const result = await db.select().from(snapshots).where(eq(snapshots.period, period));
  if (!result[0]) return null;
  const row = result[0];
  const invoicedRes = await db.execute(sql`
    SELECT COALESCE(SUM(total), 0) AS invoiced
    FROM invoices
    WHERE TO_CHAR(invoice_date::date, 'YYYY-MM') = ${period}
      AND status IN ('issued', 'partially_paid', 'paid', 'overdue', 'written_off')
  `);
  const invoiced = String((invoicedRes.rows[0] as any)?.invoiced ?? '0.00');
  return {
    ...row,
    invoicedRevenue: invoiced,
    income: row.revenue,
  };
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
