'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatZAR, fmtMonthYear, fmtDate } from '@/lib/format';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  PieChart,
  ArrowUpRight,
  Building2,
  PiggyBank,
  ArrowRightLeft,
  BadgeCheck,
  BadgeAlert,
  FileText,
  BookMarked,
  LineChart,
  Scale,
  Folders,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CashTransferDialog } from '@/components/finance/cash-transfer-dialog';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import type { TrialBalanceRow, ProfitAndLossResult } from '@pmg/db';

interface FinanceOverviewClientProps {
  periods: string[];
  selectedPeriod: string;
  currentPeriod: { period: string; status: string } | null;
  summary: {
    revenue: number;
    expenses: number;
    pmgShare: number;
    profitPool: number;
  };
  liquidBalances?: {
    cheque: number;
    savings: number;
  };
  liquidAccounts?: Array<{ id: string; code: string; name: string }>;
  accountsReceivableBalance?: number;
  trialBalance: TrialBalanceRow[];
  profitAndLoss: ProfitAndLossResult;
  revenueByDivision: Array<{ divisionName: string; total: number }>;
  recentInvoices: Array<{
    id: string;
    documentNumber: string;
    clientName: string | null;
    divisionName: string;
    invoiceDate: string;
    dueDate: string | null;
    status: string;
    total: number;
  }>;
  recentIncome: Array<{
    id: string;
    date: string;
    description: string | null;
    amount: number;
    divisionName: string;
  }>;
  recentExpenses: Array<{
    id: string;
    date: string;
    description: string | null;
    amount: number;
    category: string;
  }>;
}

