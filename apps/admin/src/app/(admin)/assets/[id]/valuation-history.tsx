'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { confirm } from '@/components/ui/confirm-dialog';
import { formatZAR, fmtDate } from '@/lib/format';
import { addAssetValuation, deleteAssetValuation } from '@/app/actions/assets-actions';
import type { AssetValuationRow } from '@pmg/db';

interface ValuationHistoryProps {
  assetId: string;
  valuations: AssetValuationRow[];
}

export function ValuationHistory({ assetId, valuations }: ValuationHistoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [valuationDate, setValuationDate] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!valuationDate) { toast.error('Date is required.'); return; }
    const num = parseFloat(value);
    if (!value || num < 0) { toast.error('A valid value is required.'); return; }

    startTransition(async () => {
      const res = await addAssetValuation(assetId, {
        valuationDate,
        value: num,
        notes: notes.trim() || undefined,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Valuation recorded.');
        setValuationDate('');
        setValue('');
        setNotes('');
        router.refresh();
      }
    });
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete this valuation?',
      description: 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    startTransition(async () => {
      const res = await deleteAssetValuation(id, assetId);
      if (res.error) toast.error(res.error);
      else { toast.success('Valuation deleted.'); router.refresh(); }
    });
  }

  // Growth between each entry and the one before it (list is newest-first).
  const withGrowth = valuations.map((v, i) => {
    const prev = valuations[i + 1];
    const growth = prev && Number(prev.value) > 0
      ? ((Number(v.value) - Number(prev.value)) / Number(prev.value)) * 100
      : null;
    return { ...v, growth };
  });

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="flex-1">
          <FieldLabel htmlFor="valuation-date">Date</FieldLabel>
          <Input
            id="valuation-date"
            type="date"
            value={valuationDate}
            onChange={(e) => setValuationDate(e.target.value)}
            disabled={isPending}
          />
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor="valuation-value">Value (ZAR)</FieldLabel>
          <Input
            id="valuation-value"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
          />
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor="valuation-notes">Notes (Optional)</FieldLabel>
          <Input
            id="valuation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
          />
        </Field>
        <Button type="submit" size="sm" disabled={isPending}>
          <Plus className="size-4 mr-1" />
          Add
        </Button>
      </form>

      {withGrowth.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
          No valuations recorded yet. Add one above to start tracking growth.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {withGrowth.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm">{fmtDate(v.valuationDate)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatZAR(Number(v.value))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {v.growth != null ? (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          v.growth > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : v.growth < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {v.growth > 0 ? <TrendingUp className="size-3.5" /> : v.growth < 0 ? <TrendingDown className="size-3.5" /> : null}
                        {v.growth > 0 ? '+' : ''}
                        {v.growth.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {v.notes ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(v.id)}
                      disabled={isPending}
                      title="Delete valuation"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
