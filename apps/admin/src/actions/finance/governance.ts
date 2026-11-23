'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  db,
  dividendPayouts,
  getTrialBalance,
  upsertDividendPolicy,
  type BankAccountCode,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import {
  postMonthlyTaxProvisionEntry,
  postQuarterlyDistributionEntry,
} from '@/lib/accounting/posting';

function revalidateGovernancePaths() {
  revalidatePath('/finance/projections');
  revalidatePath('/finance/banking');
  revalidatePath('/finance');
  revalidatePath('/accounting');
  revalidatePath('/accounting/trial-balance');
  revalidatePath('/accounting/journals');
  revalidatePath('/accounting/profit-and-loss');
  revalidatePath('/insights/financial-reports');
}

const PolicySchema = z.object({
  fiscalYear: z.coerce.number().int().min(2024).max(2040),
  minCashReserve: z.coerce.number().min(0),
  payoutRatioPercent: z.coerce.number().min(0).max(100),
  payeTaxFreeThreshold: z.coerce.number().min(0),
  dwtRatePercent: z.coerce.number().min(0).max(100),
  isSbcQualified: z.boolean(),
});

export async function saveDividendPolicy(
  input: z.input<typeof PolicySchema>,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const parsed = PolicySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid policy settings.' };
    }

    await upsertDividendPolicy(parsed.data);
    revalidateGovernancePaths();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save governance policy.' };
  }
}

const RecordDistributionSchema = z.object({
  fiscalYear: z.coerce.number().int().min(2024).max(2040),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  payoutDate: z.string().min(10, 'Payout date is required'),
  payoutType: z.enum(['director_bonus', 'dividend']),
  accountCode: z.enum(['1010', '1020', '1030']).default('1010'),
  grossAmount: z.coerce.number().positive('Gross amount must be greater than zero'),
  dwtRatePercent: z.coerce.number().min(0).max(100).default(20),
  loanOffsetAmount: z.coerce.number().min(0).default(0),
  solvencySignedOff: z.boolean(),
  notes: z.string().max(500).optional(),
});

export async function recordQuarterlyDistribution(
  input: z.input<typeof RecordDistributionSchema>,
): Promise<{ error?: string; entryId?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const parsed = RecordDistributionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid distribution details.' };
    }
    const d = parsed.data;

    if (!d.solvencySignedOff) {
      return {
        error:
          'Companies Act s46 Solvency & Liquidity sign-off is mandatory before declaring a payout.',
      };
    }

    const dwtWithheld =
      d.payoutType === 'dividend'
        ? Number(((d.grossAmount * d.dwtRatePercent) / 100).toFixed(2))
        : 0;
    const afterTax = Number((d.grossAmount - dwtWithheld).toFixed(2));
    const loanOffset = Math.min(d.loanOffsetAmount, afterTax);
    const netCashPaid = Number((afterTax - loanOffset).toFixed(2));

    if (netCashPaid > 0) {
      const tb = await getTrialBalance();
      const avail = tb.find((r) => r.accountCode === d.accountCode)?.balance ?? 0;
      if (netCashPaid > avail + 0.005) {
        return {
          error: `Insufficient funds in ${d.accountCode}: available ${avail.toFixed(2)}, net cash payout ${netCashPaid.toFixed(2)}. Transfer cash or choose another bank account.`,
        };
      }
    }

    const glRes = await postQuarterlyDistributionEntry({
      date: d.payoutDate,
      quarter: d.quarter,
      payoutType: d.payoutType,
      accountCode: d.accountCode as BankAccountCode,
      grossAmount: d.grossAmount,
      dwtWithheld,
      loanOffsetAmount: loanOffset,
      netCashPaid,
      description: d.notes?.trim() || undefined,
      createdBy: session.user.id,
    });

    if (glRes.error) return { error: glRes.error };

    const now = new Date();
    await db.insert(dividendPayouts).values({
      fiscalYear: d.fiscalYear,
      quarter: d.quarter,
      payoutDate: d.payoutDate,
      payoutType: d.payoutType,
      grossAmount: d.grossAmount.toFixed(2),
      dwtWithheld: dwtWithheld.toFixed(2),
      loanOffsetAmount: loanOffset.toFixed(2),
      netCashPaid: netCashPaid.toFixed(2),
      solvencySignedOff: true,
      solvencySignedBy: session.user.email || session.user.id,
      solvencySignedAt: now,
      journalEntryId: glRes.entryId ?? null,
      notes: d.notes?.trim() || null,
      updatedAt: now,
    });

    revalidateGovernancePaths();
    return { entryId: glRes.entryId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to record distribution.' };
  }
}

const TaxProvisionSchema = z.object({
  date: z.string().min(10, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  description: z.string().max(300).optional(),
});

export async function postTaxProvision(
  input: z.input<typeof TaxProvisionSchema>,
): Promise<{ error?: string; entryId?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const parsed = TaxProvisionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid tax provision.' };
    }

    const res = await postMonthlyTaxProvisionEntry({
      date: parsed.data.date,
      amount: parsed.data.amount,
      description: parsed.data.description?.trim() || undefined,
      createdBy: session.user.id,
    });

    if (res.error) return { error: res.error };

    revalidateGovernancePaths();
    return { entryId: res.entryId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to post tax provision.' };
  }
}
