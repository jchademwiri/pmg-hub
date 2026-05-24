'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  BillingLineItemsForm,
  type LineItemFormRow,
  type ActiveItem,
} from '@/components/billing/billing-line-items-form';
import { BillingTotalsBlock } from '@/components/billing/billing-totals-block';
import { createQuotation } from '@/app/actions/billing-quotes';
import type { QuotationDetail } from '@pmg/db';

export interface QuoteFormClientProps {
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  activeItems: ActiveItem[];
  /** When provided, the form is in edit mode */
  initialData?: QuotationDetail;
  editId?: string;
  billingSettings?: Record<string, any>;
}

const today = new Date().toISOString().split('T')[0]!;
const plus5 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

function blankRow(): LineItemFormRow {
  return {
    id: crypto.randomUUID(),
    itemId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
  };
}

function calcTotals(
  lineItems: LineItemFormRow[],
  vatEnabled: boolean,
  discountType: 'percent' | 'amount',
  discountValue: string,
) {
  let subtotal = 0;
  for (const item of lineItems) {
    subtotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  }
  const discountVal = parseFloat(discountValue) || 0;
  const discountAmount =
    discountType === 'percent'
      ? subtotal * (discountVal / 100)
      : Math.min(discountVal, subtotal);
  const vatBase = subtotal - discountAmount;
  const vatAmount = vatEnabled ? vatBase * 0.15 : 0;
  return { subtotal, discountAmount, vatAmount, total: vatBase + vatAmount };
}

