'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, savingsGoals, savingsContributions, assets, eq, getSavingsGoalById } from '@pmg/db';

const GoalSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  targetAmount: z.coerce.number().positive(),
  actualPrice: z
    .string()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!isNaN(v) && v >= 0), 'Price must be a positive number'),
  vendor: z.string().optional(),
  productUrl: z.string().optional(),
  spendTrackerKey: z
    .string()
    .optional()
    .transform((v) => (v === '' || v === 'none' ? undefined : v)),
  targetDate: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  notes: z.string().optional(),
});

const ContributionSchema = z.object({
  goalId: z.string().uuid(),
  type: z.enum(['deposit', 'withdrawal']).default('deposit'),
  contributionDate: z.string().min(1),
  amount: z.coerce.number().positive(),
  notes: z.string().optional(),
});

function revalidate(goalId?: string) {
  revalidatePath('/savings');
  if (goalId) revalidatePath(`/savings/${goalId}`);
}

export async function createSavingsGoal(formData: FormData): Promise<{ error?: string }> {
  try {
    const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const d = parsed.data;

    await db.insert(savingsGoals).values({
      name: d.name,
      description: d.description || null,
      targetAmount: String(d.targetAmount),
      actualPrice: d.actualPrice !== undefined ? String(d.actualPrice) : null,
      vendor: d.vendor || null,
      productUrl: d.productUrl || null,
      spendTrackerKey: d.spendTrackerKey || null,
      targetDate: d.targetDate || null,
      notes: d.notes || null,
    });

    revalidate();
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateSavingsGoal(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const parsed = GoalSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const d = parsed.data;

    await db
      .update(savingsGoals)
      .set({
        name: d.name,
        description: d.description || null,
        targetAmount: String(d.targetAmount),
        actualPrice: d.actualPrice !== undefined ? String(d.actualPrice) : null,
        vendor: d.vendor || null,
        productUrl: d.productUrl || null,
        spendTrackerKey: d.spendTrackerKey || null,
        targetDate: d.targetDate || null,
        notes: d.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(savingsGoals.id, id));

    revalidate(id);
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

/** Deletes the goal and, by cascade, its contribution history. */
export async function deleteSavingsGoal(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
    revalidate();
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}

export async function addContribution(formData: FormData): Promise<{ error?: string }> {
  try {
    const parsed = ContributionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const d = parsed.data;

    const goal = await getSavingsGoalById(d.goalId);
    if (!goal) return { error: 'Goal not found.' };

    if (d.type === 'withdrawal' && d.amount > goal.saved) {
      return { error: `Cannot withdraw more than the R${goal.saved.toFixed(2)} saved.` };
    }

    await db.insert(savingsContributions).values({
      goalId: d.goalId,
      type: d.type,
      contributionDate: d.contributionDate,
      amount: String(d.amount),
      notes: d.notes || null,
    });

    revalidate(d.goalId);
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteContribution(id: string, goalId: string): Promise<{ error?: string }> {
  try {
    await db.delete(savingsContributions).where(eq(savingsContributions.id, id));
    revalidate(goalId);
    return {};
  } catch {
    return { error: 'Failed to delete. Please try again.' };
  }
}

/**
 * Marks a goal purchased and registers it in the assets register.
 *
 * This is the hand-off into `assets` - the goal keeps its contribution history
 * and back-links to the new asset row, so nothing is lost and the savings
 * module can still be removed independently afterwards.
 */
export async function convertGoalToAsset(
  id: string,
  formData: FormData,
): Promise<{ error?: string; assetId?: string }> {
  try {
    const schema = z.object({
      acquisitionDate: z.string().min(1),
      cost: z.coerce.number().nonnegative(),
      category: z.string().min(1),
      serialNumber: z.string().optional(),
      location: z.string().optional(),
    });
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }
    const d = parsed.data;

    const goal = await getSavingsGoalById(id);
    if (!goal) return { error: 'Goal not found.' };
    if (goal.assetId) return { error: 'This goal has already been added to the asset register.' };

    const assetId = await db.transaction(async (tx) => {
      const [asset] = await tx
        .insert(assets)
        .values({
          kind: 'fixed_asset',
          name: goal.name,
          category: d.category,
          acquisitionDate: d.acquisitionDate,
          cost: String(d.cost),
          serialNumber: d.serialNumber || null,
          location: d.location || null,
          notes: goal.notes || null,
        })
        .returning({ id: assets.id });

      await tx
        .update(savingsGoals)
        .set({
          status: 'purchased',
          purchasedAt: d.acquisitionDate,
          assetId: asset!.id,
          updatedAt: new Date(),
        })
        .where(eq(savingsGoals.id, id));

      return asset!.id;
    });

    revalidate(id);
    revalidatePath('/assets');
    return { assetId };
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}
