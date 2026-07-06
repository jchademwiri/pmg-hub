'use server';

/**
 * posting.ts
 *
 * Dedicated accounting posting module for creating balanced double-entry journal
 * entries across the billing lifecycle. All posting functions use db.batch() with
 * pre-generated UUIDs for atomicity — either all queries succeed or none do, in a
 * single HTTP round trip.
 *
 * On invoice ISSUED:
 *   Dr Accounts Receivable (1100) / Cr Sales Revenue (4010)
 *
 * On payment RECEIVED:
 *   Entry 1 (Cash receipt):  Dr Business Cheque Account (1010) / Cr Accounts Receivable (1100)
 *   Entry 2 (PMG Share):     Dr Savings Account (1020) / Cr Business Cheque Account (1010)
 *
 * On invoice VOIDED:
 *   Voids the AR journal entry linked to the invoice.
 *
 * On payment DELETED:
 *   Voids both journal entries linked to the income record.
 *
 * On expense RECORDED:
 *   Dr <Expense Category> / Cr Business Cheque Account (1010)
 *
 * On expense DELETED:
 *   Voids the expense journal entry.
 */

import { randomUUID } from 'crypto';
import {
  getDb,
  chartAccounts,
  journalEntries,
  journalLines,
  paymentAllocations,
  and,
  eq,
  sql,
  ACCOUNT_RATES,
  getNextJournalEntryNumber,
  ensureOpenPeriod,
} from '@pmg/db';

// ── Account Code Constants ───────────────────────────────────────────────────
const BANK_ACCOUNT_CODE = '1010'; // Business Cheque Account
const SAVINGS_ACCOUNT_CODE = '1020'; // Savings Account (PMG Share destination)
const ACCOUNTS_RECEIVABLE_CODE = '1100'; // Accounts Receivable
const SALES_REVENUE_CODE = '4010'; // Sales Revenue
const MISC_EXPENSE_CODE = '5140'; // Miscellaneous Expense (fallback)
const BAD_DEBT_EXPENSE_CODE = '5150'; // Bad Debt Expense

// ── Expense category → chart account mapping ────────────────────────────────
const EXPENSE_ACCOUNT_MAP: { keywords: string[]; code: string }[] = [
  { keywords: ['hosting', 'infrastructure', 'server', 'cloud', 'domain'], code: '5010' },
  { keywords: ['software', 'subscription', 'saas', 'licence', 'license'], code: '5020' },
  { keywords: ['office', 'supply', 'supplies', 'stationery', 'printing'], code: '5030' },
  { keywords: ['marketing', 'advertising', 'ad spend', 'promotion'], code: '5040' },
  { keywords: ['professional', 'accounting', 'legal', 'consulting', 'consultant'], code: '5050' },
  { keywords: ['telecom', 'phone', 'internet', 'data', 'mobile'], code: '5060' },
  { keywords: ['travel', 'transport', 'fuel', 'petrol'], code: '5070' },
  { keywords: ['equipment', 'hardware', 'device'], code: '5030' },
  { keywords: ['insurance'], code: '5080' },
  { keywords: ['contractor', 'freelance', 'sub-contractor'], code: '5090' },
  { keywords: ['shipping', 'shipment', 'delivery', 'courier'], code: '5070' },
  { keywords: ['utility', 'electricity', 'water', 'municipal'], code: '5100' },
  { keywords: ['bank', 'charge', 'fee', 'processing'], code: '5110' },
  { keywords: ['staff', 'salary', 'wage', 'employee'], code: '5120' },
  { keywords: ['reinvest', 'growth', 'development'], code: '5130' },
];

function findExpenseAccountCode(category: string): string {
  const lower = category.toLowerCase();
  for (const mapping of EXPENSE_ACCOUNT_MAP) {
    if (mapping.keywords.some((kw) => lower.includes(kw))) {
      return mapping.code;
    }
  }
  return MISC_EXPENSE_CODE;
}

