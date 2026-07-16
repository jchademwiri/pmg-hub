'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtDate, formatZAR } from '@/lib/format'
import type { GeneralLedgerRow } from '@pmg/db'

interface GeneralLedgerTableProps {
  entries: GeneralLedgerRow[]
}

export function GeneralLedgerTable({
  entries,
}: GeneralLedgerTableProps) {
  return (
    <div className="flex flex-col gap-4">
      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-8 text-center bg-card">
          No ledger entries found for the selected filters.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entry #</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              let balance = 0;
              return entries.map((row, i) => {
                balance += (row.debit - row.credit);
                return (
                  <TableRow key={`${row.id}-${i}`}>
                    <TableCell className="text-sm">{fmtDate(row.entryDate)}</TableCell>
                    <TableCell className="text-sm font-mono">
                      <a
                        href={`/accounting/journals?search=${row.entryNumber}`}
                        className="text-primary hover:underline"
                      >
                        {row.entryNumber}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{row.accountCode}</span> — {row.accountName}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]" title={row.description || ''}>
                      {row.description || <span className="text-muted-foreground italic">No description</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.debit > 0 ? formatZAR(row.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.credit > 0 ? formatZAR(row.credit) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatZAR(balance)}
                    </TableCell>
                  </TableRow>
                )
              });
            })()}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
