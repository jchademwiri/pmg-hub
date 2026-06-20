'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SettingsSection } from '@/components/settings/settings-section';
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

interface DivisionBillingFormProps {
  division: Division;
  currentSettings: DivisionBillingSettings | null;
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

function divisionStatus(settings: DivisionBillingSettings | undefined) {
  if (!settings?.salesRepEmail) return 'Missing contact';
  if (!settings.bankName || !settings.bankAccountNumber) return 'Missing banking';
  return 'Configured';
}

function DivisionBillingForm({
  division,
  currentSettings,
  saveAction,
}: DivisionBillingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const prefix = divisionPrefix(division.name);
  const s = currentSettings;

  const [defaultVatRate, setDefaultVatRate] = useState<string>(s?.defaultVatRate ?? '15');
  const [paymentTermsDays, setPaymentTermsDays] = useState<string | number>(s?.paymentTermsDays ?? 30);
  const [bankName, setBankName] = useState<string>(s?.bankName ?? '');
  const [bankAccountName, setBankAccountName] = useState<string>(s?.bankAccountName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(s?.bankAccountNumber ?? '');
  const [bankBranchCode, setBankBranchCode] = useState<string>(s?.bankBranchCode ?? '');
  const [invoiceNotes, setInvoiceNotes] = useState<string>(s?.invoiceNotes ?? '');
  const [quoteNotes, setQuoteNotes] = useState<string>(s?.quoteNotes ?? '');
  const [salesRepName, setSalesRepName] = useState<string>(s?.salesRepName ?? '');
  const [salesRepPhone, setSalesRepPhone] = useState<string>(s?.salesRepPhone ?? '');
  const [salesRepEmail, setSalesRepEmail] = useState<string>(s?.salesRepEmail ?? '');
  const [divisionWebsite, setDivisionWebsite] = useState<string>(s?.divisionWebsite ?? '');
  const [creditExpiryMonths, setCreditExpiryMonths] = useState<string | number>(s?.creditExpiryMonths ?? 12);
  const [autoApplyCredits, setAutoApplyCredits] = useState<boolean>(s?.autoApplyCredits ?? true);
  const [activeTab, setActiveTab] = useState<'general' | 'contact_banking' | 'notes'>('general');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await saveAction(division.id, fd);
      if (result.error) {
        setError(result.error);
      } else {
        setIsDirty(false);
        toast.success(`${division.name} billing settings saved.`);
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onChange={() => setIsDirty(true)}
      className="flex flex-col gap-6"
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList variant="line" className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General & Numbers</TabsTrigger>
          <TabsTrigger value="contact_banking">Contact & Banking</TabsTrigger>
          <TabsTrigger value="notes">Templates & Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-6">
          <SettingsSection
            title="Document Numbering"
            description="Prefix is derived from the division name. Sequence numbers are managed automatically."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Invoice Prefix</FieldLabel>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {prefix}-INV-
                </div>
                <p className="text-xs text-muted-foreground">e.g. {prefix}-INV-2026-001</p>
              </Field>
              <Field>
                <FieldLabel>Quote Prefix</FieldLabel>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {prefix}-Q-
                </div>
                <p className="text-xs text-muted-foreground">e.g. {prefix}-Q-2026-001</p>
              </Field>
            </div>
          </SettingsSection>

          <Separator />

          <SettingsSection
            title="Tax & Payment"
            description="Default VAT rate and payment terms for new documents."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Default VAT Rate (%)</FieldLabel>
                <Input
                  name="defaultVatRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultVatRate}
                  onChange={(e) => setDefaultVatRate(e.target.value)}
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Payment Terms (days)</FieldLabel>
                <Input
                  name="paymentTermsDays"
                  type="number"
                  min="0"
                  max="365"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Currency</FieldLabel>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  ZAR - South African Rand
                </div>
              </Field>
            </div>
          </SettingsSection>

          <Separator />

          <SettingsSection
            title="Credit Policy"
            description="Configure default client credit settings and auto-application rules."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Credit Expiry (months)</FieldLabel>
                <Input
                  name="creditExpiryMonths"
                  type="number"
                  min="0"
                  max="120"
                  value={creditExpiryMonths}
                  onChange={(e) => setCreditExpiryMonths(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for credit notes that never expire.
                </p>
              </Field>
              <Field orientation="horizontal" className="items-end pb-1">
                {autoApplyCredits ? (
                  <input type="hidden" name="autoApplyCredits" value="on" />
                ) : null}
                <Switch
                  checked={autoApplyCredits}
                  onCheckedChange={(checked) => {
                    setAutoApplyCredits(checked);
                    setIsDirty(true);
                  }}
                  disabled={isPending}
                />
                <FieldContent>
                  <FieldLabel>Auto-apply Credit to Invoices</FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Automatically apply outstanding client credits to new invoices FIFO.
                  </p>
                </FieldContent>
              </Field>
            </div>
          </SettingsSection>
        </TabsContent>

        <TabsContent value="contact_banking" className="flex flex-col gap-6">
          <SettingsSection
            title="Contact Details"
            description="Sales rep contact info printed on invoices and quotes for this division."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel>Sales Rep Name</FieldLabel>
                <Input
                  name="salesRepName"
                  value={salesRepName}
                  onChange={(e) => setSalesRepName(e.target.value)}
                  placeholder="e.g. Jacob Chademwiri"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <Input
                  name="salesRepPhone"
                  value={salesRepPhone}
                  onChange={(e) => setSalesRepPhone(e.target.value)}
                  placeholder="+27 21 000 0000"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Email Address</FieldLabel>
                <Input
                  name="salesRepEmail"
                  type="email"
                  value={salesRepEmail}
                  onChange={(e) => setSalesRepEmail(e.target.value)}
                  placeholder="sales@example.co.za"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Division Website</FieldLabel>
                <Input
                  name="divisionWebsite"
                  value={divisionWebsite}
                  onChange={(e) => setDivisionWebsite(e.target.value)}
                  placeholder="www.example.co.za"
                  disabled={isPending}
                />
              </Field>
            </div>
          </SettingsSection>

          <Separator />

          <SettingsSection
            title="Banking Details"
            description="Printed on invoices so clients know where to pay."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Bank Name</FieldLabel>
                <Input
                  name="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. First National Bank"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Account Name</FieldLabel>
                <Input
                  name="bankAccountName"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="e.g. PMG Media (Pty) Ltd"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Account Number</FieldLabel>
                <Input
                  name="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 62012345678"
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel>Branch Code</FieldLabel>
                <Input
                  name="bankBranchCode"
                  value={bankBranchCode}
                  onChange={(e) => setBankBranchCode(e.target.value)}
                  placeholder="e.g. 250655"
                  disabled={isPending}
                />
              </Field>
            </div>
          </SettingsSection>
        </TabsContent>

        <TabsContent value="notes" className="flex flex-col gap-6">
          <SettingsSection
            title="Default Notes"
            description="Pre-filled on new invoices and quotes. Can be overridden per document."
          >
            <Field>
              <FieldLabel>Invoice Notes</FieldLabel>
              <Textarea
                name="invoiceNotes"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={4}
                disabled={isPending}
                placeholder="e.g. Payment due within 30 days. Please use invoice number as reference."
              />
            </Field>
            <Field>
              <FieldLabel>Quote Notes / Terms</FieldLabel>
              <Textarea
                name="quoteNotes"
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={4}
                disabled={isPending}
                placeholder="e.g. 50% deposit required. Quotation valid for 30 days."
              />
            </Field>
          </SettingsSection>
        </TabsContent>
      </Tabs>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save billing settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : `${division.name} settings are saved`}
        </p>
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
      <EmptyState
        title="No divisions found"
        message="Add a division before configuring billing and invoice defaults."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={activeDivision.id} onValueChange={setActiveId}>
        <TabsList variant="line" className="flex w-full justify-start overflow-x-auto">
          {divisions.map((division) => {
            const status = divisionStatus(allSettings[division.id]);

            return (
              <TabsTrigger key={division.id} value={division.id} className="gap-2">
                {division.name}
                <Badge variant={status === 'Configured' ? 'secondary' : 'outline'} className="text-xs">
                  {status}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {divisions.map((division) => (
          <TabsContent key={division.id} value={division.id}>
            <DivisionBillingForm
              key={division.id}
              division={division}
              currentSettings={allSettings[division.id] ?? null}
              saveAction={saveAction}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