// ── Look up accounts by code ───────────────────────────────────────────────
async function getAccountsByCode(codes: string[]) {
  const db = getDb();
  const accounts = await db
    .select()
    .from(chartAccounts)
    .where(sql`${chartAccounts.code} IN ${codes}`);

  const map = new Map(accounts.map((a) => [a.code, a]));
  return map;
}

// ── Post Journal Entries for a Payment ──────────────────────────────────────

/**
 * Creates and auto-posts double-entry journal entries when a payment is received.
 * Uses db.batch() for atomicity — all inserts fire in a single HTTP round trip.
 *
 * Entry 1 – Cash receipt (clearing AR):
 *   Dr Business Cheque Account (1010)  = full amount
 *   Cr Accounts Receivable (1100)      = full amount
 *
 * Entry 2 – PMG Share transfer to savings (cash movement):
 *   Dr Savings Account (1020)          = amount × 25%
 *   Cr Business Cheque Account (1010)  = amount × 25%
 */
export async function postPaymentJournalEntries(data: {
  incomeId: string;
  amount: number;
  date: string;
  description: string;
  divisionId?: string;
}): Promise<{ error?: string; entryIds?: string[] }> {
  try {
    const { incomeId, amount, date, description, divisionId } = data;

    if (amount <= 0) return { error: 'Payment amount must be positive.' };

    const period = date.slice(0, 7);
    await ensureOpenPeriod(period);

    const accountMap = await getAccountsByCode([
      BANK_ACCOUNT_CODE,
      SAVINGS_ACCOUNT_CODE,
      ACCOUNTS_RECEIVABLE_CODE,
    ]);

    const bankAccount = accountMap.get(BANK_ACCOUNT_CODE);
    const savingsAccount = accountMap.get(SAVINGS_ACCOUNT_CODE);
    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);

    if (!bankAccount || !savingsAccount || !accountsReceivable) {
      return {
        error: 'Required chart accounts not found (1010, 1020, 1100). Please run the accounting seed first.',
      };
    }

    const db = getDb();
    const entryIds: string[] = [];
    const now = new Date();

    // ── Pre-generate all IDs ───────────────────────────────────────────────
    const entry1Id = randomUUID();
    const entry1Line1Id = randomUUID();
    const entry1Line2Id = randomUUID();

    // ── Execute all inserts atomically in a transaction ────────────────────
    const pmgShareAmount = Math.round(amount * ACCOUNT_RATES.pmg_share * 100) / 100;

    await db.transaction(async (tx) => {
      const entryNumber1 = await getNextJournalEntryNumber(tx, date);
      entryIds.push(entry1Id);
      // Entry 1: Dr Bank / Cr AR
      await tx.insert(journalEntries).values({
        id: entry1Id,
        entryNumber: entryNumber1,
        entryDate: date,
        period,
        description: description || 'Payment received',
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'income',
        sourceId: incomeId,
        sourceDocumentNumber: entryNumber1,
        postedAt: now,
        postedBy: 'system',
        createdBy: 'system',
      });
      await tx.insert(journalLines).values({
        id: entry1Line1Id,
        journalEntryId: entry1Id,
        accountId: bankAccount.id,
        debit: String(amount),
        credit: null,
        description: 'Payment received',
      });
      await tx.insert(journalLines).values({
        id: entry1Line2Id,
        journalEntryId: entry1Id,
        accountId: accountsReceivable.id,
        debit: null,
        credit: String(amount),
        description: 'Payment received – AR cleared',
      });

      // Entry 2: Dr Savings / Cr Bank (PMG share)
      if (pmgShareAmount > 0) {
        const entry2Id = randomUUID();
        const entry2Line1Id = randomUUID();
        const entry2Line2Id = randomUUID();
        const entryNumber2 = await getNextJournalEntryNumber(tx, date);
        entryIds.push(entry2Id);

        await tx.insert(journalEntries).values({
          id: entry2Id,
          entryNumber: entryNumber2,
          entryDate: date,
          period,
          description: `PMG Share allocation (25%)`,
          status: 'posted',
          sourceModule: 'billing',
          sourceTable: 'income',
          sourceId: incomeId,
          sourceDocumentNumber: entryNumber2,
          postedAt: now,
          postedBy: 'system',
          createdBy: 'system',
        });
        await tx.insert(journalLines).values({
          id: entry2Line1Id,
          journalEntryId: entry2Id,
          accountId: savingsAccount.id,
          debit: String(pmgShareAmount),
          credit: null,
          description: 'PMG Share → Savings',
        });
        await tx.insert(journalLines).values({
          id: entry2Line2Id,
          journalEntryId: entry2Id,
          accountId: bankAccount.id,
          debit: null,
          credit: String(pmgShareAmount),
          description: `PMG Share transfer (25% of R${amount.toFixed(2)})`,
        });
      }
    });

    return { entryIds };
  } catch (err) {
    console.error('Failed to auto-post payment journal entries:', err);
    return { error: 'Journal auto-post failed. Please post manually in Accounting → Journals.' };
  }
}

