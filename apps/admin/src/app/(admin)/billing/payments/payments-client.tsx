'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Trash2, Lock } from 'lucide-react';
import { formatZAR, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { confirm } from '@/components/ui/confirm-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PaymentEntry {
  id: string;
  date: string;
  divisionId: string;
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
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  divisionId?: string;
  month?: string;
  closedPeriods: string[];
  updateAction: (
    id: string,
    data: {
      date: string;
      divisionId: string;
      clientId: string;
      description: string;
      amount: number;
    }
  ) => Promise<{ error?: string; success?: boolean }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

function PaymentRow({
  entry,
  closedPeriods,
  deleteAction,
}: {
  entry: PaymentEntry;
  closedPeriods: string[];
  deleteAction: PaymentsClientProps['deleteAction'];
}) {
  const router = useRouter();
  const period = entry.date.slice(0, 7);
  const isLocked = closedPeriods.includes(period);

  async function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete payment record?',
      description: 'This action cannot be undone and will revert all allocations to invoices.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    const result = await deleteAction(entry.id);
    if (result.error) toast.error(result.error);
    else toast.success('Payment deleted successfully.');
  }

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
      onClick={() => router.push(`/billing/payments/${entry.id}`)}
    >
      <TableCell className="font-medium text-xs py-3">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Calendar className="size-3.5 text-muted-foreground" />
          {fmtDate(entry.date)}
        </div>
      </TableCell>
      <TableCell className="text-xs py-3">
        {entry.clientName}
      </TableCell>
      <TableCell className="py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground">
          {entry.divisionName}
        </span>
      </TableCell>
      <TableCell className="truncate max-w-xs text-xs py-3" title={entry.description}>
        {entry.description || '-'}
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold text-xs py-3">
        {formatZAR(entry.amount)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-xs py-3">
        {entry.credit > 0 ? (
          <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[11px]">
            {formatZAR(entry.credit)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="py-3 w-16" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 justify-end">
          {isLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled>
                  <Lock className="size-3.5 text-muted-foreground/30" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Period is closed</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={handleDeleteClick} title="Delete">
              <Trash2 className="size-3.5 text-destructive" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PaymentsClient({
  entries,
  total,
  currentPage,
  pageSize,
  divisions,
  clients,
  divisionId,
  month,
  closedPeriods,
  updateAction,
  deleteAction,
}: PaymentsClientProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Reference / Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Credit Balance</TableHead>
                <TableHead className="text-right w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
                    No payments recorded yet. Click &quot;Record Payment&quot; above to get started.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((p) => (
                  <PaymentRow
                    key={p.id}
                    entry={p}
                    closedPeriods={closedPeriods}
                    deleteAction={deleteAction}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2 text-xs">
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
                  <Link
                    href={`/billing/payments?page=${currentPage - 1}${
                      divisionId ? `&divisionId=${divisionId}` : ''
                    }${month ? `&month=${month}` : ''}`}
                  >
                    Previous
                  </Link>
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
                  <Link
                    href={`/billing/payments?page=${currentPage + 1}${
                      divisionId ? `&divisionId=${divisionId}` : ''
                    }${month ? `&month=${month}` : ''}`}
                  >
                    Next
                  </Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
