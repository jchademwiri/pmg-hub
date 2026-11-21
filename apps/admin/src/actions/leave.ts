'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_LEAVE_SETTINGS,
  db,
  eq,
  getLeaveEntryById,
  getOrSeedLeaveSettings,
  leaveEntries,
  leaveSettings,
} from '@pmg/db';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';
import { canMarkEntryTaken, getTodaySAST, validateAutoLeaveDates } from '@/lib/leave';
import { deleteR2Object, uploadLeaveProofToR2 } from '@/lib/r2';

const CreateLeaveEntrySchema = z.object({
  type: z.enum(['ANNUAL', 'SICK', 'FAMILY_RESPONSIBILITY']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date'),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or fewer')
    .optional()
    .transform((v) => v?.trim() || null),
});

const UpdateLeaveEntrySchema = CreateLeaveEntrySchema.extend({
  id: z.number().int().positive('Invalid entry ID'),
});

const UpdateLeaveSettingsSchema = z.object({
  annualOpeningBalance: z.coerce.number().min(-100).max(365),
  annualMonthlyAccrual: z.coerce.number().min(0).max(10),
  annualMaxCarryOver: z.coerce.number().int().min(0).max(60),
  sickOpeningBalance: z.coerce.number().int().min(0).max(90),
  familyOpeningBalance: z.coerce.number().int().min(0).max(30),
});

async function requireAdminSession() {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'admin')) {
    return null;
  }
  return session;
}

export async function createLeaveEntry(
  input: z.input<typeof CreateLeaveEntrySchema>,
): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  try {
    const parsed = CreateLeaveEntrySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid leave entry.' };
    }

    const { type, startDate, endDate, notes } = parsed.data;
    const todayDate = getTodaySAST();
    const dateCheck = validateAutoLeaveDates(startDate, endDate, todayDate);

    if (!dateCheck.valid || !dateCheck.preview || !dateCheck.inferredStatus) {
      return { error: dateCheck.error ?? 'Invalid leave date range.' };
    }

    await db.insert(leaveEntries).values({
      type,
      status: dateCheck.inferredStatus,
      startDate,
      endDate,
      daysCount: dateCheck.preview.workingDays,
      notes,
    });

    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[createLeaveEntry] failed:', err);
    return { error: 'Failed to log leave entry. Please try again.' };
  }
}

export async function updateLeaveEntry(
  input: z.input<typeof UpdateLeaveEntrySchema>,
): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  try {
    const parsed = UpdateLeaveEntrySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid leave entry.' };
    }

    const { id, type, startDate, endDate, notes } = parsed.data;
    const existing = await getLeaveEntryById(id);
    if (!existing) return { error: 'Leave entry not found.' };

    const todayDate = getTodaySAST();
    const dateCheck = validateAutoLeaveDates(startDate, endDate, todayDate);

    if (!dateCheck.valid || !dateCheck.preview || !dateCheck.inferredStatus) {
      return { error: dateCheck.error ?? 'Invalid leave date range.' };
    }

    await db
      .update(leaveEntries)
      .set({
        type,
        status: dateCheck.inferredStatus,
        startDate,
        endDate,
        daysCount: dateCheck.preview.workingDays,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(leaveEntries.id, id));

    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[updateLeaveEntry] failed:', err);
    return { error: 'Failed to update leave entry. Please try again.' };
  }
}

export async function markLeaveEntryTaken(id: number): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  if (!Number.isInteger(id) || id <= 0) {
    return { error: 'Invalid entry ID.' };
  }

  try {
    const entry = await getLeaveEntryById(id);
    if (!entry) return { error: 'Leave entry not found.' };

    const todayDate = getTodaySAST();
    if (!canMarkEntryTaken(entry, todayDate)) {
      return {
        error:
          'Only planned leave entries whose start date is today or earlier can be marked taken.',
      };
    }

    await db
      .update(leaveEntries)
      .set({
        status: 'TAKEN',
        updatedAt: new Date(),
      })
      .where(eq(leaveEntries.id, id));

    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[markLeaveEntryTaken] failed:', err);
    return { error: 'Failed to update leave entry. Please try again.' };
  }
}

