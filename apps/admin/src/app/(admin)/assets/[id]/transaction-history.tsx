'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
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
import { Badge } from '@/components/ui/badge';
import { confirm } from '@/components/ui/confirm-dialog';
import { formatZAR, fmtDate } from '@/lib/format';
import { addAssetTransaction, deleteAssetTransaction } from '@/app/actions/assets-actions';
import type { AssetTransactionRow } from '@pmg/db';

type TransactionType = 'deposit' | 'withdrawal';

interface TransactionHistoryProps {
  assetId: string;
  transactions: AssetTransactionRow[];
}

export function TransactionHistory({ assetId, transactions }: TransactionHistoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<TransactionType>('deposit');
  const [transactionDate, setTransactionDate] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionDate) { toast.error('Date is required.'); return; }
    const num = parseFloat(amount);
    if (!amount || num < 0) { toast.error('A valid amount is required.'); return; }

    startTransition(async () => {
      const res = await addAssetTransaction(assetId, {
        type,
        transactionDate,
        amount: num,
        quantity: quantity.trim() ? parseFloat(quantity) : undefined,
        notes: notes.trim() || undefined,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(type === 'deposit' ? 'Deposit recorded.' : 'Withdrawal recorded.');
        setTransactionDate('');
        setAmount('');
        setQuantity('');
        setNotes('');
        router.refresh();
      }
    });
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete this transaction?',
      description: 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    startTransition(async () => {
      const res = await deleteAssetTransaction(id, assetId);
      if (res.error) toast.error(res.error);
      else { toast.success('Transaction deleted.'); router.refresh(); }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <Field className="w-full sm:w-36">
          <FieldLabel htmlFor="txn-type">Type</FieldLabel>
          <Select value={type} onValueChange={(v) => setType(v as TransactionType)} disabled={isPending}>
            <SelectTrigger id="txn-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field className="flex-1 min-w-[140px]">
          <FieldLabel htmlFor="txn-date">Date</FieldLabel>
          <Input
            id="txn-date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            disabled={isPending}
          />
        </Field>
        <Field className="flex-1 min-w-[140px]">
          <FieldLabel htmlFor="txn-amount">Amount (ZAR)</FieldLabel>
          <Input
            id="txn-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isPending}
          />
        </Field>
        <Field className="flex-1 min-w-[140px]">
          <FieldLabel htmlFor="txn-quantity">Quantity (Optional)</FieldLabel>
          <Input
            id="txn-quantity"
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={isPending}
          />
        </Field>
        <Field className="flex-1 min-w-[140px]">
          <FieldLabel htmlFor="txn-notes">Notes (Optional)</FieldLabel>
          <Input
            id="txn-notes"
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

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
          No deposits or withdrawals recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        t.type === 'deposit'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 border'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 border'
                      }
                    >
                      {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{fmtDate(t.transactionDate)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {t.type === 'withdrawal' ? '-' : '+'}{formatZAR(Number(t.amount))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {t.quantity ?? '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {t.notes ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                      title="Delete transaction"
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
