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

interface IncomeAddFormProps {
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate?: string;
}

const today = new Date().toISOString().split('T')[0];

export function IncomeAddForm({ divisions, clients, createAction, minDate }: IncomeAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [clientId, setClientId] = React.useState<string>('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientId) {
      setErrorMessage('Please select a client.');
      return;
    }

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      fd.set('clientId', clientId);
      const result = await createAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Income added');
        formRef.current?.reset();
        setClientId('');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldGroup className="flex-row flex-wrap items-end gap-3">
        <Field>
          <FieldLabel htmlFor="income-date">Date</FieldLabel>
          <Input
            id="income-date"
            name="date"
            type="date"
            required
            disabled={isPending}
            defaultValue={today}
            max={today}
            min={minDate}
            className="w-40"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="income-division">Division</FieldLabel>
          <Select name="divisionId" required disabled={isPending}>
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
        </Field>

        <Field>
          <FieldLabel htmlFor="income-client">Client</FieldLabel>
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
        </Field>

        <Field>
          <FieldLabel htmlFor="income-description">Description</FieldLabel>
          <Input
            id="income-description"
            name="description"
            type="text"
            placeholder="Optional"
            disabled={isPending}
            className="w-48"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="income-amount">Amount</FieldLabel>
          <Input
            id="income-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={isPending}
            className="w-36"
          />
        </Field>

        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Adding…' : 'Add Income'}
          </Button>
        </Field>
      </FieldGroup>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
