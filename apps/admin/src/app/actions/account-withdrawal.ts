'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { insertWithdrawal, getWithdrawalsByAccountYTD, getYTDSummary } from '@pmg/db';
import { ACCOUNT_KEYS } from '@/lib/accounts';

const Schema = z.object({
  account: z.enum(ACCOUNT_KEYS),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.string().min(1),
});

export async function recordAccountWithdrawal(formData: FormData): Promise<{ error?: string }> {
  const raw = Object.fromEntries(formData);
  const result = Schema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0]?.message ?? 'Validation error' };

  const { account, amount, description, date } = result.data;
  const today = new Date().toISOString().split('T')[0]!;
  if (date > today) return { error: 'Date cannot be in the future.' };

  const [withdrawnMap, ytd] = await Promise.all([getWithdrawalsByAccountYTD(), getYTDSummary()]);

  const accountEarned: Record<string, number> = {
    salary: ytd.salary,
    pmg_share: ytd.pmgShare,
    reinvest: ytd.reinvest,
    reserve: ytd.reserve,
    flex: ytd.flex,
  };
  const earned = accountEarned[account] ?? 0;
  const totalWithdrawn = withdrawnMap[account] ?? 0;
  const availableBalance = earned - totalWithdrawn;

  if (amount > availableBalance) {
    return {
      error: `Cannot withdraw more than available balance (R${availableBalance.toFixed(2)}).`,
    };
  }

  const defaultDesc = `${account.replace('_', ' ')} withdrawal — ${new Date(date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  try {
    await insertWithdrawal(amount, date, description?.trim() || defaultDesc, account);
    revalidatePath('/accounts');
    revalidatePath('/withdrawals');
    revalidatePath('/dashboard');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save.' };
  }
}
