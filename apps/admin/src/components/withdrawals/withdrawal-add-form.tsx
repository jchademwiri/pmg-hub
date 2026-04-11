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
import { ACCOUNT_LABELS, ACCOUNT_KEYS } from '@/lib/accounts';

interface WithdrawalAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  disabled?: boolean;
}

const today = new Date().toISOString().split('T')[0]!;

function formatDefaultDescription(account: string, dateStr: string): string {
  const label = ACCOUNT_LABELS[account] ?? 'Salary';
  const date = new Date(dateStr + 'T00:00:00');
  return `${label} withdrawal — ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export function WithdrawalAddForm({ createAction, disabled = false }: WithdrawalAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [selectedAccount, setSelectedAccount] = React.useState('salary');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      fd.set('account', selectedAccount);
      const result = await createAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Withdrawal recorded');
        formRef.current?.reset();
        setSelectedDate(today);
        setSelectedAccount('salary');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="withdrawal-date" className="text-sm font-medium">
          Date
        </label>
        <Input
          id="withdrawal-date"
          name="date"
          type="date"
          required
          disabled={isPending || disabled}
          defaultValue={today}
          max={today}
          className="w-40"
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="withdrawal-account" className="text-sm font-medium">
          Account
        </label>
        <Select
          value={selectedAccount}
          onValueChange={setSelectedAccount}
          disabled={isPending || disabled}
        >
          <SelectTrigger id="withdrawal-account" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {ACCOUNT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="withdrawal-amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="withdrawal-amount"
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
        <label htmlFor="withdrawal-description" className="text-sm font-medium">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="withdrawal-description"
          name="description"
          type="text"
          placeholder={formatDefaultDescription(selectedAccount, selectedDate)}
          disabled={isPending || disabled}
          className="w-72"
        />
      </div>

      <Button type="submit" disabled={isPending || disabled}>
        {isPending ? 'Adding…' : 'Add Withdrawal'}
      </Button>

      {errorMessage && <p className="w-full text-sm text-destructive">{errorMessage}</p>}
    </form>
  );
}
