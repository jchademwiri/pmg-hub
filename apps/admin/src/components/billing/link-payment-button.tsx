'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatZAR } from '@/lib/format';

interface UnlinkedIncomeRow {
  id: string;
  date: string;
  description: string | null;
  amount: string;
}

interface LinkPaymentButtonProps {
  invoiceId: string;
  invoiceTotal: string;
  unlinkedIncome: UnlinkedIncomeRow[];
  linkAction: (invoiceId: string, incomeId: string) => Promise<{ error?: string }>;
}

export function LinkPaymentButton({
  invoiceId,
  invoiceTotal,
  unlinkedIncome,
  linkAction,
}: LinkPaymentButtonProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  if (unlinkedIncome.length === 0) return null;

  const selected = unlinkedIncome.find((r) => r.id === selectedId);
  const amountMismatch =
    selected && Math.abs(Number(selected.amount) - Number(invoiceTotal)) > 0.01;

  function handleConfirm() {
    if (!selectedId) return;

    startTransition(async () => {
      const result = await linkAction(invoiceId, selectedId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Payment linked. Invoice marked as paid.');
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Link2 className="size-4" />
        Link Existing Payment
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/40 dark:bg-blue-950/20">
      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
        Link to an existing income record
      </p>
      <p className="text-xs text-blue-700 dark:text-blue-400">
        This marks the invoice as paid without creating a new income entry — use this for
        historical invoices where the payment is already recorded.
      </p>

      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Select an income record…" />
        </SelectTrigger>
        <SelectContent>
          {unlinkedIncome.map((row) => (
            <SelectItem key={row.id} value={row.id}>
              <span className="tabular-nums">{row.date}</span>
              {' — '}
              <span className="font-medium">{formatZAR(Number(row.amount))}</span>
              {row.description ? ` — ${row.description}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Amount mismatch warning */}
      {amountMismatch && selected && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          ⚠ Amount mismatch: invoice is {formatZAR(Number(invoiceTotal))}, income record is{' '}
          {formatZAR(Number(selected.amount))}. You can still link them.
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleConfirm} disabled={!selectedId}>
          Confirm Link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setSelectedId('');
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
