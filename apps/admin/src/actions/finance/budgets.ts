'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { seedSeasonalizedBudgetPlan, upsertMonthlyBudgetPlan } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

const SaveMonthlyBudgetSchema = z.object({
  fiscalYear: z.coerce.number().int().min(2024).max(2040),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM'),
  revenueTarget: z.coerce.number().min(0, 'Revenue target cannot be negative'),
  expenseBudget: z.coerce.number().min(0, 'Expense budget cannot be negative'),
  directorSalaryBudget: z.coerce.number().min(0, 'Director salary budget cannot be negative'),
  taxReserveTarget: z.coerce.number().min(0, 'Tax reserve target cannot be negative'),
  notes: z.string().max(500).optional(),
  divisionTargets: z
    .array(
      z.object({
        divisionId: z.string().uuid(),
        targetAmount: z.coerce.number().min(0),
      }),
    )
    .optional(),
});

export async function saveMonthlyBudget(
  input: z.input<typeof SaveMonthlyBudgetSchema>,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const parsed = SaveMonthlyBudgetSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid budget values.' };
    }

    const d = parsed.data;
    // If per-division targets are provided and sum > 0, keep revenueTarget in sync
    const divSum =
      d.divisionTargets && d.divisionTargets.length > 0
        ? d.divisionTargets.reduce((s, t) => s + t.targetAmount, 0)
        : null;

    await upsertMonthlyBudgetPlan({
      fiscalYear: d.fiscalYear,
      period: d.period,
      revenueTarget: divSum !== null && divSum > 0 ? divSum : d.revenueTarget,
      expenseBudget: d.expenseBudget,
      directorSalaryBudget: d.directorSalaryBudget,
      taxReserveTarget: d.taxReserveTarget,
      notes: d.notes?.trim() || null,
      divisionTargets: d.divisionTargets,
    });

    revalidatePath('/finance/projections');
    revalidatePath('/finance');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save monthly budget.' };
  }
}

export async function seedFyBudgetAction(fiscalYear: number): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2024 || fiscalYear > 2040) {
      return { error: 'Invalid fiscal year.' };
    }

    await seedSeasonalizedBudgetPlan(fiscalYear);
    revalidatePath('/finance/projections');
    revalidatePath('/finance');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to seed fiscal year budget.' };
  }
}
