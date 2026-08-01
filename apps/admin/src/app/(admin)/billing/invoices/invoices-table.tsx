'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { MoreHorizontal, Download, Copy, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

import { MobileInvoiceCard } from '@/components/billing/mobile-invoice-card';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected = entries.length > 0 && selectedIds.length === entries.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entries.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkExportCSV = () => {
    const selectedRows = entries.filter((e) => selectedIds.includes(e.id));
    if (selectedRows.length === 0) return;

    const headers = ['Invoice Number', 'Client', 'Reference', 'Issue Date', 'Due Date', 'Total (ZAR)', 'Status'];
    const csvContent = [
      headers.join(','),
      ...selectedRows.map((r) =>
        [
          `"${r.documentNumber}"`,
          `"${r.clientName || ''}"`,
          `"${r.reference || ''}"`,
          `"${r.invoiceDate}"`,
          `"${r.dueDate}"`,
          `"${r.total}"`,
          `"${r.status}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selected-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedRows.length} invoices to CSV.`);
  };

  const handleCopyNumbers = () => {
    const selectedRows = entries.filter((e) => selectedIds.includes(e.id));
    const numbers = selectedRows.map((r) => r.documentNumber).join(', ');
    navigator.clipboard.writeText(numbers);
    toast.success(`Copied ${selectedRows.length} invoice numbers to clipboard.`);
  };

  const handleBulkSendReminders = async () => {
    const selectedRows = entries.filter((e) => selectedIds.includes(e.id));
    if (selectedRows.length === 0) return;

    const { sendCustomizedReminderAction, getPendingRemindersAction } = await import('@/app/actions/send-overdue-reminders');

    startTransition(async () => {
      try {
        const pendingRes = await getPendingRemindersAction();
        if (!pendingRes.success || !pendingRes.data) {
          toast.error('Failed to load client reminder data.');
          return;
        }

        let sentCount = 0;

        for (const clientItem of pendingRes.data) {
          const matchingInvoiceIds = clientItem.invoices
            .filter((inv) => selectedIds.includes(inv.id))
            .map((inv) => inv.id);

          if (matchingInvoiceIds.length > 0 && clientItem.email) {
            const clientLabel = clientItem.businessName || clientItem.clientName;
            const res = await sendCustomizedReminderAction({
              clientId: clientItem.clientId,
              recipientEmail: clientItem.email,
              subject: `Overdue Payment Reminder - ${clientLabel}`,
              invoiceIds: matchingInvoiceIds,
            });

            if (res.success) {
              sentCount++;
            }
          }
        }

        if (sentCount > 0) {
          toast.success(`Sent payment reminders to ${sentCount} client(s).`);
          router.refresh();
        } else {
          toast.info('No overdue invoices with valid client email addresses found in selection.');
        }
      } catch (err) {
        toast.error('Failed to send reminders.');
        console.error(err);
      }
    });
  };

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
    <div className="flex flex-col gap-2">
      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
            <CheckSquare className="h-4 w-4" />
            <span>{selectedIds.length} invoice(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20" onClick={handleBulkSendReminders}>
              <Mail className="h-3 w-3" />
              Send Reminders
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkExportCSV}>
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCopyNumbers}>
              <Copy className="h-3 w-3" />
              Copy Numbers
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setSelectedIds([])}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all invoices"
                />
              </TableHead>
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
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-xs">
                  No invoices match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((inv) => {
                const isSelected = selectedIds.includes(inv.id);
                return (
                  <TableRow 
                    key={inv.id}
                    className={`hover:bg-muted/40 transition-colors border-b border-border relative ${isSelected ? 'bg-blue-500/5' : ''}`}
                  >
                    <TableCell className="relative z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectOne(inv.id)}
                        aria-label={`Select invoice ${inv.documentNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/billing/invoices/${inv.id}`}
                        className="hover:underline text-primary font-semibold"
                        aria-label={`View invoice ${inv.documentNumber}`}
                      >
                        {inv.documentNumber}
                      </Link>
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
                          {!['paid', 'void', 'written_off'].includes(inv.status) && (
                            <DropdownMenuItem asChild>
                              <Link href={`/billing/invoices/${inv.id}/edit`}>Edit</Link>
                            </DropdownMenuItem>
                          )}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
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
          <MobileInvoiceCard key={inv.id} inv={inv} handleIssue={handleIssue} handleVoid={handleVoid} />
        ))
      )}
    </>
  );

  return (
    <DataList desktop={desktopView} mobile={mobileView} />
  );
}
