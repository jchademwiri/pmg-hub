'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  addComplianceRecord as dbAddComplianceRecord,
  deleteComplianceRecord as dbDeleteComplianceRecord,
  getDb,
  complianceDocuments,
  eq
} from '@pmg/db';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';

const ComplianceSchema = z.object({
  documentType: z.string().min(1),
  customName: z.string().optional(),
  expiryDate: z.string().min(10), // YYYY-MM-DD
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
    const doc = await db.query.complianceDocuments.findFirst({
      where: eq(complianceDocuments.id, id)
    });

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
