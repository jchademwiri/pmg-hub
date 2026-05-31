'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
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
        setSelectedAllocation('salary');
        setSelectedEntry('spend');
        refreshBalances();
      }
    });
  }

  const availableBalance = balances?.[selectedAllocation]?.available ?? 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
        <Field>
          <FieldLabel htmlFor="ledger-date">Date</FieldLabel>
          <Input
            id="ledger-date"
            name="date"
            type="date"
            required
            disabled={isPending || disabled}
            defaultValue={today}
            max={today}
            min={minDate}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="ledger-allocation">Bucket</FieldLabel>
          <Select
            value={selectedAllocation}
            onValueChange={(val) =>
              setSelectedAllocation(val as typeof selectedAllocation)
            }
            disabled={isPending || disabled}
          >
            <SelectTrigger id="ledger-allocation">
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
        </Field>

        <Field>
          <FieldLabel htmlFor="ledger-entry">Entry Type</FieldLabel>
          <Select
            value={selectedEntry}
            onValueChange={(val) => setSelectedEntry(val as typeof selectedEntry)}
            disabled={isPending || disabled}
          >
            <SelectTrigger id="ledger-entry">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spend">Spend</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="ledger-amount">
            Amount
            <span className="ml-1 text-[10px] font-normal text-muted-foreground whitespace-nowrap">
              (Avail: R{availableBalance.toFixed(2)})
            </span>
          </FieldLabel>
          <Input
            id="ledger-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={isPending || disabled}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="ledger-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id="ledger-description"
            name="description"
            type="text"
            placeholder="e.g. Office supplies"
            disabled={isPending || disabled}
          />
        </Field>

        <div className="flex">
          <Button type="submit" disabled={isPending || disabled} className="w-full">
            {isPending ? 'Saving…' : 'Save Entry'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
