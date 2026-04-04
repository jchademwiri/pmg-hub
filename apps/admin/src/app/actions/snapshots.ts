'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSnapshotByPeriod, getFinancialSummaryForPeriod, insertSnapshot } from '@pmg/db';

const periodSchema = z.string().regex(/^\d{4}-\d{2}$/);

export async function closeMonth(period: string): Promise<{} | { error: string }> {
  const parsed = periodSchema.safeParse(period);
  if (!parsed.success) {
    return { error: 'Period must be YYYY-MM' };
  }

  const existing = await getSnapshotByPeriod(period);
  if (existing !== null) {
    return { error: 'Month already closed' };
  }

  try {
    const startExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01')";
    const endExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01') + INTERVAL '1 month'";
    const summary = await getFinancialSummaryForPeriod(startExpr, endExpr);
    await insertSnapshot(period, summary);
    revalidatePath('/dashboard');
    revalidatePath('/snapshots');
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Auto-closes the previous month if today is the 5th or later and it hasn't been closed yet.
 * Called server-side on dashboard load.
 */
export async function autoClosePreviousMonthIfNeeded(): Promise<void> {
  const now = new Date();
  const day = now.getDate();
  // Only auto-close on day 5 or later
  if (day < 5) return;

  // Compute previous month period
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const period = prev.toISOString().slice(0, 7); // YYYY-MM

  const existing = await getSnapshotByPeriod(period);
  if (existing !== null) return; // already closed

  try {
    const startExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01')";
    const endExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01') + INTERVAL '1 month'";
    const summary = await getFinancialSummaryForPeriod(startExpr, endExpr);
    await insertSnapshot(period, summary);
    revalidatePath('/dashboard');
    revalidatePath('/snapshots');
  } catch {
    // Silent — auto-close failure should not break the dashboard
  }
}
