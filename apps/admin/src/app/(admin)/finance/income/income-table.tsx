'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
} from '@/components/ui/table'
import { formatZAR, fmtDate } from '@/lib/format'

export type EnrichedIncome = {
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

interface IncomeTableProps {
  entries: EnrichedIncome[]
}

export function IncomeTable({ entries }: IncomeTableProps) {

  return (
    <div className="flex flex-col gap-4">
      {/* Table */}
      {entries.length === 0 ? (
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
              {entries.map((row) => (
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
        </>
      )}
    </div>
  )
}
