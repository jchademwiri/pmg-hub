'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { addContribution, deleteContribution } from '@/app/actions/savings';
import { formatZAR, fmtDate } from '@/lib/format';

type Contribution = {
  id: string;
  type: 'deposit' | 'withdrawal';
  contributionDate: string;
  amount: string;
  notes: string | null;
};

export function ContributionPanel({
  goalId,
  contributions,
  today,
}: {
  goalId: string;
  contributions: Contribution[];
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(today);
  const [type, setType] = React.useState<'deposit' | 'withdrawal'>('deposit');
  const [notes, setNotes] = React.useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    if (!date) {
      toast.error('Pick a date.');
      return;
    }

    const fd = new FormData();
    fd.set('goalId', goalId);
    fd.set('type', type);
    fd.set('contributionDate', date);
    fd.set('amount', String(value));
    fd.set('notes', notes.trim());

    startTransition(async () => {
      const res = await addContribution(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(type === 'deposit' ? 'Contribution added.' : 'Withdrawal recorded.');
      setAmount('');
      setNotes('');
      setType('deposit');
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete this entry?',
      description: 'It will be removed from the savings history. This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteContribution(id, goalId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Entry deleted.');
      router.refresh();
    });
  }

  // Newest first for reading; the ledger arrives oldest-first for the running balance.
  const withBalance = contributions.reduce<Array<Contribution & { balance: number }>>((acc, c) => {
    const prevBalance = acc.length > 0 ? acc[acc.length - 1]!.balance : 0;
    const delta = c.type === 'withdrawal' ? -Number(c.amount) : Number(c.amount);
    acc.push({ ...c, balance: prevBalance + delta });
    return acc;
  }, []);
  const rows = [...withBalance].reverse();

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Savings history</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3">
            <Field>
              <FieldLabel htmlFor="c-amount">Amount</FieldLabel>
              <Input
                id="c-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
              />
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Field>
              <FieldLabel htmlFor="c-date">Date</FieldLabel>
              <Input
                id="c-date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field>
              <FieldLabel htmlFor="c-type">Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as 'deposit' | 'withdrawal')}>
                <SelectTrigger id="c-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field>
              <FieldLabel htmlFor="c-notes">Note</FieldLabel>
              <Input
                id="c-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isPending} className="w-full">
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </form>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-md p-8 text-center">
            Nothing saved yet. Add your first contribution above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate(c.contributionDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.notes || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={
                          c.type === 'withdrawal'
                            ? 'text-destructive'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {c.type === 'withdrawal' ? (
                          <ArrowDownRight className="inline size-3.5 mr-0.5 -mt-0.5" />
                        ) : (
                          <ArrowUpRight className="inline size-3.5 mr-0.5 -mt-0.5" />
                        )}
                        {c.type === 'withdrawal' ? '-' : '+'}
                        {formatZAR(Number(c.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatZAR(c.balance)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(c.id)}
                        disabled={isPending}
                        aria-label="Delete entry"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
