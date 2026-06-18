import type { Metadata } from 'next'
import Link from 'next/link'
import { getAccountingOverview, getCurrentOpenPeriod } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { fmtMonthYear } from '@/lib/format'
import { BookOpen, FileText, Scale, TrendingUp, Calendar, Download, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounting' }

const ACCOUNTING_LINKS = [
  { href: '/accounting/chart-of-accounts', label: 'Chart of Accounts', description: 'Define and manage your account structure', icon: BookOpen },
  { href: '/accounting/journals', label: 'Journal Entries', description: 'Record and review double-entry journal entries', icon: FileText },
  { href: '/accounting/general-ledger', label: 'General Ledger', description: 'View the complete debit and credit ledger', icon: BookOpen },
  { href: '/accounting/trial-balance', label: 'Trial Balance', description: 'Verify debits equal credits across all accounts', icon: Scale },
  { href: '/accounting/profit-and-loss', label: 'Profit & Loss', description: 'View income, expenses, and net profit', icon: TrendingUp },
  { href: '/accounting/periods', label: 'Accounting Periods', description: 'Open, close, and lock accounting months', icon: Calendar },
  { href: '/accounting/exports', label: 'Exports', description: 'Export financial data for your accountant', icon: Download },
]

export default async function AccountingOverviewPage() {
  const [overview, currentPeriod] = await Promise.all([
    getAccountingOverview(),
    getCurrentOpenPeriod(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${overview.totalAccounts} accounts`} />

      <div>
        <h2 className="text-lg font-semibold">Accounting Overview</h2>
        <p className="text-sm text-muted-foreground">
          Accountant-grade double-entry bookkeeping system with journals, ledgers, and financial statements.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Active Accounts</p>
          <p className="text-2xl font-bold mt-1">{overview.totalAccounts}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Posted Entries</p>
          <p className="text-2xl font-bold mt-1">{overview.totalPostedEntries}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Draft Entries</p>
          <p className="text-2xl font-bold mt-1">{overview.totalDraftEntries}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Current Period</p>
          <p className="text-2xl font-bold mt-1">
            {currentPeriod ? fmtMonthYear(currentPeriod.period) : '—'}
          </p>
          {currentPeriod && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
              currentPeriod.status === 'open'
                ? 'bg-emerald-500/15 text-emerald-600'
                : currentPeriod.status === 'closed'
                ? 'bg-amber-500/15 text-amber-600'
                : 'bg-zinc-500/15 text-zinc-600'
            }`}>
              {currentPeriod.status}
            </span>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACCOUNTING_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:underline">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
