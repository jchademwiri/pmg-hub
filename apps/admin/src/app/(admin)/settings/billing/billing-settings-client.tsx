'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Landmark, Mail, Pencil } from 'lucide-react';
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

function HiddenPreserveInputs({ settings }: { settings: DivisionBillingSettings | null }) {
  if (!settings) return null;
  return (
    <>
      {settings.defaultVatRate ? <input type="hidden" name="defaultVatRate" value={settings.defaultVatRate} /> : null}
      {settings.paymentTermsDays != null ? <input type="hidden" name="paymentTermsDays" value={settings.paymentTermsDays} /> : null}
      {settings.bankName ? <input type="hidden" name="bankName" value={settings.bankName} /> : null}
      {settings.bankAccountName ? <input type="hidden" name="bankAccountName" value={settings.bankAccountName} /> : null}
      {settings.bankAccountNumber ? <input type="hidden" name="bankAccountNumber" value={settings.bankAccountNumber} /> : null}
      {settings.bankBranchCode ? <input type="hidden" name="bankBranchCode" value={settings.bankBranchCode} /> : null}
      {settings.invoiceNotes ? <input type="hidden" name="invoiceNotes" value={settings.invoiceNotes} /> : null}
      {settings.quoteNotes ? <input type="hidden" name="quoteNotes" value={settings.quoteNotes} /> : null}
      {settings.salesRepName ? <input type="hidden" name="salesRepName" value={settings.salesRepName} /> : null}
      {settings.salesRepPhone ? <input type="hidden" name="salesRepPhone" value={settings.salesRepPhone} /> : null}
      {settings.salesRepEmail ? <input type="hidden" name="salesRepEmail" value={settings.salesRepEmail} /> : null}
      {settings.divisionWebsite ? <input type="hidden" name="divisionWebsite" value={settings.divisionWebsite} /> : null}
      {settings.creditExpiryMonths != null ? <input type="hidden" name="creditExpiryMonths" value={settings.creditExpiryMonths} /> : null}
      {settings.autoApplyCredits ? <input type="hidden" name="autoApplyCredits" value="on" /> : null}
    </>
  );
}

// ── 1. Document Defaults Form (Prefixes + VAT % + Payment Terms) ─────────────

function DivisionDefaultsForm({ division, currentSettings, saveAction }: DivisionBillingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const prefix = divisionPrefix(division.name);
  const s = currentSettings;

  const [defaultVatRate, setDefaultVatRate] = useState<string>(s?.defaultVatRate ?? '15');
  const [paymentTermsDays, setPaymentTermsDays] = useState<string | number>(s?.paymentTermsDays ?? 30);

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
        toast.success(`${division.name} document defaults saved.`);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setIsDirty(true)} className="flex flex-col gap-6">
      <HiddenPreserveInputs settings={s} />

      <SettingsSection
        title="Document Numbering"
        description="Prefix is derived from the division name. Sequence numbers are managed automatically."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Invoice Prefix</FieldLabel>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-mono text-muted-foreground">
              {prefix}-INV-
            </div>
            <p className="text-xs text-muted-foreground">e.g. {prefix}-INV-2026-001</p>
          </Field>
          <Field>
            <FieldLabel>Quote Prefix</FieldLabel>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-mono text-muted-foreground">
              {prefix}-Q-
            </div>
            <p className="text-xs text-muted-foreground">e.g. {prefix}-Q-2026-001</p>
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Tax & Payment Terms" description="Default VAT rate and payment terms applied to new documents.">
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
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium text-muted-foreground">
              ZAR - South African Rand
            </div>
          </Field>
        </div>
      </SettingsSection>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save document defaults</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : `${division.name} defaults saved`}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Defaults'}
        </Button>
      </div>
    </form>
  );
}

