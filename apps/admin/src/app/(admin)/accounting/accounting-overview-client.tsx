'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatZAR, fmtMonthYear, fmtDate } from '@/lib/format'
import {
  ArrowRight,
  BadgeCheck,
  BadgeAlert,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { TrialBalanceRow, ProfitAndLossResult, GeneralLedgerRow } from '@pmg/db'

interface AccountingOverviewClientProps {
  periods: string[]
  selectedPeriod: string
  trialBalance: TrialBalanceRow[]
  profitAndLoss: ProfitAndLossResult
  recentEntries: GeneralLedgerRow[]
  currentPeriod: { period: string; status: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
}

export function AccountingOverviewClient({
  periods,
  selectedPeriod,
  trialBalance,
  profitAndLoss,
  recentEntries,
  currentPeriod,
}: AccountingOverviewClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('period')
    } else {
      params.set('period', value)
    }
    router.push(`/accounting?${params.toString()}`, { scroll: false })
  }

  const trialTotalDebits = trialBalance.reduce((s, r) => s + r.totalDebits, 0)
  const trialTotalCredits = trialBalance.reduce((s, r) => s + r.totalCredits, 0)
  const isBalanced = Math.abs(trialTotalDebits - trialTotalCredits) < 0.01
  const isProfit = profitAndLoss.netProfit >= 0
  const accountsReceivable = trialBalance.find((r) => r.accountCode === '1100')
  const accountsReceivableBalance = accountsReceivable?.balance ?? 0
  const accountsReceivableLabel =
    accountsReceivableBalance > 0.01
      ? 'owed by clients'
      : accountsReceivableBalance < -0.01
        ? 'credit balance'
        : 'no open AR'

  // Count accounts by type that have activity
  const activeTypeCounts = {
    asset: trialBalance.filter((r) => r.accountType === 'asset' && (r.totalDebits > 0 || r.totalCredits > 0)).length,
    liability: trialBalance.filter((r) => r.accountType === 'liability' && (r.totalDebits > 0 || r.totalCredits > 0)).length,
    equity: trialBalance.filter((r) => r.accountType === 'equity' && (r.totalDebits > 0 || r.totalCredits > 0)).length,
    revenue: trialBalance.filter((r) => r.accountType === 'revenue' && (r.totalDebits > 0 || r.totalCredits > 0)).length,
    expense: trialBalance.filter((r) => r.accountType === 'expense' && (r.totalDebits > 0 || r.totalCredits > 0)).length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod || 'all'} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>{fmtMonthYear(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {currentPeriod ? `${fmtMonthYear(currentPeriod.period)} — ${currentPeriod.status}` : 'No open period'}
          </span>
        </div>
      </div>

      {/* Financial Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Profit/Loss */}
        <div className="relative rounded-xl border bg-card overflow-hidden group hover:shadow-md transition-all duration-200">
          <div className={`absolute inset-0 opacity-[0.03] ${isProfit ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isProfit ? 'Net Profit' : 'Net Loss'}
              </p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {isProfit ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            <p className={`text-2xl font-bold mt-2 tabular-nums ${
              isProfit ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {formatZAR(profitAndLoss.netProfit)}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">
                Rev <span className="font-medium text-foreground">{formatZAR(profitAndLoss.totalRevenue)}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Exp <span className="font-medium text-foreground">{formatZAR(profitAndLoss.totalExpenses)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums">{formatZAR(profitAndLoss.totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground">
              {activeTypeCounts.revenue} revenue account{activeTypeCounts.revenue !== 1 ? 's' : ''} with activity
            </span>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accounts Receivable</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums">{formatZAR(Math.abs(accountsReceivableBalance))}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground">
              1100 · {accountsReceivableLabel}
            </span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Receipt className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums">{formatZAR(profitAndLoss.totalExpenses)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground">
              {activeTypeCounts.expense} expense account{activeTypeCounts.expense !== 1 ? 's' : ''} with activity
            </span>
          </div>
        </div>
      </div>

      {/* Financial Snapshot Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L Mini Statement */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Profit & Loss Summary</h3>
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
                <div key={r.accountId} className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{r.accountCode}</span>
                    <span className="text-sm truncate">{r.accountName}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-emerald-600">{formatZAR(r.amount)}</span>
                </div>
              ))}
              {profitAndLoss.revenue.length > 3 && (
                <div className="px-5 py-2 text-xs text-muted-foreground text-center">
                  +{profitAndLoss.revenue.length - 3} more revenue accounts
                </div>
              )}

              {/* Separator */}
              <div className="border-t-2 border-dashed" />

              {/* Expense lines */}
              {profitAndLoss.expenses.slice(0, 3).map((e) => (
                <div key={e.accountId} className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{e.accountCode}</span>
                    <span className="text-sm truncate">{e.accountName}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-red-600">{formatZAR(e.amount)}</span>
                </div>
              ))}
              {profitAndLoss.expenses.length > 3 && (
                <div className="px-5 py-2 text-xs text-muted-foreground text-center">
                  +{profitAndLoss.expenses.length - 3} more expense accounts
                </div>
              )}

              {/* Net result */}
              <div className={`px-5 py-3 flex items-center justify-between ${
                isProfit ? 'bg-emerald-500/5' : 'bg-red-500/5'
              }`}>
                <span className="text-sm font-semibold">Net {isProfit ? 'Profit' : 'Loss'}</span>
                <span className={`text-base font-bold tabular-nums ${
                  isProfit ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatZAR(profitAndLoss.netProfit)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Trial Balance Check */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Trial Balance</h3>
            <Link
              href={`/accounting/trial-balance${selectedPeriod ? `?period=${selectedPeriod}` : ''}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Full report <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Balance status */}
          <div className={`px-5 py-3 flex items-center gap-2 border-b ${
            isBalanced
              ? 'bg-emerald-500/5'
              : 'bg-red-500/5'
          }`}>
            {isBalanced ? (
              <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <BadgeAlert className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                {isBalanced ? 'Trial balance is in balance' : 'Trial balance does not balance'}
              </p>
              <p className="text-xs text-muted-foreground">
                Debits {formatZAR(trialTotalDebits)} · Credits {formatZAR(trialTotalCredits)}
              </p>
            </div>
          </div>

          {/* Active accounts by type */}
          {trialBalance.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No journal entries for the selected period.
            </div>
          ) : (
            <div className="divide-y">
              {/* Top accounts by balance magnitude */}
              {trialBalance
                .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
                .slice(0, 5)
                .map((r) => (
                  <div key={r.accountId} className="px-5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground">{r.accountCode}</span>
                      <span className="text-sm truncate">{r.accountName}</span>
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground`}>
                        {TYPE_LABELS[r.accountType] ?? r.accountType}
                      </span>
                    </div>
                    <span className={`text-sm font-medium tabular-nums ${
                      r.balance > 0 ? 'text-foreground' : r.balance < 0 ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`}>
                      {formatZAR(Math.abs(r.balance))}
                      {r.balance !== 0 && (
                        <span className={`ml-1 text-[10px] ${r.balance > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {r.balance > 0 ? 'Dr' : 'Cr'}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              {/* Balance by type summary */}
              <div className="px-5 py-3 flex flex-wrap gap-3 border-t bg-muted/20">
                {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map((type) => {
                  const total = trialBalance
                    .filter((r) => r.accountType === type)
                    .reduce((s, r) => s + r.totalDebits - r.totalCredits, 0)
                  if (Math.abs(total) < 0.01 && activeTypeCounts[type] === 0) return null
                  return (
                    <div key={type} className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{type}</p>
                      <p className={`text-xs font-semibold tabular-nums mt-0.5 ${
                        total > 0
                          ? (type === 'revenue' || type === 'liability' || type === 'equity' ? 'text-red-600' : 'text-emerald-600')
                          : total < 0
                          ? (type === 'revenue' || type === 'liability' || type === 'equity' ? 'text-emerald-600' : 'text-red-600')
                          : 'text-muted-foreground'
                      }`}>
                        {formatZAR(Math.abs(total))}
                        {total !== 0 && (
                          <span className="ml-0.5 text-[9px]">{total > 0 ? 'Dr' : 'Cr'}</span>
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Journal Entries */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Journal Entries</h3>
          <Link
            href="/accounting/journals"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {recentEntries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No posted journal entries yet.
          </div>
        ) : (
          <div className="divide-y">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5 ${
                    entry.debit > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {entry.debit > 0 ? (
                      <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{entry.accountName}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{entry.accountCode}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{fmtDate(entry.entryDate)}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{entry.entryNumber}</span>
                      {entry.sourceModule && (
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-600">
                          {entry.sourceModule}
                        </span>
                      )}
                    </div>
                    {(entry.lineDescription || entry.description) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[400px]">
                        {entry.lineDescription || entry.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {entry.debit > 0 && (
                    <p className="text-sm font-medium tabular-nums text-emerald-600">{formatZAR(entry.debit)}</p>
                  )}
                  {entry.credit > 0 && (
                    <p className="text-sm font-medium tabular-nums text-red-600">{formatZAR(entry.credit)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/accounting/chart-of-accounts', label: 'Chart of Accounts', description: 'Manage your account structure', color: 'bg-blue-500/10 text-blue-600' },
            { href: '/accounting/journals', label: 'Journal Entries', description: 'Record double-entry journals', color: 'bg-violet-500/10 text-violet-600' },
            { href: '/accounting/general-ledger', label: 'General Ledger', description: 'View the complete ledger', color: 'bg-amber-500/10 text-amber-600' },
            { href: '/accounting/trial-balance', label: 'Trial Balance', description: 'Verify debits equal credits', color: 'bg-emerald-500/10 text-emerald-600' },
            { href: '/accounting/profit-and-loss', label: 'Profit & Loss', description: 'Income, expenses, net profit', color: 'bg-rose-500/10 text-rose-600' },
            { href: '/accounting/periods', label: 'Accounting Periods', description: 'Open, close, lock months', color: 'bg-cyan-500/10 text-cyan-600' },
            { href: '/accounting/exports', label: 'Exports', description: 'Export for your accountant', color: 'bg-zinc-500/10 text-zinc-600' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 hover:bg-muted/30 hover:shadow-sm transition-all duration-200"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${link.color}`}>
                <span className="text-sm font-bold">{link.label.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:underline underline-offset-2">{link.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{link.description}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
