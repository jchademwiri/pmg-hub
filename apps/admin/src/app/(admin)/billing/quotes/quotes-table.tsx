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
import { DataList } from '@/components/ui/data-list';
import { confirm } from '@/components/ui/confirm-dialog';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { formatZAR, fmtDate } from '@/lib/format';
import type { QuotationRow } from '@pmg/db';

import { MobileQuoteCard } from '@/components/billing/mobile-quote-card';

import { convertQuotationToInvoice } from '@/app/actions/billing-quotes';

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

  function handleConvert(id: string, docNumber: string) {
    startTransition(async () => {
      const result = await convertQuotationToInvoice(id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.id) {
        toast.success(`Quote ${docNumber} converted to Invoice!`);
        router.push(`/billing/invoices/${result.id}`);
      }
    });
  }

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

  const desktopView = (
    <div className="overflow-x-auto rounded-md border border-border">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
                No quotations match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((quote) => (
            <TableRow 
              key={quote.id}
              className="hover:bg-muted/40 transition-colors border-b border-border relative cursor-pointer"
            >
              <TableCell className="font-medium">
                <Link
                  href={`/billing/quotes/${quote.id}`}
                  className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                  aria-label={`View quote ${quote.documentNumber}`}
                />
                <span className="hover:underline text-primary font-semibold relative z-10">
                  {quote.documentNumber}
                </span>
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
            </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const mobileView = (
    <>
      {entries.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground text-sm border border-border rounded-md">
          No quotations match the current filters.
        </div>
      ) : (
        entries.map((quote) => (
          <MobileQuoteCard
            key={quote.id}
            quote={quote}
            handleStatusChange={handleStatusChange}
            handleDelete={handleDelete}
            handleDuplicate={handleDuplicate}
            statusColors={QUOTE_STATUS_COLORS}
          />
        ))
      )}
    </>
  );

  return (
    <DataList desktop={desktopView} mobile={mobileView} />
  );
}
