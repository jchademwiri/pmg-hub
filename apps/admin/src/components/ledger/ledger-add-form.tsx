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

interface LedgerAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  disabled?: boolean;
  minDate?: string;
}

const today = new Date().toISOString().split('T')[0]!;

export function LedgerAddForm({ createAction, disabled = false, minDate }: LedgerAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [selectedAllocation, setSelectedAllocation] = React.useState<
    'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'
  >('salary');
  const [selectedEntry, setSelectedEntry] = React.useState<'spend' | 'transfer' | 'adjustment'>(
    'spend',
  );
  const [balances, setBalances] = React.useState<BucketBalances | null>(null);

  function refreshBalances() {
    getLedgerBalancesAction().then(setBalances).catch(() => {});
  }

  React.useEffect(() => {
    refreshBalances();
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      fd.set('allocationType', selectedAllocation);
      fd.set('entryType', selectedEntry);
      const result = await createAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Ledger entry recorded');
        formRef.current?.reset();
        setSelectedDate(today);
        setSelectedAllocation('salary');
        setSelectedEntry('spend');
        // Refresh balances
        refreshBalances();
      }
    });
  }

  const availableBalance = balances?.[selectedAllocation]?.available ?? 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="ledger-date" className="text-sm font-medium">
          Date
        </label>
        <Input
          id="ledger-date"
          name="date"
          type="date"
          required
          disabled={isPending || disabled}
          defaultValue={today}
          max={today}
          min={minDate}
          className="w-40"
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ledger-allocation" className="text-sm font-medium">
          Bucket
        </label>
        <Select
          value={selectedAllocation}
          onValueChange={(val: any) => setSelectedAllocation(val)}
          disabled={isPending || disabled}
        >
          <SelectTrigger id="ledger-allocation" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pmg_share">PMG Share</SelectItem>
            <SelectItem value="salary">Salary</SelectItem>
            <SelectItem value="reinvest">Reinvest</SelectItem>
            <SelectItem value="reserve">Reserve</SelectItem>
            <SelectItem value="flex">Flex</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ledger-entry" className="text-sm font-medium">
          Entry Type
        </label>
        <Select
          value={selectedEntry}
          onValueChange={(val: any) => setSelectedEntry(val)}
          disabled={isPending || disabled}
        >
          <SelectTrigger id="ledger-entry" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spend">Spend</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="ledger-amount"
          className="text-sm font-medium flex items-center justify-between"
        >
          Amount
          <span className="text-xs text-muted-foreground ml-2">
            (Avail: R{availableBalance.toFixed(2)})
          </span>
        </label>
        <Input
          id="ledger-amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          disabled={isPending || disabled}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ledger-description" className="text-sm font-medium">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="ledger-description"
          name="description"
          type="text"
          placeholder="e.g. Office supplies"
          disabled={isPending || disabled}
          className="w-72"
        />
      </div>

      <Button type="submit" disabled={isPending || disabled}>
        {isPending ? 'Saving…' : 'Save Entry'}
      </Button>

      {errorMessage && <p className="w-full text-sm text-destructive">{errorMessage}</p>}
    </form>
  );
}
