/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';

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
  distributionSettings,
  and,
  eq,
  inArray,
  sql,
  divisions,
  deriveDivisionPrefix,
  ACCOUNT_RATES,
  getNextJournalEntryNumber,
  ensureOpenPeriod,
  reopenPeriod,
  getTrialBalance,
  upsertBankReconciliation,
  type BankAccountCode,
  type ChartAccount,
} from '@pmg/db';

// ── Account Code Constants ───────────────────────────────────────────────────
const BANK_ACCOUNT_CODE = '1010'; // Business Cheque Account
const SAVINGS_ACCOUNT_CODE = '1020'; // Savings Account (PMG Share destination)
const ACCOUNTS_RECEIVABLE_CODE = '1100'; // Accounts Receivable
const VAT_OUTPUT_CODE = '2150'; // VAT Output Control (Liability)
const SALES_REVENUE_CODE = '4010'; // Sales Revenue
const MISC_EXPENSE_CODE = '5140'; // Miscellaneous Expense (fallback)
const BAD_DEBT_EXPENSE_CODE = '5150'; // Bad Debt Expense
const SMALL_EQUIPMENT_EXPENSE_CODE = '5030'; // Office & Small Equipment (< R7,000 SARS write-off)
const FIXED_ASSETS_PPE_CODE = '1500'; // Property, Plant & Equipment (>= R7,000 capitalized)

export const SARS_SMALL_ASSET_THRESHOLD = 7000;

export function resolveAssetPurchaseAccountCode(cost: number): '5030' | '1500' {
  return cost < SARS_SMALL_ASSET_THRESHOLD ? SMALL_EQUIPMENT_EXPENSE_CODE : FIXED_ASSETS_PPE_CODE;
}

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
  {
    keywords: ['staff', 'salary', 'wage', 'employee', 'director', 'remuneration', 'bonus'],
    code: '5120',
  },
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
async function getAccountsByCode(codes: string[], tx?: any) {
  const db = tx || getDb();
  const accounts = await db.select().from(chartAccounts).where(inArray(chartAccounts.code, codes));

  const map = new Map<string, ChartAccount>(accounts.map((a: any) => [a.code, a]));
  return map;
}

/**
 * Helper to append division prefix/name suffix to journal entry descriptions.
 */
