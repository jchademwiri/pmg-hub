'use server';

import { revalidatePath } from 'next/cache';
import { getDb, projectScheduleEntries, eq, and, inArray, recalculateProjectWaterfall } from '@pmg/db';
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
      .update(projectScheduleEntries)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(inArray(projectScheduleEntries.id, ids))
      .returning({ id: projectScheduleEntries.id });

    await recalculateProjectWaterfall();
    revalidatePath('/projects');
    revalidatePath('/projects/list');
    revalidatePath('/projects/timeline');

    return { count: result.length };
  } catch (e) {
    console.error('bulkArchiveTenders failed:', e);
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
      .delete(projectScheduleEntries)
      .where(
        and(
          inArray(projectScheduleEntries.id, ids),
          eq(projectScheduleEntries.status, 'cancelled'),
        ),
      )
      .returning({ id: projectScheduleEntries.id });

    await recalculateProjectWaterfall();
    revalidatePath('/projects');
    revalidatePath('/projects/list');
    revalidatePath('/projects/timeline');

    return { count: result.length };
  } catch (e) {
    console.error('bulkDeleteTenders failed:', e);
    return { error: 'Failed to delete tenders.' };
  }
}
