'use client'

import * as React from 'react'
import Link from 'next/link'
import { formatZAR, fmtDate } from '@/lib/format'
import {
  ArrowRight,
  Users,
  Building2,
  Target,
  UserPlus,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react'

interface RelationshipsOverviewClientProps {
  clientCount: number
  divisionCount: number
  leadCounts: {
    all: number
    new: number
    contacted: number
    converted: number
    lost: number
  }
  divisions: Array<{
    id: string
    name: string
    totalIncome: number
    totalExpenses: number
    netProfit: number
    leadCount: number
  }>
  topClients: Array<{
    id: string
    name: string
    businessName: string | null
    totalInvoiced: number
    totalPaid: number
  }>
}

const LEAD_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  contacted: 'bg-amber-500/10 text-amber-600',
  converted: 'bg-emerald-500/10 text-emerald-600',
  lost: 'bg-zinc-500/10 text-zinc-600',
}

export function RelationshipsOverviewClient({
  clientCount,
  divisionCount,
  leadCounts,
  divisions,
  topClients,
}: RelationshipsOverviewClientProps) {
  const sortedDivisions = [...divisions].sort((a, b) => b.netProfit - a.netProfit)
  return (
    <div className="flex flex-col gap-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clients</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums">{clientCount}</p>
          <p className="text-xs text-muted-foreground mt-1">active client relationships</p>
        </div>

        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Divisions</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Building2 className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums">{divisionCount}</p>
          <p className="text-xs text-muted-foreground mt-1">business divisions</p>
        </div>

        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Leads</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Target className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums">{leadCounts.all}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-600">
              {leadCounts.new} new
            </span>
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600">
              {leadCounts.converted} converted
            </span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Leads Pipeline</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
              <UserPlus className="h-4 w-4 text-rose-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <div>
              <span className="text-xl font-bold tabular-nums">{leadCounts.contacted}</span>
              <span className="text-xs text-muted-foreground ml-1">contacted</span>
            </div>
            <div>
              <span className="text-xl font-bold text-muted-foreground tabular-nums">{leadCounts.lost}</span>
              <span className="text-xs text-muted-foreground ml-1">lost</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {leadCounts.all > 0 ? `${Math.round((leadCounts.converted / leadCounts.all) * 100)}% conversion rate` : 'No leads yet'}
          </p>
        </div>
      </div>

      {/* Division Performance + Top Profitable Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Division Performance */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Division Performance</h3>
            <Link href="/relationships/divisions" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {sortedDivisions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No divisions configured.</div>
          ) : (
            <div className="divide-y">
              {sortedDivisions.map((div) => (
                <Link
                  key={div.id}
                  href={`/relationships/divisions/${div.id}`}
                  className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline">{div.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {div.leadCount > 0 ? (
                        <span className="text-xs text-muted-foreground">{div.leadCount} lead{div.leadCount !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {div.paymentCount ?? 0} payment{(div.paymentCount ?? 0) !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className={`text-xs ${div.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {div.netProfit >= 0 ? 'Profitable' : 'Loss'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-sm font-semibold tabular-nums ${div.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatZAR(Math.abs(div.netProfit))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{div.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top 3 Profitable Clients */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Top Profitable Clients</h3>
            <Link href="/relationships/clients" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {topClients.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No client activity yet.</div>
          ) : (
            <div className="divide-y">
              {topClients.map((client, index) => {
                const displayName = client.businessName || client.name
                const rankColors = [
                  'bg-amber-500/10 text-amber-600', // Gold for 1st
                  'bg-zinc-400/10 text-zinc-600',   // Silver for 2nd
                  'bg-orange-600/10 text-orange-600' // Bronze for 3rd
                ]
                const rankColor = rankColors[index] || 'bg-muted text-muted-foreground'
                
                return (
                  <Link
                    key={client.id}
                    href={`/relationships/clients/${client.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-bold text-xs ${rankColor}`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:underline">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Invoiced: {formatZAR(client.totalInvoiced)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-semibold tabular-nums text-emerald-600">
                        {formatZAR(client.totalPaid)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Total Paid</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { href: '/relationships/clients', label: 'Clients', description: 'Manage client relationships', color: 'bg-blue-500/10 text-blue-600' },
            { href: '/relationships/leads', label: 'Leads', description: 'Track and convert leads', color: 'bg-amber-500/10 text-amber-600' },
            { href: '/relationships/divisions', label: 'Divisions', description: 'Business division management', color: 'bg-violet-500/10 text-violet-600' },
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
