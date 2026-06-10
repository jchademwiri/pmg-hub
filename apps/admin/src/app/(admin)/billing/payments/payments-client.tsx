'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, Pencil, Trash2, X, Check, Lock, Eye } from 'lucide-react';
import { formatZAR, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const today = new Date().toISOString().split('T')[0]!;

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
  divisions,
  clients,
  closedPeriods,
  updateAction,
  deleteAction,
}: {
  entry: PaymentEntry;
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  closedPeriods: string[];
  updateAction: PaymentsClientProps['updateAction'];
  deleteAction: PaymentsClientProps['deleteAction'];
}) {
  const period = entry.date.slice(0, 7);
  const isLocked = closedPeriods.includes(period);
  const [mode, setMode] = React.useState<'display' | 'edit'>('display');
  const [editDate, setEditDate] = React.useState(entry.date);
  const [editDivisionId, setEditDivisionId] = React.useState(entry.divisionId);
  const [editClientId, setEditClientId] = React.useState(entry.clientId ?? '');
  const [editDesc, setEditDesc] = React.useState(entry.description);
  const [editAmount, setEditAmount] = React.useState(String(entry.amount));
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, startSaveTransition] = React.useTransition();

  function startEdit() {
    setEditDate(entry.date);
    setEditDivisionId(entry.divisionId);
    setEditClientId(entry.clientId ?? '');
    setEditDesc(entry.description);
    setEditAmount(String(entry.amount));
    setError(null);
    setMode('edit');
  }

  function handleSave() {
    setError(null);
    const amountVal = parseFloat(editAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (!editClientId || editClientId === 'none') {
      setError('Please select a client.');
      return;
    }

    startSaveTransition(async () => {
      const result = await updateAction(entry.id, {
        date: editDate,
        divisionId: editDivisionId,
        clientId: editClientId,
        description: editDesc,
        amount: amountVal,
      });
      if (result.error) setError(result.error);
      else setMode('display');
    });
  }

  async function handleDeleteClick() {
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

  if (mode === 'edit') {
    return (
      <>
        <TableRow className="bg-muted/30">
          <TableCell>
            <Input
              type="date"
              value={editDate}
              max={today}
              min={isLocked ? entry.date : undefined}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-36 text-xs h-8"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell>
            <Select value={editClientId || undefined} onValueChange={setEditClientId} disabled={isSaving}>
              <SelectTrigger className="w-40 text-xs h-8">
                <SelectValue placeholder="Select Client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.businessName ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Select value={editDivisionId} onValueChange={setEditDivisionId} disabled={isSaving}>
              <SelectTrigger className="w-36 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description"
              className="w-44 text-xs h-8"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-28 text-right font-semibold text-xs h-8"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell className="text-right text-muted-foreground tabular-nums text-xs">
            {formatZAR(entry.allocated)}
          </TableCell>
          <TableCell className="text-right tabular-nums text-xs">
            {entry.credit > 0 ? (
              <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[11px]">
                {formatZAR(entry.credit)}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button size="xs" onClick={handleSave} disabled={isSaving}>
                <Check className="size-3.5 mr-0.5" />
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setMode('display')}
                disabled={isSaving}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {error && (
          <TableRow>
            <TableCell colSpan={8} className="py-1">
              <p className="text-xs text-destructive">{error}</p>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  }

  return (
    <TableRow className="hover:bg-muted/10 transition-colors">
      <TableCell className="font-medium">
        <Link
          href={`/billing/payments/${entry.id}`}
          className="flex items-center gap-1.5 whitespace-nowrap text-xs text-primary hover:underline"
        >
          <Calendar className="size-3.5" />
          {fmtDate(entry.date)}
        </Link>
      </TableCell>
      <TableCell>
        {entry.clientId ? (
          <Link
            href={`/relationships/clients/${entry.clientId}`}
            className="font-medium text-primary hover:underline text-xs"
          >
            {entry.clientName}
          </Link>
        ) : (
          <span className="font-medium text-foreground text-xs">{entry.clientName}</span>
        )}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground">
          {entry.divisionName}
        </span>
      </TableCell>
      <TableCell className="truncate max-w-xs text-xs" title={entry.description}>
        <Link
          href={`/billing/payments/${entry.id}`}
          className="hover:text-primary hover:underline"
        >
          {entry.description || '-'}
        </Link>
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold text-xs">
        {formatZAR(entry.amount)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
        {formatZAR(entry.allocated)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-xs">
        {entry.credit > 0 ? (
          <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[11px]">
            {formatZAR(entry.credit)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/billing/payments/${entry.id}`}>
              <Eye className="size-3.5" />
              <span className="sr-only">View</span>
            </Link>
          </Button>
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
            <>
              <Button variant="ghost" size="icon-sm" onClick={startEdit}>
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={handleDeleteClick}>
                <Trash2 className="size-3.5 text-destructive" />
                <span className="sr-only">Delete</span>
              </Button>
            </>
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
      <div className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Reference / Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Credit Balance</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-xs">
                  No payments recorded yet. Click &quot;Record Payment&quot; above to get started.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((p) => (
                <PaymentRow
                  key={p.id}
                  entry={p}
                  divisions={divisions}
                  clients={clients}
                  closedPeriods={closedPeriods}
                  updateAction={updateAction}
                  deleteAction={deleteAction}
                />
              ))
            )}
          </TableBody>
        </Table>

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
