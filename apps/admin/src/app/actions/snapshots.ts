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
