'use client';

import * as React from 'react';
import { Pencil, Trash2, X, Check, Lock } from 'lucide-react';
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
import { formatZAR, fmtDate } from '@/lib/format';
import { confirm } from '@/components/ui/confirm-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
          <TableCell>
            <Input
              type="date"
              value={editDate}
              max={today}
              min={isLocked ? entry.date : undefined}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-36"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell>
            <Select value={editDivisionId} onValueChange={setEditDivisionId} disabled={isSaving}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Select
              value={editClientId || 'none'}
              onValueChange={(val) => setEditClientId(val === 'none' ? '' : val)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-36">
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
          <TableCell>
            <Select value={editCategory} onValueChange={setEditCategory} disabled={isSaving}>
              <SelectTrigger className="w-40">
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
          <TableCell>
            <Input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Optional"
              className="w-44"
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
              className="w-28"
              disabled={isSaving}
            />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Check data-icon="inline-start" />
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode('display')}
                disabled={isSaving}
              >
                <X data-icon />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {error && (
          <TableRow>
            <TableCell colSpan={7} className="py-1">
              <p className="text-sm text-destructive">{error}</p>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  }

  return (
    <TableRow>
      <TableCell>{fmtDate(entry.date)}</TableCell>
      <TableCell>{entry.divisionName}</TableCell>
      <TableCell className="text-muted-foreground">{entry.clientName ?? '-'}</TableCell>
      <TableCell>{entry.category}</TableCell>
      <TableCell>{entry.description ?? ''}</TableCell>
      <TableCell className="tabular-nums font-medium text-amber-500">
        −{formatZAR(Number(entry.amount))}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Lock data-icon className="text-muted-foreground/30" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Period is closed</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="icon" onClick={startEdit}>
              <Pencil data-icon />
              <span className="sr-only">Edit</span>
            </Button>
          )}
          {!isLocked && (
            <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
              <Trash2 data-icon />
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Actions</TableHead>
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
