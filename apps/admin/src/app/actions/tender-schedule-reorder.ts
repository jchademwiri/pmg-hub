'use server';

import { revalidatePath } from 'next/cache';
import { getSessionOrRedirect } from '@/lib/auth';
import { reorderTenderQueue as reorderTenderQueueDb } from '@pmg/db';

/**
 * Reorder the tender queue by setting sort_order for each tender.
 * Accepts an ordered array of tender IDs — the first item gets sort_order=1, second gets 2, etc.
 */
export async function reorderTenderQueue(
  orderedIds: string[],
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await reorderTenderQueueDb(orderedIds);
    revalidatePath('/scheduling');
    return {};
  } catch (e) {
    console.error('reorderTenderQueue failed:', e);
    return { error: 'Failed to reorder queue.' };
  }
}
