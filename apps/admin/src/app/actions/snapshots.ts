'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  getSnapshotByPeriod,
  getFinancialSummaryForPeriod,
  insertSnapshot,
  getUncategorizedExpensesCount,
  getDraftInvoicesCount,
  getPeriodTotals,
  closePeriod,
  getTrialBalance,
} from '@pmg/db';
import { getSASTParts } from '@/lib/format';
import { getSessionOrRedirect } from '@/lib/auth';

const periodSchema = z.string().regex(/^\d{4}-\d{2}$/);

export async function getPeriodSummary(period: string): Promise<
  | {
      revenue: number;
      expenses: number;
      pmgShare: number;
      profitPool: number;
    }
  | { error: string }
> {
  const parsed = periodSchema.safeParse(period);
  if (!parsed.success) return { error: 'Period must be YYYY-MM' };
  try {
    const startExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01')";
    const endExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01') + INTERVAL '1 month'";
    return await getFinancialSummaryForPeriod(startExpr, endExpr);
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function runPreCloseChecks(period: string): Promise<{
  uncategorizedExpenses: number;
  draftInvoices: number;
  incomeTotal: number;
  expenseTotal: number;
}> {
  const [uncategorizedExpenses, draftInvoices, totals] = await Promise.all([
    getUncategorizedExpensesCount(period),
    getDraftInvoicesCount(parseInt(period.split('-')[0], 10)),
    getPeriodTotals(period),
  ]);
  return {
    uncategorizedExpenses,
    draftInvoices,
    incomeTotal: totals.income,
    expenseTotal: totals.expenses,
  };
}

export async function closeMonth(
  period: string,
  opts?: { notes?: string },
): Promise<{} | { error: string }> {
  const parsed = periodSchema.safeParse(period);
  if (!parsed.success) {
    return { error: 'Period must be YYYY-MM' };
  }

  const existing = await getSnapshotByPeriod(period);
  if (existing !== null) {
    return { error: 'Month already closed' };
  }

  try {
    const session = await getSessionOrRedirect();
    const startExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01')";
    const endExpr = "DATE_TRUNC('month', TIMESTAMP '" + period + "-01') + INTERVAL '1 month'";
    const summary = await getFinancialSummaryForPeriod(startExpr, endExpr);
    await insertSnapshot(period, summary, { createdBy: session.user.id, notes: opts?.notes });
    await closePeriod(period, session.user.id);
    revalidatePath('/dashboard');
    revalidatePath('/insights/snapshots');
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

const ACCOUNTS_RECEIVABLE_CODE = '1100';

/**
 * Invoiced/paid for the month (from that month's AR account movement) and the
 * true outstanding AR balance as of month-end (cumulative since inception,
 * via getTrialBalance with only an end date — no lower bound).
 */
export async function getSnapshotArSummary(
  period: string,
): Promise<{ invoiced: number; paid: number; arBalance: number } | { error: string }> {
  const parsed = periodSchema.safeParse(period);
  if (!parsed.success) return { error: 'Period must be YYYY-MM' };

  const [year, month] = period.split('-').map(Number);
  const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  try {
    const [monthRows, cumulativeRows] = await Promise.all([
      getTrialBalance(period),
      getTrialBalance(undefined, undefined, undefined, monthEnd),
    ]);
    const monthAr = monthRows.find((row) => row.accountCode === ACCOUNTS_RECEIVABLE_CODE);
    const cumulativeAr = cumulativeRows.find((row) => row.accountCode === ACCOUNTS_RECEIVABLE_CODE);
    return {
      invoiced: monthAr?.totalDebits ?? 0,
      paid: monthAr?.totalCredits ?? 0,
      arBalance: cumulativeAr?.balance ?? 0,
    };
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
    await insertSnapshot(period, summary, { createdBy: 'system' });
    await closePeriod(period, 'system');
    revalidatePath('/dashboard');
    revalidatePath('/insights/snapshots');
  } catch {
    // Silent - auto-close failure should not break the dashboard
  }
}
