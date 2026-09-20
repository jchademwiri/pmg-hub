'use client';

import * as React from 'react';
import { Pencil, Trash2, X, Check, Lock, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import type { ExpenseRow } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatZAR, fmtDate, formatDivisionAbbr, stripExpenseDescription } from '@/lib/format';
import { confirm } from '@/components/ui/confirm-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const today = new Date().toISOString().split('T')[0]!;

interface ExpenseTableProps {
  entries: ExpenseRow[];
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  closedPeriods?: string[];
  minDate?: string;
}

function ExpenseTableRow({
  entry,
  divisions,
  categories,
  clients,
  deleteAction,
  updateAction,
  closedPeriods,
  minDate,
}: {
  entry: ExpenseRow;
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  closedPeriods?: string[];
  minDate?: string;
}) {
  const period = entry.date.slice(0, 7);
  const isLocked = closedPeriods?.includes(period) || (minDate ? entry.date < minDate : false);
  const [mode, setMode] = React.useState<'display' | 'edit'>('display');
  const [editDate, setEditDate] = React.useState(entry.date);
  const [editDivisionId, setEditDivisionId] = React.useState(entry.divisionId);
  const [editClientId, setEditClientId] = React.useState(entry.clientId ?? '');
  const [editCategory, setEditCategory] = React.useState(entry.category);
  const [editDesc, setEditDesc] = React.useState(entry.description ?? '');
  const [editAmount, setEditAmount] = React.useState(entry.amount);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, startSaveTransition] = React.useTransition();

  function startEdit() {
    setEditDate(entry.date);
    setEditDivisionId(entry.divisionId);
    setEditClientId(entry.clientId ?? '');
    setEditCategory(entry.category);
    setEditDesc(entry.description ?? '');
    setEditAmount(entry.amount);
    setError(null);
    setMode('edit');
  }

  function handleSave() {
    setError(null);
    startSaveTransition(async () => {
      const fd = new FormData();
      fd.set('date', editDate);
      fd.set('divisionId', editDivisionId);
      if (editClientId) fd.set('clientId', editClientId);
      fd.set('category', editCategory);
      fd.set('description', editDesc);
      fd.set('amount', editAmount);
      const result = await updateAction(entry.id, fd);
      if (result.error) setError(result.error);
      else setMode('display');
    });
  }

  async function handleDeleteClick() {
    const confirmed = await confirm({
      title: 'Delete expense?',
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    const result = await deleteAction(entry.id);
    if (result.error) toast.error(result.error);
  }

  if (mode === 'edit') {
    return (
      <>
        <TableRow className="bg-muted/30">
          <TableCell className="px-1.5 py-2">
            <Input
              type="date"
              value={editDate}
              max={today}
              min={isLocked ? entry.date : undefined}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full h-8 px-2 text-xs"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell className="px-1.5 py-2">
            <Select value={editDivisionId} onValueChange={setEditDivisionId} disabled={isSaving}>
              <SelectTrigger className="w-full h-8 px-2 text-xs truncate" title="Select division">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {formatDivisionAbbr(d.name)} — {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="px-1.5 py-2">
            <Select
              value={editClientId || 'none'}
              onValueChange={(val) => setEditClientId(val === 'none' ? '' : val)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-full h-8 px-2 text-xs truncate">
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="px-1.5 py-2">
            <Select value={editCategory} onValueChange={setEditCategory} disabled={isSaving}>
              <SelectTrigger className="w-full h-8 px-2 text-xs truncate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="px-1.5 py-2">
            <Input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Optional"
              className="w-full h-8 px-2 text-xs"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell className="px-1.5 py-2">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full h-8 px-2 text-xs text-right"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell className="px-1.5 py-2" />
          <TableCell className="px-1.5 py-2">
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="size-3.5 mr-1" />
                {isSaving ? '…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
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
              <p className="text-sm text-destructive">{error}</p>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  }

  return (
    <TableRow>
      <TableCell className="px-2.5 py-3 text-xs whitespace-nowrap">{fmtDate(entry.date)}</TableCell>
      <TableCell className="px-2.5 py-3 text-xs whitespace-nowrap">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wider bg-muted text-foreground border border-border/50"
          title={entry.divisionName}
        >
          {formatDivisionAbbr(entry.divisionName)}
        </span>
      </TableCell>
      <TableCell
        className="px-2.5 py-3 text-xs text-muted-foreground truncate"
        title={entry.clientName ?? ''}
      >
        {entry.clientName ?? '—'}
      </TableCell>
      <TableCell className="px-2.5 py-3 text-xs truncate" title={entry.category}>
        {entry.category}
      </TableCell>
      <TableCell className="px-2.5 py-3 text-xs truncate" title={entry.description ?? ''}>
        {stripExpenseDescription(entry.description)}
      </TableCell>
      <TableCell className="px-2.5 py-3 text-xs tabular-nums font-medium text-amber-500 whitespace-nowrap text-right">
        −{formatZAR(Number(entry.amount))}
      </TableCell>
      <TableCell className="px-2.5 py-3 text-xs text-center whitespace-nowrap">
        {entry.receiptUrl ? (
          <a
            href={entry.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            title={entry.receiptFileName || 'View Receipt'}
          >
            <Paperclip className="size-3" />
            <span>Receipt</span>
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground/40 italic">None</span>
        )}
      </TableCell>
      <TableCell className="px-2.5 py-3 text-xs text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {isLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" disabled>
                  <Lock data-icon className="size-3.5 text-muted-foreground/30" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Period is closed</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="icon" className="size-7" onClick={startEdit}>
              <Pencil data-icon className="size-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
          )}
          {!isLocked && (
            <Button variant="ghost" size="icon" className="size-7" onClick={handleDeleteClick}>
              <Trash2 data-icon className="size-3.5 text-muted-foreground hover:text-destructive" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ExpenseTable({
  entries,
  divisions,
  categories,
  clients,
  deleteAction,
  updateAction,
  closedPeriods,
  minDate,
}: ExpenseTableProps) {
  return (
    <Table className="w-full table-fixed" containerClassName="overflow-x-hidden">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px] text-xs px-2.5">Date</TableHead>
          <TableHead className="w-[70px] text-xs px-2.5">Division</TableHead>
          <TableHead className="w-[120px] text-xs px-2.5">Client</TableHead>
          <TableHead className="w-[120px] text-xs px-2.5">Category</TableHead>
          <TableHead className="text-xs px-2.5">Description</TableHead>
          <TableHead className="w-[105px] text-right text-xs px-2.5">Amount</TableHead>
          <TableHead className="w-[85px] text-center text-xs px-2.5">Receipt</TableHead>
          <TableHead className="w-[75px] text-right text-xs px-2.5">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <ExpenseTableRow
            key={entry.id}
            entry={entry}
            divisions={divisions}
            categories={categories}
            clients={clients}
            deleteAction={deleteAction}
            updateAction={updateAction}
            closedPeriods={closedPeriods}
            minDate={minDate}
          />
        ))}
      </TableBody>
    </Table>
  );
}
