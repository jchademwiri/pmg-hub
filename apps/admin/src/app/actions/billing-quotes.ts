'use server';

import { revalidatePath } from 'next/cache';
import { getDb, quotations, billingLineItems, eq, and } from '@pmg/db';
import { getNextDocumentNumber } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { CreateQuotationSchema, type CreateQuotationInput } from './billing-schema';

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

    // clientId is required — enforced by Zod but double-check
    if (!clientId) {
      return { error: 'A client is required.' };
    }

    const today = new Date().toISOString().split('T')[0]!;
    if (quoteDate > today) {
      return { error: 'Quote date cannot be in the future.' };
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

    const [inserted] = await db
      .insert(quotations)
      .values({
        divisionId,
        clientId,
        documentNumber,
        status: 'draft',
        quoteDate,
        expiryDate: expiryDate ?? null,
        reference: reference ?? null,
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

    // Insert line items — vatRate always 0 (VAT is document-level)
    await db.insert(billingLineItems).values(
      lineItems.map((item: { itemId: string; description: string; quantity: number; unitPrice: number; vatRate: number }, i: number) => ({
        documentType: 'quote' as const,
        documentId: inserted.id,
        sortOrder: i,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice.toFixed(2)),
        vatRate: '0',
        lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),
      })),
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
    const [existing] = await db
      .select({ id: quotations.id, status: quotations.status })
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!existing) return { error: 'Quotation not found.' };

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
        reference: reference ?? null,
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
      lineItems.map((item: { itemId: string; description: string; quantity: number; unitPrice: number; vatRate: number }, i: number) => ({
        documentType: 'quote' as const,
        documentId: id,
        sortOrder: i,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice.toFixed(2)),
        vatRate: '0',
        lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),
      })),
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

    // Delete line items first (no FK cascade — polymorphic)
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
