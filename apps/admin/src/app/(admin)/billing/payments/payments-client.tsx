'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { formatZAR, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PaymentEntry {
  id: string;
  date: string;
  divisionName: string;
  clientName: string;
  clientId: string | null;
  description: string;
  amount: number;
  allocated: number;
  credit: number;
}

interface PaymentsClientProps {
  entries: PaymentEntry[];
  total: number;
  currentPage: number;
  pageSize: number;
}

export function PaymentsClient({ entries, total, currentPage, pageSize }: PaymentsClientProps) {
  const totalPages = Math.ceil(total / pageSize);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Reference / Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead className="text-right">Credit Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No payments recorded yet. Click &quot;Record Payment&quot; above to get started.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => {
                  router.push(`/billing/payments/${p.id}`);
                }}
              >
                <TableCell className="font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {fmtDate(p.date)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-foreground">{p.clientName}</span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                    {p.divisionName}
                  </span>
                </TableCell>
                <TableCell className="truncate max-w-xs" title={p.description}>
                  {p.description}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatZAR(p.amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatZAR(p.allocated)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.credit > 0 ? (
                    <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-xs">
                      {formatZAR(p.credit)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="text-muted-foreground">
            Showing Page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span> ({total} entries)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              asChild={currentPage > 1}
            >
              {currentPage > 1 ? (
                <Link href={`/billing/payments?page=${currentPage - 1}`}>Previous</Link>
              ) : (
                <span>Previous</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              asChild={currentPage < totalPages}
            >
              {currentPage < totalPages ? (
                <Link href={`/billing/payments?page=${currentPage + 1}`}>Next</Link>
              ) : (
                <span>Next</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
