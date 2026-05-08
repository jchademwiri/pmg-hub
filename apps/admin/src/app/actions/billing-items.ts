'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDb, billingItems, billingLineItems, eq, and } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

// ── Schema ────────────────────────────────────────────────────────────────────

const ItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional().nullable(),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  unitLabel: z.string().optional().nullable(),
  vatApplicable: z.coerce.boolean(),
});

type ItemInput = z.infer<typeof ItemSchema>;

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
    const { name, description, unitPrice, unitLabel, vatApplicable } = parsed.data;

    const db = getDb();
    const [inserted] = await db
      .insert(billingItems)
      .values({
        name,
        description: description ?? null,
        unitPrice: String(unitPrice.toFixed(2)),
        unitLabel: unitLabel ?? null,
        vatApplicable,
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
    const { name, description, unitPrice, unitLabel, vatApplicable } = parsed.data;

    const db = getDb();
    await db
      .update(billingItems)
      .set({
        name,
        description: description ?? null,
        unitPrice: String(unitPrice.toFixed(2)),
        unitLabel: unitLabel ?? null,
        vatApplicable,
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

    // Check if item is referenced in any line items (by name match — no FK)
    const [usedInInvoice] = await db
      .select({ id: billingLineItems.id })
      .from(billingLineItems)
      .where(
        and(
          eq(billingLineItems.documentType, 'invoice'),
          eq(billingLineItems.description, (
            await db
              .select({ name: billingItems.name })
              .from(billingItems)
              .where(eq(billingItems.id, id))
          )[0]?.name ?? ''),
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
