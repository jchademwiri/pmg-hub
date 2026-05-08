'use client';

import { useRef, useTransition, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DivisionBillingSettings } from '@pmg/db';

interface Division {
  id: string;
  name: string;
}

interface BillingSettingsClientProps {
  divisions: Division[];
  allSettings: Record<string, DivisionBillingSettings>;
  saveAction: (divisionId: string, formData: FormData) => Promise<{ error?: string }>;
}

/** Derive a short uppercase prefix from a division name */
function divisionPrefix(name: string): string {
  const firstWord = name.trim().split(/\s+/)[0] ?? '';
  if (/^[A-Z]{2,5}$/.test(firstWord)) return firstWord;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface DivisionBillingFormProps {
  division: Division;
  currentSettings: DivisionBillingSettings | null;
  saveAction: (divisionId: string, formData: FormData) => Promise<{ error?: string }>;
}

function DivisionBillingForm({ division, currentSettings, saveAction }: DivisionBillingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const prefix = divisionPrefix(division.name);
  const s = currentSettings;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await saveAction(division.id, fd);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`${division.name} billing settings saved.`);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Document Numbering — read-only, driven by document_sequences */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Document Numbering</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Prefix is derived from the division name. Sequence numbers are managed automatically.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Invoice Prefix</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  {prefix}-INV-
                </div>
                <p className="text-xs text-muted-foreground">e.g. {prefix}-INV-2026-001</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Quote Prefix</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  {prefix}-Q-
                </div>
                <p className="text-xs text-muted-foreground">e.g. {prefix}-Q-2026-001</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tax & Payment */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Tax & Payment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Default VAT rate and payment terms for new documents.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Default VAT Rate (%)</label>
                <Input
                  name="defaultVatRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={s?.defaultVatRate ?? '15'}
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Payment Terms (days)</label>
                <Input
                  name="paymentTermsDays"
                  type="number"
                  min="0"
                  max="365"
                  defaultValue={s?.paymentTermsDays ?? 30}
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Currency</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  ZAR — South African Rand
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Contact Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Contact Details</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sales rep contact info printed on invoices and quotes for this division.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Sales Rep Name</label>
                <Input
                  name="salesRepName"
                  defaultValue={s?.salesRepName ?? ''}
                  placeholder="e.g. Jacob Chademwiri"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  name="salesRepPhone"
                  defaultValue={s?.salesRepPhone ?? ''}
                  placeholder="+27 21 000 0000"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  name="salesRepEmail"
                  type="email"
                  defaultValue={s?.salesRepEmail ?? ''}
                  placeholder="sales@example.co.za"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Division Website</label>
                <Input
                  name="divisionWebsite"
                  defaultValue={s?.divisionWebsite ?? ''}
                  placeholder="www.example.co.za"
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Banking Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Banking Details</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Printed on invoices so clients know where to pay.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Bank Name</label>
                <Input
                  name="bankName"
                  defaultValue={s?.bankName ?? ''}
                  placeholder="e.g. First National Bank"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Account Name</label>
                <Input
                  name="bankAccountName"
                  defaultValue={s?.bankAccountName ?? ''}
                  placeholder="e.g. PMG Media (Pty) Ltd"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Account Number</label>
                <Input
                  name="bankAccountNumber"
                  defaultValue={s?.bankAccountNumber ?? ''}
                  placeholder="e.g. 62012345678"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Branch Code</label>
                <Input
                  name="bankBranchCode"
                  defaultValue={s?.bankBranchCode ?? ''}
                  placeholder="e.g. 250655"
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Default Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Default Notes</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-filled on new invoices and quotes. Can be overridden per document.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Invoice Notes</label>
              <textarea
                name="invoiceNotes"
                defaultValue={s?.invoiceNotes ?? ''}
                rows={3}
                disabled={isPending}
                placeholder="e.g. Payment due within 30 days. Please use invoice number as reference."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Quote Notes / Terms</label>
              <textarea
                name="quoteNotes"
                defaultValue={s?.quoteNotes ?? ''}
                rows={3}
                disabled={isPending}
                placeholder="e.g. 50% deposit required. Quotation valid for 30 days."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-destructive text-right">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

export function BillingSettingsClient({
  divisions,
  allSettings,
  saveAction,
}: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '');
  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0];

  if (!activeDivision) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No divisions found. Add a division first to configure billing settings.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Division tabs */}
      <div className="flex items-center gap-1 flex-wrap border-b border-border">
        {divisions.map((division) => (
          <button
            key={division.id}
            type="button"
            onClick={() => setActiveId(division.id)}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeId === division.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {division.name}
          </button>
        ))}
      </div>

      {/* Settings form for active division */}
      <DivisionBillingForm
        key={activeDivision.id}
        division={activeDivision}
        currentSettings={allSettings[activeDivision.id] ?? null}
        saveAction={saveAction}
      />
    </div>
  );
}
