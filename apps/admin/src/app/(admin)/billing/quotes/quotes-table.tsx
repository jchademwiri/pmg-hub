'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { confirm } from '@/components/ui/confirm-dialog';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { formatZAR, fmtDate } from '@/lib/format';
import type { QuotationRow } from '@pmg/db';

interface QuotesTableProps {
  entries: QuotationRow[];
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateStatusAction: (
    id: string,
    status: 'sent' | 'accepted' | 'declined' | 'cancelled',
  ) => Promise<{ error?: string }>;
  duplicateAction: (id: string) => Promise<{ error?: string; id?: string }>;
}

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: 'text-zinc-600',
  sent: 'text-blue-600',
  accepted: 'text-emerald-600',
  declined: 'text-red-600',
  expired: 'text-amber-600',
  void: 'text-zinc-600 line-through',
  cancelled: 'text-zinc-600 line-through',
};

export function QuotesTable({
  entries,
  deleteAction,
  updateStatusAction,
  duplicateAction,
}: QuotesTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleStatusChange(
    id: string,
    newStatus: 'sent' | 'accepted' | 'declined' | 'cancelled',
  ) {
    startTransition(async () => {
      const result = await updateStatusAction(id, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Quote marked as ${newStatus}.`);
        router.refresh();
      }
    });
  }

  async function handleDelete(id: string, docNumber: string) {
    const confirmed = await confirm({
      title: `Delete quote ${docNumber}?`,
      description: 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteAction(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Quote deleted.');
        router.refresh();
      }
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateAction(id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.id) {
        toast.success('Quote duplicated.');
        router.push(`/billing/quotes/${result.id}/edit`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quote #</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-xs">
                No quotations match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((quote) => (
            <TableRow 
              key={quote.id}
              className="hover:bg-muted/40 transition-colors border-b border-border relative"
            >
              <TableCell className="font-medium">
                <Link
                  href={`/billing/quotes/${quote.id}`}
                  className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                  aria-label={`View quote ${quote.documentNumber}`}
                />
                {quote.documentNumber}
              </TableCell>
              <TableCell>
                {quote.reference ? (
                  <span className="text-muted-foreground">{quote.reference.length > 30 ? quote.reference.slice(0, 30) + '...' : quote.reference}</span>
                ) : (
                  <span className="italic text-muted-foreground/50">None</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {quote.clientName ?? <span className="italic">No client</span>}
              </TableCell>
              <TableCell className="tabular-nums text-sm">
                {fmtDate(quote.quoteDate)}
              </TableCell>
              <TableCell className="tabular-nums text-sm text-muted-foreground">
                {fmtDate(quote.expiryDate)}
              </TableCell>
              <TableCell className={`text-right tabular-nums text-sm font-medium ${QUOTE_STATUS_COLORS[quote.status] || ''}`}>
                {formatZAR(Number(quote.total))}
              </TableCell>
              <TableCell>
                <BillingStatusBadge status={quote.status} />
              </TableCell>
              <TableCell className="relative z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" title="Actions">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/billing/quotes/${quote.id}`}>View</Link>
                    </DropdownMenuItem>
                    {quote.status === 'draft' && (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(quote.id, 'sent')}
                      >
                        Mark Sent
                      </DropdownMenuItem>
                    )}
                    {quote.status === 'sent' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(quote.id, 'accepted')}
                        >
                          Mark Accepted
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(quote.id, 'declined')}
                        >
                          Mark Declined
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDuplicate(quote.id)}>
                      Duplicate
                    </DropdownMenuItem>
                    {(quote.status === 'draft' || quote.status === 'sent') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(quote.id, quote.documentNumber)}
                          disabled={quote.status !== 'draft'}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
