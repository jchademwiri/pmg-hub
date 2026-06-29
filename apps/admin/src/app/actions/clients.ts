'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, clients, income, eq, quotations, invoices, projectScheduleEntries } from '@pmg/db';
import { setClientActive } from '@pmg/db';

const ClientSchema = z.object({
  name:         z.string().min(1),
  businessName: z.string().optional(),
  email:        z.string().email().optional(),
  phone:        z.string().optional(),
  divisionId:   z.string().optional(),
});

export async function createClient(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.businessName === '') delete raw.businessName;
    if (raw.email === '') delete raw.email;
    if (raw.phone === '') delete raw.phone;
    if (raw.divisionId === '__none__') delete raw.divisionId;
    const result = ClientSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    await db.insert(clients).values({
      name: parsed.name,
      businessName: parsed.businessName ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      divisionId: parsed.divisionId ?? null,
    });
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('createClient failed:', e);
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateClient(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.businessName === '') delete raw.businessName;
    if (raw.email === '') delete raw.email;
    if (raw.phone === '') delete raw.phone;
    if (raw.divisionId === '__none__') delete raw.divisionId;
    const result = ClientSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    await db.update(clients)
      .set({
        name: parsed.name,
        businessName: parsed.businessName ?? null,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        divisionId: parsed.divisionId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id));
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('updateClient failed:', e);
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function toggleClientActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  try {
    await setClientActive(id, isActive);
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('toggleClientActive failed:', e);
    return { error: 'Failed to update client status.' };
  }
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  try {
    // Check for income records
    const [incomeCount] = await db
      .select({ id: income.id })
      .from(income)
      .where(eq(income.clientId, id))
      .limit(1);
    if (incomeCount) {
      return { error: 'Cannot delete a client that has payment records. Disable the client instead.' };
    }

    // Check for invoices
    const [invoiceCount] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.clientId, id))
      .limit(1);
    if (invoiceCount) {
      return { error: 'Cannot delete a client that has invoices. Disable the client instead.' };
    }

    // Check for quotes
    const [quoteCount] = await db
      .select({ id: quotations.id })
      .from(quotations)
      .where(eq(quotations.clientId, id))
      .limit(1);
    if (quoteCount) {
      return { error: 'Cannot delete a client that has quotes. Disable the client instead.' };
    }

    // Check for tender schedule entries
    const [tenderCount] = await db
      .select({ id: projectScheduleEntries.id })
      .from(projectScheduleEntries)
      .where(eq(projectScheduleEntries.clientId, id))
      .limit(1);
    if (tenderCount) {
      return { error: 'Cannot delete a client that has tender schedule entries. Disable the client instead.' };
    }

    await db.delete(clients).where(eq(clients.id, id));
    revalidatePath('/relationships/clients');
    return {};
  } catch (e) {
    console.error('deleteClient failed:', e);
    return { error: 'Failed to delete. Please try again.' };
  }
}
