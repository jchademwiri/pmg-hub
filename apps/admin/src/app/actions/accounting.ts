'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  getDb,
  chartAccounts,
  journalEntries,
  journalLines,
  eq,
  and,
  sql,
  desc,
  getNextAccountCode,
  validateJournalLines,
  getNextJournalEntryNumber,
  isPeriodOpen,
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