// ── Void Journal Entries for a Deleted Payment ─────────────────────────────

/**
 * Voids all system-generated journal entries linked to a specific income record.
 * Uses db.batch() to void all entries in a single round trip.
 */
export async function voidPaymentJournalEntries(
  incomeId: string
): Promise<{ error?: string; voidedCount?: number }> {
  try {
    const db = getDb();

    const entries = await db
      .select({ id: journalEntries.id, status: journalEntries.status })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceModule, 'billing'),
          eq(journalEntries.sourceTable, 'income'),
          eq(journalEntries.sourceId, incomeId)
        )
      );

    const toVoid = entries.filter((e) => e.status !== 'void');

    if (toVoid.length === 0) return { voidedCount: 0 };

    // Batch all void updates atomically in a transaction
    const now = new Date();
    await db.transaction(async (tx) => {
      for (const entry of toVoid) {
        await tx
          .update(journalEntries)
          .set({
            status: 'void',
            voidedAt: now,
            voidedBy: 'system',
            voidReason: 'Payment record deleted',
            updatedAt: now,
          })
          .where(eq(journalEntries.id, entry.id));
      }
    });

    return { voidedCount: toVoid.length };
  } catch (err) {
    console.error('Failed to void payment journal entries:', err);
    return { error: 'Failed to void journal entries. Please void manually in Accounting → Journals.' };
  }
}

// ── Update Journal Entries for an Adjusted Payment ─────────────────────────

/**
 * Voids existing journal entries for a payment and re-creates them with the
 * new amount. Called when a payment amount is adjusted.
 */
export async function updatePaymentJournalEntries(data: {
  incomeId: string;
  newAmount: number;
  date: string;
  description: string;
  divisionId?: string;
}): Promise<{ error?: string }> {
  await voidPaymentJournalEntries(data.incomeId);

  const result = await postPaymentJournalEntries({
    incomeId: data.incomeId,
    amount: data.newAmount,
    date: data.date,
    description: data.description,
    divisionId: data.divisionId,
  });

  return { error: result.error };
}

// ── Invoice Issue: Dr AR / Cr Revenue ───────────────────────────────────────

/**
 * Creates and auto-posts a journal entry when an invoice is issued.
 * Uses db.batch() for atomicity.
 *
 *   Dr Accounts Receivable (1100)  = invoice total
 *   Cr Sales Revenue (4010)        = invoice total
 */
