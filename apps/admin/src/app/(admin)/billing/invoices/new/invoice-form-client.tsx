'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatZAR, getEndOfMonth } from '@/lib/format';
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
import { SearchableClientSelect } from '@/components/billing/searchable-client-select';
import { BillingTotalsBlock } from '@/components/billing/billing-totals-block';
import { createInvoice } from '@/app/actions/billing-invoices';
import type { InvoiceDetail } from '@pmg/db';

export interface InvoiceFormClientProps {
  divisions: { id: string; name: string }[];
  clients: {
    id: string;
    name: string;
    businessName: string | null;
    email?: string | null;
    isActive?: boolean;
  }[];
  activeItems: ActiveItem[];
  minDate: string;
  /** When provided, the form is in edit mode */
  initialData?: InvoiceDetail;
  editId?: string;
  billingSettings?: Record<string, { quoteNotes?: string | null; invoiceNotes?: string | null }>;
  orgVatNumber?: string | null;
}

const today = new Date().toISOString().split('T')[0]!;

let nextRowId = 0;
function generateRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  nextRowId += 1;
  return `row-${Date.now()}-${nextRowId}`;
}

function blankRow(): LineItemFormRow {
  return {
    id: generateRowId(),
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
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const lineGross = qty * price;

    let lineDiscount = 0;
    if (item.discountType === 'percent') {
      lineDiscount = lineGross * ((parseFloat(item.discountValue || '0') || 0) / 100);
    } else if (item.discountType === 'amount') {
      lineDiscount = Math.min(parseFloat(item.discountValue || '0') || 0, lineGross);
    }

    subtotal += lineGross - lineDiscount;
  }
  const discountVal = parseFloat(discountValue) || 0;
  const discountAmount =
    discountType === 'percent' ? subtotal * (discountVal / 100) : Math.min(discountVal, subtotal);
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
  orgVatNumber,
}: InvoiceFormClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [divisionId, setDivisionId] = useState(initialData?.divisionId ?? '');
  const [clientId, setClientId] = useState(initialData?.clientId ?? '');
  const [invoiceDate, setInvoiceDate] = useState(initialData?.invoiceDate ?? today);
  const [hasDueDate, setHasDueDate] = useState(initialData ? !!initialData.dueDate : true);
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? getEndOfMonth(today));
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
            id: generateRowId(),
            itemId,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountType: (li.discountType as 'percent' | 'amount') ?? null,
            discountValue: li.discountValue ? String(Number(li.discountValue)) : '',
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

  function handleDivisionChange(val: string) {
    setDivisionId(val);
    if (!editId && billingSettings && val) {
      const settings = billingSettings[val];
      if (settings?.invoiceNotes) {
        setNotes(settings.invoiceNotes);
      }
      setDueDate(getEndOfMonth(invoiceDate));
      setIsDueDateModified(false);
    }
  }

  function handleClientChange(val: string) {
    setClientId(val);
    if (!val) {
      setCreditBalance(0);
    } else {
      getClientCreditBalance(val)
        .then(setCreditBalance)
        .catch((err) => console.error('Failed to load client credit balance:', err));
    }
  }

  // Load initial client credit balance in edit mode
  useEffect(() => {
    if (initialData?.clientId) {
      getClientCreditBalance(initialData.clientId)
        .then(setCreditBalance)
        .catch((err) => console.error('Failed to load client credit balance:', err));
    }
  }, [initialData?.clientId]);

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
      dueDate: hasDueDate ? dueDate || null : null,
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
              <FieldLabel>Division</FieldLabel>
              <Select
                value={divisionId}
                onValueChange={handleDivisionChange}
                disabled={isSubmitting || !!editId}
              >
                <SelectTrigger className="w-full">
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

            <Field className="sm:col-span-2">
              <FieldLabel>Client</FieldLabel>
              <SearchableClientSelect
                clients={clients}
                value={clientId}
                onValueChange={handleClientChange}
                disabled={isSubmitting}
              />
              {creditBalance > 0 && (
                <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col gap-1 mt-1">
                  <span className="font-semibold flex items-center gap-1">
                    ✨ Client Retainer Credit Available: {formatZAR(creditBalance)}
                  </span>
                  <span className="text-emerald-700">
                    This client has unallocated payments. You can record payments and apply this
                    credit to the invoice once it is issued.
                  </span>
                </div>
              )}
            </Field>
          </div>

          <Accordion type="single" collapsible defaultValue="document-settings" className="w-full">
            <AccordionItem value="document-settings" className="border-none">
              <AccordionTrigger className="py-3 px-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
                <span className="font-semibold text-sm">Dates & Reference</span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Invoice Date</FieldLabel>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setInvoiceDate(newDate);
                        if (!isDueDateModified) {
                          setDueDate(getEndOfMonth(newDate));
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <FieldLabel className="mb-0">Due Date</FieldLabel>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasDueDate}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setHasDueDate(checked);
                            if (checked && !dueDate) {
                              setDueDate(getEndOfMonth(invoiceDate));
                            }
                          }}
                          disabled={isSubmitting}
                          className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary"
                        />
                        <span>Set due date</span>
                      </label>
                    </div>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        setIsDueDateModified(true);
                      }}
                      disabled={isSubmitting || !hasDueDate}
                      className={!hasDueDate ? 'opacity-50' : ''}
                    />
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      Default: Last day of the current month
                    </span>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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

          <div className="flex flex-col gap-1 rounded-lg border bg-muted/20 p-2.5">
            <Field orientation="horizontal" className="items-center justify-between">
              <div className="flex flex-col">
                <FieldLabel htmlFor="vat-toggle" className="text-xs font-semibold cursor-pointer">
                  VAT (15%)
                </FieldLabel>
                {orgVatNumber ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Reg: {orgVatNumber}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Off (Not registered)</span>
                )}
              </div>
              <Switch
                id="vat-toggle"
                checked={vatEnabled}
                onCheckedChange={(checked) => {
                  if (checked && !orgVatNumber?.trim()) {
                    setError(
                      'VAT cannot be enabled: No registered VAT number configured in Settings → Organisation.',
                    );
                    return;
                  }
                  setError(null);
                  setVatEnabled(checked);
                }}
                disabled={isSubmitting || !orgVatNumber?.trim()}
              />
            </Field>
            {!orgVatNumber?.trim() && (
              <p className="text-[11px] text-muted-foreground/80 leading-snug pt-1 border-t border-border/50">
                To charge VAT, set your company VAT number in{' '}
                <Link
                  href="/settings/organisation"
                  className="text-primary underline font-medium hover:text-primary/80"
                  target="_blank"
                >
                  Settings → Organisation
                </Link>
                .
              </p>
            )}
          </div>

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
            <Select
              value={discountType}
              onValueChange={(v) => setDiscountType(v as 'percent' | 'amount')}
            >
              <SelectTrigger
                className="w-[65px] rounded-l-none border-l-0 focus:ring-0 focus-visible:z-10 bg-muted/10 px-3 shrink-0"
                aria-label="Discount type"
              >
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

          <div className="fixed md:relative bottom-0 left-0 right-0 p-4 md:p-0 bg-card/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t md:border-none z-50 flex flex-col gap-2 pb-[max(env(safe-area-inset-bottom),16px)] md:pb-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)] pt-2 md:pt-0">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : editId ? 'Save Changes' : 'Save Invoice'}
            </Button>
          </div>
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
