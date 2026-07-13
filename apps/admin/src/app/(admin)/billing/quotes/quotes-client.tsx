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
import { Badge } from '@/components/ui/badge';
import { getDocumentLogoText } from '@/lib/document-logo';
import { formatZAR, fmtDate } from '@/lib/format';
import { Pagination } from '@/components/ui/pagination';
import type { QuotationRow } from '@pmg/db';

interface QuotesClientProps {
  entries: QuotationRow[];
  total: number;
  currentPage: number;
  pageSize: number;
  divisionId?: string;
  status?: string;
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

export function QuotesClient({
  entries,
  total,
  currentPage,
  pageSize,
  divisionId,
  status,
  deleteAction,
  updateStatusAction,
  duplicateAction,
}: QuotesClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (divisionId) params.set('divisionId', divisionId);
    if (status) params.set('status', status);
    const qs = params.toString();
    return `/billing/quotes${qs ? `?${qs}` : ''}`;
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

  if (entries.length === 0) {
    return (
      <EmptyState
        message={
          divisionId || status
            ? 'No quotations match the current filters.'
            : 'No quotations yet. Create your first quote to get started.'
        }
        filtered={!!(divisionId || status)}
        ctaLabel={!divisionId && !status ? 'New Quote' : undefined}
        ctaHref={!divisionId && !status ? '/billing/quotes/new' : undefined}
      />
    );
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
          {entries.map((quote) => (
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
                  <span className="text-muted-foreground">{quote.reference}</span>
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
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, total)} of {total}
        </span>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(total / pageSize)}
          buildHref={buildHref}
        />
      </div>
    </div>
  );
}
