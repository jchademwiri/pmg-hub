'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function InvoiceFormClient({
  divisions,
  clients,
  activeItems,
  minDate,
  initialData,
  editId,
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

  const totals = calcTotals(lineItems, vatEnabled, discountType, discountValue);

  // Warn if invoice date is near the period boundary
  const isPeriodWarning = invoiceDate < minDate;

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
      invoiceDate,
      dueDate: dueDate || null,
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
      <div className="flex flex-col gap-6 lg:col-span-2">
        {/* Period lock warning */}
        {isPeriodWarning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
            ⚠ This invoice date may fall in a restricted financial period. Marking as paid may be
            blocked.
          </div>
        )}

        {/* Invoice details */}
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
              Invoice Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={invoiceDate}
              max={today}
              onChange={(e) => {
                const newDate = e.target.value;
                setInvoiceDate(newDate);
                if (!isDueDateModified) {
                  const d = new Date(newDate);
                  d.setDate(d.getDate() + 5);
                  setDueDate(d.toISOString().split('T')[0]!);
                }
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setIsDueDateModified(true);
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Reference</label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional reference number"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Invoice #</label>
            <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
              {editId ? 'Existing number preserved' : 'Auto-generated on save'}
            </div>
          </div>
        </div>

        {/* Line items */}
        <BillingLineItemsForm
          value={lineItems}
          onChange={setLineItems}
          activeItems={activeItems}
        />

        {/* Notes & terms */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions or notes…"
              rows={4}
              disabled={isSubmitting}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Terms & Conditions</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Optional terms and conditions…"
              rows={4}
              disabled={isSubmitting}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Sidebar — sticky */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold">Summary</p>

          {/* VAT toggle */}
          <button
            type="button"
            aria-label="Toggle VAT (15%)"
            onClick={() => setVatEnabled((v) => !v)}
            className="flex items-center justify-between py-1"
          >
            <span className="text-sm text-muted-foreground">VAT (15%)</span>
            <div
              className={`relative h-5 w-9 rounded-full transition-colors ${
                vatEnabled ? 'bg-primary' : 'bg-input'
              }`}
            >
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                  vatEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>

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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
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
