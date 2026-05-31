'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, income, eq, getIncomeById, invoices, paymentAllocations, and, sql } from '@pmg/db';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTToday } from '@/lib/format';

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
    const today = getSASTToday();
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
    const today = getSASTToday();
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

    // 1. Fetch all allocations associated with this income record
    const allocations = await db
      .select({
        invoiceId: paymentAllocations.invoiceId,
        amount: paymentAllocations.amount,
      })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.incomeId, id));

    // 2. Revert any legacy single-payment link on invoices
    await db
      .update(invoices)
      .set({ status: 'issued', paidAt: null, incomeId: null })
      .where(eq(invoices.incomeId, id));

    // 3. Manually delete allocations first to bypass potential cascade constraint bugs
    await db
      .delete(paymentAllocations)
      .where(eq(paymentAllocations.incomeId, id));

    // 4. Delete the income record
    await db.delete(income).where(eq(income.id, id));

    // 5. Recalculate status and paidAt for all affected invoices based on remaining allocations
    for (const alloc of allocations) {
      const [sumAgg] = await db
        .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

      const [invoiceRow] = await db
        .select({ total: invoices.total })
        .from(invoices)
        .where(eq(invoices.id, alloc.invoiceId));

      if (invoiceRow) {
        const invoiceTotal = parseFloat(invoiceRow.total);
        const totalAllocated = parseFloat(sumAgg?.sum ?? '0');

        if (totalAllocated >= invoiceTotal) {
          await db
            .update(invoices)
            .set({
              status: 'paid',
              paidAt: new Date(),
              incomeId: null,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, alloc.invoiceId));
        } else if (totalAllocated > 0) {
          await db
            .update(invoices)
            .set({
              status: 'partially_paid',
              paidAt: null,
              incomeId: null,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, alloc.invoiceId));
        } else {
          await db
            .update(invoices)
            .set({
              status: 'issued',
              paidAt: null,
              incomeId: null,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, alloc.invoiceId));
        }
      }
    }

    revalidatePath('/finance/income');
    revalidatePath('/billing/invoices');
    revalidatePath('/dashboard');
    return {};
  } catch (err) {
    console.error('Failed to delete income record:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete. Please try again.' };
  }
}
