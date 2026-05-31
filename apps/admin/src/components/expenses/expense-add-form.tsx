'use client';

import * as React from 'react';
import { toast } from 'sonner';
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

const today = new Date().toISOString().split('T')[0];

interface ExpenseAddFormProps {
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate?: string;
  onCancel?: () => void;
}

export function ExpenseAddForm({
  divisions,
  categories,
  clients,
  createAction,
  minDate,
  onCancel,
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field>
          <FieldLabel htmlFor="expense-date">
            Date <span className="text-destructive">*</span>
          </FieldLabel>
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
          <FieldLabel htmlFor="expense-division">
            Division <span className="text-destructive">*</span>
          </FieldLabel>
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
          <FieldLabel htmlFor="expense-category">
            Category <span className="text-destructive">*</span>
          </FieldLabel>
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
            placeholder="e.g. Server hosting"
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
            required
            disabled={isPending}
            placeholder="e.g. 250.00"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4 mt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            size="sm"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'Adding…' : 'Add Expense'}
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
