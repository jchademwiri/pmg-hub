'use server';

import { z } from 'zod';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, clients, eq } from '@pmg/db';
import { revalidatePath } from 'next/cache';

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Contact person name is required.'),
  phone: z.string().trim().optional().nullable(),
});

export async function updateClientProfileAction(formData: { name: string; phone?: string }) {
  try {
    const { client } = await getPortalSessionOrRedirect();

    const parsed = UpdateProfileSchema.safeParse(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const db = getDb();
    await db
      .update(clients)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, client.id));

    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update profile.';
    return { error: message };
  }
}
