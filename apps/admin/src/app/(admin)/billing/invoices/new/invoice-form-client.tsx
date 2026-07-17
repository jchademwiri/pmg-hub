'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatZAR } from '@/lib/format';
import { getClientCreditBalance } from '@/app/actions/billing-payments';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  BillingLineItemsForm,
  type LineItemFormRow,
  type ActiveItem,
} from '@/components/billing/billing-line-items-form';
import { BillingTotalsBlock } from '@/components/billing/billing-totals-block';
import { createInvoice } from '@/app/actions/billing-invoices';
import type { InvoiceDetail } from '@pmg/db';

export interface InvoiceFormClientProps {
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  activeItems: ActiveItem[];
  minDate: string;
  /** When provided, the form is in edit mode */
  initialData?: InvoiceDetail;
  editId?: string;
  billingSettings?: Record<string, any>;
}

const today = new Date().toISOString().split('T')[0]!;
const plus5 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

function blankRow(): LineItemFormRow {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
    itemId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    discountType: null,
    discountValue: '',
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

export function InvoiceFormClient({
  divisions,
  clients,
  activeItems,
  minDate,
  initialData,
  editId,
  billingSettings,
}: InvoiceFormClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [divisionId, setDivisionId] = useState(initialData?.divisionId ?? '');
  const [clientId, setClientId] = useState(initialData?.clientId ?? '');
  const [invoiceDate, setInvoiceDate] = useState(initialData?.invoiceDate ?? today);
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? plus5);
  const [isDueDateModified, setIsDueDateModified] = useState(!!initialData?.dueDate);
  const [reference, setReference] = useState(initialData?.reference ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [terms, setTerms] = useState(initialData?.terms ?? '');
  const [lineItems, setLineItems] = useState<LineItemFormRow[]>(
    initialData?.lineItems.length
      ? initialData.lineItems.map((li) => {
          // Try to match to a catalogue item by database itemId, fallback to description matching (exact or prefix)
          let itemId = li.itemId ?? '';
          if (!itemId) {
            const matched = activeItems.find(
              (item) =>
                item.name === li.description ||
                (item.description ?? '') === li.description ||
                (li.description && li.description.startsWith(item.name)),
            );
            itemId = matched?.id ?? '';
          }
          return {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            itemId,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountType: li.discountType ?? null,
            discountValue: li.discountValue ?? '',
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
  const [creditBalance, setCreditBalance] = useState<number>(0);

  const totals = calcTotals(lineItems, vatEnabled, discountType, discountValue);

  // Warn if invoice date is near the period boundary
  const isPeriodWarning = invoiceDate < minDate;

  // Load division default billing settings when divisionId changes (only for new invoices)
  useEffect(() => {
    if (editId || !divisionId || !billingSettings) return;

    const settings = billingSettings[divisionId];
    if (!settings) return;

    // 1. Set default notes
    if (settings.invoiceNotes) {
      setNotes(settings.invoiceNotes);
    }

    // 2. Set default due date based on paymentTermsDays
    const termsDays = settings.paymentTermsDays ?? 5; // fallback to 5 days
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() + termsDays);
    setDueDate(d.toISOString().split('T')[0]!);
    setIsDueDateModified(false); // Reset modified status since it's a smart default
  }, [divisionId, billingSettings, invoiceDate, editId]);

  // Load client unallocated credit retainer balance
  useEffect(() => {
    if (!clientId) {
      setCreditBalance(0);
      return;
    }
    getClientCreditBalance(clientId)
      .then(setCreditBalance)
      .catch((err) => console.error('Failed to load client credit balance:', err));
  }, [clientId]);

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
    if (lineItems.some((r) => !r.unitPrice || parseFloat(r.unitPrice) < 0)) {
      setError('All line items must have a valid unit price.');
      return;
    }

    const payload = {
      divisionId,
      clientId,
      invoiceDate,
      dueDate: dueDate || null,
      reference: reference || null,
      notes: notes || null,
      terms: terms || null,
      lineItems: lineItems.map((r) => ({
        itemId: r.itemId || null,
        description: r.description,
        quantity: parseFloat(r.quantity) || 1,
        unitPrice: parseFloat(r.unitPrice) || 0,
        discountType: r.discountType,
        discountValue: r.discountValue ? parseFloat(r.discountValue) : null,
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
        const { updateInvoice } = await import('@/app/actions/billing-invoices');
        result = await updateInvoice(editId, payload);
        if (!result.error) {
          router.push(`/billing/invoices/${editId}`);
          return;
        }
      } else {
        result = await createInvoice(payload);
        if (!result.error && result.id) {
          router.push(`/billing/invoices/${result.id}`);
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
      {/* Main form */}
      <Card className="flex flex-col gap-6 lg:col-span-2">
        <CardContent className="p-6 flex flex-col gap-6">
          {/* Period lock warning */}
        {isPeriodWarning && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertDescription>
              This invoice date may fall in a restricted financial period. Marking as paid may be
              blocked.
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>
              Division
            </FieldLabel>
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
          </Field>

          <Field>
            <FieldLabel>
              Client
            </FieldLabel>
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
            {creditBalance > 0 && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col gap-1 mt-1">
                <span className="font-semibold flex items-center gap-1">
                  ✨ Client Retainer Credit Available: {formatZAR(creditBalance)}
                </span>
                <span className="text-emerald-700">
                  This client has unallocated payments. You can record payments and apply this credit to the invoice once it is issued.
                </span>
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel>
              Invoice Date
            </FieldLabel>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setInvoiceDate(newDate);
                if (!isDueDateModified) {
                  const termsDays = billingSettings?.[divisionId]?.paymentTermsDays ?? 5;
                  const d = new Date(newDate);
                  d.setDate(d.getDate() + termsDays);
                  setDueDate(d.toISOString().split('T')[0]!);
                }
              }}
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel>Due Date</FieldLabel>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setIsDueDateModified(true);
              }}
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel>Reference</FieldLabel>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional reference number"
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel>Invoice #</FieldLabel>
            <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
              {editId ? 'Existing number preserved' : 'Auto-generated on save'}
            </div>
          </Field>
        </div>

        {/* Line items */}
        <BillingLineItemsForm
          value={lineItems}
          onChange={setLineItems}
          activeItems={activeItems}
        />

        {/* Notes & terms */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="notes-and-terms" className="border-none">
            <AccordionTrigger className="py-3 px-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
              <span className="font-semibold text-sm">Additional Notes & Terms</span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="invoice-notes">Notes</FieldLabel>
                  <Textarea
                    id="invoice-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment instructions or notes…"
                    rows={4}
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="invoice-terms">Terms & Conditions</FieldLabel>
                  <Textarea
                    id="invoice-terms"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Optional terms and conditions…"
                    rows={4}
                    disabled={isSubmitting}
                  />
                </Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </CardContent>
      </Card>

      {/* Sidebar - sticky */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold">Summary</p>

          <Field orientation="horizontal" className="items-center justify-between">
            <FieldLabel htmlFor="vat-toggle">VAT (15%)</FieldLabel>
            <Switch
              id="vat-toggle"
              checked={vatEnabled}
              onCheckedChange={setVatEnabled}
              disabled={isSubmitting}
            />
          </Field>

          {/* Discount */}
          <div className="flex">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="Discount"
              className="rounded-r-none focus-visible:z-10"
            />
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percent' | 'amount')}>
              <SelectTrigger className="w-[65px] rounded-l-none border-l-0 focus:ring-0 focus-visible:z-10 bg-muted/10 px-3 shrink-0" aria-label="Discount type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="amount">R</SelectItem>
              </SelectContent>
            </Select>
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

          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : editId ? 'Save Changes' : 'Save Invoice'}
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
              Invoice will be saved as <strong>Draft</strong> until issued.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
