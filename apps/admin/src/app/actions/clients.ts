'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, clients, eq } from '@pmg/db';
import { setClientActive } from '@pmg/db';

const ClientSchema = z.object({
  name:         z.string().min(1),
  businessName: z.string().optional(),
  email:        z.string().email().optional(),
  phone:        z.string().optional(),
});

export async function createClient(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.businessName === '') delete raw.businessName;
    if (raw.email === '') delete raw.email;
    if (raw.phone === '') delete raw.phone;
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
    });
    revalidatePath('/clients');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateClient(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.businessName === '') delete raw.businessName;
    if (raw.email === '') delete raw.email;
    if (raw.phone === '') delete raw.phone;
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
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id));
    revalidatePath('/clients');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function toggleClientActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  try {
    await setClientActive(id, isActive);
    revalidatePath('/clients');
    return {};
  } catch {
    return { error: 'Failed to update client status.' };
  }
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(clients).where(eq(clients.id, id));
    revalidatePath('/clients');
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('23503')) {
      return { error: 'Cannot delete a client that has income records. Disable the client instead.' };
    }
    return { error: 'Failed to save. Please try again.' };
  }
}
