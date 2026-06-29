'use server';

import { db } from '@pmg/db';
import { tenderProgressSections, tenderProgressItems } from '@pmg/db';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getTenderChecklist } from '@pmg/db';

export async function getTenderChecklistAction(tenderId: string) {
  try {
    if (!tenderId) {
      return { error: 'Project ID is required.' };
    }
    const checklist = await getTenderChecklist(tenderId);
    return { success: true, checklist };
  } catch (error: any) {
    console.error('Error fetching tender checklist:', error);
    return { error: error.message || 'Failed to fetch checklist.' };
  }
}


export async function addProgressSectionAction(tenderId: string, title: string) {
  try {
    if (!tenderId || !title.trim()) {
      return { error: 'Project ID and title are required.' };
    }

    // Get the next sort order
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenderProgressSections)
      .where(eq(tenderProgressSections.tenderId, tenderId));
    
    const sortOrder = (countResult?.count ?? 0) + 1;

    const [newSection] = await db
      .insert(tenderProgressSections)
      .values({
        tenderId,
        title: title.trim(),
        sortOrder,
      })
      .returning();

    revalidatePath('/scheduling');
    return { success: true, section: newSection };
  } catch (error: any) {
    console.error('Error adding progress section:', error);
    return { error: error.message || 'Failed to add section.' };
  }
}

export async function deleteProgressSectionAction(sectionId: string) {
  try {
    if (!sectionId) {
      return { error: 'Section ID is required.' };
    }

    await db.delete(tenderProgressSections).where(eq(tenderProgressSections.id, sectionId));

    revalidatePath('/scheduling');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting progress section:', error);
    return { error: error.message || 'Failed to delete section.' };
  }
}

export async function renameProgressSectionAction(sectionId: string, title: string) {
  try {
    if (!sectionId || !title.trim()) {
      return { error: 'Section ID and title are required.' };
    }

    const [updatedSection] = await db
      .update(tenderProgressSections)
      .set({ title: title.trim(), updatedAt: new Date() })
      .where(eq(tenderProgressSections.id, sectionId))
      .returning();

    revalidatePath('/scheduling');
    return { success: true, section: updatedSection };
  } catch (error: any) {
    console.error('Error renaming progress section:', error);
    return { error: error.message || 'Failed to rename section.' };
  }
}

export async function addProgressItemAction(sectionId: string, task: string) {
  try {
    if (!sectionId || !task.trim()) {
      return { error: 'Section ID and task are required.' };
    }

    // Get the next sort order
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenderProgressItems)
      .where(eq(tenderProgressItems.sectionId, sectionId));

    const sortOrder = (countResult?.count ?? 0) + 1;

    const [newItem] = await db
      .insert(tenderProgressItems)
      .values({
        sectionId,
        task: task.trim(),
        isCompleted: false,
        sortOrder,
      })
      .returning();

    revalidatePath('/scheduling');
    return { success: true, item: newItem };
  } catch (error: any) {
    console.error('Error adding progress item:', error);
    return { error: error.message || 'Failed to add item.' };
  }
}

export async function deleteProgressItemAction(itemId: string) {
  try {
    if (!itemId) {
      return { error: 'Item ID is required.' };
    }

    await db.delete(tenderProgressItems).where(eq(tenderProgressItems.id, itemId));

    revalidatePath('/scheduling');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting progress item:', error);
    return { error: error.message || 'Failed to delete item.' };
  }
}

export async function toggleProgressItemAction(itemId: string, isCompleted: boolean) {
  try {
    if (!itemId) {
      return { error: 'Item ID is required.' };
    }

    const [updatedItem] = await db
      .update(tenderProgressItems)
      .set({
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tenderProgressItems.id, itemId))
      .returning();

    revalidatePath('/scheduling');
    return { success: true, item: updatedItem };
  } catch (error: any) {
    console.error('Error toggling progress item:', error);
    return { error: error.message || 'Failed to toggle item.' };
  }
}

export async function updateProgressItemTextAction(itemId: string, task: string) {
  try {
    if (!itemId || !task.trim()) {
      return { error: 'Item ID and task description are required.' };
    }

    const [updatedItem] = await db
      .update(tenderProgressItems)
      .set({ task: task.trim(), updatedAt: new Date() })
      .where(eq(tenderProgressItems.id, itemId))
      .returning();

    revalidatePath('/scheduling');
    return { success: true, item: updatedItem };
  } catch (error: any) {
    console.error('Error updating progress item:', error);
    return { error: error.message || 'Failed to update item.' };
  }
}