export function QuoteFormClient({
  divisions,
  clients,
  activeItems,
  initialData,
  editId,
  billingSettings,
}: QuoteFormClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Initialise from existing data when editing
  const [divisionId, setDivisionId] = useState(initialData?.divisionId ?? '');
  const [clientId, setClientId] = useState(initialData?.clientId ?? '');
  const [quoteDate, setQuoteDate] = useState(initialData?.quoteDate ?? today);
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate ?? plus5);
  const [isExpiryDateModified, setIsExpiryDateModified] = useState(!!initialData?.expiryDate);
  const [reference, setReference] = useState(initialData?.reference ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [terms, setTerms] = useState(initialData?.terms ?? '');
  const [lineItems, setLineItems] = useState<LineItemFormRow[]>(
    initialData?.lineItems.length
      ? initialData.lineItems.map((li) => {
          // Try to match to a catalogue item by description so the select shows the right value
          const matched = activeItems.find(
            (item) => item.name === li.description || (item.description ?? '') === li.description,
          );
          return {
            id: crypto.randomUUID(),
            itemId: matched?.id ?? '',
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          };
        })
      : [blankRow()],
  );
  const [vatEnabled, setVatEnabled] = useState(initialData?.vatEnabled ?? false);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>(
    (initialData?.discountType as 'percent' | 'amount') ?? 'percent',
  );
  const [discountValue, setDiscountValue] = useState(
    initialData?.discountValue ? String(Number(initialData.discountValue)) : '',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load division default billing settings when divisionId changes (only for new quotes)
  useEffect(() => {
    if (editId || !divisionId || !billingSettings) return;

    const settings = billingSettings[divisionId];
    if (!settings) return;

    // 1. Set default notes
    if (settings.quoteNotes) {
      setNotes(settings.quoteNotes);
    }

    // 2. Set default expiry date based on paymentTermsDays
    const termsDays = settings.paymentTermsDays ?? 5; // fallback to 5 days
    const d = new Date(quoteDate);
    d.setDate(d.getDate() + termsDays);
    setExpiryDate(d.toISOString().split('T')[0]!);
    setIsExpiryDateModified(false); // Reset modified status since it's a smart default
  }, [divisionId, billingSettings, quoteDate, editId]);

  const totals = calcTotals(lineItems, vatEnabled, discountType, discountValue);

  function handleSubmit() {
    setError(null);

    if (!divisionId) {
      setError('Please select a division.');
      return;
    }
    if (!clientId) {
      setError('A client is required.');
      return;
    }
    if (lineItems.some((r) => !r.itemId)) {
      setError('All line items must have an item selected from the catalogue.');
      return;
    }
    if (lineItems.some((r) => !r.unitPrice || parseFloat(r.unitPrice) < 0)) {
      setError('All line items must have a valid unit price.');
      return;
    }

    const payload = {
      divisionId,
      clientId,
      quoteDate,
      expiryDate: expiryDate || null,
      reference: reference || null,
      notes: notes || null,
      terms: terms || null,
      lineItems: lineItems.map((r) => ({
        itemId: r.itemId,
        description: r.description,
        quantity: parseFloat(r.quantity) || 1,
        unitPrice: parseFloat(r.unitPrice) || 0,
        vatRate: 0 as const,
      })),
      vatEnabled,
      discountType: discountValue ? discountType : null,
      discountValue: discountValue ? parseFloat(discountValue) : null,
    };

    setIsSubmitting(true);
    startTransition(async () => {
      let result: { error?: string; id?: string };

      if (editId) {
        const { updateQuotation } = await import('@/app/actions/billing-quotes');
        result = await updateQuotation(editId, payload);
        if (!result.error) {
          router.push(`/billing/quotes/${editId}`);
          return;
        }
      } else {
        result = await createQuotation(payload);
        if (!result.error && result.id) {
          router.push(`/billing/quotes/${result.id}`);
          return;
        }
      }

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main form area */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        {/* Quote details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Division <span className="text-destructive">*</span>
            </label>
            <Select value={divisionId} onValueChange={setDivisionId} disabled={isSubmitting || !!editId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a division…" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Client <span className="text-destructive">*</span>
            </label>
            <Select value={clientId} onValueChange={setClientId} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client… *" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.businessName ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Issue Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={quoteDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setQuoteDate(newDate);
                if (!isExpiryDateModified) {
                  const termsDays = billingSettings?.[divisionId]?.paymentTermsDays ?? 5;
                  const d = new Date(newDate);
                  d.setDate(d.getDate() + termsDays);
                  setExpiryDate(d.toISOString().split('T')[0]!);
                }
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Expiry Date</label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => {
                setExpiryDate(e.target.value);
                setIsExpiryDateModified(true);
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Reference</label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Project name, PO-1234, Tender Ref 12/2026"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">Optional internal or client reference</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Quote #</label>
            <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
              {editId ? 'Existing number preserved' : 'Auto-generated on save'}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="flex flex-col gap-3">
          <BillingLineItemsForm
            value={lineItems}
            onChange={setLineItems}
            activeItems={activeItems}
          />
        </div>

        {/* Terms & notes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="quote-notes">Notes</FieldLabel>
            <Textarea
              id="quote-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for the client…"
              rows={4}
              disabled={isSubmitting}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="quote-terms">Terms & Conditions</FieldLabel>
            <Textarea
              id="quote-terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Optional terms and conditions…"
              rows={4}
              disabled={isSubmitting}
            />
          </Field>
        </div>
      </div>

      {/* Sidebar - sticky */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold">Summary</p>

          <Field orientation="horizontal" className="items-center justify-between">
            <FieldLabel htmlFor="quote-vat-toggle">VAT (15%)</FieldLabel>
            <Switch
              id="quote-vat-toggle"
              checked={vatEnabled}
              onCheckedChange={setVatEnabled}
              disabled={isSubmitting}
            />
          </Field>

          {/* Discount */}
          <div className="flex items-center gap-2">
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percent' | 'amount')}>
              <SelectTrigger className="h-8 w-28" aria-label="Discount type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">% Percent</SelectItem>
                <SelectItem value="amount">R Amount</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="Discount"
              className="h-8"
            />
          </div>

          <BillingTotalsBlock
            subtotal={totals.subtotal}
            discountAmount={totals.discountAmount}
            vatEnabled={vatEnabled}
            vatAmount={totals.vatAmount}
            total={totals.total}
          />

          <Separator />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : editId ? 'Save Changes' : 'Save Quote'}
          </Button>
          {!editId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              Save as Draft
            </Button>
          )}
        </div>

        {!editId && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold mb-1">Status</p>
            <p className="text-sm text-muted-foreground">
              Quote will be saved as <strong>Draft</strong> until sent to the client.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
