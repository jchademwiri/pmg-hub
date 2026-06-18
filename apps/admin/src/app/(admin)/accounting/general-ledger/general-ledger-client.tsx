'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { fmtDate, formatZAR } from '@/lib/format'
import type { GeneralLedgerRow, ChartAccount } from '@pmg/db'

interface GeneralLedgerClientProps {
  data: GeneralLedgerRow[]
  total: number
  currentPage: number
  pageSize: number
  accounts: ChartAccount[]
  filters: {
    startDate?: string
    endDate?: string
    accountId?: string
  }
}

export function GeneralLedgerClient({
  data,
  total,
  currentPage,
  pageSize,
  accounts,
  filters,
}: GeneralLedgerClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [startDate, setStartDate] = React.useState(filters.startDate || '')
  const [endDate, setEndDate] = React.useState(filters.endDate || '')

  function applyFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    params.delete('page')
    router.push(`/accounting/general-ledger?${params.toString()}`, { scroll: false })
  }

  function clearFilters() {
    router.push('/accounting/general-ledger', { scroll: false })
    setStartDate('')
    setEndDate('')
  }

  function handleDateApply() {
    applyFilters({ startDate, endDate })
  }

  const hasFilters = filters.startDate || filters.endDate || filters.accountId

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px]"
            placeholder="Start date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px]"
            placeholder="End date"
          />
          <Button size="sm" variant="outline" onClick={handleDateApply}>
            Apply
          </Button>
        </div>

        <Select
          value={filters.accountId || 'all'}
          onValueChange={(v) => applyFilters({ accountId: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.code} — {a.name}
              </SelectItem>
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
          No ledger entries found for the selected filters.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entry #</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(row.entryDate)}</TableCell>
                  <TableCell className="text-sm font-mono">{row.entryNumber}</TableCell>
                  <TableCell className="text-sm">
                    <span className="font-mono text-muted-foreground mr-1.5">{row.accountCode}</span>
                    {row.accountName}
                  </TableCell>
                  <TableCell className="text-sm max-w-[250px] truncate" title={row.lineDescription || row.description || ''}>
                    {row.lineDescription || row.description || '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {row.debit > 0 ? formatZAR(row.debit) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {row.credit > 0 ? formatZAR(row.credit) : '—'}
                  </TableCell>
                  <TableCell>
                    {row.sourceModule && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-500">
                        {row.sourceDocumentNumber ?? row.sourceModule}
                      </span>
                    )}
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
                      ...(filters.startDate ? { startDate: filters.startDate } : {}),
                      ...(filters.endDate ? { endDate: filters.endDate } : {}),
                      ...(filters.accountId ? { accountId: filters.accountId } : {}),
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
                      ...(filters.startDate ? { startDate: filters.startDate } : {}),
                      ...(filters.endDate ? { endDate: filters.endDate } : {}),
                      ...(filters.accountId ? { accountId: filters.accountId } : {}),
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
