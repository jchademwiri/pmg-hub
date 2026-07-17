'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  addComplianceRecord as dbAddComplianceRecord,
  deleteComplianceRecord as dbDeleteComplianceRecord,
  updateComplianceRecord as dbUpdateComplianceRecord,
  getDb,
  complianceDocuments,
  eq
} from '@pmg/db';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';

const ComplianceSchema = z.object({
  documentType: z.string().min(1),
  customName: z.string().optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && date === d.toISOString().split('T')[0];
  }, 'Invalid date'),
}).superRefine((data, ctx) => {
  if (data.documentType === 'CUSTOM' && !data.customName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Custom Document Name is required when Document Type is CUSTOM',
      path: ['customName'],
    });
  }
});

export async function addClientComplianceRecord(formData: FormData): Promise<{ error?: string }> {
  try {
    const { client } = await getPortalSessionOrRedirect();
    
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.customName === '') delete raw.customName;

    const result = ComplianceSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }

    const parsed = result.data;

    await dbAddComplianceRecord({
      ...parsed,
      clientId: client.id,
      uploadedBy: 'CLIENT',
      uploadedById: client.id,
    });

    revalidatePath('/compliance');
    
    return {};
  } catch (e) {
    console.error('addClientComplianceRecord failed:', e);
    return { error: 'Failed to save compliance record. Please try again.' };
  }
}

export async function deleteClientComplianceRecord(id: string): Promise<{ error?: string }> {
  try {
    const { client } = await getPortalSessionOrRedirect();
    
    // Security check: verify this document belongs to this client
    const db = getDb();
    const docs = await db.select().from(complianceDocuments).where(eq(complianceDocuments.id, id));
    const doc = docs[0];

    if (!doc || doc.clientId !== client.id) {
      return { error: 'Unauthorized' };
    }

    await dbDeleteComplianceRecord(id);

    revalidatePath('/compliance');
    
    return {};
  } catch (e) {
    console.error('deleteClientComplianceRecord failed:', e);
    return { error: 'Failed to delete compliance record. Please try again.' };
  }
}

export async function updateClientComplianceRecord(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const { client } = await getPortalSessionOrRedirect();
    
    // Security check: verify this document belongs to this client
    const db = getDb();
    const docs = await db.select().from(complianceDocuments).where(eq(complianceDocuments.id, id));
    const doc = docs[0];

    if (!doc || doc.clientId !== client.id) {
      return { error: 'Unauthorized' };
    }

    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.customName === '') delete raw.customName;

    const result = ComplianceSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }

    const parsed = result.data;

    await dbUpdateComplianceRecord(id, parsed);

    revalidatePath('/compliance');
    
    return {};
  } catch (e) {
    console.error('updateClientComplianceRecord failed:', e);
    return { error: 'Failed to update compliance record. Please try again.' };
  }
}
