import type { Metadata } from 'next';
import {
  getTrialBalance,
  getBalanceSheet,
  getProfitAndLoss,
  getJournalEntries,
  getAllAccountingPeriods,
  getCurrentOpenPeriod,
  getAccountingOverview,
  getUnpostedInvoicesReconciliation,
  getUnpostedPaymentsReconciliation,
  getUnpostedExpensesReconciliation,
} from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { AccountingOverviewClient } from './accounting-overview-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Accounting' };

export default async function AccountingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = params?.period;

  const [
    trialBalance,
    balanceSheet,
    profitAndLoss,
    recentJournals,
    allPeriods,
    currentPeriod,
    overview,
    unpostedInvoices,
    unpostedPayments,
    unpostedExpenses,
  ] = await Promise.all([
    getTrialBalance(period),
    getBalanceSheet(period),
    getProfitAndLoss(period),
    getJournalEntries({ page: 1, pageSize: 5, period: period || undefined }),
    getAllAccountingPeriods(),
    getCurrentOpenPeriod(),
    getAccountingOverview(),
    getUnpostedInvoicesReconciliation(),
    getUnpostedPaymentsReconciliation(),
    getUnpostedExpensesReconciliation(),
  ]);

  const unpostedExpensesTotal = unpostedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const periodList = allPeriods.map((p) => p.period);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal
        value={`Net ${formatZAR(profitAndLoss.netProfit)}`}
        variant={profitAndLoss.netProfit >= 0 ? 'green' : 'red'}
      />

      <div>
        <h2 className="text-lg font-semibold">Accounting Overview</h2>
        <p className="text-sm text-muted-foreground">
          Double-entry general ledger, balance sheet integrity, trial balance health, and period
          governance.
        </p>
      </div>

      <AccountingOverviewClient
        periods={periodList}
        selectedPeriod={period || ''}
        currentPeriod={
          currentPeriod ? { period: currentPeriod.period, status: currentPeriod.status } : null
        }
        overview={overview}
        trialBalance={trialBalance}
        balanceSheet={balanceSheet}
        profitAndLoss={profitAndLoss}
        unpostedInvoicesCount={unpostedInvoices.length}
        unpostedPaymentsCount={unpostedPayments.length}
        unpostedExpensesCount={unpostedExpenses.length}
        unpostedExpensesTotal={unpostedExpensesTotal}
        recentJournals={recentJournals.data.map((j) => ({
          id: j.id,
          entryNumber: j.entryNumber,
          entryDate: j.entryDate,
          description: j.description,
          status: j.status,
          sourceModule: j.sourceModule,
          period: j.period,
        }))}
      />
    </div>
  );
}
