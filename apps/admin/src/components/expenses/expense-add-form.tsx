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

const today = new Date().toISOString().split('T')[0];

interface ExpenseAddFormProps {
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate?: string;
}

export function ExpenseAddForm({
  divisions,
  categories,
  clients,
  createAction,
  minDate,
}: ExpenseAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await createAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Expense added');
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
        <Field>
          <FieldLabel htmlFor="expense-date">Date</FieldLabel>
          <Input
            id="expense-date"
            name="date"
            type="date"
            required
            disabled={isPending}
            defaultValue={today}
            max={today}
            min={minDate}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-division">Division</FieldLabel>
          <Select name="divisionId" required disabled={isPending}>
            <SelectTrigger id="expense-division">
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
          <FieldLabel htmlFor="expense-client">Client (Optional)</FieldLabel>
          <Select name="clientId" disabled={isPending}>
            <SelectTrigger id="expense-client">
              <SelectValue placeholder="No client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-category">Category</FieldLabel>
          <Select name="category" required disabled={isPending}>
            <SelectTrigger id="expense-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-description">Description</FieldLabel>
          <Input
            id="expense-description"
            name="description"
            type="text"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
          <Input
            id="expense-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={isPending}
          />
        </Field>

        <div className="flex">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Adding…' : 'Add Expense'}
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
