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
            {entries.map((row, i) => {
              if (row.isOpeningBalance) {
                return (
                  <TableRow key={`opening-${i}`} className="bg-muted/30 font-medium">
                    <TableCell colSpan={6} className="text-right text-muted-foreground">
                      Opening Balance for {row.accountCode} - {row.accountName}
                    </TableCell>
                    <TableCell className="text-right">{formatZAR(row.runningBalance)}</TableCell>
                  </TableRow>
                )
              }

              const debit = row.amount > 0 ? row.amount : null
              const credit = row.amount < 0 ? Math.abs(row.amount) : null

              return (
                <TableRow key={`${row.journalEntryId}-${row.accountId}-${i}`}>
                  <TableCell className="text-sm">{fmtDate(row.date)}</TableCell>
                  <TableCell className="text-sm font-mono">
                    <a
                      href={`/accounting/journals/${row.journalEntryId}`}
                      className="text-primary hover:underline"
                    >
                      {row.journalEntryNumber}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium">{row.accountCode}</span> — {row.accountName}
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-[200px]" title={row.description || ''}>
                    {row.description || <span className="text-muted-foreground italic">No description</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {debit ? formatZAR(debit) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {credit ? formatZAR(credit) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatZAR(row.runningBalance)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
