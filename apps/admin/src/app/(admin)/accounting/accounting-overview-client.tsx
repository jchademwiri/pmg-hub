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
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatZAR, fmtMonthYear, fmtDate } from '@/lib/format';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeAlert,
  BadgeCheck,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  Folders,
  Landmark,
  LineChart,
  Plus,
  Receipt,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  AccountingOverview,
  BalanceSheetResult,
  ProfitAndLossResult,
  TrialBalanceRow,
} from '@pmg/db';

interface AccountingOverviewClientProps {
  periods: string[];
  selectedPeriod: string;
  currentPeriod: { period: string; status: string } | null;
  overview: AccountingOverview;
  trialBalance: TrialBalanceRow[];
  balanceSheet: BalanceSheetResult;
  profitAndLoss: ProfitAndLossResult;
  unpostedInvoicesCount: number;
  unpostedPaymentsCount: number;
  recentJournals: Array<{
    id: string;
    entryNumber: string;
    entryDate: string;
    description: string | null;
    status: string;
    sourceModule: string | null;
    period: string;
  }>;
}

const JOURNAL_STATUS_STYLES: Record<string, string> = {
  posted: 'bg-emerald-500/10 text-emerald-600',
  draft: 'bg-amber-500/10 text-amber-600',
  void: 'bg-muted text-muted-foreground',
};

