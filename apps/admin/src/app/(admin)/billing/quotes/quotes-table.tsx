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
    <div className="rounded-md border border-border overflow-hidden">
      <Table className="table-fixed w-full" containerClassName="overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[130px] px-2 text-xs">Quote #</TableHead>
            <TableHead className="px-2 text-xs">Reference</TableHead>
            <TableHead className="px-2 text-xs">Client</TableHead>
            <TableHead className="w-[80px] px-2 text-xs">Date</TableHead>
            <TableHead className="w-[80px] px-2 text-xs">Expires</TableHead>
            <TableHead className="w-[85px] px-2 text-right text-xs">Amount</TableHead>
            <TableHead className="w-[90px] px-2 text-center text-xs">Status</TableHead>
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
                <TableCell className="font-medium px-2 truncate">
                  <Link
                    href={`/billing/quotes/${quote.id}`}
                    className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    aria-label={`View quote ${quote.documentNumber}`}
                  />
                  <span className="hover:underline text-primary font-semibold relative z-10 font-mono text-xs">
                    {quote.documentNumber}
                  </span>
                </TableCell>
                <TableCell className="px-2 truncate" title={quote.reference || undefined}>
                  {quote.reference ? (
                    <span className="text-muted-foreground truncate block text-xs">
                      {quote.reference}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground/50 text-xs">None</span>
                  )}
                </TableCell>
                <TableCell
                  className="text-muted-foreground px-2 truncate"
                  title={quote.clientName || undefined}
                >
                  <span className="truncate block text-xs">
                    {quote.clientName ?? <span className="italic">No client</span>}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums text-xs px-2 whitespace-nowrap">
                  {fmtDate(quote.quoteDate)}
                </TableCell>
                <TableCell className="tabular-nums text-xs text-muted-foreground px-2 whitespace-nowrap">
                  {fmtDate(quote.expiryDate)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums text-xs font-medium px-2 whitespace-nowrap ${QUOTE_STATUS_COLORS[quote.status] || ''}`}
                >
                  {formatZAR(Number(quote.total))}
                </TableCell>
                <TableCell className="px-2 text-center whitespace-nowrap">
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

  return <DataList desktop={desktopView} mobile={mobileView} />;
}
