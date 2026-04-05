'use server';

import { revalidatePath } from 'next/cache';
import { db, divisions, income, expenses, leads, eq } from '@pmg/db';
import { setDivisionActive } from '@pmg/db';
import { DivisionSchema } from './division-schema';

export async function createDivision(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = DivisionSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    await db.insert(divisions).values({ name: result.data.name });
    revalidatePath('/divisions');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateDivision(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = DivisionSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    await db.update(divisions)
      .set({ name: result.data.name, updatedAt: new Date() })
      .where(eq(divisions.id, id));
    revalidatePath('/divisions');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function toggleDivisionActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  try {
    await setDivisionActive(id, isActive);
    revalidatePath('/divisions');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to update division status.' };
  }
}

export async function deleteDivision(id: string): Promise<{ error?: string }> {
  try {
    // Check all linked tables before attempting delete
    const [incomeCount, expenseCount, leadCount] = await Promise.all([
      db.select({ id: income.id }).from(income).where(eq(income.divisionId, id)).limit(1),
      db.select({ id: expenses.id }).from(expenses).where(eq(expenses.divisionId, id)).limit(1),
      db.select({ id: leads.id }).from(leads).where(eq(leads.divisionId, id)).limit(1),
    ]);

    if (incomeCount.length > 0 || expenseCount.length > 0 || leadCount.length > 0) {
      return { error: 'Cannot delete a division that has linked records. Disable it instead.' };
    }

    await db.delete(divisions).where(eq(divisions.id, id));
    revalidatePath('/divisions');
    return {};
  } catch {
    return { error: 'Failed to delete division. Please try again.' };
  }
}
