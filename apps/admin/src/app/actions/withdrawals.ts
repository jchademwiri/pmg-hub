'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, withdrawals, eq } from '@pmg/db';
import { insertWithdrawal } from '@pmg/db';

const WithdrawalSchema = z.object({
  date:        z.string().min(1),
  amount:      z.coerce.number().positive(),
  description: z.string().optional(),
});

function formatDefaultDescription(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return `Salary withdrawal — ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

export async function createWithdrawal(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = WithdrawalSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Withdrawal date cannot be in the future.' };
    }
    const description = parsed.description?.trim() || formatDefaultDescription(parsed.date);
    await insertWithdrawal(parsed.amount, parsed.date, description);
    revalidatePath('/withdrawals');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateWithdrawal(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = WithdrawalSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Withdrawal date cannot be in the future.' };
    }
    const description = parsed.description?.trim() || formatDefaultDescription(parsed.date);
    await db.update(withdrawals)
      .set({
        date: parsed.date,
        amount: String(parsed.amount),
        description,
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
