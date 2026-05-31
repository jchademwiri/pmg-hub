'use server';

import { revalidatePath } from 'next/cache';
import { getDb, invoices, quotations, billingLineItems, income, clients, divisionBillingSettings, eq, and } from '@pmg/db';
import { getNextDocumentNumber, addDays } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTParts, getSASTToday } from '@/lib/format';
import { CreateInvoiceSchema, type CreateInvoiceInput } from './billing-schema';

// ── Shared totals helper ──────────────────────────────────────────────────────

function calcTotals(
  lineItems: { quantity: number; unitPrice: number; vatRate: number }[],
  vatEnabled?: boolean,
  discountType?: 'percent' | 'amount' | null,
  discountValue?: number | null,
) {
  let subtotal = 0;
  for (const item of lineItems) {
    subtotal += item.quantity * item.unitPrice;
  }

  const discountVal = discountValue ?? 0;
  const discountAmount =
    discountType === 'percent'
      ? subtotal * (discountVal / 100)
      : discountType === 'amount'
        ? Math.min(discountVal, subtotal)
        : 0;

  const vatBase = subtotal - discountAmount;
  const vatAmount = vatEnabled ? vatBase * 0.15 : 0;
  const total = vatBase + vatAmount;

  return { subtotal, discountAmount, vatAmount, total };
}

// ── createInvoice ─────────────────────────────────────────────────────────────

export async function createInvoice(
  data: CreateInvoiceInput,
): Promise<{ error?: string; id?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const parsed = CreateInvoiceSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const { divisionId, clientId, invoiceDate, dueDate, reference, notes, terms, lineItems, vatEnabled, discountType, discountValue } =
      parsed.data;

    // clientId is required - enforced by Zod but double-check
    if (!clientId) {
      return { error: 'A client is required.' };
    }

    if (await isPeriodClosed(invoiceDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    const { subtotal, discountAmount, vatAmount, total } = calcTotals(lineItems, vatEnabled, discountType, discountValue);
    const year = new Date(invoiceDate).getFullYear();
    const documentNumber = await getNextDocumentNumber(divisionId, 'invoice', year);

    const db = getDb();

    const [inserted] = await db
      .insert(invoices)
      .values({
        divisionId,
        clientId,
        documentNumber,
        status: 'draft',
        invoiceDate,
        dueDate: dueDate ?? addDays(invoiceDate, 7),
        reference: reference ?? null,
        subtotal: String(subtotal.toFixed(2)),
        discountType: discountType ?? null,
        discountValue: discountValue != null ? String(discountValue) : null,
        discountAmount: String(discountAmount.toFixed(2)),
        vatEnabled: vatEnabled ?? false,
        vatAmount: String(vatAmount.toFixed(2)),
        total: String(total.toFixed(2)),
        notes: notes ?? null,
        terms: terms ?? null,
        createdBy: session.user.id,
      })
      .returning({ id: invoices.id });

    if (!inserted) return { error: 'Failed to create invoice.' };

    await db.insert(billingLineItems).values(
      lineItems.map((item: { itemId: string; description: string; quantity: number; unitPrice: number; vatRate: number }, i: number) => ({
        documentType: 'invoice' as const,
        documentId: inserted.id,
        sortOrder: i,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice.toFixed(2)),
        vatRate: '0',
        lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),
      })),
    );

    revalidatePath('/billing/invoices');
    revalidatePath('/dashboard');

    return { id: inserted.id };
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── updateInvoice ─────────────────────────────────────────────────────────────

export async function updateInvoice(
  id: string,
  data: CreateInvoiceInput,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const parsed = CreateInvoiceSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const {
      clientId,
      invoiceDate,
      dueDate,
      reference,
      notes,
      terms,
      lineItems,
      vatEnabled,
      discountType,
      discountValue,
    } = parsed.data;

    if (!clientId) {
      return { error: 'A client is required.' };
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: invoices.id, status: invoices.status, invoiceDate: invoices.invoiceDate })
      .from(invoices)
      .where(eq(invoices.id, id));

    if (!existing) return { error: 'Invoice not found.' };

    if (await isPeriodClosed(existing.invoiceDate)) {
      return { error: 'Cannot edit an invoice in a closed financial period.' };
    }
    if (await isPeriodClosed(invoiceDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // Paid and voided invoices cannot be edited
    if (existing.status === 'paid') {
      return { error: 'Paid invoices cannot be edited.' };
    }
    if (existing.status === 'void') {
      return { error: 'Voided invoices cannot be edited.' };
    }

    const { subtotal, discountAmount, vatAmount, total } = calcTotals(
      lineItems,
      vatEnabled,
      discountType,
      discountValue,
    );

    // Delete existing line items and reinsert
    await db
      .delete(billingLineItems)
      .where(
        and(
          eq(billingLineItems.documentType, 'invoice'),
          eq(billingLineItems.documentId, id),
        ),
      );

    await db
      .update(invoices)
      .set({
        clientId,
        invoiceDate,
        dueDate: dueDate ?? null,
        reference: reference ?? null,
        subtotal: String(subtotal.toFixed(2)),
        discountType: discountType ?? null,
        discountValue: discountValue != null ? String(discountValue) : null,
        discountAmount: String(discountAmount.toFixed(2)),
        vatEnabled: vatEnabled ?? false,
        vatAmount: String(vatAmount.toFixed(2)),
        total: String(total.toFixed(2)),
        notes: notes ?? null,
        terms: terms ?? null,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    await db.insert(billingLineItems).values(
      lineItems.map((item: { itemId: string; description: string; quantity: number; unitPrice: number; vatRate: number }, i: number) => ({
        documentType: 'invoice' as const,
        documentId: id,
        sortOrder: i,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice.toFixed(2)),
        vatRate: '0',
        lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),
      })),
    );

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);

    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── convertQuoteToInvoice ─────────────────────────────────────────────────────

export async function convertQuoteToInvoice(
  quotationId: string,
): Promise<{ error?: string; id?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const db = getDb();

    // Load quote - must be accepted
    const [quote] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, quotationId));

    if (!quote) return { error: 'Quotation not found.' };
    if (quote.status !== 'accepted') {
      return { error: 'Only accepted quotations can be converted to invoices.' };
    }

    const { year } = getSASTParts();
    const today = getSASTToday();
    if (await isPeriodClosed(today)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // Load quote line items
    const quoteLineItems = await db
      .select()
      .from(billingLineItems)
      .where(
        and(
          eq(billingLineItems.documentType, 'quote'),
          eq(billingLineItems.documentId, quotationId),
        ),
      );

    // Fetch division payment terms to calculate due date
    const [settings] = await db
      .select({ paymentTermsDays: divisionBillingSettings.paymentTermsDays })
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, quote.divisionId));

    const paymentTermsDays = settings?.paymentTermsDays ?? 30;
    const dueDateObj = new Date(today);
    dueDateObj.setDate(dueDateObj.getDate() + paymentTermsDays);
    const calculatedDueDate = dueDateObj.toISOString().split('T')[0];

    const documentNumber = await getNextDocumentNumber(quote.divisionId, 'invoice', year);

    // Create invoice from quote
    const [inserted] = await db
      .insert(invoices)
      .values({
        divisionId: quote.divisionId,
        clientId: quote.clientId,
        documentNumber,
        status: 'draft',
        invoiceDate: today,
        dueDate: calculatedDueDate,
        reference: quote.reference,
        quotationId: quote.id,
        subtotal: quote.subtotal,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        discountAmount: quote.discountAmount,
        vatEnabled: quote.vatEnabled,
        vatAmount: quote.vatAmount,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms,
        createdBy: session.user.id,
      })
      .returning({ id: invoices.id });

    if (!inserted) return { error: 'Failed to create invoice.' };

    // Copy line items
    if (quoteLineItems.length > 0) {
      await db.insert(billingLineItems).values(
        quoteLineItems.map((li) => ({
          documentType: 'invoice' as const,
          documentId: inserted.id,
          sortOrder: li.sortOrder,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          vatRate: li.vatRate,
          lineTotal: li.lineTotal,
        })),
      );
    }

    // Mark quote as converted
    await db
      .update(quotations)
      .set({ status: 'converted', updatedAt: new Date() })
      .where(eq(quotations.id, quotationId));

    revalidatePath('/billing/invoices');
    revalidatePath('/billing/quotes');
    revalidatePath(`/billing/quotes/${quotationId}`);

    return { id: inserted.id };
  } catch {
    return { error: 'Failed to convert. Please try again.' };
  }
}