export async function postInvoiceIssueJournalEntry(data: {
  invoiceId: string;
  amount: number;
  date: string;
  description: string;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { invoiceId, amount, date, description } = data;

    if (amount <= 0) return { error: 'Invoice amount must be positive.' };

    const period = date.slice(0, 7);
    await ensureOpenPeriod(period);

    const accountMap = await getAccountsByCode([
      ACCOUNTS_RECEIVABLE_CODE,
      SALES_REVENUE_CODE,
    ]);

    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);
    const salesRevenue = accountMap.get(SALES_REVENUE_CODE);

    if (!accountsReceivable || !salesRevenue) {
      return { error: 'Required chart accounts not found (1100, 4010). Please run the accounting seed first.' };
    }

    const db = getDb();
    const entryId = randomUUID();

    // Atomic transaction: entry + 2 lines
    await db.transaction(async (tx) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        description: description || 'Invoice issued',
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'invoices',
        sourceId: invoiceId,
        sourceDocumentNumber: entryNumber,
        postedAt: new Date(),
        postedBy: 'system',
        createdBy: 'system',
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: accountsReceivable.id,
        debit: String(amount),
        credit: null,
        description: `AR – ${description}`,
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: salesRevenue.id,
        debit: null,
        credit: String(amount),
        description: `Revenue recognised – ${description}`,
      });
    });

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post invoice issue journal entry:', err);
    return { error: 'Journal auto-post failed. Please post manually in Accounting → Journals.' };
  }
}

// ── Invoice Write-off: Dr Bad Debt / Cr AR ─────────────────────────────────

export async function postInvoiceWriteOffJournalEntry(data: {
  invoiceId: string;
  amount: number;
  date: string;
  description: string;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { invoiceId, amount, date, description } = data;
    if (amount <= 0) return { error: 'Write-off amount must be positive.' };

    const period = date.slice(0, 7);
    await ensureOpenPeriod(period);

    const db = getDb();

    // Ensure 5150 exists
    const [existingBadDebt] = await db.select().from(chartAccounts).where(eq(chartAccounts.code, BAD_DEBT_EXPENSE_CODE)).limit(1);
    if (!existingBadDebt) {
       await db.insert(chartAccounts).values({
         code: BAD_DEBT_EXPENSE_CODE,
         name: 'Bad Debt Expense',
         type: 'expense',
         isActive: true,
         isPostingAccount: true,
       });
    }

    const accountMap = await getAccountsByCode([ACCOUNTS_RECEIVABLE_CODE, BAD_DEBT_EXPENSE_CODE]);
    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);
    const badDebtExpense = accountMap.get(BAD_DEBT_EXPENSE_CODE);

    if (!accountsReceivable || !badDebtExpense) {
      return { error: 'Required chart accounts not found.' };
    }

    const entryId = randomUUID();

    await db.transaction(async (tx) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        description: description || 'Invoice write-off',
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'invoices',
        sourceId: invoiceId,
        sourceDocumentNumber: entryNumber,
        postedAt: new Date(),
        postedBy: 'system',
        createdBy: 'system',
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: badDebtExpense.id,
        debit: String(amount),
        credit: null,
        description: `Bad Debt – ${description}`,
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: accountsReceivable.id,
        debit: null,
        credit: String(amount),
        description: `AR write-off – ${description}`,
      });
    });

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post write-off entry:', err);
    return { error: 'Journal auto-post failed.' };
  }
}

// ── Bad Debt Recovery: Dr AR / Cr Bad Debt ─────────────────────────────────

export async function postBadDebtRecoveryJournalEntry(data: {
  incomeId: string;
  invoiceId: string;
  amount: number;
  date: string;
  description: string;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { incomeId, invoiceId, amount, date, description } = data;
    if (amount <= 0) return { error: 'Recovery amount must be positive.' };

    const period = date.slice(0, 7);
    await ensureOpenPeriod(period);

    const db = getDb();
    const accountMap = await getAccountsByCode([ACCOUNTS_RECEIVABLE_CODE, BAD_DEBT_EXPENSE_CODE]);
    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);
    const badDebtExpense = accountMap.get(BAD_DEBT_EXPENSE_CODE);

    if (!accountsReceivable || !badDebtExpense) {
      return { error: 'Required chart accounts not found.' };
    }

    const entryId = randomUUID();

    await db.transaction(async (tx) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        description: description || 'Bad Debt Recovery',
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'income',
        sourceId: incomeId,
        sourceDocumentNumber: entryNumber,
        postedAt: new Date(),
        postedBy: 'system',
        createdBy: 'system',
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: accountsReceivable.id,
        debit: String(amount),
        credit: null,
        description: `AR Recovery – ${description}`,
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: badDebtExpense.id,
        debit: null,
        credit: String(amount),
        description: `Bad Debt Recovery – ${description}`,
      });
    });

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post recovery entry:', err);
    return { error: 'Journal auto-post failed.' };
  }
}

