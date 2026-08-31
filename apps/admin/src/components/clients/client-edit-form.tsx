'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Client } from '@pmg/db';
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

interface ClientEditFormProps {
  client: Client;
  divisions: { id: string; name: string }[];
  updateAction: (formData: FormData) => Promise<{ error?: string }>;
  onCancel?: () => void;
}

export function ClientEditForm({ client, divisions, updateAction, onCancel }: ClientEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [divisionId, setDivisionId] = React.useState(client.divisionId ?? '');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      const result = await updateAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        router.refresh();
        if (onCancel) onCancel();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field>
          <FieldLabel htmlFor="client-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="client-name"
            name="name"
            type="text"
            defaultValue={client.name}
            required
            disabled={isPending}
            placeholder="e.g. Acme Corp"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-business-name">Business Name</FieldLabel>
          <Input
            id="client-business-name"
            name="businessName"
            type="text"
            placeholder="e.g. Acme Pty Ltd"
            defaultValue={client.businessName ?? ''}
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
            defaultValue={client.email ?? ''}
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
            defaultValue={client.phone ?? ''}
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
            defaultValue={client.registrationNumber ?? ''}
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
            defaultValue={client.website ?? ''}
            disabled={isPending}
          />
        </Field>

        <Field className="md:col-span-2">
          <FieldLabel htmlFor="client-billing-address">Street / Physical Address</FieldLabel>
          <Input
            id="client-billing-address"
            name="billingAddress"
            type="text"
            placeholder="e.g. 123 Main Road, Centurion"
            defaultValue={client.billingAddress ?? ''}
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
            defaultValue={client.city ?? ''}
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
            defaultValue={client.postalCode ?? ''}
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
            defaultValue={client.province ?? ''}
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-division">Linked Division</FieldLabel>
          <Select
            defaultValue={divisionId}
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
          {/* Hidden input to carry the value in FormData */}
          <input id="client-division-hidden" type="hidden" name="divisionId" value={divisionId} />
          <p className="text-xs text-muted-foreground mt-1">
            When set, statements will use this division&apos;s branding. If unset, the first
            invoice&apos;s division is used.
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="client-is-retainer">Client Type</FieldLabel>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              id="client-is-retainer"
              name="isRetainer"
              defaultChecked={client.isRetainer}
              disabled={isPending}
              className="rounded border-input text-brand focus:ring-brand h-4 w-4"
            />
            <span className="text-sm font-medium">Mark as Retainer Client</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Flags this client as a retainer in your client lists and reports.
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="client-exclude-statements">Automated Statements</FieldLabel>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              id="client-exclude-statements"
              name="excludeFromAutoStatements"
              defaultChecked={client.excludeFromAutoStatements}
              disabled={isPending}
              className="rounded border-input text-brand focus:ring-brand h-4 w-4"
            />
            <span className="text-sm font-medium">
              Exclude this client from global automated statements
            </span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Check this if this is a VIP or edge-case client who should not receive automated monthly
            sweeps.
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
