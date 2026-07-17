'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  addComplianceRecord as dbAddComplianceRecord,
  updateComplianceRecord as dbUpdateComplianceRecord,
  deleteComplianceRecord as dbDeleteComplianceRecord,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

const ComplianceSchema = z.object({
  clientId: z.string().uuid(),
  documentType: z.string().min(1),
  customName: z.string().optional(),
  expiryDate: z.string().min(10), // YYYY-MM-DD
});

export async function addComplianceRecord(formData: FormData): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.customName === '') delete raw.customName;

    const result = ComplianceSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }

    const parsed = result.data;

    await dbAddComplianceRecord({
      ...parsed,
      uploadedBy: 'ADMIN',
      uploadedById: session.user.id,
    });

    revalidatePath(`/clients/${parsed.clientId}`);
    revalidatePath(`/relationships/clients/${parsed.clientId}`);
    revalidatePath('/insights/compliance-radar');
    
    return {};
  } catch (e) {
    console.error('addComplianceRecord failed:', e);
    return { error: 'Failed to save compliance record. Please try again.' };
  }
}

export async function updateComplianceRecord(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.customName === '') delete raw.customName;

    const result = ComplianceSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }

    const parsed = result.data;

    await dbUpdateComplianceRecord(id, {
      ...parsed,
    });

    revalidatePath(`/clients/${parsed.clientId}`);
    revalidatePath(`/relationships/clients/${parsed.clientId}`);
    revalidatePath('/insights/compliance-radar');
    
    return {};
  } catch (e) {
    console.error('updateComplianceRecord failed:', e);
    return { error: 'Failed to update compliance record. Please try again.' };
  }
}

export async function deleteComplianceRecord(id: string, clientId: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    
    await dbDeleteComplianceRecord(id);

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/relationships/clients/${clientId}`);
    revalidatePath('/insights/compliance-radar');
    
    return {};
  } catch (e) {
    console.error('deleteComplianceRecord failed:', e);
    return { error: 'Failed to delete compliance record. Please try again.' };
  }
}
