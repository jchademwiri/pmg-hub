'use server';

import { z } from 'zod';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, clients, eq } from '@pmg/db';
import { revalidatePath } from 'next/cache';

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val ? val : null));

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Contact person name is required.'),
  phone: optionalTrimmedString,
  registrationNumber: optionalTrimmedString,
  website: optionalTrimmedString,
  billingAddress: optionalTrimmedString,
  city: optionalTrimmedString,
  postalCode: optionalTrimmedString,
  province: optionalTrimmedString,
});

export async function updateClientProfileAction(formData: {
  name: string;
  phone?: string;
  registrationNumber?: string;
  website?: string;
  billingAddress?: string;
  city?: string;
  postalCode?: string;
  province?: string;
}) {
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
        registrationNumber: parsed.data.registrationNumber || null,
        website: parsed.data.website || null,
        billingAddress: parsed.data.billingAddress || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        province: parsed.data.province || null,
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
