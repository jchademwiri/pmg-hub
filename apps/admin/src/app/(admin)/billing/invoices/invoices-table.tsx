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
import { confirm } from '@/components/ui/confirm-dialog';
import { DataList } from '@/components/ui/data-list';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { formatZAR, fmtDate } from '@/lib/format';
import type { InvoiceRow } from '@pmg/db';

interface InvoicesTableProps {
  entries: InvoiceRow[];
  issueAction: (id: string) => Promise<{ error?: string }>;
  voidAction: (id: string) => Promise<{ error?: string }>;
}

export function InvoicesTable({
  entries,
  issueAction,
  voidAction,
}: InvoicesTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleIssue(id: string, docNumber: string) {
    startTransition(async () => {
      const result = await issueAction(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${docNumber} issued.`);
        router.refresh();
      }
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

  const desktopView = (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-xs">
                No invoices match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((inv) => (
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
                  {inv.reference ? (
                    <span className="text-muted-foreground">{inv.reference.length > 30 ? inv.reference.slice(0, 30) + '...' : inv.reference}</span>
                  ) : (
                    <span className="italic text-muted-foreground/50">None</span>
                  )}
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
                <TableCell className="text-right tabular-nums text-sm font-medium">
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
                      <DropdownMenuItem asChild>
                        <Link href={`/billing/invoices/${inv.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                      {inv.status === 'draft' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleIssue(inv.id, inv.documentNumber)}
                          >
                            Mark Issued
                          </DropdownMenuItem>
                        </>
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
          No invoices match the current filters.
        </div>
      ) : (
        entries.map((inv) => (
          <div key={inv.id} className="relative flex flex-col p-4 border border-border rounded-lg bg-card shadow-sm transition-shadow">
            <Link
              href={`/billing/invoices/${inv.id}`}
              className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              aria-label={`View invoice ${inv.documentNumber}`}
            />
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-foreground">{inv.documentNumber}</p>
                <p className="text-sm text-muted-foreground">{inv.clientName ?? 'No client'}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-bold tabular-nums">{formatZAR(Number(inv.total))}</span>
                <BillingStatusBadge status={inv.status} />
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
              <span>Due {fmtDate(inv.dueDate)}</span>
              <div className="relative z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="touch" className="h-8 w-8 min-h-0 min-w-0 p-0" title="Actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/billing/invoices/${inv.id}`}>View</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/billing/invoices/${inv.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    {inv.status === 'draft' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleIssue(inv.id, inv.documentNumber)}>
                          Mark Issued
                        </DropdownMenuItem>
                      </>
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
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );

  return (
    <DataList desktop={desktopView} mobile={mobileView} />
  );
}
