'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSnapshotByPeriod, getFinancialSummaryForPeriod, insertSnapshot } from '@pmg/db';
import { getSASTParts } from '@/lib/format';

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
    revalidatePath('/insights/snapshots');
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function autoClosePreviousMonthIfNeeded(): Promise<void> {
  const { year, month, day } = getSASTParts();
  if (day < 5) return;

  const prev = new Date(year, month - 1, 1);
  const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

  const existing = await getSnapshotByPeriod(period);
  if (existing !== null) return;

  try {
    const startExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01')";
    const endExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01') + INTERVAL '1 month'";
    const summary = await getFinancialSummaryForPeriod(startExpr, endExpr);
    if (summary.revenue === 0 && summary.expenses === 0) return;
    await insertSnapshot(period, summary);
    revalidatePath('/dashboard');
    revalidatePath('/insights/snapshots');
  } catch {
    // Silent - auto-close failure should not break the dashboard
  }
}
