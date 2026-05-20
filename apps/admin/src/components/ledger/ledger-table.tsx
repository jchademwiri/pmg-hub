'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Lock } from 'lucide-react';
import { formatZAR, fmtDate } from '@/lib/format';
import { LedgerEditForm } from './ledger-edit-form';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type LedgerEntry = {
  id: string;
  date: string;
  description: string | null;
  amount: string | number;
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share';
  entryType: 'spend' | 'transfer' | 'adjustment';
};

interface LedgerTableProps {
  entries: LedgerEntry[];
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  disabled?: boolean;
  closedPeriods?: string[];
}

export function LedgerTable({
  entries,
  updateAction,
  deleteAction,
  disabled = false,
  closedPeriods,
}: LedgerTableProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteAction(deleteId);
    if (result.error) toast.error(result.error);
    else toast.success('Deleted successfully');
    setDeleteId(null);
  }

  // Sort descending by date
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-muted-foreground border rounded-md p-8 text-center bg-card">
        No ledger entries found.
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleDelete}
        title="Delete ledger entry"
        description="Are you sure you want to delete this ledger entry? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Bucket</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((entry) => {
            const isEditing = editingId === entry.id;
            const period = entry.date.slice(0, 7);
            const isLocked = closedPeriods?.includes(period);
            const minDate = isLocked ? entry.date : undefined;

            if (isEditing) {
              return (
                <TableRow key={entry.id} className="bg-muted/10">
                  <TableCell colSpan={6} className="p-2">
                    <LedgerEditForm
                      entry={entry}
                      updateAction={updateAction}
                      onCancel={() => setEditingId(null)}
                      disabled={disabled}
                      minDate={minDate}
                    />
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {fmtDate(entry.date)}
                </TableCell>
                <TableCell className="capitalize">{entry.allocationType}</TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {entry.entryType}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={entry.description || ''}>
                  {entry.description || '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatZAR(Number(entry.amount))}
                </TableCell>
                <TableCell>
                  {isLocked ? (
                    <Button variant="ghost" size="icon" disabled title="Period is closed">
                      <Lock className="h-4 w-4 text-muted-foreground/30" />
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={disabled}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingId(entry.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          onClick={() => setDeleteId(entry.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
