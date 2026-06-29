'use server';

import { db } from '@pmg/db';
import { projectProgressSections, projectProgressItems } from '@pmg/db';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getProjectChecklist } from '@pmg/db';

export async function getProjectChecklistAction(projectId: string) {
  try {
    if (!projectId) {
      return { error: 'Project ID is required.' };
    }
    const checklist = await getProjectChecklist(projectId);
    return { success: true, checklist };
  } catch (error: any) {
    console.error('Error fetching tender checklist:', error);
    return { error: error.message || 'Failed to fetch checklist.' };
  }
}


export async function addProgressSectionAction(projectId: string, title: string) {
  try {
    if (!projectId || !title.trim()) {
      return { error: 'Project ID and title are required.' };
    }

    // Get the next sort order
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectProgressSections)
      .where(eq(projectProgressSections.projectId, projectId));
    
    const sortOrder = (countResult?.count ?? 0) + 1;

    const [newSection] = await db
      .insert(projectProgressSections)
      .values({
        projectId,
        title: title.trim(),
        sortOrder,
      })
      .returning();

    revalidatePath('/projects');
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

    await db.delete(projectProgressSections).where(eq(projectProgressSections.id, sectionId));

    revalidatePath('/projects');
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
      .update(projectProgressSections)
      .set({ title: title.trim(), updatedAt: new Date() })
      .where(eq(projectProgressSections.id, sectionId))
      .returning();

    revalidatePath('/projects');
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
      .from(projectProgressItems)
      .where(eq(projectProgressItems.sectionId, sectionId));

    const sortOrder = (countResult?.count ?? 0) + 1;

    const [newItem] = await db
      .insert(projectProgressItems)
      .values({
        sectionId,
        task: task.trim(),
        isCompleted: false,
        sortOrder,
      })
      .returning();

    revalidatePath('/projects');
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

    await db.delete(projectProgressItems).where(eq(projectProgressItems.id, itemId));

    revalidatePath('/projects');
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
      .update(projectProgressItems)
      .set({
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(projectProgressItems.id, itemId))
      .returning();

    revalidatePath('/projects');
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
      .update(projectProgressItems)
      .set({ task: task.trim(), updatedAt: new Date() })
      .where(eq(projectProgressItems.id, itemId))
      .returning();

    revalidatePath('/projects');
    return { success: true, item: updatedItem };
  } catch (error: any) {
    console.error('Error updating progress item:', error);
    return { error: error.message || 'Failed to update item.' };
  }
}
