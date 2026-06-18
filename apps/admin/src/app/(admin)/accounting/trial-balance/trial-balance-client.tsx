'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { formatZAR, fmtMonthYear } from '@/lib/format'
import type { TrialBalanceRow } from '@pmg/db'

interface TrialBalanceClientProps {
  data: TrialBalanceRow[]
  periods: string[]
  selectedPeriod: string
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
}

export function TrialBalanceClient({ data, periods, selectedPeriod }: TrialBalanceClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('period')
    } else {
      params.set('period', value)
    }
    router.push(`/accounting/trial-balance?${params.toString()}`, { scroll: false })
  }

  const totalDebits = data.reduce((s, r) => s + r.totalDebits, 0)
  const totalCredits = data.reduce((s, r) => s + r.totalCredits, 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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

      {/* Balance indicator */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
        isBalanced
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
          : 'bg-destructive/10 border-destructive/30 text-destructive'
      }`}>
        <span>{isBalanced ? '✓ Trial balance is in balance' : '✗ Trial balance does not balance'}</span>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-8 text-center bg-card">
          No posted journal entries found for the selected period.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debits</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell className="text-sm font-mono">{row.accountCode}</TableCell>
                <TableCell className="text-sm font-medium">{row.accountName}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                    {TYPE_LABELS[row.accountType] ?? row.accountType}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {row.totalDebits > 0 ? formatZAR(row.totalDebits) : '—'}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {row.totalCredits > 0 ? formatZAR(row.totalCredits) : '—'}
                </TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums">
                  {formatZAR(Math.abs(row.balance))}
                  {row.balance !== 0 && (
                    <span className={`ml-1 text-xs ${row.balance > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {row.balance > 0 ? 'Dr' : 'Cr'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right tabular-nums">{formatZAR(totalDebits)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatZAR(totalCredits)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {isBalanced ? 'Balanced' : formatZAR(Math.abs(totalDebits - totalCredits))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  )
}
