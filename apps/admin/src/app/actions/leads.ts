'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, leads, clients, eq } from '@pmg/db';

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

export async function convertLeadToClient(id: string): Promise<{ error?: string; clientId?: string }> {
  try {
    const lead = await db.select().from(leads).where(eq(leads.id, id)).then(rows => rows[0]);
    if (!lead) return { error: 'Lead not found.' };
    if (lead.status === 'converted') return { error: 'Lead is already converted.' };

    if (lead.email) {
      const [existingClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.email, lead.email));
      if (existingClient) {
        return { error: `A client with the email "${lead.email}" already exists.` };
      }
    }

    // Use the module-level db client (supports transactions after driver switch)
    // Insert client and update lead status atomically
    const inserted = await db.transaction(async (tx) => {
      // 1. Lock the lead row to prevent concurrent status updates
      const [leadRow] = await tx
        .select()
        .from(leads)
        .where(eq(leads.id, id))
        .for('update');

      if (!leadRow) throw new Error('Lead not found.');
      if (leadRow.status === 'converted') throw new Error('Lead is already converted.');

      // 2. Lock / verify existing client uniqueness (email only - backed by DB constraint)
      // Note: Phone uniqueness is not enforced as there is no DB unique constraint on clients.phone
      if (leadRow.email) {
        const [existingClient] = await tx
          .select()
          .from(clients)
          .where(eq(clients.email, leadRow.email));
        if (existingClient) {
          throw new Error(`A client with the email "${leadRow.email}" already exists.`);
        }
      }


      const [client] = await tx.insert(clients).values({
        name: leadRow.name || 'Converted Lead',
        email: leadRow.email ?? null,
        phone: leadRow.phone ?? null,
        isActive: true,
      }).returning({ id: clients.id });

      if (!client) {
        throw new Error('Failed to create client record.');
      }

      await tx.update(leads)
        .set({ status: 'converted', updatedAt: new Date() })
        .where(eq(leads.id, id));

      return client;
    });


    if (!inserted) {
      return { error: 'Failed to create client record.' };
    }

    revalidatePath('/relationships/leads');
    revalidatePath('/relationships/clients');
    revalidatePath(`/relationships/leads/${id}`);
    revalidatePath('/dashboard');

    return { clientId: inserted.id };
  } catch {
    return { error: 'Failed to convert lead to client. Please try again.' };
  }
}
