'use server';

import { revalidatePath } from 'next/cache';
import { getDb, quotations, billingLineItems, eq, and } from '@pmg/db';
import { getNextDocumentNumber, addDays, getQuotationById, today } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getEndOfMonth } from '@/lib/format';
import { CreateQuotationSchema, type CreateQuotationInput } from './billing-schema';
import { hasBillingLineItemItemIdColumn } from './billing-line-item-compat';

let hasQuotationReferenceColumnPromise: Promise<boolean> | null = null;

async function hasQuotationReferenceColumn() {
  if (!hasQuotationReferenceColumnPromise) {
    hasQuotationReferenceColumnPromise = getDb()
      .execute(
        `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'quotations'
            AND column_name = 'reference'
        ) AS "exists"
      `,
      )
      .then((res) => {
        const rows = (res as { rows?: Array<{ exists?: boolean }> }).rows;
        const exists = Boolean(rows?.[0]?.exists);
        if (!exists) hasQuotationReferenceColumnPromise = null;
        return exists;
      })
      .catch(() => {
        hasQuotationReferenceColumnPromise = null;
        return false;
      });
  }
  return hasQuotationReferenceColumnPromise;
}

// ── Shared discount + totals helper ──────────────────────────────────────────

function calcDocumentTotals(
  lineItems: {
    quantity: number;
    unitPrice: number;
    discountType?: 'percent' | 'amount' | null;
    discountValue?: number | null;
  }[],
  vatEnabled: boolean,
  discountType: 'percent' | 'amount' | null | undefined,
  discountValue: number | null | undefined,
) {
  let subtotal = 0;
  for (const item of lineItems) {
    const rawTotal = item.quantity * item.unitPrice;
    const itemDiscountVal = item.discountValue ?? 0;
    const itemDiscountAmount =
      item.discountType === 'percent'
        ? rawTotal * (itemDiscountVal / 100)
        : item.discountType === 'amount'
          ? Math.min(itemDiscountVal, rawTotal)
          : 0;
    // Round each line the same way buildQuoteLineItemRows rounds its stored
    // `lineTotal`, so the header subtotal always foots exactly to the sum of
    // the displayed line totals.
    subtotal += Math.round((rawTotal - itemDiscountAmount) * 100) / 100;
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

  return {
    subtotal,
    discountAmount,
    vatAmount,
    total,
  };
}

// ── Shared line-item row builder ─────────────────────────────────────────────
// Used by both createQuotation and updateQuotation so their stored line items
// never drift apart — updateQuotation previously reinserted rows with a
// different (discount-less) computation than createQuotation, silently
// dropping every per-line discount whenever a quote was edited.

function buildQuoteLineItemRows(
  documentId: string,
  lineItems: {
    itemId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discountType?: 'percent' | 'amount' | null;
    discountValue?: number | null;
  }[],
) {
  return lineItems.map((item, i) => {
    const rawTotal = item.quantity * item.unitPrice;
    const itemDiscountVal = item.discountValue ?? 0;
    const itemDiscountAmount =
      item.discountType === 'percent'
        ? rawTotal * (itemDiscountVal / 100)
        : item.discountType === 'amount'
          ? Math.min(itemDiscountVal, rawTotal)
          : 0;

    return {
      documentType: 'quote' as const,
      documentId,
      sortOrder: i,
      itemId: item.itemId ?? null,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice.toFixed(2)),
      discountType: item.discountType ?? null,
      discountValue: item.discountValue != null ? String(item.discountValue) : null,
      discountAmount: String(itemDiscountAmount.toFixed(2)),
      vatRate: '0',
      lineTotal: String((rawTotal - itemDiscountAmount).toFixed(2)),
    };
  });
}

// ── createQuotation ───────────────────────────────────────────────────────────

