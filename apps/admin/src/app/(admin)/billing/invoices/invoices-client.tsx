'use client';

import Link from 'next/link';
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
  issueAction,
  voidAction,
}: InvoicesClientProps) {
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
      else toast.success(`${docNumber} voided.`);
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((inv) => (
            <TableRow 
              key={inv.id}
              className="hover:bg-muted/40 transition-colors border-b border-border relative"
            >
              <TableCell className="font-medium">
                <Link
                  href={`/billing/invoices/${inv.id}`}
                  className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                  aria-label={`View invoice ${inv.documentNumber}`}
                />
                {inv.documentNumber}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px] tracking-wide">
                  {getDocumentLogoText(inv.divisionName)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {inv.clientName ?? <span className="italic">No client</span>}
              </TableCell>
              <TableCell className="tabular-nums text-sm">
                {fmtDate(inv.invoiceDate)}
              </TableCell>
              <TableCell className="tabular-nums text-sm text-muted-foreground">
                {fmtDate(inv.dueDate)}
              </TableCell>
              <TableCell className={`text-right tabular-nums text-sm font-medium ${STATUS_TEXT_COLORS[inv.status] || ''}`}>
                {formatZAR(Number(inv.total))}
              </TableCell>
              <TableCell>
                <BillingStatusBadge status={inv.status} />
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
                      <Link href={`/billing/invoices/${inv.id}`}>View</Link>
                    </DropdownMenuItem>
                    {inv.status === 'draft' && (
                      <DropdownMenuItem onClick={() => handleIssue(inv.id, inv.documentNumber)}>
                        Issue Invoice
                      </DropdownMenuItem>
                    )}
                    {(inv.status === 'draft' || inv.status === 'issued' || inv.status === 'overdue') && (
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
