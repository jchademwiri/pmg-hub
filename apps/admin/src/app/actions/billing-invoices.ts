'use server';

import { revalidatePath } from 'next/cache';
import { getDb, invoices, quotations, billingLineItems, income, clients, divisionBillingSettings, eq, and, inArray, paymentAllocations, sql } from '@pmg/db';
import { getNextDocumentNumber, addDays } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { postInvoiceIssueJournalEntry, voidInvoiceJournalEntries, postPaymentJournalEntries, updateInvoiceJournalEntry, postInvoiceWriteOffJournalEntry } from '@/lib/accounting/posting';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTParts, getSASTToday } from '@/lib/format';
import { CreateInvoiceSchema, type CreateInvoiceInput } from './billing-schema';
import { hasBillingLineItemItemIdColumn } from './billing-line-item-compat';

class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

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

// Custom error class to preserve validation messages through transaction boundaries
class InvoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceValidationError';
  }
}

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

    const { subtotal, discountAmount, vatAmount, total } = calcTotals(
      lineItems,
      vatEnabled,
      discountType,
      discountValue,
    );

    // Delete existing line items, update invoice, and reinsert atomically
    const existingRow = await db.transaction(async (tx) => {
      const [existingLocked] = await tx
        .select({ id: invoices.id, status: invoices.status, invoiceDate: invoices.invoiceDate, total: invoices.total, documentNumber: invoices.documentNumber, divisionId: invoices.divisionId })
        .from(invoices)
        .where(eq(invoices.id, id))
        .for('update');

      if (!existingLocked) throw new InvoiceValidationError('Invoice not found.');

      // Paid, voided, and written-off invoices cannot be edited
      if (existingLocked.status === 'paid') {
        throw new InvoiceValidationError('Paid invoices cannot be edited.');
      }
      if (existingLocked.status === 'void') {
        throw new InvoiceValidationError('Voided invoices cannot be edited.');
      }
      if (existingLocked.status === 'written_off') {
        throw new InvoiceValidationError('Written-off invoices cannot be edited.');
      }

      // We allow editing of draft, issued, or overdue invoices in closed periods
      const isInvoiceEditable = existingLocked.status === 'draft' || existingLocked.status === 'issued' || existingLocked.status === 'overdue';
      if (!isInvoiceEditable) {
        if (await isPeriodClosed(existingLocked.invoiceDate)) {
          throw new InvoiceValidationError('Cannot edit an invoice in a closed financial period.');
        }
        if (await isPeriodClosed(invoiceDate)) {
          const minDate = await getMinAllowedDate();
          throw new InvoiceValidationError(getMinDateErrorMessage(minDate));
        }
      }

      await tx
        .delete(billingLineItems)
        .where(
          and(
            eq(billingLineItems.documentType, 'invoice'),
            eq(billingLineItems.documentId, id),
          ),
        );

      await tx
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

      await tx.insert(billingLineItems).values(
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

      return existingLocked;
    });

    if (!existingRow) return { error: 'Invoice not found.' };

    // If an issued/overdue invoice's total or date changed, void the old AR entry and repost
    const totalChanged = existingRow.total !== String(total.toFixed(2));
    const dateChanged = existingRow.invoiceDate !== invoiceDate;
    if ((existingRow.status === 'issued' || existingRow.status === 'overdue') && (totalChanged || dateChanged)) {
      const journalResult = await updateInvoiceJournalEntry({
        invoiceId: id,
        newAmount: total,
        date: invoiceDate,
        description: `Invoice ${existingRow.documentNumber}`,
        divisionId: existingRow.divisionId,
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
  } catch (err) {
    // Preserve specific validation error messages
    if (err instanceof InvoiceValidationError) {
      return { error: err.message };
    }
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
      throw new ActionError(getMinDateErrorMessage(minDate));
    }

    const includeLineItemItemId = await hasBillingLineItemItemIdColumn();

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

    // Create invoice, copy line items, and mark quote as converted atomically
    const inserted = await db.transaction(async (tx) => {
      // 1. Lock the quotation row to serialize concurrent conversions
      const [quoteLocked] = await tx
        .select()
        .from(quotations)
        .where(eq(quotations.id, quotationId))
        .for('update');

      if (!quoteLocked) throw new InvoiceValidationError('Quotation not found.');
      if (quoteLocked.status !== 'accepted') {
        throw new InvoiceValidationError('Only accepted quotations can be converted to invoices.');
      }

      // Load quote line items inside the transaction to share the lock
      const quoteLineItems = await tx
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

      // 2. Check if an invoice has already been created for this quotation
      const [existingInvoice] = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.quotationId, quotationId));

      if (existingInvoice) {
        throw new InvoiceValidationError('An invoice has already been created for this quotation.');
      }

      const [inv] = await tx
        .insert(invoices)
        .values({
          divisionId: quoteLocked.divisionId,
          clientId: quoteLocked.clientId,
          documentNumber,
          status: 'draft',
          invoiceDate: today,
          dueDate: calculatedDueDate,
          reference: quoteLocked.reference,
          quotationId: quoteLocked.id,
          subtotal: quoteLocked.subtotal,
          discountType: quoteLocked.discountType,
          discountValue: quoteLocked.discountValue,
          discountAmount: quoteLocked.discountAmount,
          vatEnabled: quoteLocked.vatEnabled,
          vatAmount: quoteLocked.vatAmount,
          total: quoteLocked.total,
          notes: quoteLocked.notes,
          terms: quoteLocked.terms,
          createdBy: session.user.id,
        })
        .returning({ id: invoices.id });

      if (!inv) throw new InvoiceValidationError('Failed to create invoice.');

      // Copy line items
      if (quoteLineItems.length > 0) {
        await tx.insert(billingLineItems).values(
          quoteLineItems.map((li) => ({
            documentType: 'invoice' as const,
            documentId: inv.id,
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
      await tx
        .update(quotations)
        .set({ status: 'converted', updatedAt: new Date() })
        .where(eq(quotations.id, quotationId));

      return inv;
    });

    if (!inserted) return { error: 'Failed to create invoice.' };

    revalidatePath('/billing/invoices');
    revalidatePath('/billing/quotes');
    revalidatePath(`/billing/quotes/${quotationId}`);

    return { id: inserted.id };
  } catch (err) {
    // Preserve specific validation error messages
    if (err instanceof InvoiceValidationError) {
      return { error: err.message };
    }
    return { error: 'Failed to convert. Please try again.' };
  }
}

// ── issueInvoice ──────────────────────────────────────────────────────────────

export async function issueInvoice(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();
    // Atomic status transition
    const updateResult = await db
      .update(invoices)
      .set({ status: 'issued', updatedAt: new Date() })
      .where(and(
        eq(invoices.id, id),
        eq(invoices.status, 'draft')
      ))
      .returning({ id: invoices.id });

    if (updateResult.length === 0) {
      return { error: 'Invoice not found or is no longer a draft.' };
    }

    // Fetch invoice details for the journal entry
    const [invoiceDetail] = await db
      .select({ total: invoices.total, invoiceDate: invoices.invoiceDate, documentNumber: invoices.documentNumber, divisionId: invoices.divisionId })
      .from(invoices)
      .where(eq(invoices.id, id));

    // Auto-post: Dr AR (1100) / Cr Revenue (4010)
    if (invoiceDetail) {
      const journalResult = await postInvoiceIssueJournalEntry({
        invoiceId: id,
        amount: parseFloat(invoiceDetail.total),
        date: invoiceDetail.invoiceDate,
        description: `Invoice ${invoiceDetail.documentNumber}`,
        divisionId: invoiceDetail.divisionId,
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

    // Post to income ledger and mark invoice paid atomically in a transaction
    const result = await db.transaction(async (tx) => {
      // Lock the invoice row to prevent concurrent status updates
      const [invoiceLocked] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .for('update');

      if (!invoiceLocked) throw new InvoiceValidationError('Invoice not found.');
      if (invoiceLocked.status === 'paid') throw new InvoiceValidationError('Invoice is already paid.');
      if (invoiceLocked.status === 'void') throw new InvoiceValidationError('Cannot mark a voided invoice as paid.');
      if (!invoiceLocked.clientId) throw new InvoiceValidationError('A client must be set before marking as paid.');

      const [row] = await tx
        .insert(income)
        .values({
          date: paymentDate,
          divisionId: invoiceLocked.divisionId!,
          clientId: invoiceLocked.clientId!,
          description,
          amount: invoiceLocked.total!,
        })
        .returning({ id: income.id });

      if (!row) throw new InvoiceValidationError('Failed to post income record.');

      await tx
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          incomeId: row.id,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id));

      return { incomeRow: row, invoiceLocked };
    });

    if (!result) return { error: 'Failed to post income record.' };
    const { incomeRow, invoiceLocked } = result;

    // Auto-post: Dr Bank (1010) / Cr AR (1100) + Dr Savings / Cr Bank (PMG share)
    const journalResult = await postPaymentJournalEntries({
      incomeId: incomeRow.id,
      amount: parseFloat(invoiceLocked.total),
      date: paymentDate,
      description,
      divisionId: invoiceLocked.divisionId,
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
  } catch (err) {
    // Preserve specific validation error messages
    if (err instanceof InvoiceValidationError) {
      return { error: err.message };
    }
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
    if (invoice.status === 'void') {
      return { error: 'Invoice is already void.' };
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

    // Atomic update
    const updateResult = await db
      .update(invoices)
      .set({ status: 'issued', updatedAt: new Date() })
      .where(and(
        inArray(invoices.id, eligibleIds),
        eq(invoices.status, 'draft')
      ))
      .returning({ id: invoices.id });

    const updatedIds = updateResult.map(r => r.id);
    if (updatedIds.length === 0) {
      return { error: 'No invoices were updated.' };
    }

    // Fetch invoice details for journal entries
    const invoiceDetails = await db
      .select({ id: invoices.id, total: invoices.total, invoiceDate: invoices.invoiceDate, documentNumber: invoices.documentNumber, divisionId: invoices.divisionId })
      .from(invoices)
      .where(inArray(invoices.id, updatedIds));

    // Auto-post AR for each issued invoice
    for (const inv of invoiceDetails) {
      const journalResult = await postInvoiceIssueJournalEntry({
        invoiceId: inv.id,
        amount: parseFloat(inv.total),
        date: inv.invoiceDate,
        description: `Invoice ${inv.documentNumber}`,
        divisionId: inv.divisionId,
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

// ── writeOffInvoice ──────────────────────────────────────────────────────────

export async function writeOffInvoice(id: string, reason: string): Promise<{ error?: string }> {
  await getSessionOrRedirect();

  try {
    const db = getDb();
    const writeOffDate = getSASTToday();

    if (await isPeriodClosed(writeOffDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    await db.transaction(async (tx) => {
      // Calculate total allocations within the transaction to prevent stale reads
      const [sumAgg] = await tx
        .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, id));
      
      const totalAllocated = parseFloat(sumAgg?.sum ?? '0');

      const [invoice] = await tx
        .select({ id: invoices.id, status: invoices.status, total: invoices.total, documentNumber: invoices.documentNumber, divisionId: invoices.divisionId })
        .from(invoices)
        .where(eq(invoices.id, id));

      if (!invoice) throw new Error('Invoice not found.');
      if (invoice.status !== 'issued' && invoice.status !== 'overdue') {
        throw new Error('Only issued or overdue invoices can be written off.');
      }

      const total = parseFloat(invoice.total);
      const outstanding = Math.max(0, total - totalAllocated);

      if (outstanding <= 0) {
        throw new Error('Invoice has no outstanding balance to write off.');
      }

      const updateResult = await tx
        .update(invoices)
        .set({ 
          status: 'written_off', 
          writeOffAmount: String(outstanding),
          updatedAt: new Date() 
        })
        .where(and(eq(invoices.id, id), eq(invoices.status, invoice.status)))
        .returning({ id: invoices.id });

      if (updateResult.length === 0) {
        throw new Error('Invoice status changed concurrently. Write-off aborted.');
      }

      const journalResult = await postInvoiceWriteOffJournalEntry({
        invoiceId: id,
        amount: outstanding,
        date: writeOffDate,
        description: `Write-off Invoice ${invoice.documentNumber}: ${reason}`,
        sourceDocumentNumber: invoice.documentNumber,
        divisionId: invoice.divisionId,
        tx,
      });

      if (journalResult.error) {
        throw new Error(journalResult.error);
      }
    });

    revalidatePath('/billing/invoices');
    revalidatePath(`/billing/invoices/${id}`);
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');

    return {};
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT') throw err;
    return { error: err.message || 'Failed to write off invoice. Please try again.' };
  }
}

export async function fetchInvoicesByMonth(year: number, month: number) {
  const { getAllInvoices } = await import('@pmg/db');
  return getAllInvoices(
    { year, month: `${year}-${month.toString().padStart(2, '0')}` },
    { page: 1, pageSize: 1000 }
  );
}

export async function fetchInvoicesByYear(year: number) {
  const { getAllInvoices } = await import('@pmg/db');
  return getAllInvoices(
    { year },
    { page: 1, pageSize: 5000 }
  );
}
