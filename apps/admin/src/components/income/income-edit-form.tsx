'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { IncomeRow } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface IncomeEditFormProps {
  entry: IncomeRow;
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  updateAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate?: string;
}

export function IncomeEditForm({
  entry,
  divisions,
  clients,
  updateAction,
  minDate,
}: IncomeEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [clientId, setClientId] = React.useState<string>(entry.clientId ?? '');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      fd.set('clientId', clientId);
      const result = await updateAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Income updated');
        router.push('/finance/income');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="income-date" className="text-sm font-medium">
          Date
        </label>
        <Input
          id="income-date"
          name="date"
          type="date"
          defaultValue={entry.date}
          max={new Date().toISOString().split('T')[0]}
          min={minDate}
          required
          disabled={isPending}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="income-division" className="text-sm font-medium">
          Division
        </label>
        <Select name="divisionId" defaultValue={entry.divisionId} required disabled={isPending}>
          <SelectTrigger id="income-division" className="w-44">
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((division) => (
              <SelectItem key={division.id} value={division.id}>
                {division.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="income-client" className="text-sm font-medium">
          Client
        </label>
        <Select value={clientId} onValueChange={setClientId} disabled={isPending}>
          <SelectTrigger id="income-client" className="w-44">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.businessName ?? client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="income-description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="income-description"
          name="description"
          type="text"
          placeholder="Optional"
          defaultValue={entry.description ?? ''}
          disabled={isPending}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="income-amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="income-amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={entry.amount}
          required
          disabled={isPending}
          className="w-36"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>

      {errorMessage && <p className="w-full text-sm text-destructive">{errorMessage}</p>}
    </form>
  );
}
