'use server';

import { revalidatePath } from 'next/cache';
import { getDb, tenderScheduleEntries, eq, and, inArray } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

/**
 * Bulk archive: sets status to 'cancelled' for all selected completed/submitted tenders.
 * This removes them from the active views while preserving the data.
 */
export async function bulkArchiveTenders(ids: string[]): Promise<{ error?: string; count?: number }> {
  try {
    await getSessionOrRedirect();
    if (ids.length === 0) return { count: 0 };

    const db = getDb();

    const result = await db
      .update(tenderScheduleEntries)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(inArray(tenderScheduleEntries.id, ids))
      .returning({ id: tenderScheduleEntries.id });

    revalidatePath('/scheduling');
    revalidatePath('/scheduling/list');

    return { count: result.length };
  } catch {
    return { error: 'Failed to archive tenders.' };
  }
}

/**
 * Bulk delete: hard-deletes selected cancelled tenders only.
 * Restricted to cancelled status to prevent accidental data loss.
 */
export async function bulkDeleteTenders(ids: string[]): Promise<{ error?: string; count?: number }> {
  try {
    await getSessionOrRedirect();
    if (ids.length === 0) return { count: 0 };

    const db = getDb();

    // Only allow deleting cancelled tenders — server-side safety guard
    const result = await db
      .delete(tenderScheduleEntries)
      .where(
        and(
          inArray(tenderScheduleEntries.id, ids),
          eq(tenderScheduleEntries.status, 'cancelled'),
        ),
      )
      .returning({ id: tenderScheduleEntries.id });

    revalidatePath('/scheduling');
    revalidatePath('/scheduling/list');

    return { count: result.length };
  } catch {
    return { error: 'Failed to delete tenders.' };
  }
}
