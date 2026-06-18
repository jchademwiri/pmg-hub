'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  getDb,
  chartAccounts,
  journalEntries,
  journalLines,
  accountingPeriods,
  eq,
  and,
  sql,
  desc,
  getNextAccountCode,
  validateJournalLines,
  getNextJournalEntryNumber,
  isPeriodOpen,
  ensureOpenPeriod,
  closePeriod,
  lockPeriod,
  reopenPeriod,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';

// ── Chart of Accounts ─────────────────────────────────────────────────────────

const AccountTypeEnum = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']);

const CreateAccountSchema = z.object({
  name: z.string().min(1).max(200),
  type: AccountTypeEnum,
  code: z.string().max(20).optional(),
  description: z.string().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  isPostingAccount: z.coerce.boolean().default(true),
});

export async function createChartAccount(formData: FormData): Promise<{ error?: string; accountId?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      code: (formData.get('code') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
      parentId: (formData.get('parentId') as string) || undefined,
      isPostingAccount: formData.get('isPostingAccount') !== 'off',
    };

    const parsed = CreateAccountSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const db = getDb();
    const code = parsed.data.code || await getNextAccountCode(parsed.data.type);

    // Check code uniqueness
    const [existing] = await db
      .select({ id: chartAccounts.id })
      .from(chartAccounts)
      .where(eq(chartAccounts.code, code))
      .limit(1);

    if (existing) {
      return { error: `Account code "${code}" already exists.` };
    }

    const [inserted] = await db
      .insert(chartAccounts)
      .values({
        code,
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description ?? null,
        parentId: parsed.data.parentId ?? null,
        isPostingAccount: parsed.data.isPostingAccount,
      })
      .returning({ id: chartAccounts.id });

    revalidatePath('/accounting/chart-of-accounts');
    return { accountId: inserted?.id };
  } catch (err) {
    console.error('Failed to create chart account:', err);
    return { error: 'Failed to create account. Please try again.' };
  }
}

const UpdateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.coerce.boolean().optional(),
  isPostingAccount: z.coerce.boolean().optional(),
});

export async function updateChartAccount(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();

    const raw = {
      name: (formData.get('name') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
      isActive: formData.get('isActive') !== 'off',
      isPostingAccount: formData.get('isPostingAccount') !== 'off',
    };

    const parsed = UpdateAccountSchema.safeParse({ ...raw, id });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    const db = getDb();
    const { id: accountId, ...updates } = parsed.data;

    await db
      .update(chartAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chartAccounts.id, accountId));

    revalidatePath('/accounting/chart-of-accounts');
    return {};
  } catch (err) {
    console.error('Failed to update chart account:', err);
    return { error: 'Failed to update account. Please try again.' };
  }
}

// ── Journal Entry Validation ──────────────────────────────────────────────────

const CreateJournalLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.coerce.number().min(0).optional().nullable(),
  credit: z.coerce.number().min(0).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

const CreateJournalEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  lines: z.array(CreateJournalLineSchema).min(2),
});

/**
 * Creates a journal entry with balanced debit/credit lines.
 * Returns an error if the entry does not balance.
 */
