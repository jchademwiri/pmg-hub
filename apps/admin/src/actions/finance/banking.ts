'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getTrialBalance, upsertBankReconciliation, type BankAccountCode } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import {
  postBankReconciliationAdjustment,
  postFy2027OpeningBalanceTrueUp,
  postOwnerWithdrawalJournalEntry,
  postQuickBankEntry,
  type BankReconciliationContraCode,
  type OwnerWithdrawalMode,
} from '@/lib/accounting/posting';

function revalidateBankingPaths() {
  revalidatePath('/finance/banking');
  revalidatePath('/finance/expenses');
  revalidatePath('/finance');
  revalidatePath('/accounting');
  revalidatePath('/accounting/trial-balance');
  revalidatePath('/accounting/general-ledger');
  revalidatePath('/accounting/journals');
  revalidatePath('/accounting/profit-and-loss');
  revalidatePath('/dashboard');
}

const ReconcileSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM'),
  accountCode: z.enum(['1010', '1020', '1030']),
  statementDate: z.string().min(10, 'Statement date is required'),
  statementBalance: z.coerce.number(),
  postAdjustment: z.boolean().optional().default(false),
  contraCode: z.enum(['5110', '4030', '1250', '3010']).optional(),
  notes: z.string().max(500).optional(),
});

export async function reconcileBankAccount(
  input: z.input<typeof ReconcileSchema>,
): Promise<{ error?: string; status?: 'reconciled' | 'variance'; variance?: number }> {
  try {
    const session = await getSessionOrRedirect();
    const parsed = ReconcileSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid reconciliation input.' };
    }
    const d = parsed.data;

    // Live book balance as of statementDate
    const tb = await getTrialBalance(undefined, undefined, undefined, d.statementDate);
    const bookBalance = tb.find((r) => r.accountCode === d.accountCode)?.balance ?? 0;
    const rawVariance = Number((d.statementBalance - bookBalance).toFixed(2));

    let adjustmentJournalId: string | null = null;
    let finalBookBalance = bookBalance;
    let finalVariance = rawVariance;
    let finalStatus: 'reconciled' | 'variance' =
      Math.abs(rawVariance) < 0.01 ? 'reconciled' : 'variance';

    if (Math.abs(rawVariance) >= 0.01 && d.postAdjustment) {
      if (!d.contraCode) {
        return { error: 'Please choose a contra account for the balancing journal entry.' };
      }

      const adj = await postBankReconciliationAdjustment({
        accountCode: d.accountCode as BankAccountCode,
        date: d.statementDate,
        delta: rawVariance,
        contraCode: d.contraCode as BankReconciliationContraCode,
        description:
          d.notes?.trim() || `Bank reconciliation adjustment (${d.accountCode} · ${d.period})`,
        createdBy: session.user.id,
      });

      if (adj.error) return { error: adj.error };
      adjustmentJournalId = adj.entryId ?? null;
      finalBookBalance = d.statementBalance;
      finalVariance = 0;
      finalStatus = 'reconciled';
    }

    await upsertBankReconciliation({
      period: d.period,
      accountCode: d.accountCode as BankAccountCode,
      statementDate: d.statementDate,
      statementBalance: d.statementBalance,
      bookBalance: finalBookBalance,
      variance: finalVariance,
      adjustmentJournalId,
      status: finalStatus,
      notes: d.notes?.trim() || null,
      reconciledBy: session.user.id,
    });

    revalidateBankingPaths();
    return { status: finalStatus, variance: finalVariance };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save reconciliation.' };
  }
}

const OwnerWithdrawalSchema = z.object({
  date: z.string().min(10, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  mode: z.enum(['director_loan', 'loan_repayment', 'salary_advance']),
  description: z.string().max(300).optional(),
});

export async function recordOwnerWithdrawal(
  input: z.input<typeof OwnerWithdrawalSchema>,
): Promise<{ error?: string; entryId?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const parsed = OwnerWithdrawalSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
    }
    const d = parsed.data;

    const res = await postOwnerWithdrawalJournalEntry({
      date: d.date,
      amount: d.amount,
      mode: d.mode as OwnerWithdrawalMode,
      description: d.description?.trim() || '',
      createdBy: session.user.id,
    });

    if (res.error) return { error: res.error };

    revalidateBankingPaths();
    return { entryId: res.entryId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to record entry.' };
  }
}

const QuickBankEntrySchema = z.object({
  type: z.enum(['bank_fee', 'interest']),
  accountCode: z.enum(['1010', '1020', '1030']).default('1010'),
  date: z.string().min(10, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  description: z.string().max(300).optional(),
});

export async function recordQuickBankEntry(
  input: z.input<typeof QuickBankEntrySchema>,
): Promise<{ error?: string; entryId?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const parsed = QuickBankEntrySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
    }
    const d = parsed.data;

    const res = await postQuickBankEntry({
      type: d.type,
      accountCode: d.accountCode as BankAccountCode,
      date: d.date,
      amount: d.amount,
      description: d.description?.trim() || '',
      createdBy: session.user.id,
    });

    if (res.error) return { error: res.error };

    revalidateBankingPaths();
    return { entryId: res.entryId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to record bank entry.' };
  }
}

const Fy2027TransitionSchema = z.object({
  realChequeBalance: z.coerce.number(),
  realSavingsBalance: z.coerce.number(),
});

export async function runFy2027TransitionWizard(
  input: z.input<typeof Fy2027TransitionSchema>,
): Promise<{ error?: string; postedEntries?: number }> {
  try {
    const session = await getSessionOrRedirect();
    const parsed = Fy2027TransitionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid balances.' };
    }

    const res = await postFy2027OpeningBalanceTrueUp({
      realChequeBalance: parsed.data.realChequeBalance,
      realSavingsBalance: parsed.data.realSavingsBalance,
      createdBy: session.user.id,
    });

    if (res.error) return { error: res.error };

    revalidateBankingPaths();
    return { postedEntries: res.postedEntries };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to run FY2027 transition.' };
  }
}