export function AccountingOverviewClient({
  periods,
  selectedPeriod,
  currentPeriod,
  overview,
  trialBalance,
  balanceSheet,
  profitAndLoss,
  unpostedInvoicesCount,
  unpostedPaymentsCount,
  recentJournals,
}: AccountingOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('period');
    } else {
      params.set('period', value);
    }
    const qs = params.toString();
    router.push(qs ? `/accounting?${qs}` : '/accounting', { scroll: false });
  }

  const trialTotalDebits = trialBalance.reduce((s, r) => s + r.totalDebits, 0);
  const trialTotalCredits = trialBalance.reduce((s, r) => s + r.totalCredits, 0);
  const trialDiff = Math.abs(trialTotalDebits - trialTotalCredits);
  const isTrialBalanced = trialDiff < 0.01;

  const bsDiff = Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity);
  const isBalanceSheetBalanced = bsDiff < 0.01;

  const isProfitable = profitAndLoss.netProfit >= 0;
  const totalUnposted = unpostedInvoicesCount + unpostedPaymentsCount;
  const isReconciled = totalUnposted === 0;

  return (
    <div className="flex flex-col gap-6">
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

          <Button asChild size="sm" className="gap-1.5 shrink-0">
            <Link href="/accounting/journals/new">
              <Plus className="h-3.5 w-3.5" />
              New Journal Entry
            </Link>
          </Button>
        </div>
      </div>

      {/* Trial Balance Health Banner */}
      <div
        className={`rounded-xl border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 ${
          isTrialBalanced
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}
      >
        <div className="flex items-center gap-3">
          {isTrialBalanced ? (
            <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <BadgeAlert className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                isTrialBalanced ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {isTrialBalanced ? 'Trial Balance is in balance' : 'Trial Balance does not balance'}
            </p>
            <p className="text-xs text-muted-foreground">
              Total Debits {formatZAR(trialTotalDebits)} · Total Credits{' '}
              {formatZAR(trialTotalCredits)}
              {!isTrialBalanced && ` · Variance ${formatZAR(trialDiff)}`}
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

      {/* Core Accounting KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Assets
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Landmark className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-foreground">
            {formatZAR(balanceSheet.totalAssets)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {balanceSheet.assets.length} active asset account
            {balanceSheet.assets.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Net Profit (GL) */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {isProfitable ? 'Net Profit (GL)' : 'Net Loss (GL)'}
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
          <p className="text-xs text-muted-foreground mt-1">
            Rev {formatZAR(profitAndLoss.totalRevenue)} · Exp{' '}
            {formatZAR(profitAndLoss.totalExpenses)}
          </p>
        </div>

        {/* Journal Entries */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Journal Entries
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Receipt className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-foreground">
            {overview.totalPostedEntries.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Posted · {overview.totalDraftEntries} draft · {overview.totalAccounts} GL accounts
          </p>
        </div>

        {/* Reconciliation Integrity */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sub-Ledger Sync
            </p>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isReconciled ? 'bg-emerald-500/10' : 'bg-amber-500/10'
              }`}
            >
              {isReconciled ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-600" />
              )}
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              isReconciled ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {isReconciled ? 'All Synced' : `${totalUnposted} Unposted`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {unpostedInvoicesCount} unposted invoice{unpostedInvoicesCount === 1 ? '' : 's'} ·{' '}
            {unpostedPaymentsCount} payment{unpostedPaymentsCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Row 1: Balance Sheet Snapshot + Profit & Loss Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Sheet Snapshot */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              Balance Sheet Snapshot
            </h3>
            <Link
              href="/insights/financial-reports"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Financial Reports (AFS) <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y">
            <div className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium">Total Assets</p>
                <p className="text-xs text-muted-foreground">
                  Cash, Accounts Receivable, PPE &amp; Loan Accounts
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatZAR(balanceSheet.totalAssets)}
              </span>
            </div>

            <div className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium">Total Liabilities</p>
                <p className="text-xs text-muted-foreground">
                  Payables, VAT, Income Tax Payable &amp; Client Credits
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatZAR(balanceSheet.totalLiabilities)}
              </span>
            </div>

            <div className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-sm font-medium">Total Equity</p>
                <p className="text-xs text-muted-foreground">
                  Share Capital, Retained Earnings &amp; Current Net Income
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatZAR(balanceSheet.totalEquity)}
              </span>
            </div>

            <div
              className={`px-5 py-3 flex items-center justify-between ${
                isBalanceSheetBalanced ? 'bg-emerald-500/5' : 'bg-red-500/5'
              }`}
            >
              <span className="text-xs font-semibold flex items-center gap-1.5">
                {isBalanceSheetBalanced ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <BadgeAlert className="h-4 w-4 text-red-600" />
                )}
                Assets = Liabilities + Equity
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isBalanceSheetBalanced ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {isBalanceSheetBalanced
                  ? formatZAR(balanceSheet.totalLiabilitiesAndEquity)
                  : `Variance ${formatZAR(bsDiff)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Profit & Loss Summary */}
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
              No posted ledger activity for the selected period.
            </div>
          ) : (
            <div className="divide-y">
              {profitAndLoss.revenue.slice(0, 3).map((r) => (
                <div
                  key={r.accountId}
                  className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{r.accountCode}</span>
                    <span className="text-sm truncate">{r.accountName}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-emerald-600">
                    {formatZAR(r.amount)}
                  </span>
                </div>
              ))}

              <div className="border-t-2 border-dashed" />

              {profitAndLoss.expenses.slice(0, 3).map((e) => (
                <div
                  key={e.accountId}
                  className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{e.accountCode}</span>
                    <span className="text-sm truncate">{e.accountName}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-red-600">
                    {formatZAR(e.amount)}
                  </span>
                </div>
              ))}

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
      </div>

      {/* Row 2: Recent Journal Entries */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-violet-600" />
            Recent Journal Entries
          </h3>
          <Link
            href="/accounting/journals"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {recentJournals.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              message="No journal entries found for the selected period."
              filtered={Boolean(selectedPeriod)}
            />
          </div>
        ) : (
          <div className="divide-y">
            {recentJournals.map((entry) => (
              <Link
                key={entry.id}
                href="/accounting/journals"
                className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors block"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {entry.entryNumber}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        JOURNAL_STATUS_STYLES[entry.status] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {entry.status}
                    </span>
                    {entry.sourceModule && (
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-600 capitalize">
                        {entry.sourceModule}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-0.5 truncate">
                    {entry.description || (
                      <span className="italic text-muted-foreground">No description</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {fmtDate(entry.entryDate)}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    {entry.period}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Accounting Modules Quick-Access Deck (Strictly Accounting items only) */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Accounting Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              href: '/accounting/profit-and-loss',
              label: 'Profit & Loss',
              description: 'Formal statement of income & spend',
              color: 'bg-rose-500/10 text-rose-600',
              icon: LineChart,
            },
            {
              href: '/accounting/trial-balance',
              label: 'Trial Balance',
              description: 'Audit debit and credit equality',
              color: 'bg-emerald-500/10 text-emerald-600',
              icon: Scale,
            },
            {
              href: '/accounting/general-ledger',
              label: 'General Ledger',
              description: 'Complete double-entry ledger view',
              color: 'bg-amber-500/10 text-amber-600',
              icon: BookMarked,
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
              description: 'Manage GL accounts and classifications',
              color: 'bg-cyan-500/10 text-cyan-600',
              icon: Folders,
            },
            {
              href: '/accounting/periods',
              label: 'Accounting Periods',
              description: 'Close and lock monthly accounting periods',
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
