import type { Metadata } from 'next';
import {
  getTotalRevenue,
  getTotalExpenses,
  getRevenueByDivision,
  getAllIncome,
  getAllExpenses,
  getAllInvoices,
  getActiveRates,
  getTrialBalance,
  getActiveChartAccounts,
  getCurrentOpenPeriod,
  getAllAccountingPeriods,
  getProfitAndLoss,
} from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { FinanceOverviewClient } from './finance-overview-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Finance' };

export default async function FinanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = params?.period;

  const [
    revenue,
    expenses,
    rates,
    revenueByDivision,
    incomeData,
    expenseData,
    invoiceData,
    trialBalance,
    allAccounts,
    currentPeriod,
    allPeriods,
    profitAndLoss,
  ] = await Promise.all([
    getTotalRevenue(),
    getTotalExpenses(),
    getActiveRates(),
    getRevenueByDivision(),
    getAllIncome({}, { page: 1, pageSize: 5 }),
    getAllExpenses({}, { page: 1, pageSize: 5 }),
    getAllInvoices({}, { page: 1, pageSize: 5 }),
    getTrialBalance(period),
    getActiveChartAccounts(),
    getCurrentOpenPeriod(),
    getAllAccountingPeriods(),
    getProfitAndLoss(period),
  ]);

  const actualProfit = revenue - expenses;
  const pmgShare = Math.max(0, actualProfit) * rates.pmg_share;
  const profitPool = actualProfit;

  const chequeBalance = trialBalance.find((r) => r.accountCode === '1010')?.balance ?? 0;
  const savingsBalance = trialBalance.find((r) => r.accountCode === '1020')?.balance ?? 0;
  const accountsReceivableBalance =
    trialBalance.find((r) => r.accountCode === '1100')?.balance ?? 0;

  const liquidAccounts = allAccounts
    .filter((a) => a.type === 'asset')
    .map((a) => ({ id: a.id, code: a.code, name: a.name }));

  const periodList = allPeriods.map((p) => p.period);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal
        value={`Net ${formatZAR(profitAndLoss.netProfit)}`}
        variant={profitAndLoss.netProfit >= 0 ? 'green' : 'red'}
      />

      <div>
        <h2 className="text-lg font-semibold">Finance & Accounting Overview</h2>
        <p className="text-sm text-muted-foreground">
          Cash liquidity, operational spend, P&amp;L performance, and double-entry ledger health.
        </p>
      </div>

      <FinanceOverviewClient
        periods={periodList}
        selectedPeriod={period || ''}
        currentPeriod={
          currentPeriod ? { period: currentPeriod.period, status: currentPeriod.status } : null
        }
        summary={{ revenue, expenses, pmgShare, profitPool }}
        liquidBalances={{ cheque: chequeBalance, savings: savingsBalance }}
        liquidAccounts={liquidAccounts}
        accountsReceivableBalance={accountsReceivableBalance}
        trialBalance={trialBalance}
        profitAndLoss={profitAndLoss}
        revenueByDivision={revenueByDivision}
        recentInvoices={invoiceData.data.map((inv) => ({
          id: inv.id,
          documentNumber: inv.documentNumber,
          clientName: inv.clientName,
          divisionName: inv.divisionName,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          status: inv.status,
          total: Number(inv.total),
        }))}
        recentIncome={incomeData.data.map((r) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          amount: Number(r.amount),
          divisionName: r.divisionName,
        }))}
        recentExpenses={expenseData.data.map((r) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          amount: Number(r.amount),
          category: r.category,
        }))}
      />
    </div>
  );
}
