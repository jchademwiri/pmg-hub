'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, expenses, eq } from '@pmg/db';

const ExpenseSchema = z.object({
  date:        z.string().min(1),
  divisionId:  z.string().uuid(),
  category:    z.string().min(1),
  description: z.string().optional(),
  amount:      z.coerce.number().positive(),
});

export async function createExpense(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = ExpenseSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Expense date cannot be in the future.' };
    }
    await db.insert(expenses).values({
      date: parsed.date,
      divisionId: parsed.divisionId,
      category: parsed.category,
      description: parsed.description ?? null,
      amount: String(parsed.amount),
    });
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateExpense(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = ExpenseSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Expense date cannot be in the future.' };
    }
    await db.update(expenses)
      .set({
        date: parsed.date,
        divisionId: parsed.divisionId,
        category: parsed.category,
        description: parsed.description ?? null,
        amount: String(parsed.amount),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id));
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(expenses).where(eq(expenses.id, id));
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}