// ── Invoice Void: void the AR journal entry ────────────────────────────────

/**
 * Voids all system-generated journal entries linked to a specific invoice.
 * Uses db.batch() for atomicity.
 */
export async function voidInvoiceJournalEntries(
  invoiceId: string
): Promise<{ error?: string; voidedCount?: number }> {
  try {
    const db = getDb();
    let voidedCount = 0;

    // 1. Find AR entries linked to the invoice
    const invoiceEntries = await db
      .select({ id: journalEntries.id, status: journalEntries.status })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceModule, 'billing'),
          eq(journalEntries.sourceTable, 'invoices'),
          eq(journalEntries.sourceId, invoiceId)
        )
      );

    const toVoid = invoiceEntries.filter((e) => e.status !== 'void');

    // 2. Find payment entries linked to this invoice via payment_allocations
    const linkedIncome = await db
      .selectDistinct({ incomeId: paymentAllocations.incomeId })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.invoiceId, invoiceId));

    // Collect all payment entries to void
    const paymentEntriesToVoid: string[] = [];
    for (const row of linkedIncome) {
      if (!row.incomeId) continue;
      const pe = await db
        .select({ id: journalEntries.id, status: journalEntries.status })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.sourceModule, 'billing'),
            eq(journalEntries.sourceTable, 'income'),
            eq(journalEntries.sourceId, row.incomeId)
          )
        );
      for (const entry of pe) {
        if (entry.status !== 'void') paymentEntriesToVoid.push(entry.id);
      }
    }

    // 3. Batch-void all entries atomically in a transaction
    const allToVoid = [...toVoid.map((e) => e.id), ...paymentEntriesToVoid];

    if (allToVoid.length > 0) {
      const now = new Date();
      await db.transaction(async (tx) => {
        for (const entryId of allToVoid) {
          await tx
            .update(journalEntries)
            .set({
              status: 'void',
              voidedAt: now,
              voidedBy: 'system',
              voidReason: 'Invoice voided',
              updatedAt: now,
            })
            .where(eq(journalEntries.id, entryId));
        }
      });
      voidedCount = allToVoid.length;
    }

    return { voidedCount };
  } catch (err) {
    console.error('Failed to void invoice journal entries:', err);
    return { error: 'Failed to void journal entries. Please void manually in Accounting → Journals.' };
  }
}

// ── Invoice Amount Edit: void + repost AR entry ────────────────────────

/**
 * Voids ONLY the AR journal entry for an invoice (not payment entries) and
 * re-creates it with the new amount. Called when an issued/overdue invoice's
 * total is changed. We must not void payment entries — those are independent.
 */
export async function updateInvoiceJournalEntry(data: {
  invoiceId: string;
  newAmount: number;
  date: string;
  description: string;
}): Promise<{ error?: string }> {
  try {
    const db = getDb();

    // Find only the AR entry (sourceTable = 'invoices'), NOT payment entries
    const invoiceEntries = await db
      .select({ id: journalEntries.id, status: journalEntries.status })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceModule, 'billing'),
          eq(journalEntries.sourceTable, 'invoices'),
          eq(journalEntries.sourceId, data.invoiceId)
        )
      );

    const toVoid = invoiceEntries.filter((e) => e.status !== 'void');

    if (toVoid.length > 0) {
      const now = new Date();
      await db.transaction(async (tx) => {
        for (const entry of toVoid) {
          await tx
            .update(journalEntries)
            .set({
              status: 'void',
              voidedAt: now,
              voidedBy: 'system',
              voidReason: 'Invoice amount edited',
              updatedAt: now,
            })
            .where(eq(journalEntries.id, entry.id));
        }
      });
    }

    // Post new AR entry with the updated amount
    const result = await postInvoiceIssueJournalEntry({
      invoiceId: data.invoiceId,
      amount: data.newAmount,
      date: data.date,
      description: data.description,
    });

    return { error: result.error };
  } catch (err) {
    console.error('Failed to update invoice journal entry:', err);
    return { error: 'Journal update failed. Please adjust manually in Accounting → Journals.' };
  }
}

