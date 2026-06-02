'use server';

import { revalidatePath } from 'next/cache';
import { getDb, quotations, billingLineItems, eq, and } from '@pmg/db';
import { getNextDocumentNumber, addDays } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { CreateQuotationSchema, type CreateQuotationInput } from './billing-schema';

let hasQuotationReferenceColumnPromise: Promise<boolean> | null = null;
let hasBillingLineItemItemIdColumnPromise: Promise<boolean> | null = null;

async function hasQuotationReferenceColumn() {
  if (!hasQuotationReferenceColumnPromise) {
    hasQuotationReferenceColumnPromise = getDb()
      .execute(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'quotations'
            AND column_name = 'reference'
        ) AS "exists"
      `)
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

async function hasBillingLineItemItemIdColumn() {
  if (!hasBillingLineItemItemIdColumnPromise) {
    hasBillingLineItemItemIdColumnPromise = getDb()
      .execute(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'billing_line_items'
            AND column_name = 'item_id'
        ) AS "exists"
      `)
      .then((res) => {
        const rows = (res as { rows?: Array<{ exists?: boolean }> }).rows;
        const exists = Boolean(rows?.[0]?.exists);
        if (!exists) hasBillingLineItemItemIdColumnPromise = null;
        return exists;
      })
      .catch(() => {
        hasBillingLineItemItemIdColumnPromise = null;
        return false;
      });
  }
  return hasBillingLineItemItemIdColumnPromise;
}

function lineItemInsertValues(
  item: { itemId?: string | null; description: string; quantity: number; unitPrice: number },
  documentType: 'quote',
  documentId: string,
  sortOrder: number,
  includeItemId: boolean,
) {
  return {
    documentType,
    documentId,
    sortOrder,
    ...(includeItemId ? { itemId: item.itemId ?? null } : {}),
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice.toFixed(2)),
    vatRate: '0',
    lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),
  };
}

// ── Shared discount + totals helper ──────────────────────────────────────────

function calcDocumentTotals(
  lineItems: { quantity: number; unitPrice: number }[],
  vatEnabled: boolean,
  discountType: 'percent' | 'amount' | null | undefined,
  discountValue: number | null | undefined,
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

  return {
    subtotal,
    discountAmount,
    vatAmount,
    total,
  };
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

    const { subtotal, discountAmount, vatAmount, total } = calcDocumentTotals(
      lineItems,
      vatEnabled,
      discountType,
      discountValue,
    );

    const year = new Date(quoteDate).getFullYear();
    const documentNumber = await getNextDocumentNumber(divisionId, 'quote', year);

    const db = getDb();
    const includeReference = await hasQuotationReferenceColumn();
    const includeLineItemItemId = await hasBillingLineItemItemIdColumn();

    const [inserted] = await db
      .insert(quotations)
      .values({
        divisionId,
        clientId,
        documentNumber,
        status: 'draft',
        quoteDate,
        expiryDate: expiryDate ?? addDays(quoteDate, 30),
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

    if (!inserted) return { error: 'Failed to create quotation.' };

    // Insert line items - vatRate always 0 (VAT is document-level)
    await db.insert(billingLineItems).values(
      lineItems.map((item, i) => lineItemInsertValues(
        item,
        'quote',
        inserted.id,
        i,
        includeLineItemItemId,
      )),
    );

    revalidatePath('/billing/quotes');
    revalidatePath('/dashboard');

    return { id: inserted.id };
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
    const includeLineItemItemId = await hasBillingLineItemItemIdColumn();
    const [existing] = await db
      .select({ id: quotations.id, status: quotations.status, quoteDate: quotations.quoteDate })
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!existing) return { error: 'Quotation not found.' };

    if (await isPeriodClosed(existing.quoteDate)) {
      return { error: 'Cannot edit a quotation in a closed financial period.' };
    }
    if (await isPeriodClosed(quoteDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    const editableStatuses = ['draft', 'sent', 'accepted'];
    if (!editableStatuses.includes(existing.status)) {
      return { error: 'This quotation can no longer be edited.' };
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
      .where(
        and(
          eq(billingLineItems.documentType, 'quote'),
          eq(billingLineItems.documentId, id),
        ),
      );

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

    await db.insert(billingLineItems).values(
      lineItems.map((item, i) => lineItemInsertValues(
        item,
        'quote',
        id,
        i,
        includeLineItemItemId,
      )),
    );

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

    await db
      .update(quotations)
      .set({ status, updatedAt: new Date() })
      .where(eq(quotations.id, id));

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
      .where(
        and(
          eq(billingLineItems.documentType, 'quote'),
          eq(billingLineItems.documentId, id),
        ),
      );

    await db.delete(quotations).where(eq(quotations.id, id));

    revalidatePath('/billing/quotes');

    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}