export function BillingDefaultsClient({ divisions, allSettings, saveAction }: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '');
  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0];

  if (!activeDivision) return <EmptyState title="No divisions found" message="Add a division first." />;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={activeDivision.id} onValueChange={setActiveId}>
        <div className="sticky top-13 z-20 bg-background/95 py-2 backdrop-blur-sm sm:top-14">
          <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1 overflow-x-auto">
            {divisions.map((division) => (
              <TabsTrigger key={division.id} value={division.id} className="gap-2">
                {division.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {divisions.map((division) => (
          <TabsContent key={division.id} value={division.id} className="mt-4">
            <DivisionDefaultsForm
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

// ── 2. Document Templates & Notes Form ───────────────────────────────────────

function DivisionTemplatesForm({ division, currentSettings, saveAction }: DivisionBillingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const s = currentSettings;
  const [invoiceNotes, setInvoiceNotes] = useState<string>(s?.invoiceNotes ?? '');
  const [quoteNotes, setQuoteNotes] = useState<string>(s?.quoteNotes ?? '');

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
        toast.success(`${division.name} document templates saved.`);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setIsDirty(true)} className="flex flex-col gap-6">
      <HiddenPreserveInputs settings={s} />

      <SettingsSection
        title={`Document Notes & Terms for ${division.name}`}
        description="Pre-filled payment instructions and quote validity rules printed on documents."
      >
        <Field>
          <FieldLabel>Invoice Notes & Payment Terms</FieldLabel>
          <Textarea
            name="invoiceNotes"
            value={invoiceNotes}
            onChange={(e) => setInvoiceNotes(e.target.value)}
            rows={4}
            disabled={isPending}
            placeholder="e.g. Payment due within 7 days. Use invoice number as reference."
          />
        </Field>
        <Field>
          <FieldLabel>Quote Terms & Validity</FieldLabel>
          <Textarea
            name="quoteNotes"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            rows={4}
            disabled={isPending}
            placeholder="e.g. Quotation valid for 30 days. 50% deposit required."
          />
        </Field>
      </SettingsSection>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save document templates</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : `${division.name} templates saved`}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Templates'}
        </Button>
      </div>
    </form>
  );
}

export function BillingTemplatesClient({ divisions, allSettings, saveAction }: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '');
  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0];

  if (!activeDivision) return null;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={activeDivision.id} onValueChange={setActiveId}>
        <div className="sticky top-13 z-20 bg-background/95 py-2 backdrop-blur-sm sm:top-14">
          <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1 overflow-x-auto">
            {divisions.map((division) => (
              <TabsTrigger key={division.id} value={division.id} className="gap-2">
                {division.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {divisions.map((division) => (
          <TabsContent key={division.id} value={division.id} className="mt-4">
            <DivisionTemplatesForm
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

// ── 3. Credit Policy Form ───────────────────────────────────────────────────

function DivisionCreditForm({ division, currentSettings, saveAction }: DivisionBillingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const s = currentSettings;
  const [creditExpiryMonths, setCreditExpiryMonths] = useState<string | number>(s?.creditExpiryMonths ?? 12);
  const [autoApplyCredits, setAutoApplyCredits] = useState<boolean>(s?.autoApplyCredits ?? true);

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
        toast.success(`${division.name} credit policy saved.`);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setIsDirty(true)} className="flex flex-col gap-6">
      <HiddenPreserveInputs settings={s} />

      <SettingsSection
        title={`Credit Rules & Expiry for ${division.name}`}
        description="Configure client credit note retention and automatic allocation policies."
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
            <p className="text-xs text-muted-foreground">Set to 0 for credit notes that never expire.</p>
          </Field>
          <Field orientation="horizontal" className="items-end pb-1">
            {autoApplyCredits ? <input type="hidden" name="autoApplyCredits" value="on" /> : null}
            <Switch
              checked={autoApplyCredits}
              onCheckedChange={(checked) => {
                setAutoApplyCredits(checked);
                setIsDirty(true);
              }}
              disabled={isPending}
            />
            <FieldContent>
              <FieldLabel>Auto-apply Credits to Invoices</FieldLabel>
              <p className="text-xs text-muted-foreground">
                Automatically apply outstanding client credits to new invoices FIFO.
              </p>
            </FieldContent>
          </Field>
        </div>
      </SettingsSection>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save credit policy</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : `${division.name} credit policy saved`}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Credit Policy'}
        </Button>
      </div>
    </form>
  );
}

export function BillingCreditClient({ divisions, allSettings, saveAction }: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '');
  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0];

  if (!activeDivision) return null;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={activeDivision.id} onValueChange={setActiveId}>
        <div className="sticky top-13 z-20 bg-background/95 py-2 backdrop-blur-sm sm:top-14">
          <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1 overflow-x-auto">
            {divisions.map((division) => (
              <TabsTrigger key={division.id} value={division.id} className="gap-2">
                {division.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {divisions.map((division) => (
          <TabsContent key={division.id} value={division.id} className="mt-4">
            <DivisionCreditForm
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

// ── 4. Email Contact Details Form ───────────────────────────────────────────

function DivisionEmailContactForm({
  division,
  currentSettings,
  saveAction,
  onSuccess,
}: DivisionBillingFormProps & { onSuccess?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const s = currentSettings;
  const [salesRepName, setSalesRepName] = useState<string>(s?.salesRepName ?? '');
  const [salesRepPhone, setSalesRepPhone] = useState<string>(s?.salesRepPhone ?? '');
  const [salesRepEmail, setSalesRepEmail] = useState<string>(s?.salesRepEmail ?? '');
  const [divisionWebsite, setDivisionWebsite] = useState<string>(s?.divisionWebsite ?? '');

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
        toast.success(`${division.name} contact details updated.`);
        onSuccess?.();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setIsDirty(true)} className="flex flex-col gap-6">
      <HiddenPreserveInputs settings={s} />

      <SettingsSection
        title={`Sales Rep & Contact Info for ${division.name}`}
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
              placeholder="+27 74 049 1433"
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
              placeholder="info@playhousemedia.co.za"
              disabled={isPending}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Division Website</FieldLabel>
            <Input
              name="divisionWebsite"
              value={divisionWebsite}
              onChange={(e) => setDivisionWebsite(e.target.value)}
              placeholder="www.playhousemedia.co.za"
              disabled={isPending}
            />
          </Field>
        </div>
      </SettingsSection>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not save contact details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3.5 shadow-sm backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {isDirty ? 'Unsaved changes' : `${division.name} contact details saved`}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Contact Details'}
        </Button>
      </div>
    </form>
  );
}

export function BillingEmailClient({ divisions, allSettings, saveAction }: BillingSettingsClientProps) {
  const [activeId, setActiveId] = useState<string>(divisions[0]?.id ?? '');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const activeDivision = divisions.find((d) => d.id === activeId) ?? divisions[0];

  if (!activeDivision) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Division Contact Info</h3>
          <p className="text-xs text-muted-foreground">Sales rep contact email, phone, and website details per division.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="gap-2 text-xs"
        >
          <Pencil className="h-3.5 w-3.5" />
          {isEditing ? 'Close Editor' : 'Edit Contact Details'}
        </Button>
      </div>

      {isEditing && (
        <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b pb-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              Edit Division Contact Info
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs">
              Cancel
            </Button>
          </div>

          <Tabs value={activeDivision.id} onValueChange={setActiveId}>
            <TabsList className="w-full justify-start rounded-lg bg-muted/40 p-1 overflow-x-auto">
              {divisions.map((division) => {
                const s = allSettings[division.id];
                const hasContact = Boolean(s?.salesRepEmail);

                return (
                  <TabsTrigger key={division.id} value={division.id} className="gap-2">
                    {division.name}
                    <Badge
                      variant={hasContact ? 'default' : 'outline'}
                      className={
                        hasContact
                          ? 'bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0'
                          : 'border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0'
                      }
                    >
                      {hasContact ? 'Configured' : 'Missing'}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {divisions.map((division) => (
              <TabsContent key={division.id} value={division.id} className="mt-4">
                <DivisionEmailContactForm
                  key={division.id}
                  division={division}
                  currentSettings={allSettings[division.id] ?? null}
                  saveAction={saveAction}
                  onSuccess={() => setIsEditing(false)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}

// ── 5. Banking Accounts Matrix & Inline Table Editor ─────────────────────────

function BankingMatrixRow({
  division,
  settings,
  saveAction,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  division: Division;
  settings: DivisionBillingSettings | null;
  saveAction: (divisionId: string, formData: FormData) => Promise<{ error?: string }>;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [bankName, setBankName] = useState<string>(settings?.bankName ?? '');
  const [bankAccountName, setBankAccountName] = useState<string>(settings?.bankAccountName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(settings?.bankAccountNumber ?? '');
  const [bankBranchCode, setBankBranchCode] = useState<string>(settings?.bankBranchCode ?? '');

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('bankName', bankName);
      fd.append('bankAccountName', bankAccountName);
      fd.append('bankAccountNumber', bankAccountNumber);
      fd.append('bankBranchCode', bankBranchCode);

      if (settings?.defaultVatRate) fd.append('defaultVatRate', settings.defaultVatRate);
      if (settings?.paymentTermsDays != null) fd.append('paymentTermsDays', String(settings.paymentTermsDays));
      if (settings?.salesRepName) fd.append('salesRepName', settings.salesRepName);
      if (settings?.salesRepEmail) fd.append('salesRepEmail', settings.salesRepEmail);
      if (settings?.salesRepPhone) fd.append('salesRepPhone', settings.salesRepPhone);
      if (settings?.divisionWebsite) fd.append('divisionWebsite', settings.divisionWebsite);
      if (settings?.invoiceNotes) fd.append('invoiceNotes', settings.invoiceNotes);
      if (settings?.quoteNotes) fd.append('quoteNotes', settings.quoteNotes);
      if (settings?.creditExpiryMonths != null) fd.append('creditExpiryMonths', String(settings.creditExpiryMonths));
      if (settings?.autoApplyCredits) fd.append('autoApplyCredits', 'on');

      const res = await saveAction(division.id, fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`${division.name} banking details saved.`);
        onCancelEdit();
      }
    });
  }

  if (isEditing) {
    return (
      <TableRow className="bg-muted/30">
        <TableCell className="py-2.5 pl-4 font-medium align-middle">{division.name}</TableCell>
        <TableCell className="py-2.5">
          <Input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g. Capitec"
            className="h-8 text-xs bg-background"
            disabled={isPending}
          />
        </TableCell>
        <TableCell className="py-2.5">
          <Input
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value)}
            placeholder="e.g. MR JACOB CHADEMWIRI"
            className="h-8 text-xs bg-background"
            disabled={isPending}
          />
        </TableCell>
        <TableCell className="py-2.5">
          <Input
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="e.g. 2520318607"
            className="h-8 text-xs font-mono bg-background"
            disabled={isPending}
          />
        </TableCell>
        <TableCell className="py-2.5">
          <Input
            value={bankBranchCode}
            onChange={(e) => setBankBranchCode(e.target.value)}
            placeholder="e.g. 470010"
            className="h-8 text-xs font-mono bg-background"
            disabled={isPending}
          />
        </TableCell>
        <TableCell className="py-2.5 pr-4 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-600 text-white gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              disabled={isPending}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="py-3.5 pl-4 font-medium">{division.name}</TableCell>
      <TableCell className="py-3.5 text-sm">
        {settings?.bankName ? (
          <span className="flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {settings.bankName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Not set
          </span>
        )}
      </TableCell>
      <TableCell className="py-3.5 text-sm text-muted-foreground">
        {settings?.bankAccountName || '-'}
      </TableCell>
      <TableCell className="py-3.5 font-mono text-xs text-foreground font-semibold">
        {settings?.bankAccountNumber || '-'}
      </TableCell>
      <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
        {settings?.bankBranchCode || '-'}
      </TableCell>
      <TableCell className="py-3.5 pr-4 text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={onStartEdit}
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
          Edit
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function BankingOverviewMatrix({
  divisions,
  allSettings,
  saveAction,
}: {
  divisions: Division[];
  allSettings: Record<string, DivisionBillingSettings>;
  saveAction?: (divisionId: string, formData: FormData) => Promise<{ error?: string }>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <SettingsSection
      title="Banking Accounts Overview"
      description="Bank accounts and payment details printed on client invoices per division. Click Edit to update inline."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-3.5 pl-4">Division</TableHead>
            <TableHead className="py-3.5">Bank Name</TableHead>
            <TableHead className="py-3.5">Account Name</TableHead>
            <TableHead className="py-3.5">Account Number</TableHead>
            <TableHead className="py-3.5">Branch Code</TableHead>
            <TableHead className="py-3.5 pr-4 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {divisions.map((div) => (
            <BankingMatrixRow
              key={div.id}
              division={div}
              settings={allSettings[div.id] ?? null}
              saveAction={saveAction!}
              isEditing={editingId === div.id}
              onStartEdit={() => setEditingId(div.id)}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
          {divisions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                No divisions configured yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </SettingsSection>
  );
}

export function BankingAccountsClient({
  divisions,
  allSettings,
  saveAction,
}: BillingSettingsClientProps) {
  return (
    <BankingOverviewMatrix
      divisions={divisions}
      allSettings={allSettings}
      saveAction={saveAction}
    />
  );
}

export function BillingSettingsClient({ divisions, allSettings, saveAction }: BillingSettingsClientProps) {
  return <BillingDefaultsClient divisions={divisions} allSettings={allSettings} saveAction={saveAction} />;
}