// ── Expense: Dr Expense Account / Cr Bank ───────────────────────────────────

/**
 * Creates and auto-posts a journal entry when an expense is recorded.
 * Uses db.batch() for atomicity.
 *
 *   Dr <Expense Category Account>  = expense amount
 *   Cr Business Cheque Account (1010) = expense amount
 */
export async function postExpenseJournalEntry(data: {
  expenseId: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { expenseId, amount, date, category, description } = data;

    if (amount <= 0) return { error: 'Expense amount must be positive.' };

    const period = date.slice(0, 7);
    await ensureOpenPeriod(period);

    const expenseCode = findExpenseAccountCode(category);
    const accountMap = await getAccountsByCode([
      BANK_ACCOUNT_CODE,
      expenseCode,
    ]);

    const bankAccount = accountMap.get(BANK_ACCOUNT_CODE);
    const expenseAccount = accountMap.get(expenseCode);

    if (!bankAccount || !expenseAccount) {
      return { error: `Required chart accounts not found (1010, ${expenseCode}). Please run the accounting seed first.` };
    }

    const db = getDb();
    const entryId = randomUUID();
    const desc = description || category;

    // Atomic transaction: entry + 2 lines
    await db.transaction(async (tx) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        description: desc,
        status: 'posted',
        sourceModule: 'expense',
        sourceTable: 'expenses',
        sourceId: expenseId,
        sourceDocumentNumber: entryNumber,
        postedAt: new Date(),
        postedBy: 'system',
        createdBy: 'system',
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: expenseAccount.id,
        debit: String(amount),
        credit: null,
        description: desc,
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: bankAccount.id,
        debit: null,
        credit: String(amount),
        description: desc,
      });
    });

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post expense journal entry:', err);
    return { error: 'Journal auto-post failed. Please post manually in Accounting → Journals.' };
  }
}

// ── Void Expense Journal Entry ─────────────────────────────────────────────

/**
 * Voids all system-generated journal entries linked to a specific expense.
 * Uses db.batch() for atomicity.
 */
export async function voidExpenseJournalEntries(
  expenseId: string
): Promise<{ error?: string; voidedCount?: number }> {
  try {
    const db = getDb();

    const entries = await db
      .select({ id: journalEntries.id, status: journalEntries.status })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceModule, 'expense'),
          eq(journalEntries.sourceTable, 'expenses'),
          eq(journalEntries.sourceId, expenseId)
        )
      );

    const toVoid = entries.filter((e) => e.status !== 'void');

    if (toVoid.length === 0) return { voidedCount: 0 };

    const now = new Date();
    await db.transaction(async (tx) => {
      for (const entry of toVoid) {
        await tx
          .update(journalEntries)
          .set({
            status: 'void',
            voidedAt: now,
            voidedBy: 'system',
            voidReason: 'Expense record deleted',
            updatedAt: now,
          })
          .where(eq(journalEntries.id, entry.id));
      }
    });

    return { voidedCount: toVoid.length };
  } catch (err) {
    console.error('Failed to void expense journal entries:', err);
    return { error: 'Failed to void journal entries. Please void manually in Accounting → Journals.' };
  }
}

// ── Update Expense Journal Entry ──────────────────────────────────────────

/**
 * Voids existing journal entry for an expense and re-creates it with the
 * new amount/category. Called when an expense is edited.
 */
export async function updateExpenseJournalEntry(data: {
  expenseId: string;
  newAmount: number;
  date: string;
  category: string;
  description?: string;
}): Promise<{ error?: string }> {
  await voidExpenseJournalEntries(data.expenseId);

  const result = await postExpenseJournalEntry({
    expenseId: data.expenseId,
    amount: data.newAmount,
    date: data.date,
    category: data.category,
    description: data.description,
  });

  return { error: result.error };
}
