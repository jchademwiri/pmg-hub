'use server';

import { revalidatePath } from 'next/cache';
import { db, divisions, eq } from '@pmg/db';
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

export async function deleteDivision(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(divisions).where(eq(divisions.id, id));
    revalidatePath('/divisions');
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('23503')) {
      return { error: 'Cannot delete division with existing income or expense records.' };
    }
    return { error: 'Failed to save. Please try again.' };
  }
}
