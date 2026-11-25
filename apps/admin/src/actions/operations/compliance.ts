'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  db,
  complianceDocuments,
  complianceDocumentTypes,
  eq,
  sql,
  addComplianceRecord as dbAddComplianceRecord,
  updateComplianceRecord as dbUpdateComplianceRecord,
  deleteComplianceRecord as dbDeleteComplianceRecord,
  ensureComplianceDocumentType,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

const ComplianceSchema = z.object({
  clientId: z.string().uuid(),
  documentType: z.string().min(1),
  customName: z.string().optional(),
  expiryDate: z.string().min(10), // YYYY-MM-DD
});

const DocumentTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Document type name is required')
    .max(120, 'Document type name is too long')
    .refine((val) => val.toUpperCase() !== 'CUSTOM', '"CUSTOM" is reserved'),
});

/**
 * Resolves a submitted documentType + optional customName:
 * If the user selected `CUSTOM` and entered a name, automatically persists
 * that name into `compliance_document_types` so admins can reuse, rename, or
 * disable it, and stores it directly as `documentType`.
 */
async function resolveAndPersistDocumentType(
  documentType: string,
  customName?: string,
): Promise<{ documentType: string; customName: string | null } | { error: string }> {
  if (documentType === 'CUSTOM') {
    const trimmed = customName?.trim();
    if (!trimmed) {
      return { error: 'Please enter a custom document name.' };
    }
    await ensureComplianceDocumentType(trimmed);
    return { documentType: trimmed, customName: null };
  }
  return { documentType: documentType.trim(), customName: null };
}

export async function addComplianceRecord(formData: FormData): Promise<{ error?: string }> {
  const session = await getSessionOrRedirect();

  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.customName === '') delete raw.customName;

    const result = ComplianceSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }

    const parsed = result.data;
    const resolved = await resolveAndPersistDocumentType(parsed.documentType, parsed.customName);
    if ('error' in resolved) {
      return { error: resolved.error };
    }

    await dbAddComplianceRecord({
      clientId: parsed.clientId,
      documentType: resolved.documentType,
      customName: resolved.customName,
      expiryDate: parsed.expiryDate,
      uploadedBy: 'ADMIN',
      uploadedById: session.user.id,
    });

    revalidatePath(`/clients/${parsed.clientId}`);
    revalidatePath(`/relationships/clients/${parsed.clientId}`);
    revalidatePath('/insights/compliance-radar');
    revalidatePath('/settings/compliance');

    return {};
  } catch (e) {
    console.error('addComplianceRecord failed:', e);
    return { error: 'Failed to save compliance record. Please try again.' };
  }
}

export async function updateComplianceRecord(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  await getSessionOrRedirect();

  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.customName === '') delete raw.customName;

    const result = ComplianceSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }

    const parsed = result.data;
    const resolved = await resolveAndPersistDocumentType(parsed.documentType, parsed.customName);
    if ('error' in resolved) {
      return { error: resolved.error };
    }

    await dbUpdateComplianceRecord(id, {
      clientId: parsed.clientId,
      documentType: resolved.documentType,
      customName: resolved.customName,
      expiryDate: parsed.expiryDate,
    });

    revalidatePath(`/clients/${parsed.clientId}`);
    revalidatePath(`/relationships/clients/${parsed.clientId}`);
    revalidatePath('/insights/compliance-radar');
    revalidatePath('/settings/compliance');

    return {};
  } catch (e) {
    console.error('updateComplianceRecord failed:', e);
    return { error: 'Failed to update compliance record. Please try again.' };
  }
}

