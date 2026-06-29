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


export async function addProgressSectionAction(
  projectId: string,
  title: string
): Promise<{ success: boolean; section?: any; error?: string }> {
  try {
    if (!projectId || !title.trim()) {
      return { success: false, error: 'Project ID and title are required.' };
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
    return { success: false, error: error.message || 'Failed to add section.' };
  }
}

export async function deleteProgressSectionAction(
  sectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!sectionId) {
      return { success: false, error: 'Section ID is required.' };
    }

    await db.delete(projectProgressSections).where(eq(projectProgressSections.id, sectionId));

    revalidatePath('/projects');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting progress section:', error);
    return { success: false, error: error.message || 'Failed to delete section.' };
  }
}

export async function renameProgressSectionAction(
  sectionId: string,
  title: string
): Promise<{ success: boolean; section?: any; error?: string }> {
  try {
    if (!sectionId || !title.trim()) {
      return { success: false, error: 'Section ID and title are required.' };
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
    return { success: false, error: error.message || 'Failed to rename section.' };
  }
}

export async function addProgressItemAction(
  sectionId: string,
  task: string
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    if (!sectionId || !task.trim()) {
      return { success: false, error: 'Section ID and task are required.' };
    }

    return await db.transaction(async (tx) => {
      // Get the next sort order
      const [countResult] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(projectProgressItems)
        .where(eq(projectProgressItems.sectionId, sectionId));

      const sortOrder = (countResult?.count ?? 0) + 1;

      const [newItem] = await tx
        .insert(projectProgressItems)
        .values({
          sectionId,
          task: task.trim(),
          isCompleted: false,
          sortOrder,
        })
        .returning();

      // If the section was completed, it is now in_progress because a new uncompleted task was added
      const [section] = await tx
        .select()
        .from(projectProgressSections)
        .where(eq(projectProgressSections.id, sectionId))
        .limit(1);

      if (section && section.status === 'completed') {
        await tx
          .update(projectProgressSections)
          .set({ status: 'in_progress', updatedAt: new Date() })
          .where(eq(projectProgressSections.id, sectionId));
      }

      revalidatePath('/projects');
      return { success: true, item: newItem };
    });
  } catch (error: any) {
    console.error('Error adding progress item:', error);
    return { success: false, error: error.message || 'Failed to add item.' };
  }
}

export async function deleteProgressItemAction(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!itemId) {
      return { success: false, error: 'Item ID is required.' };
    }

    return await db.transaction(async (tx) => {
      // Get the item first to know its sectionId
      const [item] = await tx
        .select()
        .from(projectProgressItems)
        .where(eq(projectProgressItems.id, itemId))
        .limit(1);

      if (!item) {
        return { success: false, error: 'Item not found.' };
      }

      const sectionId = item.sectionId;

      // Delete the item
      await tx.delete(projectProgressItems).where(eq(projectProgressItems.id, itemId));

      // Fetch remaining items
      const remainingItems = await tx
        .select()
        .from(projectProgressItems)
        .where(eq(projectProgressItems.sectionId, sectionId));

      const totalCount = remainingItems.length;
      const completedCount = remainingItems.filter((i) => i.isCompleted).length;

      let nextStatus: 'backlog' | 'in_progress' | 'completed' = 'in_progress';

      if (totalCount === 0) {
        nextStatus = 'backlog';
      } else if (completedCount === totalCount) {
        nextStatus = 'completed';
      } else if (completedCount === 0) {
        nextStatus = 'backlog';
      }

      await tx
        .update(projectProgressSections)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(projectProgressSections.id, sectionId));

      revalidatePath('/projects');
      return { success: true };
    });
  } catch (error: any) {
    console.error('Error deleting progress item:', error);
    return { success: false, error: error.message || 'Failed to delete item.' };
  }
}

export async function toggleProgressItemAction(
  itemId: string,
  isCompleted: boolean
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    if (!itemId) {
      return { success: false, error: 'Item ID is required.' };
    }

    return await db.transaction(async (tx) => {
      // 1. Update the progress item
      const [updatedItem] = await tx
        .update(projectProgressItems)
        .set({
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(projectProgressItems.id, itemId))
        .returning();

      const sectionId = updatedItem.sectionId;

      // 2. Get all progress items in this section to determine section status
      const allItems = await tx
        .select()
        .from(projectProgressItems)
        .where(eq(projectProgressItems.sectionId, sectionId));

      const totalCount = allItems.length;
      const completedCount = allItems.filter((i) => i.isCompleted).length;

      let nextStatus: 'backlog' | 'in_progress' | 'completed' = 'in_progress';

      if (completedCount === totalCount && totalCount > 0) {
        nextStatus = 'completed';
      } else if (completedCount === 0) {
        nextStatus = 'backlog';
      }

      // 3. Update the section status
      await tx
        .update(projectProgressSections)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(projectProgressSections.id, sectionId));

      revalidatePath('/projects');
      return { success: true, item: updatedItem };
    });
  } catch (error: any) {
    console.error('Error toggling progress item:', error);
    return { success: false, error: error.message || 'Failed to toggle item.' };
  }
}

export async function updateProgressItemTextAction(
  itemId: string,
  task: string
): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    if (!itemId || !task.trim()) {
      return { success: false, error: 'Item ID and task description are required.' };
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
    return { success: false, error: error.message || 'Failed to update item.' };
  }
}

export async function updateProgressSectionStatusAction(
  sectionId: string,
  status: 'backlog' | 'in_progress' | 'completed'
): Promise<{ success: boolean; section?: any; error?: string }> {
  try {
    if (!sectionId || !status) {
      return { success: false, error: 'Section ID and status are required.' };
    }

    return await db.transaction(async (tx) => {
      // 1. Update the section status
      const [updatedSection] = await tx
        .update(projectProgressSections)
        .set({ status, updatedAt: new Date() })
        .where(eq(projectProgressSections.id, sectionId))
        .returning();

      // 2. If moved to completed, mark all sub-tasks complete
      if (status === 'completed') {
        await tx
          .update(projectProgressItems)
          .set({
            isCompleted: true,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(projectProgressItems.sectionId, sectionId));
      }

      revalidatePath('/projects');
      return { success: true, section: updatedSection };
    });
  } catch (error: any) {
    console.error('Error updating progress section status:', error);
    return { success: false, error: error.message || 'Failed to update section status.' };
  }
}
