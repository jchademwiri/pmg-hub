'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatZAR, fmtDate } from '@/lib/format'

type EnrichedIncome = {
  id: string
  date: string
  divisionId: string
  divisionName: string
  clientId: string | null
  clientName: string | null
  description: string | null
  amount: string
  amountNum: number
  allocated: number
  unallocated: number
  isFullyAllocated: boolean
  period: string
  isClosed: boolean
  source: 'invoice_payment' | 'deposit' | 'manual'
}

interface IncomeClientProps {
  data: EnrichedIncome[]
  total: number
  sum: number
  currentPage: number
  pageSize: number
  divisions: { id: string; name: string }[]
  clients: { id: string; name: string; businessName: string | null }[]
  months: string[]
  filters: {
    month?: string
    divisionId?: string
    clientId?: string
  }
}

export function IncomeClient({
  data,
  total,
  sum,
  currentPage,
  pageSize,
  divisions,
  clients,
  months,
  filters,
}: IncomeClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams()
    if (key !== 'month' && filters.month) params.set('month', filters.month)
    if (key !== 'divisionId' && filters.divisionId) params.set('divisionId', filters.divisionId)
    if (key !== 'clientId' && filters.clientId) params.set('clientId', filters.clientId)
    if (value) params.set(key, value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function clearFilters() {
    router.push(pathname, { scroll: false })
  }

  const hasFilters = filters.month || filters.divisionId || filters.clientId

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.month || 'all'}
          onValueChange={(v) => updateFilter('month', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.divisionId || 'all'}
          onValueChange={(v) => updateFilter('divisionId', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.clientId || 'all'}
          onValueChange={(v) => updateFilter('clientId', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.businessName ?? c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-8 text-center bg-card">
          No income records found.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Unallocated</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {fmtDate(row.date)}
                    {row.isClosed && (
                      <span className="ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-500">
                        Closed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{row.divisionName}</TableCell>
                  <TableCell className="text-sm">{row.clientName ?? '—'}</TableCell>
                  <TableCell className="text-sm max-w-[250px] truncate" title={row.description || ''}>
                    {row.description || '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    {formatZAR(row.amountNum)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-emerald-600">
                    {formatZAR(row.allocated)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <span className={row.unallocated > 0 ? 'text-amber-600' : 'text-muted-foreground'}>
                      {formatZAR(row.unallocated)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.source === 'invoice_payment'
                        ? 'bg-blue-500/15 text-blue-500'
                        : row.source === 'deposit'
                        ? 'bg-purple-500/15 text-purple-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {row.source === 'invoice_payment' ? 'Invoice'
                        : row.source === 'deposit' ? 'Deposit'
                        : 'Manual'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/billing/payments/${row.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`?${new URLSearchParams({
                      ...(filters.month ? { month: filters.month } : {}),
                      ...(filters.divisionId ? { divisionId: filters.divisionId } : {}),
                      ...(filters.clientId ? { clientId: filters.clientId } : {}),
                      page: String(currentPage - 1),
                    }).toString()}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < total && (
                  <a
                    href={`?${new URLSearchParams({
                      ...(filters.month ? { month: filters.month } : {}),
                      ...(filters.divisionId ? { divisionId: filters.divisionId } : {}),
                      ...(filters.clientId ? { clientId: filters.clientId } : {}),
                      page: String(currentPage + 1),
                    }).toString()}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
