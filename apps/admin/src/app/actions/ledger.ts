'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, ledger, eq } from '@pmg/db';
import {
  insertLedgerEntry,
  updateLedgerEntry as dbUpdateLedgerEntry,
  deleteLedgerEntry as dbDeleteLedgerEntry,
} from '@pmg/db';
import { getLedgerBalances } from '@/lib/financial';
import { getSessionOrRedirect } from '@/lib/auth';

const ledgerSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  allocationType: z.enum(['salary', 'reinvest', 'reserve', 'flex']).default('salary'),
  entryType: z.enum(['spend', 'transfer', 'adjustment']).default('spend'),
  description: z.string().optional(),
});

function formatDefaultDescription(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return `Ledger Entry — ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

async function checkLedgerConstraints(
  allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex',
  requestedAmount: number,
  existingAmountId?: string,
): Promise<{ error?: string }> {
  const balances = await getLedgerBalances();
  let availableBalance = balances[allocationType].available;

  if (existingAmountId) {
    const { getLedgerById } = await import('@pmg/db');
    const existing = await getLedgerById(existingAmountId);
    if (existing && existing.allocationType === allocationType) {
      availableBalance += Number(existing.amount);
    }
  }

  if (requestedAmount > availableBalance) {
    return {
      error: `Cannot spend more than available balance (R${availableBalance.toFixed(2)}).`,
    };
  }

  return {};
}

export async function createLedgerEntry(formData: FormData): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const raw = Object.fromEntries(formData);
    const result = ledgerSchema.safeParse(raw);
    
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Ledger date cannot be in the future.' };
    }
    
    const description = parsed.description?.trim() || formatDefaultDescription(parsed.date);

    const constraintCheck = await checkLedgerConstraints(parsed.allocationType, parsed.amount);
    if (constraintCheck.error) return constraintCheck;

    await insertLedgerEntry({
      amount: parsed.amount,
      date: parsed.date,
      description,
      allocationType: parsed.allocationType,
      entryType: parsed.entryType,
      createdBy: session.user.id
    });
    
    revalidatePath('/ledger');
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function updateLedgerEntry(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect(); // just ensure active session
    const raw = Object.fromEntries(formData);
    const result = ledgerSchema.safeParse(raw);
    
    if (!result.success) {
      return { error: result.error.issues[0]?.message ?? 'Validation error' };
    }
    
    const parsed = result.data;
    const today = new Date().toISOString().split('T')[0]!;
    if (parsed.date > today) {
      return { error: 'Ledger date cannot be in the future.' };
    }
    
    const description = parsed.description?.trim() || formatDefaultDescription(parsed.date);

    const constraintCheck = await checkLedgerConstraints(parsed.allocationType, parsed.amount, id);
    if (constraintCheck.error) return constraintCheck;

    await dbUpdateLedgerEntry(id, {
        date: parsed.date,
        amount: parsed.amount,
        description,
        allocationType: parsed.allocationType,
        entryType: parsed.entryType
    });
    
    revalidatePath('/ledger');
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}

export async function deleteLedgerEntry(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await dbDeleteLedgerEntry(id);
    
    revalidatePath('/ledger');
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}
