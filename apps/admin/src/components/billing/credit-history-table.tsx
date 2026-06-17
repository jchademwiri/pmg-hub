'use client';

import { formatZAR, fmtDate } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface CreditHistoryEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  balanceAfter: number;
  documentNumber?: string;
  linkedInvoiceNumber?: string;
}

interface CreditHistoryTableProps {
  entries: CreditHistoryEntry[];
}

export function CreditHistoryTable({ entries }: CreditHistoryTableProps) {
  function exportToCSV() {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance'];
    const rows = entries.map((entry) => [
      fmtDate(new Date(entry.date)),
      entry.type,
      `"${entry.description.replace(/"/g, '""')}"`,
      entry.amount,
      entry.balanceAfter,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `credit-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 text-xs gap-1.5">
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      )}
      <div className="border rounded-md overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                No credit movements found.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => {
              const isPositive = entry.amount > 0;
              return (
                <TableRow key={entry.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(new Date(entry.date))}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {entry.type}
                  </TableCell>
                  <TableCell className="text-xs max-w-sm truncate" title={entry.description}>
                    {entry.description}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-semibold text-xs ${
                      isPositive ? 'text-emerald-600' : 'text-zinc-600'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {formatZAR(entry.amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-medium">
                    {formatZAR(entry.balanceAfter)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
