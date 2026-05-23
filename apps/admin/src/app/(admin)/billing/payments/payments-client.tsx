'use client';

import Link from 'next/link';
import { FileEdit, Info, Calendar } from 'lucide-react';
import { formatZAR } from '@/lib/format';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="flex flex-col gap-4">
      {/* Table wrapper */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Client</th>
              <th className="p-3">Division</th>
              <th className="p-3">Reference / Description</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Allocated</th>
              <th className="p-3 text-right">Credit Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No payments recorded yet. Click &quot;Record Payment&quot; above to get started.
                </td>
              </tr>
            ) : (
              entries.map((p) => (
                <tr key={p.id} className="hover:bg-muted/10">
                  <td className="p-3 whitespace-nowrap text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {p.date}
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-foreground">{p.clientName}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                      {p.divisionName}
                    </span>
                  </td>
                  <td className="p-3 truncate max-w-xs" title={p.description}>
                    {p.description}
                  </td>
                  <td className="p-3 text-right tabular-nums font-semibold">
                    {formatZAR(p.amount)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">
                    {formatZAR(p.allocated)}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {p.credit > 0 ? (
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        {formatZAR(p.credit)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