async function formatDivisionDescription(
  db: any,
  divisionId: string,
  baseDesc: string,
): Promise<string> {
  try {
    const [div] = await db
      .select({ name: divisions.name })
      .from(divisions)
      .where(eq(divisions.id, divisionId));
    if (!div?.name) return baseDesc;
    const prefix = deriveDivisionPrefix(div.name);
    if (baseDesc.endsWith(` - ${prefix}`) || baseDesc.endsWith(` - ${div.name}`)) {
      return baseDesc;
    }
    return `${baseDesc} - ${prefix}`;
  } catch {
    return baseDesc;
  }
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
  pmgShareAmount?: number;
  date: string;
  description: string;
  sourceDocumentNumber?: string;
  divisionId: string;
  tx?: any;
}): Promise<{ error?: string; entryIds?: string[] }> {
  try {
    const { incomeId, amount, date, description, divisionId } = data;

    if (amount <= 0) return { error: 'Payment amount must be positive.' };

    const period = date.slice(0, 7);
    const p = await ensureOpenPeriod(period, data.tx);
    if (p.status !== 'open') return { error: `Accounting period ${period} is closed.` };

    const db = data.tx || getDb();

    const accountMap = await getAccountsByCode(
      [BANK_ACCOUNT_CODE, SAVINGS_ACCOUNT_CODE, ACCOUNTS_RECEIVABLE_CODE],
      db,
    );

    const bankAccount = accountMap.get(BANK_ACCOUNT_CODE);
    const savingsAccount = accountMap.get(SAVINGS_ACCOUNT_CODE);
    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);

    if (!bankAccount || !savingsAccount || !accountsReceivable) {
      return {
        error:
          'Required chart accounts not found (1010, 1020, 1100). Please run the accounting seed first.',
      };
    }

    const entryIds: string[] = [];
    const now = new Date();

    // ── Pre-generate all IDs ───────────────────────────────────────────────
    const entry1Id = randomUUID();
    const entry1Line1Id = randomUUID();
    const entry1Line2Id = randomUUID();

    // ── Execute all inserts atomically in a transaction ────────────────────
    const pmgShareAmount =
      data.pmgShareAmount !== undefined
        ? Math.round(data.pmgShareAmount * 100) / 100
        : Math.round(amount * ACCOUNT_RATES.pmg_share * 100) / 100;

    const runInsideTx = async (tx: any) => {
      const entryNumber1 = await getNextJournalEntryNumber(tx, date);
      const formattedDesc = await formatDivisionDescription(
        tx,
        divisionId,
        description || 'Payment received',
      );
      entryIds.push(entry1Id);
      // Entry 1: Dr Bank / Cr AR
      await tx.insert(journalEntries).values({
        id: entry1Id,
        entryNumber: entryNumber1,
        entryDate: date,
        period,
        divisionId,
        description: formattedDesc,
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'income',
        sourceId: incomeId,
        sourceDocumentNumber: data.sourceDocumentNumber || entryNumber1,
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

      // Entry 2: Dr Savings Account (1020) / Cr Business Cheque Account (1010)
      // Pure bank-to-bank cash transfer — total liquid cash (1010 + 1020) remains unchanged.
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
          divisionId,
          description: `PMG Share allocation (25%)`,
          status: 'posted',
          sourceModule: 'billing',
          sourceTable: 'income',
          sourceId: incomeId,
          sourceDocumentNumber: data.sourceDocumentNumber || entryNumber2,
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
          description: `PMG Share transfer from Cheque (25% of R${amount.toFixed(2)})`,
        });
      }
    };

    if (data.tx) {
      await runInsideTx(data.tx);
    } else {
      await db.transaction(runInsideTx);
    }

    return { entryIds };
  } catch (err) {
    console.error('Failed to auto-post payment journal entries:', err);
    return {
      error: `Journal auto-post failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Void Journal Entries for a Deleted Payment ─────────────────────────────

/**
 * Voids all system-generated journal entries linked to a specific income record.
 * Uses db.batch() to void all entries in a single round trip.
 */
export async function voidPaymentJournalEntries(
  incomeId: string,
  externalTx?: any,
): Promise<{ error?: string; voidedCount?: number }> {
  try {
    const db = externalTx || getDb();

    const entries = await db
      .select({ id: journalEntries.id, status: journalEntries.status })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceModule, 'billing'),
          eq(journalEntries.sourceTable, 'income'),
          eq(journalEntries.sourceId, incomeId),
        ),
      );

    const toVoid = entries.filter((e: any) => e.status !== 'void');

    if (toVoid.length === 0) return { voidedCount: 0 };

    // Batch all void updates atomically in a transaction
    const now = new Date();
    const runInsideTx = async (tx: any) => {
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
    };

    if (externalTx) {
      await runInsideTx(externalTx);
    } else {
      await db.transaction(runInsideTx);
    }

    return { voidedCount: toVoid.length };
  } catch (err) {
    console.error('Failed to void payment journal entries:', err);
    return {
      error: 'Failed to void journal entries. Please void manually in Accounting → Journals.',
    };
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
  divisionId: string;
}): Promise<{ error?: string }> {
  try {
    await getDb().transaction(async (tx) => {
      await voidPaymentJournalEntries(data.incomeId, tx);

      const result = await postPaymentJournalEntries({
        incomeId: data.incomeId,
        amount: data.newAmount,
        date: data.date,
        description: data.description,
        divisionId: data.divisionId,
        tx,
      });

      // Throw (not return) on failure — a plain return from inside a Drizzle
      // transaction callback still commits, which previously left the void
      // permanent even when the repost failed, leaving the payment with zero
      // journal entries.
      if (result.error) {
        throw new Error(result.error);
      }
    });

    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to update payment journal entries.',
    };
  }
}

// ── Invoice Issue: Dr AR / Cr Revenue (+ Cr VAT Output if enabled) ─────────

/**
 * Creates and auto-posts a journal entry when an invoice is issued.
 * Uses db.batch() for atomicity.
 *
 * If VAT is enabled:
 *   Dr Accounts Receivable (1100)  = invoice total
 *   Cr Sales Revenue (4010)        = subtotal (excl VAT)
 *   Cr VAT Output Control (2150)   = vat amount
 *
 * If VAT is disabled:
 *   Dr Accounts Receivable (1100)  = invoice total
 *   Cr Sales Revenue (4010)        = invoice total
 */
export async function postInvoiceIssueJournalEntry(data: {
  invoiceId: string;
  amount: number;
  subtotal?: number;
  vatAmount?: number;
  vatEnabled?: boolean;
  date: string;
  description?: string;
  sourceDocumentNumber?: string;
  divisionId: string;
  tx?: any;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { invoiceId, amount, subtotal, vatAmount, vatEnabled, date, description, divisionId } =
      data;

    if (amount <= 0) return { error: 'Invoice amount must be positive.' };

    const period = date.slice(0, 7);
    let p = await ensureOpenPeriod(period, data.tx);
    if (p.status === 'locked')
      return { error: `Accounting period ${period} is permanently locked.` };
    if (p.status === 'closed') {
      await reopenPeriod(period, data.tx);
      p = await ensureOpenPeriod(period, data.tx);
    }

    const db = data.tx || getDb();
    const isVatActive = Boolean(vatEnabled && vatAmount && vatAmount > 0);

    const requiredCodes = isVatActive
      ? [ACCOUNTS_RECEIVABLE_CODE, SALES_REVENUE_CODE, VAT_OUTPUT_CODE]
      : [ACCOUNTS_RECEIVABLE_CODE, SALES_REVENUE_CODE];

    const accountMap = await getAccountsByCode(requiredCodes, db);

    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);
    const salesRevenue = accountMap.get(SALES_REVENUE_CODE);
    const vatOutput = isVatActive ? accountMap.get(VAT_OUTPUT_CODE) : null;

    if (!accountsReceivable || !salesRevenue || (isVatActive && !vatOutput)) {
      return {
        error:
          'Required chart accounts not found (1100, 4010, 2150). Please run the accounting seed first.',
      };
    }

    const entryId = randomUUID();

    // Atomic transaction: entry + lines
    const runInsideTx = async (tx: any) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      const formattedDesc = await formatDivisionDescription(
        tx,
        divisionId,
        description || 'Invoice issued',
      );
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        divisionId,
        description: formattedDesc,
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'invoices',
        sourceId: invoiceId,
        sourceDocumentNumber: data.sourceDocumentNumber || entryNumber,
        postedAt: new Date(),
        postedBy: 'system',
        createdBy: 'system',
      });

      // Dr Accounts Receivable (Total)
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: accountsReceivable.id,
        debit: String(amount.toFixed(2)),
        credit: null,
        description: `AR – ${description || 'Invoice issued'}`,
      });

      if (isVatActive && vatOutput) {
        const netRevenue = subtotal != null ? subtotal : amount - (vatAmount || 0);
        // Cr Sales Revenue (Net Excl. VAT)
        await tx.insert(journalLines).values({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: salesRevenue.id,
          debit: null,
          credit: String(netRevenue.toFixed(2)),
          description: `Revenue recognised (excl. VAT) – ${description || 'Invoice issued'}`,
        });

        // Cr VAT Output Control (Liability)
        await tx.insert(journalLines).values({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: vatOutput.id,
          debit: null,
          credit: String(vatAmount!.toFixed(2)),
          description: `VAT Output liability (15%) – ${description || 'Invoice issued'}`,
        });
      } else {
        // Cr Sales Revenue (Full total)
        await tx.insert(journalLines).values({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: salesRevenue.id,
          debit: null,
          credit: String(amount.toFixed(2)),
          description: `Revenue recognised – ${description || 'Invoice issued'}`,
        });
      }
    };

    if (data.tx) {
      await runInsideTx(data.tx);
    } else {
      await db.transaction(runInsideTx);
    }

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post invoice issue journal entry:', err);
    return {
      error: `Journal auto-post failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Invoice Write-off: Dr Bad Debt / Cr AR ─────────────────────────────────

export async function postInvoiceWriteOffJournalEntry(data: {
  invoiceId: string;
  amount: number;
  date: string;
  description: string;
  sourceDocumentNumber?: string;
  divisionId: string;
  tx?: any;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { invoiceId, amount, date, description, divisionId } = data;
    if (amount <= 0) return { error: 'Write-off amount must be positive.' };

    const period = date.slice(0, 7);
    const p = await ensureOpenPeriod(period, data.tx);
    if (p.status !== 'open') return { error: `Accounting period ${period} is closed.` };

    const db = data.tx || getDb();

    await db
      .insert(chartAccounts)
      .values({
        code: BAD_DEBT_EXPENSE_CODE,
        name: 'Bad Debt Expense',
        type: 'expense',
        isActive: true,
        isPostingAccount: true,
      })
      .onConflictDoNothing({ target: chartAccounts.code });

    const accountMap = await getAccountsByCode(
      [ACCOUNTS_RECEIVABLE_CODE, BAD_DEBT_EXPENSE_CODE],
      db,
    );
    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);
    const badDebtExpense = accountMap.get(BAD_DEBT_EXPENSE_CODE);

    if (!accountsReceivable || !badDebtExpense) {
      return { error: 'Required chart accounts not found.' };
    }

    const entryId = randomUUID();

    const runInsideTx = async (tx: any) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      const formattedDesc = await formatDivisionDescription(
        tx,
        divisionId,
        description || 'Invoice write-off',
      );
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        divisionId,
        description: formattedDesc,
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'invoices',
        sourceId: invoiceId,
        sourceDocumentNumber: data.sourceDocumentNumber || entryNumber,
        postedAt: new Date(),
        postedBy: 'system',
        createdBy: 'system',
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: badDebtExpense.id,
        debit: String(amount.toFixed(2)),
        credit: null,
        description: `Bad Debt – ${description}`,
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: accountsReceivable.id,
        debit: null,
        credit: String(amount.toFixed(2)),
        description: `AR write-off – ${description}`,
      });
    };

    if (data.tx) {
      await runInsideTx(data.tx);
    } else {
      await db.transaction(runInsideTx);
    }

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post write-off entry:', err);
    return {
      error: `Journal auto-post failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Bad Debt Recovery: Dr AR / Cr Bad Debt ─────────────────────────────────

export async function postBadDebtRecoveryJournalEntry(data: {
  incomeId: string;
  invoiceId: string;
  amount: number;
  date: string;
  description: string;
  sourceDocumentNumber?: string;
  divisionId: string;
  tx?: any;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { incomeId, amount, date, description, divisionId } = data;
    if (amount <= 0) return { error: 'Recovery amount must be positive.' };

    const period = date.slice(0, 7);
    const p = await ensureOpenPeriod(period, data.tx);
    if (p.status !== 'open') return { error: `Accounting period ${period} is closed.` };

    const db = data.tx || getDb();
    const accountMap = await getAccountsByCode(
      [ACCOUNTS_RECEIVABLE_CODE, BAD_DEBT_EXPENSE_CODE],
      db,
    );
    const accountsReceivable = accountMap.get(ACCOUNTS_RECEIVABLE_CODE);
    const badDebtExpense = accountMap.get(BAD_DEBT_EXPENSE_CODE);

    if (!accountsReceivable || !badDebtExpense) {
      return { error: 'Required chart accounts not found.' };
    }

    const entryId = randomUUID();

    const runInsideTx = async (tx: any) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        divisionId,
        description: description || 'Bad Debt Recovery',
        status: 'posted',
        sourceModule: 'billing',
        sourceTable: 'income',
        sourceId: incomeId,
        sourceDocumentNumber: data.sourceDocumentNumber || entryNumber,
        postedAt: new Date(),
        postedBy: 'system',
        createdBy: 'system',
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: accountsReceivable.id,
        debit: String(amount.toFixed(2)),
        credit: null,
        description: `AR Recovery – ${description}`,
      });
      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: badDebtExpense.id,
        debit: null,
        credit: String(amount.toFixed(2)),
        description: `Bad Debt Recovery – ${description}`,
      });
    };

    if (data.tx) {
      await runInsideTx(data.tx);
    } else {
      await db.transaction(runInsideTx);
    }

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post recovery entry:', err);
    return {
      error: `Journal auto-post failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Invoice Void: void the AR journal entry ────────────────────────────────

/**
 * Voids all system-generated journal entries linked to a specific invoice.
 * Uses db.batch() for atomicity.
 */
export async function voidInvoiceJournalEntries(
  invoiceId: string,
  tx?: any,
): Promise<{ error?: string; voidedCount?: number }> {
  try {
    const db = tx || getDb();

    // 1. Find AR entries linked to the invoice
    const invoiceEntries: { id: string; status: string }[] = await db
      .select({ id: journalEntries.id, status: journalEntries.status })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceModule, 'billing'),
          eq(journalEntries.sourceTable, 'invoices'),
          eq(journalEntries.sourceId, invoiceId),
        ),
      );

    const toVoid = invoiceEntries.filter((e) => e.status !== 'void');

    // 2. Defensive check: callers (voidInvoice/bulkVoidInvoices) only ever
    // reach this function for draft/issued/overdue invoices, which can never
    // have a real cash-receipt allocation (any positive allocation flips
    // status to partially_paid/paid before it could get here). If we ever
    // find one anyway, refuse to void anything automatically rather than
    // silently erasing a real cash-receipt journal entry — this indicates a
    // bug elsewhere (e.g. a caller bypassing the status guard) and needs
    // investigation, not a silent sweep.
    const linkedIncome = await db
      .selectDistinct({ incomeId: paymentAllocations.incomeId })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.invoiceId, invoiceId));

    if (linkedIncome.length > 0) {
      console.error(
        `voidInvoiceJournalEntries: invoice ${invoiceId} has ${linkedIncome.length} linked payment_allocations row(s) — refusing to void automatically to avoid erasing real cash-receipt journal entries.`,
      );
      return {
        error:
          'This invoice has linked payments and cannot be voided automatically. Reverse the payment(s) first, then investigate before voiding.',
      };
    }

    // 3. Void the invoice's own AR/Revenue entries.
    if (toVoid.length > 0) {
      const now = new Date();
      const voidRows = async (t: any) => {
        for (const entry of toVoid) {
          await t
            .update(journalEntries)
            .set({
              status: 'void',
              voidedAt: now,
              voidedBy: 'system',
              voidReason: 'Invoice voided',
              updatedAt: now,
            })
            .where(eq(journalEntries.id, entry.id));
        }
      };
      if (tx) {
        await voidRows(tx);
      } else {
        await db.transaction(voidRows);
      }
    }

    return { voidedCount: toVoid.length };
  } catch (err) {
    console.error('Failed to void invoice journal entries:', err);
    return {
      error: 'Failed to void journal entries. Please void manually in Accounting → Journals.',
    };
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
  subtotal?: number;
  vatAmount?: number;
  vatEnabled?: boolean;
  date: string;
  description: string;
  divisionId: string;
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
          eq(journalEntries.sourceId, data.invoiceId),
        ),
      );

    const toVoid = invoiceEntries.filter((e) => e.status !== 'void');

    // Void the old entry and post the new one in a single transaction so a
    // failed repost (e.g. the new date falls in a closed period) rolls back
    // the void too, instead of leaving the invoice with no journal entry at all.
    await db.transaction(async (tx) => {
      if (toVoid.length > 0) {
        const now = new Date();
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
      }

      const result = await postInvoiceIssueJournalEntry({
        invoiceId: data.invoiceId,
        amount: data.newAmount,
        subtotal: data.subtotal,
        vatAmount: data.vatAmount,
        vatEnabled: data.vatEnabled,
        date: data.date,
        description: data.description,
        divisionId: data.divisionId,
        tx,
      });

      if (result.error) {
        throw new Error(result.error);
      }
    });

    return {};
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
  sourceDocumentNumber?: string;
  divisionId: string;
  tx?: any;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const { expenseId, amount, date, category, description, divisionId } = data;

    if (amount <= 0) return { error: 'Expense amount must be positive.' };

    const period = date.slice(0, 7);
    const p = await ensureOpenPeriod(period, data.tx);
    if (p.status !== 'open') return { error: `Accounting period ${period} is closed.` };

    const db = data.tx || getDb();
    const expenseCode = findExpenseAccountCode(category);
    const accountMap = await getAccountsByCode([BANK_ACCOUNT_CODE, expenseCode], db);

    const bankAccount = accountMap.get(BANK_ACCOUNT_CODE);
    const expenseAccount = accountMap.get(expenseCode);

    if (!bankAccount || !expenseAccount) {
      return {
        error: `Required chart accounts not found (1010, ${expenseCode}). Please run the accounting seed first.`,
      };
    }

    const entryId = randomUUID();
    const desc = description || category;

    const runInsideTx = async (tx: any) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        divisionId,
        description: desc,
        status: 'posted',
        sourceModule: 'expense',
        sourceTable: 'expenses',
        sourceId: expenseId,
        sourceDocumentNumber: data.sourceDocumentNumber || entryNumber,
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
    };

    if (data.tx) {
      await runInsideTx(data.tx);
    } else {
      await db.transaction(runInsideTx);
    }

    return { entryId };
  } catch (err) {
    console.error('Failed to auto-post expense journal entry:', err);
    return {
      error: `Journal auto-post failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Void Expense Journal Entry ─────────────────────────────────────────────

/**
 * Voids all system-generated journal entries linked to a specific expense.
 * Uses db.batch() for atomicity.
 */
export async function voidExpenseJournalEntries(
  expenseId: string,
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
          eq(journalEntries.sourceId, expenseId),
        ),
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
    return {
      error: 'Failed to void journal entries. Please void manually in Accounting → Journals.',
    };
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
  divisionId: string;
}): Promise<{ error?: string }> {
  await voidExpenseJournalEntries(data.expenseId);

  const result = await postExpenseJournalEntry({
    expenseId: data.expenseId,
    amount: data.newAmount,
    date: data.date,
    category: data.category,
    description: data.description,
    divisionId: data.divisionId,
  });

  return { error: result.error };
}

// ── Void Write-Off Journal Entries ──────────────────────────────────────────

/**
 * Voids write-off / bad debt journal entries linked to an invoice.
 * Called when a write-off is removed/restored.
 */
export async function voidInvoiceWriteOffJournalEntries(
  invoiceId: string,
  externalTx?: any,
): Promise<{ error?: string; voidedCount?: number }> {
  try {
    const db = externalTx || getDb();

    const entries = await db
      .select({
        id: journalEntries.id,
        status: journalEntries.status,
        description: journalEntries.description,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceModule, 'billing'),
          eq(journalEntries.sourceTable, 'invoices'),
          eq(journalEntries.sourceId, invoiceId),
        ),
      );

    const writeOffEntries = entries.filter(
      (e: any) =>
        e.status !== 'void' &&
        (e.description?.toLowerCase().includes('write-off') ||
          e.description?.toLowerCase().includes('bad debt')),
    );

    if (writeOffEntries.length === 0) return { voidedCount: 0 };

    const now = new Date();
    const runInsideTx = async (tx: any) => {
      for (const entry of writeOffEntries) {
        await tx
          .update(journalEntries)
          .set({
            status: 'void',
            voidedAt: now,
            voidedBy: 'system',
            voidReason: 'Write-off removed',
            updatedAt: now,
          })
          .where(eq(journalEntries.id, entry.id));
      }
    };

    if (externalTx) {
      await runInsideTx(externalTx);
    } else {
      await db.transaction(runInsideTx);
    }

    return { voidedCount: writeOffEntries.length };
  } catch (err) {
    console.error('Failed to void write-off journal entries:', err);
    return { error: 'Failed to void write-off journal entries.' };
  }
}

// ── Post Journal Entry for Fixed Asset Purchase (SARS R7,000 Rule) ──────────

/**
 * Posts a balanced double-entry journal entry when a fixed asset is purchased:
 *   - cost < R7,000 (SARS small-asset write-off):
 *       Dr 5030 Office & Small Equipment / Cr 1010 Business Cheque Account
 *   - cost >= R7,000 (capitalized PPE):
 *       Dr 1500 Property, Plant & Equipment / Cr 1010 Business Cheque Account
 */
export async function postAssetPurchaseJournalEntry(data: {
  assetId: string;
  name: string;
  cost: number;
  date: string;
  divisionId?: string;
}): Promise<{ error?: string; entryId?: string; accountCode?: string }> {
  try {
    const { assetId, name, cost, date } = data;
    if (cost <= 0) return {};

    const period = date.slice(0, 7);
    const p = await ensureOpenPeriod(period);
    if (p.status !== 'open') {
      return { error: `Accounting period ${period} is closed.` };
    }

    const db = getDb();
    const debitCode = resolveAssetPurchaseAccountCode(cost);

    // Ensure 1500 PPE and 5030 Small Equipment exist before lookup
    await db
      .insert(chartAccounts)
      .values([
        {
          code: FIXED_ASSETS_PPE_CODE,
          name: 'Property, Plant & Equipment',
          type: 'asset',
          description: 'Capitalized fixed assets costing R7,000 or more',
          isActive: true,
          isPostingAccount: true,
        },
        {
          code: SMALL_EQUIPMENT_EXPENSE_CODE,
          name: 'Office & Small Equipment',
          type: 'expense',
          description: 'Office supplies and small assets under R7,000 (SARS immediate write-off)',
          isActive: true,
          isPostingAccount: true,
        },
      ])
      .onConflictDoNothing({ target: chartAccounts.code });

    const accountMap = await getAccountsByCode([BANK_ACCOUNT_CODE, debitCode], db);
    const bankAccount = accountMap.get(BANK_ACCOUNT_CODE);
    const debitAccount = accountMap.get(debitCode);

    if (!bankAccount || !debitAccount) {
      return {
        error: `Required chart accounts not found (${BANK_ACCOUNT_CODE}, ${debitCode}).`,
      };
    }

    // Resolve corporate division (prefer Playhouse Media Group, fallback to first active division)
    let resolvedDivisionId = data.divisionId;
    if (!resolvedDivisionId) {
      const allDivs = await db.select({ id: divisions.id, name: divisions.name }).from(divisions);
      const pmgDiv = allDivs.find((d) => d.name.toLowerCase().includes('playhouse'));
      resolvedDivisionId = pmgDiv?.id ?? allDivs[0]?.id;
    }
    if (!resolvedDivisionId) {
      return { error: 'No division found to post asset purchase journal entry.' };
    }

    const entryId = randomUUID();
    const now = new Date();
    const isSmallAsset = cost < SARS_SMALL_ASSET_THRESHOLD;

    await db.transaction(async (tx) => {
      const entryNumber = await getNextJournalEntryNumber(tx, date);
      const desc = isSmallAsset
        ? `Small asset write-off (<R7k): ${name}`
        : `Fixed asset purchase (PPE): ${name}`;

      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: date,
        period,
        divisionId: resolvedDivisionId!,
        description: desc,
        status: 'posted',
        sourceModule: 'assets',
        sourceTable: 'assets',
        sourceId: assetId,
        sourceDocumentNumber: entryNumber,
        postedAt: now,
        postedBy: 'system',
        createdBy: 'system',
      });

      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: debitAccount.id,
        debit: String(cost.toFixed(2)),
        credit: null,
        description: isSmallAsset ? `Small asset (<R7k) — ${name}` : `Capitalized PPE — ${name}`,
      });

      await tx.insert(journalLines).values({
        id: randomUUID(),
        journalEntryId: entryId,
        accountId: bankAccount.id,
        debit: null,
        credit: String(cost.toFixed(2)),
        description: `Asset purchase paid from Cheque — ${name}`,
      });
    });

    return { entryId, accountCode: debitCode };
  } catch (err) {
    console.error('Failed to auto-post asset purchase journal entry:', err);
    return {
      error: `Asset journal auto-post failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Banking, Reconciliation & Owner Withdrawal Journal Helpers ───────────────

async function resolveCorporateDivisionId(db: ReturnType<typeof getDb>, divisionId?: string) {
  if (divisionId) return divisionId;
  const allDivs = await db.select({ id: divisions.id, name: divisions.name }).from(divisions);
  const pmgDiv = allDivs.find((d) => d.name.toLowerCase().includes('playhouse'));
  return pmgDiv?.id ?? allDivs[0]?.id;
}

async function postSimpleTwoLineJournal(data: {
  date: string;
  debitCode: string;
  creditCode: string;
  amount: number;
  description: string;
  debitLineDescription: string;
  creditLineDescription: string;
  sourceModule: string;
  createdBy?: string;
  divisionId?: string;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    const absAmount = Math.abs(data.amount);
    if (absAmount < 0.01) return {};

    const period = data.date.slice(0, 7);
    const p = await ensureOpenPeriod(period);
    if (p.status !== 'open') {
      return { error: `Accounting period ${period} is ${p.status} and cannot be posted to.` };
    }

    const db = getDb();
    const accountMap = await getAccountsByCode([data.debitCode, data.creditCode], db);
    const debitAccount = accountMap.get(data.debitCode);
    const creditAccount = accountMap.get(data.creditCode);

    if (!debitAccount || !creditAccount) {
      return {
        error: `Required chart accounts not found (${data.debitCode}, ${data.creditCode}).`,
      };
    }

    const resolvedDivisionId = await resolveCorporateDivisionId(db, data.divisionId);
    if (!resolvedDivisionId) {
      return { error: 'No division found to post journal entry.' };
    }

    const entryId = randomUUID();
    const now = new Date();
    const actor = data.createdBy || 'system';

    await db.transaction(async (tx) => {
      const entryNumber = await getNextJournalEntryNumber(tx, data.date);

      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: data.date,
        period,
        divisionId: resolvedDivisionId,
        description: data.description,
        status: 'posted',
        sourceModule: data.sourceModule,
        sourceDocumentNumber: entryNumber,
        postedAt: now,
        postedBy: actor,
        createdBy: actor,
      });

      await tx.insert(journalLines).values([
        {
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: debitAccount.id,
          debit: absAmount.toFixed(2),
          credit: null,
          description: data.debitLineDescription,
        },
        {
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: creditAccount.id,
          debit: null,
          credit: absAmount.toFixed(2),
          description: data.creditLineDescription,
        },
      ]);
    });

    return { entryId };
  } catch (err) {
    console.error('Failed to post banking journal entry:', err);
    return {
      error: `Journal posting failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export type BankReconciliationContraCode = '5110' | '4030' | '1250' | '3010';

/**
 * Posts a balanced bank reconciliation adjustment entry.
 * delta = statementBalance - bookBalance:
 *  - delta > 0: Dr <bank> / Cr <contra>
 *  - delta < 0: Dr <contra> / Cr <bank>
 */
export async function postBankReconciliationAdjustment(data: {
  accountCode: BankAccountCode;
  date: string;
  delta: number;
  contraCode: BankReconciliationContraCode;
  description: string;
  createdBy?: string;
}): Promise<{ error?: string; entryId?: string }> {
  const isIncrease = data.delta > 0;
  return postSimpleTwoLineJournal({
    date: data.date,
    debitCode: isIncrease ? data.accountCode : data.contraCode,
    creditCode: isIncrease ? data.contraCode : data.accountCode,
    amount: Math.abs(data.delta),
    description: data.description,
    debitLineDescription: `Bank reconciliation adjustment (${data.accountCode})`,
    creditLineDescription: `Bank reconciliation adjustment (${data.contraCode})`,
    sourceModule: 'banking',
    createdBy: data.createdBy,
  });
}

export type OwnerWithdrawalMode = 'director_loan' | 'loan_repayment' | 'salary_advance';

/**
 * Posts a Director's Loan withdrawal (Dr 1250 / Cr 1010), Director's Loan repayment
 * (Dr 1010 / Cr 1250), or Director Salary / Advance (Dr 5120 / Cr 1010).
 */
export async function postOwnerWithdrawalJournalEntry(data: {
  date: string;
  amount: number;
  mode: OwnerWithdrawalMode;
  description: string;
  createdBy?: string;
}): Promise<{ error?: string; entryId?: string }> {
  const mapping: Record<
    OwnerWithdrawalMode,
    { debitCode: string; creditCode: string; label: string }
  > = {
    director_loan: {
      debitCode: '1250',
      creditCode: BANK_ACCOUNT_CODE,
      label: "Director's Loan withdrawal",
    },
    loan_repayment: {
      debitCode: BANK_ACCOUNT_CODE,
      creditCode: '1250',
      label: "Director's Loan repayment",
    },
    salary_advance: {
      debitCode: '5120',
      creditCode: BANK_ACCOUNT_CODE,
      label: 'Director remuneration / advance',
    },
  };

  const selected = mapping[data.mode];
  return postSimpleTwoLineJournal({
    date: data.date,
    debitCode: selected.debitCode,
    creditCode: selected.creditCode,
    amount: data.amount,
    description: data.description || selected.label,
    debitLineDescription: selected.label,
    creditLineDescription: selected.label,
    sourceModule: 'banking',
    createdBy: data.createdBy,
  });
}

/**
 * Posts a 1-click Bank Fee (Dr 5110 / Cr <bank>) or Interest Received (Dr <bank> / Cr 4030).
 */
export async function postQuickBankEntry(data: {
  type: 'bank_fee' | 'interest';
  accountCode: BankAccountCode;
  date: string;
  amount: number;
  description: string;
  createdBy?: string;
}): Promise<{ error?: string; entryId?: string }> {
  const isFee = data.type === 'bank_fee';
  return postSimpleTwoLineJournal({
    date: data.date,
    debitCode: isFee ? '5110' : data.accountCode,
    creditCode: isFee ? data.accountCode : '4030',
    amount: data.amount,
    description: data.description || (isFee ? 'Monthly bank charges' : 'Bank interest received'),
    debitLineDescription: isFee ? 'Bank charges' : `Interest credited to ${data.accountCode}`,
    creditLineDescription: isFee ? `Bank fee deducted from ${data.accountCode}` : 'Interest income',
    sourceModule: 'banking',
    createdBy: data.createdBy,
  });
}

/**
 * Runs the FY2027/28 Year-End Bank True-Up (2027-02-28) & Opening Balance Transition:
 * 1. Computes book balances strictly as of 2027-02-28 (ignoring March 2027+ entries).
 * 2. Posts any variance for 1010 and 1020 against 1250 Director's Loan (drawdown) or
 *    3010 Owner's Capital (injection) on 2027-02-28.
 * 3. Records reconciled 2027-02 bank_reconciliations rows.
 * 4. Inserts a date-effective pmg_share = 0% row effective 2027-03-01 (idempotent).
 */
export async function postFy2027OpeningBalanceTrueUp(data: {
  realChequeBalance: number;
  realSavingsBalance: number;
  createdBy?: string;
}): Promise<{ error?: string; postedEntries: number }> {
  try {
    const trueUpDate = '2027-02-28';
    const trueUpPeriod = '2027-02';
    const tb = await getTrialBalance(undefined, undefined, undefined, trueUpDate);
    const byCode = new Map(tb.map((r) => [r.accountCode, r.balance]));

    const bookCheque = byCode.get('1010') ?? 0;
    const bookSavings = byCode.get('1020') ?? 0;

    let postedEntries = 0;

    const accounts: Array<{ code: BankAccountCode; book: number; real: number; label: string }> = [
      { code: '1010', book: bookCheque, real: data.realChequeBalance, label: 'Cheque Account' },
      { code: '1020', book: bookSavings, real: data.realSavingsBalance, label: 'Savings Account' },
    ];

    for (const acc of accounts) {
      const delta = acc.real - acc.book;
      let adjustmentJournalId: string | null = null;

      if (Math.abs(delta) >= 0.01) {
        const contraCode: BankReconciliationContraCode = delta < 0 ? '1250' : '3010';
        const res = await postBankReconciliationAdjustment({
          accountCode: acc.code,
          date: trueUpDate,
          delta,
          contraCode,
          description: `FY2026/27 Year-End True-Up (${acc.label}) for FY2027/28 Opening Balance`,
          createdBy: data.createdBy,
        });
        if (res.error) return { error: res.error, postedEntries };
        adjustmentJournalId = res.entryId ?? null;
        postedEntries++;
      }

      await upsertBankReconciliation({
        period: trueUpPeriod,
        accountCode: acc.code,
        statementDate: trueUpDate,
        statementBalance: acc.real,
        bookBalance: acc.real,
        variance: 0,
        adjustmentJournalId,
        status: 'reconciled',
        notes: 'FY2026/27 Year-End True-Up & FY2027/28 Opening Balance confirmation',
        reconciledBy: data.createdBy ?? 'system',
      });
    }

    // Sunset pmg_share to 0% effective 2027-03-01 (idempotent)
    const db = getDb();
    const existingSunset = await db
      .select({ id: distributionSettings.id })
      .from(distributionSettings)
      .where(
        and(
          eq(distributionSettings.rateKey, 'pmg_share'),
          sql`${distributionSettings.effectiveFrom} >= '2027-03-01'`,
          sql`${distributionSettings.rateValue}::numeric = 0`,
        ),
      )
      .limit(1);

    if (existingSunset.length === 0) {
      await db.insert(distributionSettings).values({
        rateKey: 'pmg_share',
        rateValue: '0.0000',
        effectiveFrom: new Date('2027-03-01T00:00:00Z'),
        effectiveTo: null,
        description: 'FY2027/28 (Pty) Ltd governance transition — PMG Share sunsetted (0%)',
        distributionBasis: 'net_profit',
        isActive: true,
      });
    }

    return { postedEntries };
  } catch (err) {
    console.error('Failed to run FY2027 opening balance true-up:', err);
    return {
      error: `FY2027 transition failed: ${err instanceof Error ? err.message : String(err)}`,
      postedEntries: 0,
    };
  }
}

// ── Phase 5: Monthly SARS Tax Provisioning & Quarterly Dividend / Bonus GL ──

/**
 * Posts a monthly or periodic SARS Corporate Income Tax provision:
 *   Dr 5160 Income Tax Expense / Cr 2160 SARS Income Tax & DWT Payable
 */
export async function postMonthlyTaxProvisionEntry(data: {
  date: string;
  amount: number;
  description?: string;
  createdBy?: string;
}): Promise<{ error?: string; entryId?: string }> {
  return postSimpleTwoLineJournal({
    date: data.date,
    debitCode: '5160',
    creditCode: '2160',
    amount: data.amount,
    description: data.description || `SARS Income Tax provision (${data.date.slice(0, 7)})`,
    debitLineDescription: 'Corporate Income Tax provision',
    creditLineDescription: 'SARS Income Tax payable accrual',
    sourceModule: 'governance',
    createdBy: data.createdBy,
  });
}

/**
 * Posts a balanced multi-line journal entry for a quarterly distribution:
 * - director_bonus (0% PAYE within threshold):
 *     Dr 5120 Staff Costs & Director Remuneration = grossAmount
 *     Cr 1250 Director's Loan Account = loanOffsetAmount (if > 0)
 *     Cr 1010 Business Cheque Account = netCashPaid (if > 0)
 * - dividend (Companies Act s46 + 20% DWT):
 *     Dr 3040 Dividends Declared = grossAmount
 *     Cr 2160 SARS Income Tax & DWT Payable = dwtWithheld (if > 0)
 *     Cr 1250 Director's Loan Account = loanOffsetAmount (if > 0)
 *     Cr 1010 Business Cheque Account = netCashPaid (if > 0)
 */
export async function postQuarterlyDistributionEntry(data: {
  date: string;
  quarter: string;
  payoutType: 'director_bonus' | 'dividend';
  grossAmount: number;
  dwtWithheld: number;
  loanOffsetAmount: number;
  netCashPaid: number;
  description?: string;
  createdBy?: string;
}): Promise<{ error?: string; entryId?: string }> {
  try {
    if (data.grossAmount < 0.01) {
      return { error: 'Gross distribution amount must be greater than zero.' };
    }

    const totalCredits = Number(
      (data.dwtWithheld + data.loanOffsetAmount + data.netCashPaid).toFixed(2),
    );
    if (Math.abs(data.grossAmount - totalCredits) >= 0.01) {
      return {
        error: `Distribution lines do not balance (gross ${data.grossAmount.toFixed(2)} vs credits ${totalCredits.toFixed(2)}).`,
      };
    }

    const period = data.date.slice(0, 7);
    const p = await ensureOpenPeriod(period);
    if (p.status !== 'open') {
      return { error: `Accounting period ${period} is ${p.status} and cannot be posted to.` };
    }

    const debitCode = data.payoutType === 'director_bonus' ? '5120' : '3040';
    const codes = [debitCode, BANK_ACCOUNT_CODE];
    if (data.dwtWithheld > 0) codes.push('2160');
    if (data.loanOffsetAmount > 0) codes.push('1250');

    const db = getDb();
    const accountMap = await getAccountsByCode(codes, db);
    const debitAccount = accountMap.get(debitCode);
    const bankAccount = accountMap.get(BANK_ACCOUNT_CODE);
    const sarsAccount = data.dwtWithheld > 0 ? accountMap.get('2160') : null;
    const loanAccount = data.loanOffsetAmount > 0 ? accountMap.get('1250') : null;

    if (
      !debitAccount ||
      (data.netCashPaid > 0 && !bankAccount) ||
      (data.dwtWithheld > 0 && !sarsAccount) ||
      (data.loanOffsetAmount > 0 && !loanAccount)
    ) {
      return { error: `Required chart accounts not found (${codes.join(', ')}).` };
    }

    const resolvedDivisionId = await resolveCorporateDivisionId(db);
    if (!resolvedDivisionId) {
      return { error: 'No division found to post distribution journal entry.' };
    }

    const entryId = randomUUID();
    const now = new Date();
    const actor = data.createdBy || 'system';
    const label =
      data.payoutType === 'director_bonus'
        ? `${data.quarter} Director Bonus (0% PAYE)`
        : `${data.quarter} Dividend Declared (Companies Act s46)`;

    await db.transaction(async (tx) => {
      const entryNumber = await getNextJournalEntryNumber(tx, data.date);

      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: data.date,
        period,
        divisionId: resolvedDivisionId,
        description: data.description?.trim() || label,
        status: 'posted',
        sourceModule: 'governance',
        sourceDocumentNumber: entryNumber,
        postedAt: now,
        postedBy: actor,
        createdBy: actor,
      });

      const lines: Array<{
        id: string;
        journalEntryId: string;
        accountId: string;
        debit: string | null;
        credit: string | null;
        description: string;
      }> = [
        {
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: debitAccount.id,
          debit: data.grossAmount.toFixed(2),
          credit: null,
          description: label,
        },
      ];

      if (data.dwtWithheld > 0 && sarsAccount) {
        lines.push({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: sarsAccount.id,
          debit: null,
          credit: data.dwtWithheld.toFixed(2),
          description: `20% Dividends Withholding Tax (DWT) — ${data.quarter}`,
        });
      }

      if (data.loanOffsetAmount > 0 && loanAccount) {
        lines.push({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: loanAccount.id,
          debit: null,
          credit: data.loanOffsetAmount.toFixed(2),
          description: `Offset against Director's Loan Account (1250) — ${data.quarter}`,
        });
      }

      if (data.netCashPaid > 0 && bankAccount) {
        lines.push({
          id: randomUUID(),
          journalEntryId: entryId,
          accountId: bankAccount.id,
          debit: null,
          credit: data.netCashPaid.toFixed(2),
          description: `Net cash payout from Cheque Account — ${data.quarter}`,
        });
      }

      await tx.insert(journalLines).values(lines);
    });

    return { entryId };
  } catch (err) {
    console.error('Failed to post quarterly distribution journal entry:', err);
    return {
      error: `Distribution posting failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
