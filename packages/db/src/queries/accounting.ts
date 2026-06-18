import { db } from "../client";
import {
  chartAccounts,
  journalEntries,
  journalLines,
  accountingPeriods,
} from "../schema/accounting";
import { eq, and, desc, asc, sql } from "drizzle-orm";

// ── Chart of Accounts ─────────────────────────────────────────────────────────

/**
 * Returns all chart accounts ordered by code.
 */
export async function getAllChartAccounts() {
  return db
    .select()
    .from(chartAccounts)
    .orderBy(asc(chartAccounts.code));
}

/**
 * Returns only active chart accounts ordered by code.
 */
export async function getActiveChartAccounts() {
  return db
    .select()
    .from(chartAccounts)
    .where(eq(chartAccounts.isActive, true))
    .orderBy(asc(chartAccounts.code));
}

/**
 * Returns chart accounts grouped by type for the UI.
 */
export async function getChartAccountsByType() {
  const accounts = await getActiveChartAccounts();
  const grouped: Record<string, typeof accounts> = {
    asset: [],
    liability: [],
    equity: [],
    revenue: [],
    expense: [],
  };
  for (const account of accounts) {
    grouped[account.type]?.push(account);
  }
  return grouped;
}

/**
 * Fetches a single chart account by id.
 */
export async function getChartAccountById(id: string) {
  const [account] = await db
    .select()
    .from(chartAccounts)
    .where(eq(chartAccounts.id, id))
    .limit(1);
  return account ?? null;
}

/**
 * Returns the next available account code for a given type.
 * Uses the type prefix + next sequential number (e.g. 1001, 1002 for assets).
 */
export async function getNextAccountCode(
  type: "asset" | "liability" | "equity" | "revenue" | "expense"
): Promise<string> {
  const prefix = { asset: 1, liability: 2, equity: 3, revenue: 4, expense: 5 }[type];

  const [last] = await db
    .select({ code: chartAccounts.code })
    .from(chartAccounts)
    .where(sql`${chartAccounts.code} LIKE ${`${prefix}%`}`)
    .orderBy(desc(chartAccounts.code))
    .limit(1);

  if (!last) return `${prefix}001`;
  const num = parseInt(last.code.slice(1), 10) + 1;
  return `${prefix}${String(num).padStart(3, "0")}`;
}

// ── Journal Entries ───────────────────────────────────────────────────────────

/**
 * Returns journal entries with pagination, ordered by date descending.
 */
export async function getJournalEntries({
  page = 1,
  pageSize = 20,
  status,
  period,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  period?: string;
} = {}) {
  const conditions = [];
  if (status) conditions.push(eq(journalEntries.status, status as any));
  if (period) conditions.push(eq(journalEntries.period, period));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalEntries)
    .where(where);

  const data = await db
    .select()
    .from(journalEntries)
    .where(where)
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return {
    data,
    total: countResult?.count ?? 0,
    page,
    pageSize,
  };
}

/**
 * Fetches a journal entry with its lines.
 */
export async function getJournalEntryWithLines(id: string) {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1);

  if (!entry) return null;

  const lines = await db
    .select()
    .from(journalLines)
    .where(eq(journalLines.journalEntryId, id))
    .orderBy(asc(journalLines.createdAt));

  return { ...entry, lines };
}

/**
 * Validates that a set of journal lines balance (total debits = total credits).
 */
export function validateJournalLines(
  lines: { debit?: string | number | null; credit?: string | number | null }[]
): { valid: boolean; totalDebits: number; totalCredits: number; error?: string } {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    const debit = line.debit ? Number(line.debit) : 0;
    const credit = line.credit ? Number(line.credit) : 0;

    if (debit > 0 && credit > 0) {
      return { valid: false, totalDebits, totalCredits, error: "A line cannot have both a debit and credit amount." };
    }
    if (debit <= 0 && credit <= 0) {
      return { valid: false, totalDebits, totalCredits, error: "Each line must have either a debit or credit amount greater than zero." };
    }

    totalDebits += debit;
    totalCredits += credit;
  }

  if (lines.length < 2) {
    return { valid: false, totalDebits, totalCredits, error: "A journal entry must have at least two lines." };
  }

  const diff = Math.abs(totalDebits - totalCredits);
  if (diff > 0.01) {
    return {
      valid: false,
      totalDebits,
      totalCredits,
      error: `Journal entry does not balance. Debits (R${totalDebits.toFixed(2)}) ≠ Credits (R${totalCredits.toFixed(2)}).`,
    };
  }

  return { valid: true, totalDebits, totalCredits };
}

/**
 * Returns the next journal entry number (JE-YYYY-NNNN).
 */
export async function getNextJournalEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;

  const [last] = await db
    .select({ entryNumber: journalEntries.entryNumber })
    .from(journalEntries)
    .where(sql`${journalEntries.entryNumber} LIKE ${`${prefix}%`}`)
    .orderBy(desc(journalEntries.entryNumber))
    .limit(1);

  if (!last) return `${prefix}0001`;
  const seq = parseInt(last.entryNumber.split("-").pop()!, 10) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ── Accounting Periods ────────────────────────────────────────────────────────

/**
 * Returns all accounting periods ordered by period descending.
 */
export async function getAllAccountingPeriods() {
  return db
    .select()
    .from(accountingPeriods)
    .orderBy(desc(accountingPeriods.period));
}

/**
 * Returns the current open period (YYYY-MM) or null.
 */
export async function getCurrentOpenPeriod() {
  const [period] = await db
    .select()
    .from(accountingPeriods)
    .where(eq(accountingPeriods.status, "open"))
    .orderBy(desc(accountingPeriods.period))
    .limit(1);
  return period ?? null;
}

/**
 * Checks if a given period (YYYY-MM) is open for journal entries.
 */
export async function isPeriodOpen(period: string): Promise<boolean> {
  const [row] = await db
    .select({ status: accountingPeriods.status })
    .from(accountingPeriods)
    .where(eq(accountingPeriods.period, period))
    .limit(1);

  // If period doesn't exist in the table, treat it as open
  return !row || row.status === "open";
}
