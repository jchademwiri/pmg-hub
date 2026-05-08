'use server';

import { revalidatePath } from 'next/cache';
import { getDb, invoices, quotations, billingLineItems, income, clients, eq, and } from '@pmg/db';
import { getNextDocumentNumber } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { CreateInvoiceSchema, type CreateInvoiceInput } from './billing-schema';

// ── Shared totals helper ──────────────────────────────────────────────────────

function calcTotals(lineItems: { quantity: number; unitPrice: number; vatRate: number }[]) {
  let subtotal = 0;
  let vatAmount = 0;
  for (const item of lineItems) {
    const lineSubtotal = item.quantity * item.unitPrice;
    subtotal += lineSubtotal;
    vatAmount += lineSubtotal * (item.vatRate / 100);
  }
  return { subtotal, vatAmount, total: subtotal + vatAmount };
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
    const { divisionId, clientId, invoiceDate, dueDate, poNumber, notes, terms, lineItems } =
      parsed.data;

    const today = new Date().toISOString().split('T')[0]!;
    if (invoiceDate > today) {
      return { error: 'Invoice date cannot be in the future.' };
    }
    if (await isPeriodClosed(invoiceDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    const { subtotal, vatAmount, total } = calcTotals(lineItems);
    const year = new Date(invoiceDate).getFullYear();
    const documentNumber = await getNextDocumentNumber(divisionId, 'invoice', year);

    const db = getDb();

    const [inserted] = await db
      .insert(invoices)
      .values({
        divisionId,
        clientId: clientId ?? null,
        documentNumber,
        status: 'draft',
        invoiceDate,
        dueDate: dueDate ?? null,
        poNumber: poNumber ?? null,
        subtotal: String(subtotal.toFixed(2)),
        vatAmount: String(vatAmount.toFixed(2)),
        total: String(total.toFixed(2)),
        notes: notes ?? null,
        terms: terms ?? null,
        createdBy: session.user.id,
      })
      .returning({ id: invoices.id });

    if (!inserted) return { error: 'Failed to create invoice.' };

    await db.insert(billingLineItems).values(
      lineItems.map((item, i) => ({
        documentType: 'invoice' as const,
        documentId: inserted.id,
        sortOrder: i,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice.toFixed(2)),
        vatRate: String(item.vatRate),
        lineTotal: String((item.quantity * item.unitPrice * (1 + item.vatRate / 100)).toFixed(2)),
      })),
    );

    revalidatePath('/billing/invoices');
    revalidatePath('/dashboard');

    return { id: inserted.id };
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

    // Load quote — must be accepted
    const [quote] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, quotationId));

    if (!quote) return { error: 'Quotation not found.' };
    if (quote.status !== 'accepted') {
      return { error: 'Only accepted quotations can be converted to invoices.' };
    }

    const today = new Date().toISOString().split('T')[0]!;
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

    const year = new Date().getFullYear();
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
        quotationId: quote.id,
        subtotal: quote.subtotal,
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
    // date. An invoice can be issued in a prior period and paid late — what
    // matters for the ledger is when the cash was received.
    const paymentDate = new Date().toISOString().split('T')[0]!;
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
    const description = `${invoice.documentNumber} — ${clientLabel}`;

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