export async function createJournalEntry(data: {
  entryDate: string;
  description: string;
  lines: { accountId: string; debit?: number; credit?: number; description?: string }[];
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const session = await getSessionOrRedirect();

    const parsed = CreateJournalEntrySchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Validation error' };
    }

    // Validate lines balance
    const validation = validateJournalLines(parsed.data.lines);
    if (!validation.valid) {
      return { error: validation.error };
    }

    // Check period is open
    const period = parsed.data.entryDate.slice(0, 7); // YYYY-MM
    if (!(await isPeriodOpen(period))) {
      return { error: `Period ${period} is closed. Cannot create journal entries in a closed period.` };
    }

    // Auto-create period record if it doesn't exist
    await ensureOpenPeriod(period);

    const db = getDb();
    const entryNumber = await getNextJournalEntryNumber();

    // Create the entry
    const [entry] = await db
      .insert(journalEntries)
      .values({
        entryNumber,
        entryDate: parsed.data.entryDate,
        period,
        description: parsed.data.description,
        status: 'draft',
        createdBy: session.user.id,
      })
      .returning({ id: journalEntries.id });

    if (!entry) return { error: 'Failed to create journal entry.' };

    // Create the lines
    for (const line of parsed.data.lines) {
      await db.insert(journalLines).values({
        journalEntryId: entry.id,
        accountId: line.accountId,
        debit: line.debit ? String(line.debit) : null,
        credit: line.credit ? String(line.credit) : null,
        description: line.description ?? null,
      });
    }

    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/chart-of-accounts');
    return { entryId: entry.id };
  } catch (err) {
    console.error('Failed to create journal entry:', err);
    return { error: 'Failed to create journal entry. Please try again.' };
  }
}

// ── Journal Entry Posting ─────────────────────────────────────────────────────

/**
 * Posts a draft journal entry (changes status from draft to posted).
 */
export async function postJournalEntry(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id))
      .limit(1);

    if (!entry) return { error: 'Journal entry not found.' };
    if (entry.status !== 'draft') return { error: 'Only draft entries can be posted.' };

    // Verify lines balance
    const lines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, id));

    const validation = validateJournalLines(lines);
    if (!validation.valid) return { error: validation.error };

    // Check period is open
    if (!(await isPeriodOpen(entry.period))) {
      return { error: `Period ${entry.period} is closed.` };
    }

    await db
      .update(journalEntries)
      .set({
        status: 'posted',
        postedAt: new Date(),
        postedBy: entry.createdBy,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, id));

    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');
    return {};
  } catch (err) {
    console.error('Failed to post journal entry:', err);
    return { error: 'Failed to post journal entry.' };
  }
}

/**
 * Voids a journal entry (posted or draft).
 */
export async function voidJournalEntry(id: string, reason: string): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id))
      .limit(1);

    if (!entry) return { error: 'Journal entry not found.' };
    if (entry.status === 'void') return { error: 'Entry is already voided.' };

    await db
      .update(journalEntries)
      .set({
        status: 'void',
        voidedAt: new Date(),
        voidedBy: session.user.id,
        voidReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, id));

    revalidatePath('/accounting/journals');
    // Only revalidate report pages if the entry was posted (affects balances)
    if (entry.status === 'posted') {
      revalidatePath('/accounting/trial-balance');
      revalidatePath('/accounting/general-ledger');
      revalidatePath('/accounting/profit-and-loss');
    }
    return {};
  } catch (err) {
    console.error('Failed to void journal entry:', err);
    return { error: 'Failed to void journal entry.' };
  }
}

// ── Accounting Periods ────────────────────────────────────────────────────────

/**
 * Closes an accounting period.
 */
export async function closeAccountingPeriod(period: string): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    await closePeriod(period, session.user.id);
    revalidatePath('/accounting/periods');
    revalidatePath('/accounting/journals');
    return {};
  } catch (err) {
    console.error('Failed to close period:', err);
    return { error: 'Failed to close period.' };
  }
}

/**
 * Locks an accounting period permanently.
 */
export async function lockAccountingPeriod(period: string): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    await lockPeriod(period, session.user.id);
    revalidatePath('/accounting/periods');
    revalidatePath('/accounting/journals');
    return {};
  } catch (err) {
    console.error('Failed to lock period:', err);
    return { error: 'Failed to lock period.' };
  }
}

/**
 * Reopens a closed accounting period.
 */
export async function reopenAccountingPeriod(period: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await reopenPeriod(period);
    revalidatePath('/accounting/periods');
    revalidatePath('/accounting/journals');
    return {};
  } catch (err) {
    console.error('Failed to reopen period:', err);
    return { error: 'Failed to reopen period.' };
  }
}