// ── issueInvoice ──────────────────────────────────────────────────────────────

export async function issueInvoice(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();
    const [invoice] = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, id));

    if (!invoice) return { error: 'Invoice not found.' };
    if (invoice.status !== 'draft') {
      return { error: 'Only draft invoices can be issued.' };
    }

    await db
      .update(invoices)
      .set({ status: 'issued', updatedAt: new Date() })
      .where(eq(invoices.id, id));

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);

    return {};
  } catch {
    return { error: 'Failed to issue invoice. Please try again.' };
  }
}

// ── markInvoicePaid ───────────────────────────────────────────────────────────

export async function markInvoicePaid(id: string): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const db = getDb();
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));

    if (!invoice) return { error: 'Invoice not found.' };
    if (invoice.status === 'paid') return { error: 'Invoice is already paid.' };
    if (invoice.status === 'void') return { error: 'Cannot mark a voided invoice as paid.' };
    if (!invoice.clientId) {
      return { error: 'A client must be set before marking as paid.' };
    }

    // Period lock is checked against TODAY (the payment date), not the invoice
    // date. An invoice can be issued in a prior period and paid late - what
    // matters for the ledger is when the cash was received.
    const paymentDate = getSASTToday();
    if (await isPeriodClosed(paymentDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // Load client for description
    const [client] = await db
      .select({ name: clients.name, businessName: clients.businessName })
      .from(clients)
      .where(eq(clients.id, invoice.clientId));

    if (!client) return { error: 'Client not found.' };

    const clientLabel = client.businessName ?? client.name;
    const description = `${invoice.documentNumber} - ${clientLabel}`;

    // Post to income ledger using today as the payment date so late payments
    // land in the correct open period, not the (possibly closed) invoice period.
    const [incomeRow] = await db
      .insert(income)
      .values({
        date: paymentDate,
        divisionId: invoice.divisionId,
        clientId: invoice.clientId,
        description,
        amount: invoice.total,
      })
      .returning({ id: income.id });

    if (!incomeRow) return { error: 'Failed to post income record.' };

    // Mark invoice paid
    await db
      .update(invoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        incomeId: incomeRow.id,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);
    revalidatePath('/finance/income');
    revalidatePath('/dashboard');

    return {};
  } catch {
    return { error: 'Failed to mark as paid. Please try again.' };
  }
}

// ── voidInvoice ───────────────────────────────────────────────────────────────

export async function voidInvoice(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();
    const [invoice] = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, id));

    if (!invoice) return { error: 'Invoice not found.' };
    if (invoice.status === 'paid') {
      return { error: 'Cannot void a paid invoice.' };
    }

    await db
      .update(invoices)
      .set({ status: 'void', updatedAt: new Date() })
      .where(eq(invoices.id, id));

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);

    return {};
  } catch {
    return { error: 'Failed to void invoice. Please try again.' };
  }
}
