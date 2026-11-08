'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/ui/confirm-dialog';
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
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { Badge } from '@/components/ui/badge';
import { getDocumentLogoText } from '@/lib/document-logo';
import { formatZAR, fmtDate } from '@/lib/format';
import { STATUS_TEXT_COLORS } from '@/lib/billing-status';
import type { InvoiceRow } from '@pmg/db';

interface InvoicesClientProps {
  entries: InvoiceRow[];
  total: number;
  currentPage: number;
  pageSize: number;
  divisionId?: string;
  status?: string;
  fullyPaidCount?: number;
  partiallyPaidCount?: number;
  outstandingCount?: number;
  issueAction: (id: string) => Promise<{ error?: string }>;
  voidAction: (id: string) => Promise<{ error?: string }>;
}

export function InvoicesClient({
  entries,
  total,
  currentPage,
  pageSize,
  divisionId,
  status,
  fullyPaidCount = 0,
  partiallyPaidCount = 0,
  outstandingCount = 0,
  issueAction,
  voidAction,
}: InvoicesClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (divisionId) params.set('divisionId', divisionId);
    if (status) params.set('status', status);
    const qs = params.toString();
    return `/billing/invoices${qs ? `?${qs}` : ''}`;
  }

  function handleIssue(id: string, docNumber: string) {
    startTransition(async () => {
      const result = await issueAction(id);
      if (result.error) toast.error(result.error);
      else toast.success(`${docNumber} issued.`);
    });
  }

  async function handleVoid(id: string, docNumber: string) {
    const confirmed = await confirm({
      title: 'Void Invoice',
      description: `Are you sure you want to void invoice ${docNumber}? This action cannot be undone.`,
      confirmText: 'Void Invoice',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await voidAction(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${docNumber} voided.`);
        router.refresh();
      }
    });
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        message={
          divisionId || status
            ? 'No invoices match the current filters.'
            : 'No invoices yet. Create your first invoice to get started.'
        }
        filtered={!!(divisionId || status)}
        ctaLabel={!divisionId && !status ? 'New Invoice' : undefined}
        ctaHref={!divisionId && !status ? '/billing/invoices/new' : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status === 'paid' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-muted/40 px-3 py-2 rounded-md border border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Paid & Partially Paid Invoices</span>
            <span className="text-muted-foreground hidden sm:inline">
              · Sorted with partially paid on top
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {partiallyPaidCount} Partially Paid
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {fullyPaidCount} Fully Paid
            </span>
          </div>
        </div>
      )}

      {status === 'only_outstanding' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-muted/40 px-3 py-2 rounded-md border border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Outstanding Invoices</span>
            <span className="text-muted-foreground hidden sm:inline">
              · Requiring payment collection
            </span>
          </div>
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {total} Outstanding Invoice{total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border overflow-hidden">
        <Table className="table-fixed w-full" containerClassName="overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[125px] px-2 text-xs">Invoice #</TableHead>
              <TableHead className="px-2 text-xs">Reference</TableHead>
              <TableHead className="px-2 text-xs">Client</TableHead>
              <TableHead className="w-[80px] px-2 text-xs">Issue Date</TableHead>
              <TableHead className="w-[80px] px-2 text-xs">Due Date</TableHead>
              <TableHead className="w-[85px] px-2 text-right text-xs">Total</TableHead>
              <TableHead className="w-[80px] px-2 text-right text-xs">Paid</TableHead>
              <TableHead className="w-[85px] px-2 text-right text-xs">Balance Due</TableHead>
              <TableHead className="w-[110px] px-2 text-center text-xs">Status</TableHead>
              <TableHead className="w-10 px-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((inv) => {
              const invTotal = Number(inv.total);
              const invPaid =
                inv.status === 'paid'
                  ? invTotal
                  : Math.min(invTotal, Number(inv.allocatedAmount || 0));
              const invBalance = Math.max(0, invTotal - invPaid);

              return (
                <TableRow
                  key={inv.id}
                  className="hover:bg-muted/40 transition-colors border-b border-border relative"
                >
                  <TableCell className="font-medium px-2 truncate">
                    <Link
                      href={`/billing/invoices/${inv.id}`}
                      className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                      aria-label={`View invoice ${inv.documentNumber}`}
                    />
                    <span className="hover:underline text-primary font-semibold relative z-10 font-mono text-xs">
                      {inv.documentNumber}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 truncate" title={inv.reference || undefined}>
                    {inv.reference ? (
                      <span className="text-muted-foreground truncate block text-xs">
                        {inv.reference}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground/50 text-xs">None</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground px-2 truncate"
                    title={inv.clientName || undefined}
                  >
                    <span className="truncate block text-xs">
                      {inv.clientName ?? <span className="italic">No client</span>}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-xs px-2 whitespace-nowrap">
                    {fmtDate(inv.invoiceDate)}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs text-muted-foreground px-2 whitespace-nowrap">
                    {fmtDate(inv.dueDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-medium px-2 whitespace-nowrap">
                    {formatZAR(invTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs px-2 whitespace-nowrap">
                    <span
                      className={
                        invPaid > 0 ? 'text-emerald-600 font-medium' : 'text-muted-foreground'
                      }
                    >
                      {formatZAR(invPaid)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-semibold px-2 whitespace-nowrap">
                    <span
                      className={
                        invBalance === 0
                          ? 'text-emerald-600 font-medium'
                          : 'text-amber-600 font-semibold'
                      }
                    >
                      {formatZAR(invBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 text-center whitespace-nowrap">
                    <BillingStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="relative z-10 px-2 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" title="Actions">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/billing/invoices/${inv.id}`}>View</Link>
                        </DropdownMenuItem>
                        {inv.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleIssue(inv.id, inv.documentNumber)}>
                            Issue Invoice
                          </DropdownMenuItem>
                        )}
                        {(inv.status === 'draft' ||
                          inv.status === 'issued' ||
                          inv.status === 'overdue') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleVoid(inv.id, inv.documentNumber)}
                            >
                              Void
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of{' '}
          {total}
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
