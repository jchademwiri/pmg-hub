'use client';

import { useRef, useTransition, useState, useEffect } from 'react';
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
  divisions: Division[];
  allSettings: Record<string, DivisionBillingSettings>;
  saveAction: (divisionId: string, formData: FormData) => Promise<{ error?: string }>;
}

function DivisionBillingForm({
  division,
  currentSettings,
  divisions,
  allSettings,
  saveAction,
}: DivisionBillingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const prefix = divisionPrefix(division.name);
  const s = currentSettings;

  // Local state for controllable fields
  const [defaultVatRate, setDefaultVatRate] = useState<string>('15');
  const [paymentTermsDays, setPaymentTermsDays] = useState<string | number>(30);
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountName, setBankAccountName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankBranchCode, setBankBranchCode] = useState<string>('');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [salesRepName, setSalesRepName] = useState<string>('');
  const [salesRepPhone, setSalesRepPhone] = useState<string>('');
  const [salesRepEmail, setSalesRepEmail] = useState<string>('');
  const [divisionWebsite, setDivisionWebsite] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'general' | 'contact_banking' | 'notes'>('general');
  const [cloneSourceId, setCloneSourceId] = useState<string>('');

  // Sync state when currentSettings changes (on division switch or save)
  useEffect(() => {
    setDefaultVatRate(s?.defaultVatRate ?? '15');
    setPaymentTermsDays(s?.paymentTermsDays ?? 30);
    setBankName(s?.bankName ?? '');
    setBankAccountName(s?.bankAccountName ?? '');
    setBankAccountNumber(s?.bankAccountNumber ?? '');
    setBankBranchCode(s?.bankBranchCode ?? '');
    setInvoiceNotes(s?.invoiceNotes ?? '');
    setQuoteNotes(s?.quoteNotes ?? '');
    setSalesRepName(s?.salesRepName ?? '');
    setSalesRepPhone(s?.salesRepPhone ?? '');
    setSalesRepEmail(s?.salesRepEmail ?? '');
    setDivisionWebsite(s?.divisionWebsite ?? '');
  }, [s]);

  // Clone handling
  const otherDivisions = divisions.filter((d) => d.id !== division.id);

  function handleClone() {
    if (!cloneSourceId) return;
    const sourceSettings = allSettings[cloneSourceId];
    if (!sourceSettings) {
      toast.error('No billing settings found for the selected division.');
      return;
    }

    setDefaultVatRate(sourceSettings.defaultVatRate ?? '15');
    setPaymentTermsDays(sourceSettings.paymentTermsDays ?? 30);
    setBankName(sourceSettings.bankName ?? '');
    setBankAccountName(sourceSettings.bankAccountName ?? '');
    setBankAccountNumber(sourceSettings.bankAccountNumber ?? '');
    setBankBranchCode(sourceSettings.bankBranchCode ?? '');
    setInvoiceNotes(sourceSettings.invoiceNotes ?? '');
    setQuoteNotes(sourceSettings.quoteNotes ?? '');
    setSalesRepName(sourceSettings.salesRepName ?? '');
    setSalesRepPhone(sourceSettings.salesRepPhone ?? '');
    setSalesRepEmail(sourceSettings.salesRepEmail ?? '');
    setDivisionWebsite(sourceSettings.divisionWebsite ?? '');

    const sourceName = divisions.find((d) => d.id === cloneSourceId)?.name ?? 'selected division';
    toast.success(`Settings cloned from "${sourceName}". Check the tabs to review, then click Save Changes.`);
    setCloneSourceId('');
  }

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
      {/* Clone Settings Banner */}
      {otherDivisions.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Clone settings from another division
            </h4>
            <p className="text-xs text-muted-foreground">Copy all general, contact, banking, and notes templates from another division to this form.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={cloneSourceId}
              onChange={(e) => setCloneSourceId(e.target.value)}
              className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a division...</option>
              {otherDivisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClone}
              disabled={!cloneSourceId}
            >
              Clone
            </Button>
          </div>
        </div>
      )}

      {/* Settings Form Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60'
          )}
        >
          General & Numbers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contact_banking')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
            activeTab === 'contact_banking'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60'
          )}
        >
          Contact & Banking
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
            activeTab === 'notes'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60'
          )}
        >
          Templates & Notes
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Document Numbering */}
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
                      value={defaultVatRate}
                      onChange={(e) => setDefaultVatRate(e.target.value)}
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
                      value={paymentTermsDays}
                      onChange={(e) => setPaymentTermsDays(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Currency</label>
                    <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                      ZAR - South African Rand
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'contact_banking' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
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
                      value={salesRepName}
                      onChange={(e) => setSalesRepName(e.target.value)}
                      placeholder="e.g. Jacob Chademwiri"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      name="salesRepPhone"
                      value={salesRepPhone}
                      onChange={(e) => setSalesRepPhone(e.target.value)}
                      placeholder="+27 21 000 0000"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      name="salesRepEmail"
                      type="email"
                      value={salesRepEmail}
                      onChange={(e) => setSalesRepEmail(e.target.value)}
                      placeholder="sales@example.co.za"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Division Website</label>
                    <Input
                      name="divisionWebsite"
                      value={divisionWebsite}
                      onChange={(e) => setDivisionWebsite(e.target.value)}
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
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. First National Bank"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Account Name</label>
                    <Input
                      name="bankAccountName"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="e.g. PMG Media (Pty) Ltd"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Account Number</label>
                    <Input
                      name="bankAccountNumber"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="e.g. 62012345678"
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Branch Code</label>
                    <Input
                      name="bankBranchCode"
                      value={bankBranchCode}
                      onChange={(e) => setBankBranchCode(e.target.value)}
                      placeholder="e.g. 250655"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
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
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={4}
                    disabled={isPending}
                    placeholder="e.g. Payment due within 30 days. Please use invoice number as reference."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-1.5 mt-4">
                  <label className="text-sm font-medium">Quote Notes / Terms</label>
                  <textarea
                    name="quoteNotes"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    rows={4}
                    disabled={isPending}
                    placeholder="e.g. 50% deposit required. Quotation valid for 30 days."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Save */}
      {error && <p className="text-sm text-destructive text-right">{error}</p>}
      <div className="flex justify-end border-t border-border pt-4">
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
        divisions={divisions}
        allSettings={allSettings}
        saveAction={saveAction}
      />
    </div>
  );
}
