'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, expenses, eq, getExpenseById } from '@pmg/db';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTToday } from '@/lib/format';
import { postExpenseJournalEntry, voidExpenseJournalEntries, updateExpenseJournalEntry } from '@/lib/accounting/posting';
import { getSessionOrRedirect } from '@/lib/auth';
import { uploadReceiptToR2 } from '@/lib/r2';

const ExpenseSchema = z.object({
  date: z.string().min(1),
  divisionId: z.string().uuid(),
  clientId: z
    .string()
    .optional()
    .transform((val) => (val === '' || val === 'none' ? undefined : val)),
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
});

export async function createExpense(formData: FormData): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const raw = Object.fromEntries(formData);
    const result = ExpenseSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = getSASTToday();
    if (parsed.date > today) {
      return { error: 'Expense date cannot be in the future.' };
    }
    if (await isPeriodClosed(parsed.date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    const receiptFile = formData.get('receipt') as File | null;
    const receiptData = await uploadReceiptToR2(receiptFile);
    if (receiptData.error) {
      return { error: receiptData.error };
    }

    const [inserted] = await db.insert(expenses).values({
      date: parsed.date,
      divisionId: parsed.divisionId,
      clientId: parsed.clientId ?? null,
      category: parsed.category,
      description: parsed.description ?? null,
      amount: String(parsed.amount),
      receiptUrl: receiptData.url ?? null,
      receiptFileName: receiptData.fileName ?? null,
      receiptFileSize: receiptData.fileSize ? String(receiptData.fileSize) : null,
    }).returning({ id: expenses.id });

    // Auto-post: Dr Expense / Cr Bank
    if (inserted) {
      const journalResult = await postExpenseJournalEntry({
        expenseId: inserted.id,
        amount: parsed.amount,
        date: parsed.date,
        category: parsed.category,
        description: parsed.description || undefined,
        divisionId: parsed.divisionId,
      });
      if (journalResult.error) {
        console.warn('Expense auto-post warning:', journalResult.error);
      }
    }

    revalidatePath('/finance/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateExpense(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const raw = Object.fromEntries(formData);
    const result = ExpenseSchema.safeParse(raw);
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    const parsed = result.data;
    const today = getSASTToday();
    if (parsed.date > today) {
      return { error: 'Expense date cannot be in the future.' };
    }
    if (await isPeriodClosed(parsed.date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }
    const receiptFile = formData.get('receipt') as File | null;
    const receiptData = await uploadReceiptToR2(receiptFile);
    if (receiptData.error) {
      return { error: receiptData.error };
    }

    const updatePayload: Record<string, any> = {
      date: parsed.date,
      divisionId: parsed.divisionId,
      clientId: parsed.clientId ?? null,
      category: parsed.category,
      description: parsed.description ?? null,
      amount: String(parsed.amount),
      updatedAt: new Date(),
    };

    if (receiptData.url) {
      updatePayload.receiptUrl = receiptData.url;
      updatePayload.receiptFileName = receiptData.fileName;
      updatePayload.receiptFileSize = String(receiptData.fileSize);
    }

    await db
      .update(expenses)
      .set(updatePayload)
      .where(eq(expenses.id, id));

    // Auto-post: void old entry, post new one
    await updateExpenseJournalEntry({
      expenseId: id,
      newAmount: parsed.amount,
      date: parsed.date,
      category: parsed.category,
      description: parsed.description || undefined,
      divisionId: parsed.divisionId,
    });

    revalidatePath('/finance/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const existing = await getExpenseById(id);
    if (!existing) return { error: 'Record not found.' };

    if (await isPeriodClosed(existing.date)) {
      return { error: 'Cannot delete records from a closed financial period.' };
    }

    // Void the expense journal entry before deleting
    await voidExpenseJournalEntries(id);

    await db.delete(expenses).where(eq(expenses.id, id));
    revalidatePath('/finance/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');
    return {};
  } catch (err) {
    console.error('Failed to delete expense:', err);
    return { error: 'Failed to delete expense. Please try again.' };
  }
}

export async function fetchExpensesByMonth(year: number, month: number, divisionId?: string, category?: string) {
  await getSessionOrRedirect();
  const { getAllExpenses } = await import('@pmg/db');
  const expensesResult = await getAllExpenses(
    { month: `${year}-${month.toString().padStart(2, '0')}`, divisionId, category },
    { page: 1, pageSize: 5000 }
  );
  return { data: expensesResult.data };
}

export async function fetchExpensesByYear(year: number, divisionId?: string, category?: string) {
  await getSessionOrRedirect();
  const { getAllExpenses } = await import('@pmg/db');
  const expensesResult = await getAllExpenses(
    { year, divisionId, category },
    { page: 1, pageSize: 5000 }
  );
  return { data: expensesResult.data };
}
