'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { IncomeRow } from '@pmg/db';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field>
          <FieldLabel htmlFor="income-date">
            Date <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="income-date"
            name="date"
            type="date"
            defaultValue={entry.date}
            max={new Date().toISOString().split('T')[0]}
            min={minDate}
            required
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="income-amount">
            Amount (ZAR) <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="income-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={entry.amount}
            required
            disabled={isPending}
            placeholder="e.g. 5000"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="income-division">
            Division <span className="text-destructive">*</span>
          </FieldLabel>
          <Select name="divisionId" defaultValue={entry.divisionId} required disabled={isPending}>
            <SelectTrigger id="income-division">
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
        </Field>

        <Field>
          <FieldLabel htmlFor="income-client">Client</FieldLabel>
          <Select value={clientId} onValueChange={setClientId} disabled={isPending}>
            <SelectTrigger id="income-client">
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
        </Field>

        <Field className="md:col-span-2">
          <FieldLabel htmlFor="income-description">Description</FieldLabel>
          <Input
            id="income-description"
            name="description"
            type="text"
            placeholder="e.g. Payment for monthly maintenance"
            defaultValue={entry.description ?? ''}
            disabled={isPending}
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4 mt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
