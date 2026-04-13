'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, withdrawals, eq } from '@pmg/db';
import {
  insertWithdrawal,
  getWithdrawalsByAccountYTD,
  getWithdrawalsByAccount,
  getYTDSummary,
} from '@pmg/db';

const WithdrawalSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  account: z.string().min(1),
});

function formatDefaultDescription(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return `Withdrawal — ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

async function checkWithdrawalConstraints(
  account: string,
  requestedAmount: number,
  existingAmountId?: string,
): Promise<{ error?: string }> {
  const [withdrawnMap, ytd, withdrawnList] = await Promise.all([
    getWithdrawalsByAccountYTD(),
    getYTDSummary(),
    getWithdrawalsByAccount(account),
  ]);

  const accountEarned: Record<string, number> = {
    salary: ytd.salary,
    pmg_share: ytd.pmgShare,
    reinvest: ytd.reinvest,
    reserve: ytd.reserve,
    flex: ytd.flex,
  };
  const earned = accountEarned[account] ?? 0;
  let totalWithdrawn = withdrawnMap[account] ?? 0;

  if (existingAmountId) {
    const existing = withdrawnList.find((w) => w.id === existingAmountId);
    if (existing) {
      totalWithdrawn -= Number(existing.amount);
    }
  }

  const availableBalance = earned - totalWithdrawn;

  if (requestedAmount > availableBalance) {
    return {
      error: `Cannot withdraw more than available balance (R${availableBalance.toFixed(2)}).`,
    };
  }

  return {};
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

    // Check constraints before inserting
    const constraintCheck = await checkWithdrawalConstraints(parsed.account, parsed.amount);
    if (constraintCheck.error) return constraintCheck;

    await insertWithdrawal(parsed.amount, parsed.date, description, parsed.account);
    revalidatePath('/withdrawals');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateWithdrawal(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
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

    // Check constraints before updating
    const constraintCheck = await checkWithdrawalConstraints(parsed.account, parsed.amount, id);
    if (constraintCheck.error) return constraintCheck;

    await db
      .update(withdrawals)
      .set({
        date: parsed.date,
        amount: String(parsed.amount),
        description,
        account: parsed.account,
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