export function FinanceOverviewClient({
  periods,
  selectedPeriod,
  currentPeriod,
  summary,
  liquidBalances = { cheque: 0, savings: 0 },
  liquidAccounts = [],
  accountsReceivableBalance = 0,
  trialBalance,
  profitAndLoss,
  revenueByDivision,
  recentInvoices,
  recentIncome,
  recentExpenses,
}: FinanceOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transferOpen, setTransferOpen] = React.useState(false);

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('period');
    } else {
      params.set('period', value);
    }
    router.push(`/finance?${params.toString()}`, { scroll: false });
  }

  const isProfitable = profitAndLoss.netProfit >= 0;
  const trialTotalDebits = trialBalance.reduce((s, r) => s + r.totalDebits, 0);
  const trialTotalCredits = trialBalance.reduce((s, r) => s + r.totalCredits, 0);
  const isBalanced = Math.abs(trialTotalDebits - trialTotalCredits) < 0.01;

  const accountsReceivableLabel =
    accountsReceivableBalance > 0.01
      ? 'owed by clients'
      : accountsReceivableBalance < -0.01
        ? 'credit balance'
        : 'no open AR';

  const totalLiquidCash = liquidBalances.cheque + liquidBalances.savings;
  const pendingTransfer = Math.max(0, summary.pmgShare - liquidBalances.savings);

  return (
    <div className="flex flex-col gap-6">
      <CashTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={liquidAccounts}
        suggestedAmount={pendingTransfer}
      />

      {/* Period Selector & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Period
          </span>
          <Select value={selectedPeriod || 'all'} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {fmtMonthYear(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/accounting/periods"
            className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                currentPeriod?.status === 'open' ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
            {currentPeriod
              ? `${fmtMonthYear(currentPeriod.period)} — ${currentPeriod.status}`
              : 'No open period'}
          </Link>
          <Button
            size="sm"
            onClick={() => setTransferOpen(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shrink-0"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Transfer Funds
          </Button>
        </div>
      </div>

      {/* Banking & Liquid Cashflow Row */}
      <div className="rounded-xl border bg-gradient-to-r from-card via-card to-blue-500/5 p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Liquid Cash &amp; Banking Reserves
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time liquid bank balances across operational cheque and reserve savings accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1010 · Cheque Account</span>
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1.5 tabular-nums text-foreground">
              {formatZAR(liquidBalances.cheque)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Operational liquidity in bank
            </p>
          </div>

          <div className="rounded-lg border bg-card p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1020 · Savings Account</span>
              <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-bold mt-1.5 tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatZAR(liquidBalances.savings)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Physical cash in savings
              {pendingTransfer > 0 && (
                <span className="block text-[10px] text-amber-500 font-medium mt-0.5">
                  ({formatZAR(pendingTransfer)} pending transfer from Cheque)
                </span>
              )}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-3.5 bg-primary/5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Liquid Cash</span>
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xl font-bold mt-1.5 tabular-nums text-primary">
              {formatZAR(totalLiquidCash)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Combined physical bank cash</p>
          </div>
        </div>
      </div>

      {/* Core Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Net Profit / Loss */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {isProfitable ? 'Net Profit' : 'Net Loss'}
            </p>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isProfitable ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}
            >
              {isProfitable ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              isProfitable ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatZAR(profitAndLoss.netProfit)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Accrual P&amp;L</p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Revenue
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600">
            {formatZAR(profitAndLoss.totalRevenue || summary.revenue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Recognized income</p>
        </div>

        {/* Total Expenses */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Expenses
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Receipt className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-red-600">
            {formatZAR(profitAndLoss.totalExpenses || summary.expenses)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total operating costs</p>
        </div>

        {/* Accounts Receivable */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Accounts Receivable
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-blue-600">
            {formatZAR(Math.abs(accountsReceivableBalance))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">1100 · {accountsReceivableLabel}</p>
        </div>

        {/* PMG Share */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              PMG Share (25%)
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <PieChart className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-purple-600">
            {formatZAR(summary.pmgShare)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">25% profit allocation</p>
        </div>
      </div>

      {/* Trial Balance Health Banner */}
      <div
        className={`rounded-xl border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 ${
          isBalanced ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
        }`}
      >
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <BadgeAlert className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {isBalanced ? 'Trial Balance is in balance' : 'Trial Balance does not balance'}
            </p>
            <p className="text-xs text-muted-foreground">
              Total Debits {formatZAR(trialTotalDebits)} · Total Credits{' '}
              {formatZAR(trialTotalCredits)}
            </p>
          </div>
        </div>

        <Link
          href={`/accounting/trial-balance${selectedPeriod ? `?period=${selectedPeriod}` : ''}`}
          className="text-xs font-medium text-foreground hover:underline flex items-center gap-1"
        >
          View Trial Balance <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Two-Column Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: P&L Statement & Division Revenue */}
        <div className="flex flex-col gap-6">
          {/* Mini P&L Statement */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <LineChart className="h-4 w-4 text-emerald-600" />
                Profit &amp; Loss Summary
              </h3>
              <Link
                href={`/accounting/profit-and-loss${selectedPeriod ? `?period=${selectedPeriod}` : ''}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Full report <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {profitAndLoss.revenue.length === 0 && profitAndLoss.expenses.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No financial data for the selected period.
              </div>
            ) : (
              <div className="divide-y">
                {/* Revenue lines */}
                {profitAndLoss.revenue.slice(0, 3).map((r) => (
                  <div
                    key={r.accountId}
                    className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.accountCode}
                      </span>
                      <span className="text-sm truncate">{r.accountName}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-emerald-600">
                      {formatZAR(r.amount)}
                    </span>
                  </div>
                ))}

                {/* Separator */}
                <div className="border-t-2 border-dashed" />

                {/* Expense lines */}
                {profitAndLoss.expenses.slice(0, 3).map((e) => (
                  <div
                    key={e.accountId}
                    className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground">
                        {e.accountCode}
                      </span>
                      <span className="text-sm truncate">{e.accountName}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-red-600">
                      {formatZAR(e.amount)}
                    </span>
                  </div>
                ))}

                {/* Net result */}
                <div
                  className={`px-5 py-3 flex items-center justify-between ${
                    isProfitable ? 'bg-emerald-500/5' : 'bg-red-500/5'
                  }`}
                >
                  <span className="text-sm font-semibold">
                    Net {isProfitable ? 'Profit' : 'Loss'}
                  </span>
                  <span
                    className={`text-base font-bold tabular-nums ${
                      isProfitable ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {formatZAR(profitAndLoss.netProfit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Revenue by Division */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Revenue by Division
              </h3>
              <Link
                href="/billing/reports"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View reports <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {revenueByDivision.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState message="No revenue recorded yet for divisions." filtered={false} />
              </div>
            ) : (
              <div className="divide-y">
                {revenueByDivision.map((div) => {
                  const pct = summary.revenue > 0 ? (div.total / summary.revenue) * 100 : 0;
                  return (
                    <div
                      key={div.divisionName}
                      className="px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{div.divisionName}</span>
                        <span className="text-sm font-semibold tabular-nums text-emerald-600">
                          {formatZAR(div.total)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {pct.toFixed(1)}% of total
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Invoices & Recent Cash Movement */}
        <div className="flex flex-col gap-6">
          {/* Recent Invoices */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Recent Invoices
              </h3>
              <Link
                href="/billing/invoices"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {recentInvoices.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState message="No invoices recorded yet." filtered={false} />
              </div>
            ) : (
              <div className="divide-y">
                {recentInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/billing/invoices/${inv.id}`}
                    className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors block"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {inv.documentNumber}
                        </span>
                        <BillingStatusBadge status={inv.status} />
                      </div>
                      <p className="text-sm text-foreground mt-0.5 truncate">
                        {inv.clientName ?? (
                          <span className="italic text-muted-foreground">No client</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{fmtDate(inv.invoiceDate)}</span>
                        {inv.divisionName && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-600">
                            {inv.divisionName}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-foreground shrink-0 ml-4">
                      {formatZAR(inv.total)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Income */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Recent Income
              </h3>
              <Link
                href="/billing/payments"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {recentIncome.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState message="No income recorded yet." filtered={false} />
              </div>
            ) : (
              <div className="divide-y">
                {recentIncome.map((inc) => (
                  <div
                    key={inc.id}
                    className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {inc.description || 'Income entry'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{fmtDate(inc.date)}</span>
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600">
                          {inc.divisionName}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-emerald-600 shrink-0 ml-4">
                      {formatZAR(inc.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Expenses */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-red-600" />
                Recent Expenses
              </h3>
              <Link
                href="/finance/expenses"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {recentExpenses.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState message="No expenses recorded yet." filtered={false} />
              </div>
            ) : (
              <div className="divide-y">
                {recentExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {exp.description || 'Expense entry'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{fmtDate(exp.date)}</span>
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-600">
                          {exp.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-red-600 shrink-0 ml-4">
                      {formatZAR(exp.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modules Quick-Access Deck */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Financial &amp; Accounting Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              href: '/finance/expenses',
              label: 'Expenses',
              description: 'Record and categorize expenses',
              color: 'bg-red-500/10 text-red-600',
              icon: TrendingDown,
            },
            {
              href: '/finance/recurring',
              label: 'Recurring',
              description: 'Subscriptions & scheduled bills',
              color: 'bg-blue-500/10 text-blue-600',
              icon: CalendarClock,
            },
            {
              href: '/accounting/profit-and-loss',
              label: 'Profit & Loss',
              description: 'Formal statement of income & spend',
              color: 'bg-rose-500/10 text-rose-600',
              icon: LineChart,
            },
            {
              href: '/accounting/general-ledger',
              label: 'General Ledger',
              description: 'Complete double-entry ledger view',
              color: 'bg-amber-500/10 text-amber-600',
              icon: BookMarked,
            },
            {
              href: '/accounting/trial-balance',
              label: 'Trial Balance',
              description: 'Audit debit and credit equality',
              color: 'bg-emerald-500/10 text-emerald-600',
              icon: Scale,
            },
            {
              href: '/accounting/journals',
              label: 'Journal Entries',
              description: 'Create and review manual journals',
              color: 'bg-violet-500/10 text-violet-600',
              icon: Receipt,
            },
            {
              href: '/accounting/chart-of-accounts',
              label: 'Chart of Accounts',
              description: 'Manage accounts and categories',
              color: 'bg-cyan-500/10 text-cyan-600',
              icon: Folders,
            },
            {
              href: '/accounting/periods',
              label: 'Accounting Periods',
              description: 'Lock and reconcile monthly periods',
              color: 'bg-indigo-500/10 text-indigo-600',
              icon: CalendarClock,
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 hover:bg-muted/30 hover:shadow-sm transition-all duration-200"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${link.color}`}
              >
                <link.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:underline underline-offset-2">
                  {link.label}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{link.description}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
