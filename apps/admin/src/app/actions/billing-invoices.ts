'use server';

import { revalidatePath } from 'next/cache';
import { getDb, invoices, quotations, billingLineItems, income, clients, divisionBillingSettings, eq, and, inArray } from '@pmg/db';
import { getNextDocumentNumber, addDays } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { postInvoiceIssueJournalEntry, voidInvoiceJournalEntries, postPaymentJournalEntries, updateInvoiceJournalEntry } from './accounting-auto-post';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTParts, getSASTToday } from '@/lib/format';
import { CreateInvoiceSchema, type CreateInvoiceInput } from './billing-schema';
import { hasBillingLineItemItemIdColumn, lineItemInsertValues } from './billing-line-item-compat';

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
    const includeLineItemItemId = await hasBillingLineItemItemIdColumn();

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
      lineItems.map((item: { itemId?: string | null; description: string; quantity: number; unitPrice: number; vatRate: number }, i: number) => ({
        documentType: 'invoice' as const,
        documentId: inserted.id,
        sortOrder: i,
        itemId: item.itemId ?? null,
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
    const includeLineItemItemId = await hasBillingLineItemItemIdColumn();
    const [existing] = await db
      .select({ id: invoices.id, status: invoices.status, invoiceDate: invoices.invoiceDate, total: invoices.total, documentNumber: invoices.documentNumber })
      .from(invoices)
      .where(eq(invoices.id, id));

    if (!existing) return { error: 'Invoice not found.' };

    // Paid and voided invoices cannot be edited
    if (existing.status === 'paid') {
      return { error: 'Paid invoices cannot be edited.' };
    }
    if (existing.status === 'void') {
      return { error: 'Voided invoices cannot be edited.' };
    }

    // We allow editing of draft, issued, or overdue invoices in closed periods
    const isInvoiceEditable = existing.status === 'draft' || existing.status === 'issued' || existing.status === 'overdue';
    if (!isInvoiceEditable) {
      if (await isPeriodClosed(existing.invoiceDate)) {
        return { error: 'Cannot edit an invoice in a closed financial period.' };
      }
      if (await isPeriodClosed(invoiceDate)) {
        const minDate = await getMinAllowedDate();
        return { error: getMinDateErrorMessage(minDate) };
      }
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
      lineItems.map((item: { itemId?: string | null; description: string; quantity: number; unitPrice: number; vatRate: number }, i: number) => ({
        documentType: 'invoice' as const,
        documentId: id,
        sortOrder: i,
        itemId: item.itemId ?? null,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice.toFixed(2)),
        vatRate: '0',
        lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),
      })),
    );

    // If an issued/overdue invoice's total changed, void the old AR entry and repost
    if ((existing.status === 'issued' || existing.status === 'overdue') && existing.total !== String(total.toFixed(2))) {
      const journalResult = await updateInvoiceJournalEntry({
        invoiceId: id,
        newAmount: total,
        date: existing.invoiceDate,
        description: `Invoice ${existing.documentNumber}`,
      });
      if (journalResult.error) {
        console.warn('Invoice AR update warning:', journalResult.error);
      }
    }

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');

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

    const includeLineItemItemId = await hasBillingLineItemItemIdColumn();

    // Load quote line items
    const quoteLineItems = await db
      .select({
        sortOrder: billingLineItems.sortOrder,
        ...(includeLineItemItemId ? { itemId: billingLineItems.itemId } : {}),
        description: billingLineItems.description,
        quantity: billingLineItems.quantity,
        unitPrice: billingLineItems.unitPrice,
        vatRate: billingLineItems.vatRate,
        lineTotal: billingLineItems.lineTotal,
      })
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
          itemId: li.itemId,
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

    // Fetch invoice details for the journal entry
    const [invoiceDetail] = await db
      .select({ total: invoices.total, invoiceDate: invoices.invoiceDate, documentNumber: invoices.documentNumber })
      .from(invoices)
      .where(eq(invoices.id, id));

    await db
      .update(invoices)
      .set({ status: 'issued', updatedAt: new Date() })
      .where(eq(invoices.id, id));

    // Auto-post: Dr AR (1100) / Cr Revenue (4010)
    if (invoiceDetail) {
      const journalResult = await postInvoiceIssueJournalEntry({
        invoiceId: id,
        amount: parseFloat(invoiceDetail.total),
        date: invoiceDetail.invoiceDate,
        description: `Invoice ${invoiceDetail.documentNumber}`,
      });
      if (journalResult.error) {
        console.warn('Invoice AR auto-post warning:', journalResult.error);
      }
    }

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');

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

    // Auto-post: Dr Bank (1010) / Cr AR (1100) + Dr Savings / Cr Bank (PMG share)
    const journalResult = await postPaymentJournalEntries({
      incomeId: incomeRow.id,
      amount: parseFloat(invoice.total),
      date: paymentDate,
      description,
      divisionId: invoice.divisionId,
    });
    if (journalResult.error) {
      console.warn('Payment AR auto-post warning:', journalResult.error);
    }

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);
    revalidatePath('/billing/payments');
    revalidatePath('/dashboard');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');

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

    // Reverse any credit applications
    const { reverseCreditApplication } = await import('./credit-management');
    const reverseRes = await reverseCreditApplication(id);
    if (reverseRes.error) {
      return { error: reverseRes.error };
    }

    await db
      .update(invoices)
      .set({ status: 'void', updatedAt: new Date() })
      .where(eq(invoices.id, id));

    // Void the AR journal entry (Dr AR / Cr Revenue)
    const journalResult = await voidInvoiceJournalEntries(id);
    if (journalResult.error) {
      console.warn('Invoice AR void warning:', journalResult.error);
    }

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');

    return {};
  } catch {
    return { error: 'Failed to void invoice. Please try again.' };
  }
}