export async function createQuotation(
  data: CreateQuotationInput,
): Promise<{ error?: string; id?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const parsed = CreateQuotationSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const {
      divisionId,
      clientId,
      quoteDate,
      expiryDate,
      reference,
      notes,
      terms,
      lineItems,
      vatEnabled,
      discountType,
      discountValue,
    } = parsed.data;

    // clientId is required - enforced by Zod but double-check
    if (!clientId) {
      return { error: 'A client is required.' };
    }

    if (await isPeriodClosed(quoteDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    if (vatEnabled) {
      try {
        const { getOrganisationSettings } = await import('@pmg/db');
        if (typeof getOrganisationSettings === 'function') {
          const orgSettings = await getOrganisationSettings();
          if (orgSettings && !orgSettings.vatNumber?.trim()) {
            return {
              error:
                'VAT cannot be enabled: No registered VAT number is configured in Organisation Settings.',
            };
          }
        }
      } catch {
        // Table or settings not initialized
      }
    }

    const { subtotal, discountAmount, vatAmount, total } = calcDocumentTotals(
      lineItems,
      vatEnabled,
      discountType,
      discountValue,
    );

    const year = Number(quoteDate.slice(0, 4));
    const documentNumber = await getNextDocumentNumber(divisionId, 'quote', year);

    const db = getDb();
    const includeReference = await hasQuotationReferenceColumn();
    await hasBillingLineItemItemIdColumn();

    const { id: insertedId } = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(quotations)
        .values({
          divisionId,
          clientId,
          documentNumber,
          status: 'draft',
          quoteDate,
          expiryDate: expiryDate ?? getEndOfMonth(quoteDate),
          ...(includeReference ? { reference: reference ?? null } : {}),
          subtotal: String(subtotal.toFixed(2)),
          discountType: discountType ?? null,
          discountValue: discountValue != null ? String(discountValue) : null,
          discountAmount: String(discountAmount.toFixed(2)),
          vatEnabled,
          vatAmount: String(vatAmount.toFixed(2)),
          total: String(total.toFixed(2)),
          notes: notes ?? null,
          terms: terms ?? null,
          createdBy: session.user.id,
        })
        .returning({ id: quotations.id });

      if (!inserted) {
        throw new Error('Failed to create quotation.');
      }

      // Insert line items - vatRate always 0 (VAT is document-level)
      await tx.insert(billingLineItems).values(buildQuoteLineItemRows(inserted.id, lineItems));

      return { id: inserted.id };
    });

    revalidatePath('/billing/quotes');
    revalidatePath('/dashboard');

    return { id: insertedId };
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── updateQuotation ───────────────────────────────────────────────────────────

export async function updateQuotation(
  id: string,
  data: CreateQuotationInput,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const parsed = CreateQuotationSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const {
      clientId,
      quoteDate,
      expiryDate,
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
    const includeReference = await hasQuotationReferenceColumn();
    await hasBillingLineItemItemIdColumn();
    const [existing] = await db
      .select({ id: quotations.id, status: quotations.status, quoteDate: quotations.quoteDate })
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!existing) return { error: 'Quotation not found.' };

    const editableStatuses = ['draft', 'sent', 'accepted'];
    if (!editableStatuses.includes(existing.status)) {
      return { error: 'This quotation can no longer be edited.' };
    }

    if (vatEnabled) {
      try {
        const { getOrganisationSettings } = await import('@pmg/db');
        if (typeof getOrganisationSettings === 'function') {
          const orgSettings = await getOrganisationSettings();
          if (orgSettings && !orgSettings.vatNumber?.trim()) {
            return {
              error:
                'VAT cannot be enabled: No registered VAT number is configured in Organisation Settings.',
            };
          }
        }
      } catch {
        // Table or settings not initialized
      }
    }

    const { subtotal, discountAmount, vatAmount, total } = calcDocumentTotals(
      lineItems,
      vatEnabled,
      discountType,
      discountValue,
    );

    // Delete existing line items and reinsert
    await db
      .delete(billingLineItems)
      .where(and(eq(billingLineItems.documentType, 'quote'), eq(billingLineItems.documentId, id)));

    await db
      .update(quotations)
      .set({
        clientId,
        quoteDate,
        expiryDate: expiryDate ?? null,
        ...(includeReference ? { reference: reference ?? null } : {}),
        subtotal: String(subtotal.toFixed(2)),
        discountType: discountType ?? null,
        discountValue: discountValue != null ? String(discountValue) : null,
        discountAmount: String(discountAmount.toFixed(2)),
        vatEnabled,
        vatAmount: String(vatAmount.toFixed(2)),
        total: String(total.toFixed(2)),
        notes: notes ?? null,
        terms: terms ?? null,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id));

    await db.insert(billingLineItems).values(buildQuoteLineItemRows(id, lineItems));

    revalidatePath('/billing/quotes');
    revalidatePath(`/billing/quotes/${id}`);

    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── updateQuotationStatus ─────────────────────────────────────────────────────

export async function updateQuotationStatus(
  id: string,
  status: 'sent' | 'accepted' | 'declined' | 'cancelled',
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();
    const [quote] = await db
      .select({ id: quotations.id, status: quotations.status })
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!quote) return { error: 'Quotation not found.' };

    // Validate allowed transitions
    const allowed: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['accepted', 'declined', 'cancelled'],
    };

    if (!allowed[quote.status]?.includes(status)) {
      return { error: 'Invalid status transition.' };
    }

    await db.update(quotations).set({ status, updatedAt: new Date() }).where(eq(quotations.id, id));

    revalidatePath('/billing/quotes');
    revalidatePath(`/billing/quotes/${id}`);

    return {};
  } catch {
    return { error: 'Failed to update status. Please try again.' };
  }
}

