'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDb, tenderScheduleEntries, clients, eq } from '@pmg/db';
import type { NewTenderScheduleEntry, TenderScheduleEntry } from '@pmg/db';
import {
  createTenderScheduleEntry as createEntry,
  updateTenderScheduleEntry as updateEntry,
  cancelTenderScheduleEntry as cancelEntry,
  transitionTenderStatus as transitionStatus,
  recalculateTenderWaterfall,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

// ── Validation Schema ─────────────────────────────────────────────────────────

const TenderScheduleSchema = z.object({
  clientId: z.string().min(1, 'A client is required.'),
  divisionId: z.string().optional(),
  tenderReference: z.string().min(1, 'Tender reference is required.'),
  closingDate: z.string().min(1, 'Closing date is required.'),
  effortDays: z.coerce.number().int().positive('Effort must be greater than 0.'),
  bufferDays: z.coerce.number().int().min(0).default(5),
  // startDate intentionally omitted — system-assigned by recalculateTenderWaterfall
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  notes: z.string().optional(),
  blockers: z.string().optional(),
});

const validStatuses = ['planned', 'in_progress', 'completed', 'submitted', 'cancelled'] as const;

function isTenderScheduleStatus(status: string): status is TenderScheduleEntry['status'] {
  return validStatuses.includes(status as TenderScheduleEntry['status']);
}

// ── Server Actions ────────────────────────────────────────────────────────────

export async function createTenderScheduleEntry(formData: FormData): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.divisionId === '__none__') delete raw.divisionId;
    if (raw.notes === '') delete raw.notes;
    if (raw.blockers === '') delete raw.blockers;

    // Validate form input
    const parsed = TenderScheduleSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const {
      clientId,
      divisionId,
      tenderReference,
      closingDate,
      effortDays,
      bufferDays,
      priority,
      notes,
      blockers,
    } = parsed.data;

    // Verify client exists
    const db = getDb();
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (!client) {
      return { error: 'Selected client not found.' };
    }

    // Insert with provisional dates — recalculateTenderWaterfall() below
    // overwrites startDate and targetCompletionDate with the correct chained values.
    const provisionalStart = new Date().toISOString().split('T')[0];
    const provisionalCompletion = new Date(provisionalStart);
    provisionalCompletion.setDate(provisionalCompletion.getDate() + effortDays);

    await createEntry({
      clientId,
      divisionId: divisionId ?? null,
      tenderReference,
      closingDate,
      effortDays,
      bufferDays,
      startDate: provisionalStart,
      targetCompletionDate: provisionalCompletion.toISOString().split('T')[0],
      status: 'planned',
      priority,
      notes: notes ?? null,
      blockers: blockers ?? null,
      createdBy: session.user.id,
    });

    await recalculateTenderWaterfall();
    revalidatePath('/scheduling');
    revalidatePath('/scheduling/list');
    revalidatePath('/scheduling/timeline');
    return {};
  } catch (e) {
    console.error('createTenderScheduleEntry failed:', e);
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateTenderScheduleEntry(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = Object.fromEntries(formData) as Record<string, string>;
    if (raw.divisionId === '__none__') delete raw.divisionId;
    if (raw.notes === '') delete raw.notes;
    if (raw.blockers === '') delete raw.blockers;

    const parsed = TenderScheduleSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const {
      clientId,
      divisionId,
      tenderReference,
      closingDate,
      effortDays,
      bufferDays,
      priority,
      notes,
      blockers,
    } = parsed.data;

    // startDate and targetCompletionDate are not accepted from the form —
    // recalculateTenderWaterfall() will set the correct chained dates.
    await updateEntry(id, {
      clientId,
      divisionId: divisionId ?? null,
      tenderReference,
      closingDate,
      effortDays,
      bufferDays,
      priority,
      notes: notes ?? null,
      blockers: blockers ?? null,
    });

    await recalculateTenderWaterfall();
    revalidatePath('/scheduling');
    revalidatePath('/scheduling/list');
    revalidatePath('/scheduling/timeline');
    return {};
  } catch (e) {
    console.error('updateTenderScheduleEntry failed:', e);
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateTenderScheduleEntryJson(
  id: string,
  data: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    // Build partial update from the provided data object
    const update: Partial<NewTenderScheduleEntry> = {};
    if (data.notes !== undefined) update.notes = data.notes as string;
    if (data.blockers !== undefined) update.blockers = data.blockers as string;
    if (data.actualEffortDays !== undefined)
      update.actualEffortDays = data.actualEffortDays as number;
    if (data.outcome !== undefined) update.outcome = data.outcome as 'won' | 'lost' | 'pending';
    if (data.priority !== undefined)
      update.priority = data.priority as 'low' | 'normal' | 'high' | 'urgent';

    await updateEntry(id, update);

    await recalculateTenderWaterfall();
    revalidatePath('/scheduling');
    revalidatePath('/scheduling/list');
    revalidatePath('/scheduling/timeline');
    return {};
  } catch (e) {
    console.error('updateTenderScheduleEntryJson failed:', e);
    return { error: 'Failed to update. Please try again.' };
  }
}

export async function cancelTenderScheduleEntry(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await cancelEntry(id);
    await recalculateTenderWaterfall();
    revalidatePath('/scheduling');
    revalidatePath('/scheduling/list');
    revalidatePath('/scheduling/timeline');
    return {};
  } catch (e) {
    console.error('cancelTenderScheduleEntry failed:', e);
    return { error: 'Failed to cancel tender.' };
  }
}

export async function transitionTenderStatusAction(
  id: string,
  newStatus: string,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    if (!isTenderScheduleStatus(newStatus)) {
      return { error: 'Invalid status transition.' };
    }

    // Validate status transition
    const db = getDb();
    const [entry] = await db
      .select({ id: tenderScheduleEntries.id, status: tenderScheduleEntries.status })
      .from(tenderScheduleEntries)
      .where(eq(tenderScheduleEntries.id, id))
      .limit(1);

    if (!entry) return { error: 'Tender not found.' };

    const transitions: Record<string, string[]> = {
      planned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled', 'planned'],
      completed: ['submitted', 'cancelled', 'planned'],
      submitted: ['planned'],
      cancelled: ['planned'],
    };

    const allowed = transitions[entry.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return { error: `Cannot transition from '${entry.status}' to '${newStatus}'.` };
    }

    await transitionStatus(id, newStatus);

    await recalculateTenderWaterfall();
    revalidatePath('/scheduling');
    revalidatePath('/scheduling/list');
    revalidatePath('/scheduling/timeline');
    return {};
  } catch (e) {
    console.error('transitionTenderStatusAction failed:', e);
    return { error: 'Failed to update status.' };
  }
}
