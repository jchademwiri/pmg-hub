'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, leads, eq } from '@pmg/db';

const LeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost'], {
    error: 'Status must be one of: new, contacted, converted, or lost',
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
    revalidatePath('/relationships/leads');
    revalidatePath(`/relationships/leads/${id}`);
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
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
    revalidatePath(`/relationships/leads/${id}`);
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

const CreateLeadSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    source: z.string().optional(),
    serviceInterest: z.string().optional(),
    divisionId: z.string().uuid().optional(),
    message: z.string().optional(),
  })
  .refine((data) => !!(data.email || data.phone), {
    message: 'At least one of email or phone is required',
  });

export async function createLead(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = CreateLeadSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    await db.insert(leads).values({
      name: parsed.name,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      source: parsed.source ?? null,
      serviceInterest: parsed.serviceInterest ?? null,
      divisionId: parsed.divisionId ?? null,
      message: parsed.message ?? null,
      status: 'new',
    });
    revalidatePath('/relationships/leads');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteLead(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(leads).where(eq(leads.id, id));
    revalidatePath('/relationships/leads');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}