// ── deleteQuotation ───────────────────────────────────────────────────────────

export async function deleteQuotation(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();
    const [quote] = await db
      .select({ id: quotations.id, status: quotations.status })
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!quote) return { error: 'Quotation not found.' };
    if (quote.status !== 'draft') {
      return { error: 'Only draft quotations can be deleted.' };
    }

    // Delete line items first (no FK cascade - polymorphic)
    await db
      .delete(billingLineItems)
      .where(and(eq(billingLineItems.documentType, 'quote'), eq(billingLineItems.documentId, id)));

    await db.delete(quotations).where(eq(quotations.id, id));

    revalidatePath('/billing/quotes');

    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}

// ── duplicateQuotation ────────────────────────────────────────────────────────

export async function duplicateQuotation(id: string): Promise<{ error?: string; id?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const source = await getQuotationById(id);
    if (!source) return { error: 'Quotation not found.' };

    const todayStr = today();

    // Preserve the same expiry offset as the original (days between quoteDate and expiryDate)
    let newExpiryDate: string | null = null;
    if (source.expiryDate && source.quoteDate) {
      const origIssue = new Date(source.quoteDate);
      const origExpiry = new Date(source.expiryDate);
      const diffDays = Math.round(
        (origExpiry.getTime() - origIssue.getTime()) / (1000 * 60 * 60 * 24),
      );
      newExpiryDate = addDays(todayStr, diffDays);
    }

    const year = Number(todayStr.slice(0, 4));
    const documentNumber = await getNextDocumentNumber(source.divisionId, 'quote', year);

    const db = getDb();
    const includeReference = await hasQuotationReferenceColumn();
    const includeLineItemItemId = await hasBillingLineItemItemIdColumn();

    const { id: insertedId } = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(quotations)
        .values({
          divisionId: source.divisionId,
          clientId: source.clientId,
          documentNumber,
          status: 'draft',
          quoteDate: todayStr,
          expiryDate: newExpiryDate,
          // Reference is intentionally cleared — the caller updates it for the new job
          ...(includeReference ? { reference: null } : {}),
          subtotal: source.subtotal,
          discountType: source.discountType ?? null,
          discountValue: source.discountValue ?? null,
          discountAmount: source.discountAmount,
          vatEnabled: source.vatEnabled,
          vatAmount: source.vatAmount,
          total: source.total,
          notes: source.notes ?? null,
          terms: source.terms ?? null,
          createdBy: session.user.id,
        })
        .returning({ id: quotations.id });

      if (!inserted) {
        throw new Error('Failed to duplicate quotation.');
      }

      if (source.lineItems.length > 0) {
        await tx.insert(billingLineItems).values(
          source.lineItems.map((li, i) => ({
            documentType: 'quote' as const,
            documentId: inserted.id,
            sortOrder: i,
            ...(includeLineItemItemId ? { itemId: li.itemId ?? null } : {}),
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            vatRate: li.vatRate,
            lineTotal: li.lineTotal,
          })),
        );
      }

      return { id: inserted.id };
    });

    revalidatePath('/billing/quotes');

    return { id: insertedId };
  } catch {
    return { error: 'Failed to duplicate. Please try again.' };
  }
}

