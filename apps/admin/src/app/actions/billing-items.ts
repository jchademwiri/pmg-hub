'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDb, billingItems, billingLineItems, eq, and, or } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

// ── Schema ────────────────────────────────────────────────────────────────────

const ItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional().nullable(),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  unitLabel: z.string().optional().nullable(),
  // vatApplicable removed from UI - VAT is document-level. Kept in DB for
  // backward compatibility; always passed as true so existing records are stable.
});

type ItemInput = z.infer<typeof ItemSchema>;

let hasBillingLineItemItemIdColumnPromise: Promise<boolean> | null = null;

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

// ── createItem ────────────────────────────────────────────────────────────────

export async function createItem(
  data: ItemInput,
): Promise<{ error?: string; id?: string }> {
  try {
    await getSessionOrRedirect();

    const parsed = ItemSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const { name, description, unitPrice, unitLabel } = parsed.data;

    const db = getDb();
    const [inserted] = await db
      .insert(billingItems)
      .values({
        name,
        description: description ?? null,
        unitPrice: String(unitPrice.toFixed(2)),
        unitLabel: unitLabel ?? null,
        vatApplicable: true, // always true - VAT is document-level
      })
      .returning({ id: billingItems.id });

    if (!inserted) return { error: 'Failed to create item.' };

    revalidatePath('/billing/items');
    return { id: inserted.id };
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── updateItem ────────────────────────────────────────────────────────────────

export async function updateItem(
  id: string,
  data: ItemInput,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const parsed = ItemSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const { name, description, unitPrice, unitLabel } = parsed.data;

    const db = getDb();
    await db
      .update(billingItems)
      .set({
        name,
        description: description ?? null,
        unitPrice: String(unitPrice.toFixed(2)),
        unitLabel: unitLabel ?? null,
        // vatApplicable: preserve existing value - not changed from UI
        updatedAt: new Date(),
      })
      .where(eq(billingItems.id, id));

    revalidatePath('/billing/items');
    revalidatePath(`/billing/items/${id}`);
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

// ── archiveItem ───────────────────────────────────────────────────────────────

export async function archiveItem(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();
    await db
      .update(billingItems)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(billingItems.id, id));

    revalidatePath('/billing/items');
    revalidatePath(`/billing/items/${id}`);
    return {};
  } catch {
    return { error: 'Failed to archive. Please try again.' };
  }
}

// ── unarchiveItem ─────────────────────────────────────────────────────────────

export async function unarchiveItem(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();
    await db
      .update(billingItems)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(billingItems.id, id));

    revalidatePath('/billing/items');
    revalidatePath(`/billing/items/${id}`);
    return {};
  } catch {
    return { error: 'Failed to unarchive. Please try again.' };
  }
}

// ── deleteItem ────────────────────────────────────────────────────────────────

export async function deleteItem(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const db = getDb();

    const hasItemId = await hasBillingLineItemItemIdColumn();
    const [item] = hasItemId
      ? []
      : await db
          .select({ name: billingItems.name, description: billingItems.description })
          .from(billingItems)
          .where(eq(billingItems.id, id));

    // Check if item is referenced in any invoice line items. Fall back to legacy
    // description matching until the item_id migration has been applied.
    const [usedInInvoice] = await db
      .select({ id: billingLineItems.id })
      .from(billingLineItems)
      .where(
        and(
          eq(billingLineItems.documentType, 'invoice'),
          hasItemId
            ? eq(billingLineItems.itemId, id)
            : or(
                eq(billingLineItems.description, item?.name ?? ''),
                eq(billingLineItems.description, item?.description ?? ''),
              ),
        ),
      )
      .limit(1);

    if (usedInInvoice) {
      return { error: 'Archive instead of deleting used items.' };
    }

    await db.delete(billingItems).where(eq(billingItems.id, id));

    revalidatePath('/billing/items');
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}
