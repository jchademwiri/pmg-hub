'use server';

import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, clients, eq } from '@pmg/db';
import { revalidatePath } from 'next/cache';

export async function updateClientProfileAction(formData: { name: string; phone: string }) {
  try {
    const { client } = await getPortalSessionOrRedirect();

    if (!formData.name.trim()) {
      return { error: 'Contact person name is required.' };
    }

    const db = getDb();
    await db
      .update(clients)
      .set({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, client.id));

    revalidatePath('/profile');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update profile.' };
  }
}
