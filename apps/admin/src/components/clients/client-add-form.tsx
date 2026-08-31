'use client';

import * as React from 'react';
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

interface ClientAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  onCancel?: () => void;
  divisions: { id: string; name: string }[];
}

export function ClientAddForm({ createAction, onCancel, divisions }: ClientAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [divisionId, setDivisionId] = React.useState('__none__');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await createAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        formRef.current?.reset();
        setDivisionId('__none__');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field>
          <FieldLabel htmlFor="client-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="client-name"
            name="name"
            type="text"
            required
            placeholder="e.g. Acme Corp"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-biz-name">Business Name</FieldLabel>
          <Input
            id="client-biz-name"
            name="businessName"
            type="text"
            placeholder="e.g. Acme Pty Ltd"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-email">Email Address</FieldLabel>
          <Input
            id="client-email"
            name="email"
            type="email"
            placeholder="e.g. billing@acme.com"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-phone">Phone Number</FieldLabel>
          <Input
            id="client-phone"
            name="phone"
            type="text"
            placeholder="e.g. +27 82 123 4567"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-registration-number">CIPC Registration Number</FieldLabel>
          <Input
            id="client-registration-number"
            name="registrationNumber"
            type="text"
            placeholder="e.g. 2024/123456/07"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-website">Website URL</FieldLabel>
          <Input
            id="client-website"
            name="website"
            type="text"
            placeholder="e.g. https://acme.co.za"
            disabled={isPending}
          />
        </Field>

        <Field className="lg:col-span-2">
          <FieldLabel htmlFor="client-billing-address">Street / Physical Address</FieldLabel>
          <Input
            id="client-billing-address"
            name="billingAddress"
            type="text"
            placeholder="e.g. 123 Main Road, Centurion"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-city">City / Town</FieldLabel>
          <Input
            id="client-city"
            name="city"
            type="text"
            placeholder="e.g. Pretoria"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-postal-code">Postal Code</FieldLabel>
          <Input
            id="client-postal-code"
            name="postalCode"
            type="text"
            placeholder="e.g. 0157"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-province">Province</FieldLabel>
          <Input
            id="client-province"
            name="province"
            type="text"
            placeholder="e.g. Gauteng"
            disabled={isPending}
          />
        </Field>

        <Field className="lg:col-span-2">
          <FieldLabel htmlFor="client-division">Linked Division</FieldLabel>
          <Select
            value={divisionId}
            disabled={isPending}
            onValueChange={(value) => setDivisionId(value)}
          >
            <SelectTrigger id="client-division" className="text-sm h-9">
              <SelectValue placeholder="No division linked (auto-detect)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                No division linked
              </SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            id="client-add-division-hidden"
            type="hidden"
            name="divisionId"
            value={divisionId}
          />
          <p className="text-xs text-muted-foreground mt-1">
            When set, statements will use this division&apos;s branding. If unset, the first
            invoice&apos;s division is used.
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="client-add-is-retainer">Client Type</FieldLabel>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              id="client-add-is-retainer"
              name="isRetainer"
              disabled={isPending}
              className="rounded border-input text-brand focus:ring-brand h-4 w-4"
            />
            <span className="text-sm font-medium">Mark as Retainer Client</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Flags this client as a retainer in your lists.
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="client-add-exclude-statements">Automated Statements</FieldLabel>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              id="client-add-exclude-statements"
              name="excludeFromAutoStatements"
              disabled={isPending}
              className="rounded border-input text-brand focus:ring-brand h-4 w-4"
            />
            <span className="text-sm font-medium">Exclude from global statements</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Check if this VIP client should not receive automated monthly sweeps.
          </p>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4 mt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} size="sm">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'Adding…' : 'Add Client'}
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
