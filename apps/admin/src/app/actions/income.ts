'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, income, eq, getIncomeById } from '@pmg/db';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';

const IncomeSchema = z.object({
  date: z.string().min(1),
  divisionId: z.string().uuid(),
  clientId: z.string().uuid(),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
});

export async function createIncome(formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = IncomeSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Income date cannot be in the future.' };
    }
    if (await isPeriodClosed(parsed.date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }
    await db.insert(income).values({
      date: parsed.date,
      divisionId: parsed.divisionId,
      clientId: parsed.clientId,
      description: parsed.description ?? null,
      amount: String(parsed.amount),
    });
    revalidatePath('/finance/income');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateIncome(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const raw = Object.fromEntries(formData);
    const result = IncomeSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Income date cannot be in the future.' };
    }
    if (await isPeriodClosed(parsed.date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }
    await db
      .update(income)
      .set({
        date: parsed.date,
        divisionId: parsed.divisionId,
        clientId: parsed.clientId,
        description: parsed.description ?? null,
        amount: String(parsed.amount),
        updatedAt: new Date(),
      })
      .where(eq(income.id, id));
    revalidatePath('/finance/income');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteIncome(id: string): Promise<{ error?: string }> {
  try {
    const existing = await getIncomeById(id);
    if (!existing) return { error: 'Record not found.' };

    if (await isPeriodClosed(existing.date)) {
      return { error: 'Cannot delete records from a closed financial period.' };
    }

    await db.delete(income).where(eq(income.id, id));
    revalidatePath('/finance/income');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}