export async function deleteLeaveEntry(id: number): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  if (!Number.isInteger(id) || id <= 0) {
    return { error: 'Invalid entry ID.' };
  }

  try {
    const existing = await getLeaveEntryById(id);
    await db.delete(leaveEntries).where(eq(leaveEntries.id, id));
    if (existing?.proofKey) {
      await deleteR2Object(existing.proofKey);
    }
    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[deleteLeaveEntry] failed:', err);
    return { error: 'Failed to delete leave entry. Please try again.' };
  }
}

export async function uploadLeaveProof(
  entryId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return { error: 'Invalid entry ID.' };
  }

  try {
    const entry = await getLeaveEntryById(entryId);
    if (!entry) return { error: 'Leave entry not found.' };

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { error: 'Please select a proof document to upload.' };
    }

    const uploaded = await uploadLeaveProofToR2(file, entry.id, entry.startDate);
    if (uploaded.error || !uploaded.key) {
      return { error: uploaded.error ?? 'Failed to upload proof document.' };
    }

    const previousKey = entry.proofKey;

    await db
      .update(leaveEntries)
      .set({
        proofKey: uploaded.key,
        proofFileName: uploaded.fileName ?? file.name,
        proofMimeType: uploaded.mimeType ?? (file.type || 'application/octet-stream'),
        proofSizeBytes: uploaded.sizeBytes ?? file.size,
        proofUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leaveEntries.id, entry.id));

    if (previousKey && previousKey !== uploaded.key) {
      await deleteR2Object(previousKey);
    }

    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[uploadLeaveProof] failed:', err);
    return { error: 'Failed to attach proof document. Please try again.' };
  }
}

export async function removeLeaveProof(entryId: number): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return { error: 'Invalid entry ID.' };
  }

  try {
    const entry = await getLeaveEntryById(entryId);
    if (!entry) return { error: 'Leave entry not found.' };

    const previousKey = entry.proofKey;

    await db
      .update(leaveEntries)
      .set({
        proofKey: null,
        proofFileName: null,
        proofMimeType: null,
        proofSizeBytes: null,
        proofUploadedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(leaveEntries.id, entry.id));

    if (previousKey) {
      await deleteR2Object(previousKey);
    }

    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[removeLeaveProof] failed:', err);
    return { error: 'Failed to remove proof document. Please try again.' };
  }
}

export async function updateLeaveSettings(
  input: z.input<typeof UpdateLeaveSettingsSchema>,
): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  try {
    const parsed = UpdateLeaveSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid settings values.' };
    }

    const current = await getOrSeedLeaveSettings();
    const d = parsed.data;

    await db
      .update(leaveSettings)
      .set({
        annualOpeningBalance: d.annualOpeningBalance.toFixed(2),
        annualMonthlyAccrual: d.annualMonthlyAccrual.toFixed(2),
        annualMaxCarryOver: d.annualMaxCarryOver,
        sickOpeningBalance: d.sickOpeningBalance,
        familyOpeningBalance: d.familyOpeningBalance,
        updatedAt: new Date(),
      })
      .where(eq(leaveSettings.id, current.id));

    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[updateLeaveSettings] failed:', err);
    return { error: 'Failed to update leave settings. Please try again.' };
  }
}

export async function resetLeaveSettings(): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: 'Unauthorized: admin access required.' };

  try {
    const current = await getOrSeedLeaveSettings();

    await db
      .update(leaveSettings)
      .set({
        ...DEFAULT_LEAVE_SETTINGS,
        updatedAt: new Date(),
      })
      .where(eq(leaveSettings.id, current.id));

    revalidatePath('/leave');
    return {};
  } catch (err) {
    console.error('[resetLeaveSettings] failed:', err);
    return { error: 'Failed to reset leave settings. Please try again.' };
  }
}
