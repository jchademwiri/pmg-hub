'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, withdrawals, eq } from '@pmg/db';

const WithdrawalSchema = z.object({
  date:        z.string().min(1),
  amount:      z.coerce.number().positive(),
  description: z.string().optional(),
});

export async function updateWithdrawal(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = WithdrawalSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    await db.update(withdrawals)
      .set({
        date: parsed.date,
        amount: String(parsed.amount),
        description: parsed.description ?? null,
      })
      .where(eq(withdrawals.id, id));
    revalidatePath('/withdrawals');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteWithdrawal(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(withdrawals).where(eq(withdrawals.id, id));
    revalidatePath('/withdrawals');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}