export async function deleteComplianceRecord(
  id: string,
  clientId: string,
): Promise<{ error?: string }> {
  await getSessionOrRedirect();

  try {
    await dbDeleteComplianceRecord(id);

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/relationships/clients/${clientId}`);
    revalidatePath('/insights/compliance-radar');
    revalidatePath('/settings/compliance');

    return {};
  } catch (e) {
    console.error('deleteComplianceRecord failed:', e);
    return { error: 'Failed to delete compliance record. Please try again.' };
  }
}

// ── Predefined Compliance Document Types CRUD ────────────────────────────────

export async function createComplianceDocumentType(
  formData: FormData,
): Promise<{ error?: string }> {
  await getSessionOrRedirect();

  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = DocumentTypeSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const [existing] = await db
      .select({ id: complianceDocumentTypes.id })
      .from(complianceDocumentTypes)
      .where(eq(complianceDocumentTypes.name, parsed.data.name))
      .limit(1);

    if (existing) {
      return { error: `"${parsed.data.name}" already exists.` };
    }

    const [maxRow] = await db
      .select({
        maxSort: sql<number>`COALESCE(MAX(${complianceDocumentTypes.sortOrder}), 0)::int`,
      })
      .from(complianceDocumentTypes);

    await db.insert(complianceDocumentTypes).values({
      name: parsed.data.name,
      sortOrder: (maxRow?.maxSort ?? 0) + 1,
      isActive: true,
    });

    revalidatePath('/settings/compliance');
    revalidatePath('/insights/compliance-radar');
    return {};
  } catch (e) {
    console.error('createComplianceDocumentType failed:', e);
    return { error: 'Failed to create document type. Please try again.' };
  }
}

export async function updateComplianceDocumentType(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  await getSessionOrRedirect();

  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = DocumentTypeSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const newName = parsed.data.name;

    const rows = await db
      .select()
      .from(complianceDocumentTypes)
      .where(eq(complianceDocumentTypes.id, id));
    const current = rows[0];
    if (!current) return { error: 'Document type not found.' };

    const oldName = current.name;
    if (oldName !== newName) {
      const [conflict] = await db
        .select({ id: complianceDocumentTypes.id })
        .from(complianceDocumentTypes)
        .where(eq(complianceDocumentTypes.name, newName))
        .limit(1);
      if (conflict) {
        return { error: `"${newName}" already exists.` };
      }
    }

    const isActive = raw.isActive !== undefined ? raw.isActive === 'true' : current.isActive;

    await db.transaction(async (tx) => {
      await tx
        .update(complianceDocumentTypes)
        .set({ name: newName, isActive, updatedAt: new Date() })
        .where(eq(complianceDocumentTypes.id, id));

      if (oldName !== newName) {
        await tx
          .update(complianceDocuments)
          .set({ documentType: newName, updatedAt: new Date() })
          .where(eq(complianceDocuments.documentType, oldName));
      }
    });

    revalidatePath('/settings/compliance');
    revalidatePath('/insights/compliance-radar');
    return {};
  } catch (e) {
    console.error('updateComplianceDocumentType failed:', e);
    return { error: 'Failed to update document type. Please try again.' };
  }
}

export async function toggleComplianceDocumentTypeActive(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  await getSessionOrRedirect();

  try {
    await db
      .update(complianceDocumentTypes)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(complianceDocumentTypes.id, id));

    revalidatePath('/settings/compliance');
    revalidatePath('/insights/compliance-radar');
    return {};
  } catch (e) {
    console.error('toggleComplianceDocumentTypeActive failed:', e);
    return { error: 'Failed to update status. Please try again.' };
  }
}

export async function deleteComplianceDocumentType(id: string): Promise<{ error?: string }> {
  await getSessionOrRedirect();

  try {
    const rows = await db
      .select()
      .from(complianceDocumentTypes)
      .where(eq(complianceDocumentTypes.id, id));
    const current = rows[0];
    if (!current) return { error: 'Document type not found.' };

    const usageRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(complianceDocuments)
      .where(eq(complianceDocuments.documentType, current.name));

    const count = usageRows[0]?.count ?? 0;
    if (count > 0) {
      return {
        error: `Cannot delete "${current.name}" because ${count} client compliance record${count === 1 ? '' : 's'} use it. Disable or rename it instead.`,
      };
    }

    await db.delete(complianceDocumentTypes).where(eq(complianceDocumentTypes.id, id));

    revalidatePath('/settings/compliance');
    revalidatePath('/insights/compliance-radar');
    return {};
  } catch (e) {
    console.error('deleteComplianceDocumentType failed:', e);
    return { error: 'Failed to delete document type. Please try again.' };
  }
}
