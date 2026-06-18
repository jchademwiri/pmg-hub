import type { Metadata } from 'next'
import Link from 'next/link'
import { getClientsWithBillingActivity, getAgingReport } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { formatZAR, fmtDate } from '@/lib/format'
import { ArrowUpRight, BadgeCheck, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounts' }

export default async function BillingAccountsPage() {
  const [clients, aging] = await Promise.all([
    getClientsWithBillingActivity(),
    getAgingReport(),
  ])

  const totalOutstanding = clients.reduce((s, c) => s + c.totalOutstanding, 0)
  const totalInvoiced = clients.reduce((s, c) => s + c.totalInvoiced, 0)
  const totalPaid = clients.reduce((s, c) => s + c.totalPaid, 0)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${clients.length} clients`} />

      <div>
        <h2 className="text-lg font-semibold">Billing Accounts</h2>
        <p className="text-sm text-muted-foreground">
          View and manage client billing accounts and receivables overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invoiced</p>
          <p className="text-2xl font-bold mt-2 tabular-nums">{formatZAR(totalInvoiced)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600">{formatZAR(totalPaid)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</p>
          <p className={`text-2xl font-bold mt-2 tabular-nums ${totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatZAR(totalOutstanding)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collection Rate</p>
          <p className="text-2xl font-bold mt-2 tabular-nums">
            {totalInvoiced > 0 ? `${Math.round((totalPaid / totalInvoiced) * 100)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Aging Summary</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0">
          {aging.map((bucket) => {
            const isOverdue = bucket.bucket !== 'current'
            const isCritical = bucket.bucket === '61_plus' || bucket.bucket === '31_60'
            return (
              <div key={bucket.bucket} className={`px-4 py-4 text-center ${isCritical && bucket.count > 0 ? 'bg-red-500/5' : ''}`}>
                <p className="text-xs text-muted-foreground">{bucket.label}</p>
                <p className={`text-lg font-bold tabular-nums mt-1 ${
                  bucket.count > 0 && isCritical ? 'text-red-600' : bucket.count > 0 && isOverdue ? 'text-amber-600' : ''
                }`}>
                  {formatZAR(bucket.total)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Client Accounts Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Client Accounts</h3>
        </div>
        {clients.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No client accounts found.</div>
        ) : (
          <div className="divide-y">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/billing/statements/${client.id}`}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium group-hover:underline">{client.businessName || client.name}</p>
                    {client.totalOutstanding > 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{client.invoiceCount} invoices</span>
                    <span className="text-xs text-muted-foreground">{client.quoteCount} quotes</span>
                    {client.lastActivityDate && (
                      <span className="text-xs text-muted-foreground">Last activity: {fmtDate(client.lastActivityDate)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`text-sm font-semibold tabular-nums ${client.totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatZAR(client.totalOutstanding)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    of {formatZAR(client.totalInvoiced)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
