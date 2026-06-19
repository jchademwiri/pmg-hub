'use client'

import * as React from 'react'
import Link from 'next/link'
import { formatZAR, fmtDate } from '@/lib/format'
import {
  ArrowRight,
  DollarSign,
  FileText,
  Receipt,
  CreditCard,
  BadgeCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react'
import type { AgingRow } from '@pmg/db'

interface BillingOverviewClientProps {
  invoiceSummary: {
    total: number
    sum: number
    outstanding: number
  }
  aging: AgingRow[]
  currentMonthPayments: {
    sum: number
    count: number
  }
  currentMonthInvoiced: number
  recentInvoices: Array<{
    id: string
    documentNumber: string
    clientName: string | null
    status: string
    total: string
    invoiceDate: string
  }>
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600',
  partially_paid: 'bg-amber-500/10 text-amber-600',
  issued: 'bg-blue-500/10 text-blue-600',
  overdue: 'bg-red-500/10 text-red-600',
  draft: 'bg-zinc-500/10 text-zinc-600',
  void: 'bg-zinc-500/10 text-zinc-600',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  paid: 'text-emerald-600',
  partially_paid: 'text-amber-600',
  issued: 'text-blue-600',
  overdue: 'text-red-600',
  draft: 'text-zinc-600',
  void: 'text-zinc-600 line-through',
}

export function BillingOverviewClient({
  invoiceSummary,
  aging,
  currentMonthPayments,
  currentMonthInvoiced,
  recentInvoices,
}: BillingOverviewClientProps) {
  const outstanding = invoiceSummary.outstanding
  const totalInvoiced = invoiceSummary.sum

  return (
    <div className="flex flex-col gap-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invoiced</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-blue-600">{formatZAR(totalInvoiced)}</p>
          <p className="text-xs text-muted-foreground mt-1">{invoiceSummary.total} invoices</p>
        </div>

        {/* Invoiced This Month */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoiced This Month</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Receipt className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-violet-600">{formatZAR(currentMonthInvoiced)}</p>
          <p className="text-xs text-muted-foreground mt-1">current billing period</p>
        </div>

        {/* Payments This Month */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payments This Month</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600">
            {formatZAR(currentMonthPayments.sum)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentMonthPayments.count} transaction{currentMonthPayments.count !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {/* Accounts Receivables */}
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accounts Receivables</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${outstanding > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
              <DollarSign className={`h-4 w-4 ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 tabular-nums ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatZAR(outstanding)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalInvoiced > 0 ? `${Math.round((outstanding / totalInvoiced) * 100)}% uncollected` : 'No invoices'}
          </p>
        </div>
      </div>

      {/* Aging Report + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aging Report */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Aging Report</h3>
            <Link href="/billing/accounts" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {aging.every((a) => a.count === 0) ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No outstanding invoices. All caught up!
            </div>
          ) : (
            <div className="divide-y">
              {aging.map((bucket) => {
                const isOverdue = bucket.bucket !== 'current'
                const isCritical = bucket.bucket === '61_plus' || bucket.bucket === '31_60'
                return (
                  <div key={bucket.bucket} className={`px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors ${
                    isCritical && bucket.count > 0 ? 'bg-red-500/5' : ''
                  }`}>
                    <div className="flex items-center gap-2">
                      {bucket.count > 0 && isOverdue ? (
                        <AlertTriangle className={`h-4 w-4 ${isCritical ? 'text-red-600' : 'text-amber-600'} shrink-0`} />
                      ) : bucket.count > 0 ? (
                        <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{bucket.label}</p>
                        <p className="text-xs text-muted-foreground">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${
                      bucket.count > 0 && isCritical ? 'text-red-600' : bucket.count > 0 && isOverdue ? 'text-amber-600' : 'text-muted-foreground'
                    }`}>
                      {formatZAR(bucket.total)}
                    </p>
                  </div>
                )
              })}
              <div className="px-5 py-3 bg-muted/20 flex items-center justify-between border-t-2">
                <span className="text-sm font-semibold">Total Outstanding</span>
                <span className={`text-base font-bold tabular-nums ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatZAR(outstanding)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Invoices</h3>
            <Link href="/billing/invoices" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No invoices yet.
            </div>
          ) : (
            <div className="divide-y">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/billing/invoices/${inv.id}`}
                  className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      inv.status === 'paid' || inv.status === 'partially_paid'
                        ? 'bg-emerald-500/10'
                        : inv.status === 'overdue'
                        ? 'bg-red-500/10'
                        : 'bg-blue-500/10'
                    }`}>
                      {inv.status === 'paid' || inv.status === 'partially_paid' ? (
                        <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:underline">
                        {inv.clientName || 'Unknown Client'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-muted-foreground">{inv.documentNumber}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(inv.invoiceDate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4 flex items-center gap-2">
                    <span className={`text-sm font-medium tabular-nums ${STATUS_TEXT_COLORS[inv.status] || ''}`}>{formatZAR(Number(inv.total))}</span>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      STATUS_STYLES[inv.status] || 'bg-zinc-500/10 text-zinc-600'
                    }`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/billing/accounts', label: 'Accounts', description: 'Client billing accounts', color: 'bg-blue-500/10 text-blue-600' },
            { href: '/billing/quotes', label: 'Quotes', description: 'Create and manage quotations', color: 'bg-violet-500/10 text-violet-600' },
            { href: '/billing/invoices', label: 'Invoices', description: 'Issue and track invoices', color: 'bg-emerald-500/10 text-emerald-600' },
            { href: '/billing/payments', label: 'Payments', description: 'Record incoming payments', color: 'bg-cyan-500/10 text-cyan-600' },
            { href: '/billing/credits', label: 'Credits', description: 'Credit notes and refunds', color: 'bg-amber-500/10 text-amber-600' },
            { href: '/billing/statements', label: 'Statements', description: 'Client account statements', color: 'bg-rose-500/10 text-rose-600' },
            { href: '/billing/items', label: 'Items', description: 'Catalogue of billable items', color: 'bg-zinc-500/10 text-zinc-600' },
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
