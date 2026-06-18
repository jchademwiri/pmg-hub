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
import { formatZAR } from '@/lib/format'
import type { ProfitAndLossResult } from '@pmg/db'

interface ProfitAndLossClientProps {
  data: ProfitAndLossResult
  periods: string[]
  selectedPeriod: string
}

export function ProfitAndLossClient({ data, periods, selectedPeriod }: ProfitAndLossClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('period')
    } else {
      params.set('period', value)
    }
    router.push(`/accounting/profit-and-loss?${params.toString()}`, { scroll: false })
  }

  const isProfit = data.netProfit >= 0

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
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Revenue Section */}
        <div className="px-5 py-4 border-b bg-emerald-500/5">
          <h3 className="text-sm font-semibold text-emerald-600">Revenue</h3>
        </div>
        {data.revenue.length === 0 ? (
          <div className="px-5 py-4 text-sm text-muted-foreground border-b">
            No revenue recorded for this period.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenue.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell className="text-sm font-mono">{row.accountCode}</TableCell>
                  <TableCell className="text-sm">{row.accountName}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums text-emerald-600">
                    {formatZAR(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold border-t-2">
                <TableCell colSpan={2}>Total Revenue</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">
                  {formatZAR(data.totalRevenue)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {/* Expenses Section */}
        <div className="px-5 py-4 border-t border-b bg-destructive/5">
          <h3 className="text-sm font-semibold text-destructive">Expenses</h3>
        </div>
        {data.expenses.length === 0 ? (
          <div className="px-5 py-4 text-sm text-muted-foreground border-b">
            No expenses recorded for this period.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expenses.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell className="text-sm font-mono">{row.accountCode}</TableCell>
                  <TableCell className="text-sm">{row.accountName}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums text-destructive">
                    {formatZAR(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold border-t-2">
                <TableCell colSpan={2}>Total Expenses</TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {formatZAR(data.totalExpenses)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {/* Net Profit */}
        <div className={`px-5 py-4 border-t-2 flex items-center justify-between ${isProfit ? 'bg-emerald-500/5' : 'bg-destructive/5'}`}>
          <span className="text-sm font-semibold">Net Profit / (Loss)</span>
          <span className={`text-lg font-bold tabular-nums ${isProfit ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatZAR(data.netProfit)}
          </span>
        </div>
      </div>
    </div>
  )
}
