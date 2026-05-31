'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ExpenseRow } from '@pmg/db';
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

interface ExpenseEditFormProps {
  entry: ExpenseRow;
  divisions: { id: string; name: string }[];
  categories: string[];
  updateAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate?: string;
}

export function ExpenseEditForm({
  entry,
  divisions,
  categories,
  updateAction,
  minDate,
}: ExpenseEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      const result = await updateAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Expense updated');
        router.push('/finance/expenses');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field>
          <FieldLabel htmlFor="expense-date">
            Date <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="expense-date"
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
          <FieldLabel htmlFor="expense-amount">
            Amount (ZAR) <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="expense-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={entry.amount}
            required
            disabled={isPending}
            placeholder="e.g. 150.50"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-division">
            Division <span className="text-destructive">*</span>
          </FieldLabel>
          <Select name="divisionId" defaultValue={entry.divisionId} required disabled={isPending}>
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
          <FieldLabel htmlFor="expense-category">
            Category <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="expense-category"
            name="category"
            type="text"
            list="category-suggestions"
            defaultValue={entry.category}
            required
            disabled={isPending}
            placeholder="e.g. Software, Office Supplies"
          />
          <datalist id="category-suggestions">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>

        <Field className="md:col-span-2">
          <FieldLabel htmlFor="expense-description">Description</FieldLabel>
          <Input
            id="expense-description"
            name="description"
            type="text"
            placeholder="e.g. Monthly server hosting subscription"
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
