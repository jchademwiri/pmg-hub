'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, expenseCategories, expenses, eq, sql } from '@pmg/db';

const ExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function createExpenseCategory(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const result = ExpenseCategorySchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    await db.insert(expenseCategories).values({ name: result.data.name });
    revalidatePath('/expense-categories');
    revalidatePath('/expenses');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateExpenseCategory(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const result = ExpenseCategorySchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const newName = result.data.name;

    const rows = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
    if (rows.length === 0) return { error: 'Category not found.' };
    const oldName = rows[0]!.name;

    await db.transaction(async (tx) => {
      await tx.update(expenseCategories)
        .set({ name: newName })
        .where(eq(expenseCategories.id, id));

      if (oldName !== newName) {
        await tx.update(expenses)
          .set({ category: newName })
          .where(eq(expenses.category, oldName));
      }
    });

    revalidatePath('/expense-categories');
    revalidatePath('/expenses');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteExpenseCategory(id: string): Promise<{ error?: string }> {
  try {
    // Get the category name first
    const rows = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
    if (rows.length === 0) {
      return { error: 'Category not found.' };
    }
    const categoryName = rows[0]!.name;

    // Check if any expenses reference this category
    const usageResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(eq(expenses.category, categoryName));

    const count = usageResult[0]?.count ?? 0;
    if (count > 0) {
      return { error: 'Category is in use by existing expenses' };
    }

    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
    revalidatePath('/expense-categories');
    revalidatePath('/expenses');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}
