'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, leads, eq } from '@pmg/db';

const LeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost'], {
    errorMap: () => ({ message: 'Status must be one of: new, contacted, converted, or lost' }),
  }),
});

export async function updateLeadStatus(id: string, formData: FormData): Promise<{ error?: string }> {
  const raw = Object.fromEntries(formData);
  const result = LeadStatusSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation error' };
  }
  try {
    await db.update(leads)
      .set({ status: result.data.status, updatedAt: new Date() })
      .where(eq(leads.id, id));
    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    revalidatePath('/dashboard');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

const LeadNotesSchema = z.object({ notes: z.string().optional() });

export async function updateLeadNotes(id: string, formData: FormData): Promise<{ error?: string }> {
  const raw = Object.fromEntries(formData);
  const result = LeadNotesSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation error' };
  }
  try {
    await db.update(leads)
      .set({ notes: result.data.notes ?? null, updatedAt: new Date() })
      .where(eq(leads.id, id));
    revalidatePath(`/leads/${id}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