// ── bulkIssueInvoices ─────────────────────────────────────────────────────────

export async function bulkIssueInvoices(ids: string[]): Promise<{ error?: string; successCount?: number }> {
  try {
    await getSessionOrRedirect();

    if (ids.length === 0) return { successCount: 0 };

    const db = getDb();
    
    // Find eligible draft invoices in the selected set
    const eligible = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(
        inArray(invoices.id, ids),
        eq(invoices.status, 'draft')
      ));

    const eligibleIds = eligible.map(inv => inv.id);
    if (eligibleIds.length === 0) {
      return { error: 'No draft invoices selected.' };
    }

    // Fetch invoice details for journal entries
    const invoiceDetails = await db
      .select({ id: invoices.id, total: invoices.total, invoiceDate: invoices.invoiceDate, documentNumber: invoices.documentNumber })
      .from(invoices)
      .where(inArray(invoices.id, eligibleIds));

    await db
      .update(invoices)
      .set({ status: 'issued', updatedAt: new Date() })
      .where(inArray(invoices.id, eligibleIds));

    // Auto-post AR for each issued invoice
    for (const inv of invoiceDetails) {
      const journalResult = await postInvoiceIssueJournalEntry({
        invoiceId: inv.id,
        amount: parseFloat(inv.total),
        date: inv.invoiceDate,
        description: `Invoice ${inv.documentNumber}`,
      });
      if (journalResult.error) {
        console.warn('Bulk issue AR auto-post warning:', journalResult.error);
      }
    }

    revalidatePath('/billing/invoices');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    return { successCount: eligibleIds.length };
  } catch {
    return { error: 'Failed to bulk issue invoices.' };
  }
}

// ── bulkVoidInvoices ──────────────────────────────────────────────────────────

export async function bulkVoidInvoices(ids: string[]): Promise<{ error?: string; successCount?: number }> {
  try {
    await getSessionOrRedirect();

    if (ids.length === 0) return { successCount: 0 };

    const db = getDb();

    // Find eligible invoices to void (draft, issued, overdue - NOT paid or void)
    const eligible = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(
        inArray(invoices.id, ids),
        inArray(invoices.status, ['draft', 'issued', 'overdue'])
      ));

    const eligibleIds = eligible.map(inv => inv.id);
    if (eligibleIds.length === 0) {
      return { error: 'No voidable invoices selected.' };
    }

    await db
      .update(invoices)
      .set({ status: 'void', updatedAt: new Date() })
      .where(inArray(invoices.id, eligibleIds));

    // Void AR journal entries for each voided invoice
    for (const invId of eligibleIds) {
      const journalResult = await voidInvoiceJournalEntries(invId);
      if (journalResult.error) {
        console.warn('Bulk void AR warning:', journalResult.error);
      }
    }

    revalidatePath('/billing/invoices');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    return { successCount: eligibleIds.length };
  } catch {
    return { error: 'Failed to bulk void invoices.' };
  }
}
