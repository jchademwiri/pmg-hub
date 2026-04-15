'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLedgerBalancesAction } from '@/app/actions/ledger';
import type { BucketBalances } from '@/lib/financial';

interface LedgerEditFormProps {
  entry: {
    id: string;
    date: string;
    amount: string | number;
    allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex';
    entryType: 'spend' | 'transfer' | 'adjustment';
    description: string | null;
  };
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  onCancel: () => void;
  disabled?: boolean;
  minDate?: string;
}

const today = new Date().toISOString().split('T')[0]!;

export function LedgerEditForm({
  entry,
  updateAction,
  onCancel,
  disabled = false,
  minDate,
}: LedgerEditFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [selectedDate, setSelectedDate] = React.useState(entry.date);
  const [selectedAllocation, setSelectedAllocation] = React.useState(entry.allocationType);
  const [selectedEntry, setSelectedEntry] = React.useState(entry.entryType);
  const [balances, setBalances] = React.useState<BucketBalances | null>(null);

  React.useEffect(() => {
    getLedgerBalancesAction().then(setBalances).catch(console.error);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      fd.set('allocationType', selectedAllocation);
      fd.set('entryType', selectedEntry);

      const result = await updateAction(entry.id, fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Ledger entry updated');
        // Refresh balances
        getLedgerBalancesAction().then(setBalances).catch(console.error);
        onCancel();
      }
    });
  }

  // When editing, available balance conceptually includes the current entry's amount
  // since changing it shouldn't be penalized for what was already assigned to it.
  const availableBalance = balances?.[selectedAllocation]?.available ?? 0;
  // Technically we should add the `entry.amount` to it if we stay in same allocation
  const effectiveAvailable =
    selectedAllocation === entry.allocationType
      ? availableBalance + Number(entry.amount)
      : availableBalance;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 items-end bg-muted/30 p-3 rounded-md border text-left w-full sm:w-auto"
    >
      <div className="flex flex-wrap gap-3 items-end w-full">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label htmlFor={`edit-date-${entry.id}`} className="text-sm font-medium">
            Date
          </label>
          <Input
            id={`edit-date-${entry.id}`}
            name="date"
            type="date"
            required
            disabled={isPending || disabled}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            min={minDate}
            className="sm:w-36"
          />
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label htmlFor={`edit-allocation-${entry.id}`} className="text-sm font-medium">
            Bucket
          </label>
          <Select
            value={selectedAllocation}
            onValueChange={(val: any) => setSelectedAllocation(val)}
            disabled={isPending || disabled}
          >
            <SelectTrigger id={`edit-allocation-${entry.id}`} className="sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="reinvest">Reinvest</SelectItem>
              <SelectItem value="reserve">Reserve</SelectItem>
              <SelectItem value="flex">Flex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label htmlFor={`edit-entryb-${entry.id}`} className="text-sm font-medium">
            Type
          </label>
          <Select
            value={selectedEntry}
            onValueChange={(val: any) => setSelectedEntry(val)}
            disabled={isPending || disabled}
          >
            <SelectTrigger id={`edit-entryb-${entry.id}`} className="sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spend">Spend</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label
            htmlFor={`edit-amount-${entry.id}`}
            className="text-sm font-medium flex justify-between"
          >
            Amount
            <span className="text-xs text-muted-foreground ml-2">
              (R{effectiveAvailable.toFixed(2)})
            </span>
          </label>
          <Input
            id={`edit-amount-${entry.id}`}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={isPending || disabled}
            defaultValue={Number(entry.amount).toFixed(2)}
            className="sm:w-32"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label htmlFor={`edit-desc-${entry.id}`} className="text-sm font-medium">
            Description
          </label>
          <Input
            id={`edit-desc-${entry.id}`}
            name="description"
            type="text"
            defaultValue={entry.description || ''}
            disabled={isPending || disabled}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex gap-2 w-full justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending || disabled}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || disabled}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {errorMessage && <p className="w-full text-sm text-destructive">{errorMessage}</p>}
    </form>
  );
}
