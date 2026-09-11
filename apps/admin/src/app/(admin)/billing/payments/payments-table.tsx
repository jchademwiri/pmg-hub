'use client';

import * as React from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface PaymentEntry {
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

interface PaymentsTableProps {
  entries: PaymentEntry[];
  closedPeriods: string[];
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

function PaymentRow({
  entry,
  closedPeriods,
  deleteAction,
}: {
  entry: PaymentEntry;
  closedPeriods: string[];
  deleteAction: PaymentsTableProps['deleteAction'];
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const period = entry.date.slice(0, 7);
  const isLocked = closedPeriods.includes(period);

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    const confirmed = await confirm({
      title: 'Delete payment record?',
      description: 'This action cannot be undone and will revert all allocations to invoices.',
      confirmText: 'Delete',
      variant: 'destructive',
    });

    if (confirmed) {
      setIsDeleting(true);
      const result = await deleteAction(entry.id);
      setIsDeleting(false);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Payment deleted successfully.');
        router.refresh();
      }
    }
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
      onClick={() => router.push(`/billing/payments/${entry.id}`)}
    >
      <TableCell className="font-medium text-xs py-3 px-2 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground shrink-0" />
          {fmtDate(entry.date)}
        </div>
      </TableCell>
      <TableCell className="text-xs py-3 px-2 truncate" title={entry.clientName}>
        <span className="truncate block">{entry.clientName}</span>
      </TableCell>
      <TableCell className="py-3 px-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground whitespace-nowrap">
          {entry.divisionName}
        </span>
      </TableCell>
      <TableCell className="truncate text-xs py-3 px-2" title={entry.description}>
        <span className="truncate block text-muted-foreground">{entry.description || '-'}</span>
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold text-xs py-3 px-2 text-emerald-600 whitespace-nowrap">
        {formatZAR(entry.amount)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-xs py-3 px-2 whitespace-nowrap">
        {entry.credit > 0 ? (
          <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[11px]">
            {formatZAR(entry.credit)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="py-3 px-2 w-14" onClick={(e) => e.stopPropagation()}>
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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              title="Delete"
            >
              <Trash2 className="size-3.5 text-destructive" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function MobilePaymentCard({
  entry,
  closedPeriods,
  deleteAction,
}: {
  entry: PaymentEntry;
  closedPeriods: string[];
  deleteAction: PaymentsTableProps['deleteAction'];
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const period = entry.date.slice(0, 7);
  const isLocked = closedPeriods.includes(period);

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    const confirmed = await confirm({
      title: 'Delete payment record?',
      description: 'This action cannot be undone and will revert all allocations to invoices.',
      confirmText: 'Delete',
      variant: 'destructive',
    });

    if (confirmed) {
      setIsDeleting(true);
      const result = await deleteAction(entry.id);
      setIsDeleting(false);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Payment deleted successfully.');
        router.refresh();
      }
    }
  };

  return (
    <div
      className="bg-card border rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
      onClick={() => router.push(`/billing/payments/${entry.id}`)}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="font-semibold text-sm truncate">{entry.clientName}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Calendar className="size-3" /> {fmtDate(entry.date)}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="truncate max-w-[120px] bg-secondary text-secondary-foreground px-1.5 rounded">
              {entry.divisionName}
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1 shrink-0">
          <div className="font-bold text-emerald-600 text-sm">{formatZAR(entry.amount)}</div>
          {entry.credit > 0 && (
            <span className="font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[10px]">
              Credit: {formatZAR(entry.credit)}
            </span>
          )}
        </div>
      </div>

      {entry.description && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded border border-border/40 line-clamp-2">
          {entry.description}
        </div>
      )}

      <div
        className="flex justify-end pt-2 border-t border-border/40 mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        {isLocked ? (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="h-7 px-2 text-xs text-muted-foreground/50"
          >
            <Lock className="size-3 mr-1.5" /> Locked
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3 mr-1.5" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export function PaymentsTable({ entries, closedPeriods, deleteAction }: PaymentsTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8 px-4 border rounded-lg bg-card border-dashed">
        No payments recorded yet. Click &quot;Record Payment&quot; above to get started.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* Mobile View */}
        <div className="flex md:hidden flex-col gap-3">
          {entries.map((p) => (
            <MobilePaymentCard
              key={p.id}
              entry={p}
              closedPeriods={closedPeriods}
              deleteAction={deleteAction}
            />
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block border rounded-lg bg-card">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] px-2 text-xs">Date</TableHead>
                <TableHead className="w-[180px] px-2 text-xs">Client</TableHead>
                <TableHead className="w-[100px] px-2 text-xs">Division</TableHead>
                <TableHead className="px-2 text-xs">Reference / Description</TableHead>
                <TableHead className="w-[100px] px-2 text-right text-xs">Amount</TableHead>
                <TableHead className="w-[110px] px-2 text-right text-xs">Credit Balance</TableHead>
                <TableHead className="text-right w-14 px-2 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((p) => (
                <PaymentRow
                  key={p.id}
                  entry={p}
                  closedPeriods={closedPeriods}
                  deleteAction={deleteAction}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
