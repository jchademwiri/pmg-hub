'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { AlertCircle, Building2, CheckCircle2, Landmark, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      <SettingsSection
        title="Document Numbering"
        description="Prefix is derived from the division name. Sequence numbers are managed automatically."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Invoice Prefix</FieldLabel>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground font-mono">
              {prefix}-INV-
            </div>
            <p className="text-xs text-muted-foreground">e.g. {prefix}-INV-2026-001</p>
          </Field>
          <Field>
            <FieldLabel>Quote Prefix</FieldLabel>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground font-mono">
              {prefix}-Q-
            </div>
            <p className="text-xs text-muted-foreground">e.g. {prefix}-Q-2026-001</p>
          </Field>
        </div>
      </SettingsSection>

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
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground font-medium">
              ZAR - South African Rand
            </div>
          </Field>
        </div>
      </SettingsSection>

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

      {/* Hidden inputs to preserve banking details when saving Billing & Taxes form */}
      {s?.bankName ? <input type="hidden" name="bankName" value={s.bankName} /> : null}
      {s?.bankAccountName ? <input type="hidden" name="bankAccountName" value={s.bankAccountName} /> : null}
      {s?.bankAccountNumber ? <input type="hidden" name="bankAccountNumber" value={s.bankAccountNumber} /> : null}
      {s?.bankBranchCode ? <input type="hidden" name="bankBranchCode" value={s.bankBranchCode} /> : null}

      <SettingsSection
        title="Sales Rep & Contact Info"
        description="Contact details printed on document headers and used for email routing."
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
          <Field className="sm:col-span-2">
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

      <SettingsSection
        title="Default Notes & Terms"
        description="Pre-filled on new invoices and quotes. Can be overridden per document."
      >
        <Field>
          <FieldLabel>Invoice Notes</FieldLabel>
          <Textarea
            name="invoiceNotes"
            value={invoiceNotes}
            onChange={(e) => setInvoiceNotes(e.target.value)}
            rows={3}
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
            rows={3}
            disabled={isPending}
            placeholder="e.g. 50% deposit required. Quotation valid for 30 days."
          />
        </Field>
      </SettingsSection>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save billing settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
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
        <div className="sticky top-13 z-20 bg-background/95 py-2 backdrop-blur-sm sm:top-14">
          <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1 overflow-x-auto">
            {divisions.map((division) => {
              const status = divisionStatus(allSettings[division.id]);
              const isConfigured = status === 'Configured';

              return (
                <TabsTrigger key={division.id} value={division.id} className="gap-2">
                  {division.name}
                  <Badge
                    variant={isConfigured ? 'default' : 'outline'}
                    className={
                      isConfigured
                        ? 'bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0'
                        : 'border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0'
                    }
                  >
                    {status}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        {divisions.map((division) => (
          <TabsContent key={division.id} value={division.id} className="mt-4">
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

export function BankingOverviewMatrix({
  divisions,
  allSettings,
}: {
  divisions: Division[];
  allSettings: Record<string, DivisionBillingSettings>;
}) {
  return (
    <SettingsSection
      title="Banking Overview Matrix"
      description="Bank accounts and payment details printed on client invoices per division."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-3.5 pl-4">Division</TableHead>
            <TableHead className="py-3.5">Bank Name</TableHead>
            <TableHead className="py-3.5">Account Name</TableHead>
            <TableHead className="py-3.5">Account Number</TableHead>
            <TableHead className="py-3.5 pr-4">Branch Code</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {divisions.map((div) => {
            const s = allSettings[div.id];
            const hasBanking = Boolean(s?.bankName && s?.bankAccountNumber);

            return (
              <TableRow key={div.id}>
                <TableCell className="py-3.5 pl-4 font-medium">{div.name}</TableCell>
                <TableCell className="py-3.5 text-sm">
                  {s?.bankName ? (
                    <span className="flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      {s.bankName}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      Not set
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-3.5 text-sm text-muted-foreground">
                  {s?.bankAccountName || '-'}
                </TableCell>
                <TableCell className="py-3.5 font-mono text-xs text-foreground font-semibold">
                  {s?.bankAccountNumber || '-'}
                </TableCell>
                <TableCell className="py-3.5 pr-4 font-mono text-xs text-muted-foreground">
                  {s?.bankBranchCode || '-'}
                </TableCell>
              </TableRow>
            );
          })}
          {divisions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                No divisions configured yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}

function DivisionBankingFormOnly({
  division,
  currentSettings,
  saveAction,
}: DivisionBillingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const s = currentSettings;
  const [bankName, setBankName] = useState<string>(s?.bankName ?? '');
  const [bankAccountName, setBankAccountName] = useState<string>(s?.bankAccountName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(s?.bankAccountNumber ?? '');
  const [bankBranchCode, setBankBranchCode] = useState<string>(s?.bankBranchCode ?? '');

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
        toast.success(`${division.name} banking details updated.`);
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
      {/* Hidden inputs to preserve non-banking division settings */}
      {s?.defaultVatRate ? <input type="hidden" name="defaultVatRate" value={s.defaultVatRate} /> : null}
      {s?.paymentTermsDays ? <input type="hidden" name="paymentTermsDays" value={s.paymentTermsDays} /> : null}
      {s?.salesRepName ? <input type="hidden" name="salesRepName" value={s.salesRepName} /> : null}
      {s?.salesRepEmail ? <input type="hidden" name="salesRepEmail" value={s.salesRepEmail} /> : null}
      {s?.salesRepPhone ? <input type="hidden" name="salesRepPhone" value={s.salesRepPhone} /> : null}
      {s?.divisionWebsite ? <input type="hidden" name="divisionWebsite" value={s.divisionWebsite} /> : null}
      {s?.invoiceNotes ? <input type="hidden" name="invoiceNotes" value={s.invoiceNotes} /> : null}
      {s?.quoteNotes ? <input type="hidden" name="quoteNotes" value={s.quoteNotes} /> : null}
      {s?.creditExpiryMonths != null ? <input type="hidden" name="creditExpiryMonths" value={s.creditExpiryMonths} /> : null}
      {s?.autoApplyCredits ? <input type="hidden" name="autoApplyCredits" value="on" /> : null}

      <SettingsSection
        title={`Banking Details for ${division.name}`}
        description="Printed on client invoices so buyers know where to pay."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Bank Name</FieldLabel>
            <Input
              name="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Capitec"
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel>Account Holder / Name</FieldLabel>
            <Input
              name="bankAccountName"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="e.g. MR JACOB CHADEMWIRI"
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel>Account Number</FieldLabel>
            <Input
              name="bankAccountNumber"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="e.g. 2520318607"
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel>Branch Code</FieldLabel>
            <Input
              name="bankBranchCode"
              value={bankBranchCode}
              onChange={(e) => setBankBranchCode(e.target.value)}
              placeholder="e.g. 470010"
              disabled={isPending}
            />
          </Field>
        </div>
      </SettingsSection>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save banking details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : `${division.name} banking details saved`}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Banking Details'}
        </Button>
      </div>
    </form>
  );
}

export function BankingAccountsClient({
  divisions,
  allSettings,
  saveAction,
}: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '');
  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0];

  if (!activeDivision) return null;

  return (
    <div className="flex flex-col gap-8">
      <Tabs value={activeDivision.id} onValueChange={setActiveId}>
        <div className="sticky top-13 z-20 bg-background/95 py-2 backdrop-blur-sm sm:top-14">
          <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1 overflow-x-auto">
            {divisions.map((division) => {
              const s = allSettings[division.id];
              const hasBanking = Boolean(s?.bankName && s?.bankAccountNumber);

              return (
                <TabsTrigger key={division.id} value={division.id} className="gap-2">
                  {division.name}
                  <Badge
                    variant={hasBanking ? 'default' : 'outline'}
                    className={
                      hasBanking
                        ? 'bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0'
                        : 'border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0'
                    }
                  >
                    {hasBanking ? 'Banking Configured' : 'Missing Banking'}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        {divisions.map((division) => (
          <TabsContent key={division.id} value={division.id} className="mt-4">
            <DivisionBankingFormOnly
              key={division.id}
              division={division}
              currentSettings={allSettings[division.id] ?? null}
              saveAction={saveAction}
            />
          </TabsContent>
        ))}
      </Tabs>

      <BankingOverviewMatrix divisions={divisions} allSettings={allSettings} />
    </div>
  );
}