export async function fetchQuotesByMonth(
  year: number,
  month: number,
  divisionId?: string,
  status?: string,
) {
  const { getAllQuotations } = await import('@pmg/db');
  return getAllQuotations(
    { month: `${year}-${month.toString().padStart(2, '0')}`, divisionId, status },
    { page: 1, pageSize: 1000 },
  );
}

export async function fetchQuotesByYear(year: number, divisionId?: string, status?: string) {
  const { getAllQuotations } = await import('@pmg/db');
  return getAllQuotations({ year, divisionId, status }, { page: 1, pageSize: 5000 });
}

/**
 * ── convertQuotationToInvoice ───────────────────────────────────────────────
 * Converts an accepted or sent quote into a formal invoice (INV-XXXX).
 * Copies all header details & line items and marks quote as 'converted'.
 */
export async function convertQuotationToInvoice(
  id: string,
): Promise<{ error?: string; id?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();
    const { invoices } = await import('@pmg/db');

    const source = await getQuotationById(id);
    if (!source) return { error: 'Quote not found.' };

    const todayStr = new Date().toISOString().split('T')[0]!;
    if (await isPeriodClosed(todayStr)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    const dueDate = addDays(todayStr, 30);

    const year = new Date(todayStr).getFullYear();
    const documentNumber = await getNextDocumentNumber(source.divisionId, 'invoice', year);

    const newInvoiceId = await db.transaction(async (tx) => {
      const [inv] = await tx
        .insert(invoices)
        .values({
          documentNumber,
          divisionId: source.divisionId,
          clientId: source.clientId,
          invoiceDate: todayStr,
          dueDate,
          reference: source.reference
            ? `Quote ${source.documentNumber}: ${source.reference}`
            : `From Quote ${source.documentNumber}`,
          subtotal: source.subtotal,
          discountType: source.discountType,
          discountValue: source.discountValue,
          discountAmount: source.discountAmount,
          vatAmount: source.vatAmount,
          total: source.total,
          status: 'issued',
          createdBy: session.user.id,
        })
        .returning({ id: invoices.id });

      if (!inv) throw new Error('Failed to create invoice.');

      if (source.lineItems.length > 0) {
        const includeLineItemItemId = await hasBillingLineItemItemIdColumn();
        await tx.insert(billingLineItems).values(
          source.lineItems.map((li, i) => ({
            documentType: 'invoice' as const,
            documentId: inv.id,
            sortOrder: i,
            ...(includeLineItemItemId ? { itemId: li.itemId ?? null } : {}),
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            vatRate: li.vatRate,
            lineTotal: li.lineTotal,
          })),
        );
      }

      await tx
        .update(quotations)
        .set({ status: 'converted', updatedAt: new Date() })
        .where(eq(quotations.id, id));

      return inv.id;
    });

    revalidatePath('/billing/quotes');
    revalidatePath('/billing/invoices');
    return { id: newInvoiceId };
  } catch (err) {
    console.error('Failed to convert quote to invoice:', err);
    return { error: 'Failed to convert quote to invoice.' };
  }
}
