import { db } from "../client";
import {
  chartAccounts,
  journalEntries,
  journalLines,
  accountingPeriods,
} from "../schema/accounting";
import { user } from "../schema/auth";
import { snapshots } from "../schema/snapshots";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

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
 * Returns ALL chart accounts grouped by type for the UI.
 * Includes both active and inactive accounts so deactivating doesn't hide them.
 */
export async function getChartAccountsByType() {
  const accounts = await getAllChartAccounts();
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
  year,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  period?: string;
  year?: number;
} = {}) {
  const conditions = [];
  if (status) conditions.push(eq(journalEntries.status, status as any));
  if (period) conditions.push(eq(journalEntries.period, period));
  if (year) {
    conditions.push(sql`${journalEntries.period} >= ${`${year}-03`}`);
    conditions.push(sql`${journalEntries.period} <= ${`${year + 1}-02`}`);
  }

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
 * Returns the next journal entry number (JE-YYYY-NNNN) using an atomic DB allocator.
 * Can receive an optional tx transaction context and the entry date.
 * The year is derived from the entryDate parameter, not the server clock.
 */
export async function getNextJournalEntryNumber(txOrDate?: any, entryDate?: string): Promise<string> {
  // Handle overloaded parameters: (tx, entryDate) or (entryDate) or ()
  let tx: any;
  let dateStr: string;

  if (typeof txOrDate === 'string') {
    // Called as getNextJournalEntryNumber(entryDate)
    tx = undefined;
    dateStr = txOrDate;
  } else if (txOrDate && entryDate) {
    // Called as getNextJournalEntryNumber(tx, entryDate)
    tx = txOrDate;
    dateStr = entryDate;
  } else if (txOrDate) {
    // Called as getNextJournalEntryNumber(tx) - backward compat, use current year
    tx = txOrDate;
    dateStr = new Date().toISOString().slice(0, 10);
  } else {
    // Called as getNextJournalEntryNumber() - use current year
    dateStr = new Date().toISOString().slice(0, 10);
  }

  const year = new Date(dateStr).getFullYear();
  const prefix = `JE-${year}-`;
  const client = tx || db;

  const result = await client.execute(sql`
    INSERT INTO journal_sequences (year, last_sequence, updated_at)
    VALUES (${year}, 1, NOW())
    ON CONFLICT (year)
    DO UPDATE SET
      last_sequence = journal_sequences.last_sequence + 1,
      updated_at = NOW()
    RETURNING last_sequence
  `);

  const sequence = (result.rows[0] as { last_sequence: number }).last_sequence;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}


// ── Accounting Periods ────────────────────────────────────────────────────────

/**
 * Returns all accounting periods ordered by period descending.
 * Resolves closedBy/lockedBy user IDs to user names.
 */
export async function getAllAccountingPeriods() {
  const rows = await db
    .select()
    .from(accountingPeriods)
    .orderBy(desc(accountingPeriods.period));

  // Collect unique user IDs to batch-resolve names
  const userIds = [...new Set(
    [...rows.map((r) => r.closedBy), ...rows.map((r) => r.lockedBy)]
      .filter((id): id is string => !!id)
  )];

  if (userIds.length === 0) {
    return rows.map((r) => ({ ...r, closedByName: null, lockedByName: null }));
  }

  const users = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, userIds));

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return rows.map((r) => ({
    ...r,
    closedByName: r.closedBy ? (userMap.get(r.closedBy) ?? r.closedBy) : null,
    lockedByName: r.lockedBy ? (userMap.get(r.lockedBy) ?? r.lockedBy) : null,
  }));
}

export type AccountingPeriodWithNames = Awaited<ReturnType<typeof getAllAccountingPeriods>>[number];

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
  // Check if a snapshot exists for this period. If so, it is closed/locked.
  const [snapshot] = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.period, period))
    .limit(1);

  if (snapshot) {
    return false;
  }

  const [row] = await db
    .select({ status: accountingPeriods.status })
    .from(accountingPeriods)
    .where(eq(accountingPeriods.period, period))
    .limit(1);

  // If period doesn't exist in the table, treat it as open
  return !row || row.status === "open";
}

// ── Trial Balance ─────────────────────────────────────────────────────────────

export type TrialBalanceRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebits: number;
  totalCredits: number;
  balance: number;
};

/**
 * Returns trial balance data: for each posting account, the sum of debits and
 * credits across only posted journal lines, optionally filtered by period.
 * Uses a subquery to ensure only journal lines belonging to posted entries
 * are aggregated — void/draft entries are excluded.
 */
export async function getTrialBalance(period?: string): Promise<TrialBalanceRow[]> {
  const entryConditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (period) entryConditions.push(eq(journalEntries.period, period));

  const accountConditions = [
    eq(chartAccounts.isPostingAccount, true),
    eq(chartAccounts.isActive, true),
  ];

  // Subquery: aggregate debits/credits only from posted journal entries
  // Note: raw SQL fields in subqueries MUST have an explicit .as('alias')
  // for Drizzle ORM to be able to reference them from the outer query.
  const postedLineTotals = db
    .select({
      accountId: journalLines.accountId,
      totalDebits: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`.as("totalDebits"),
      totalCredits: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`.as("totalCredits"),
    })
    .from(journalLines)
    .innerJoin(
      journalEntries,
      and(
        eq(journalLines.journalEntryId, journalEntries.id),
        ...entryConditions
      )
    )
    .groupBy(journalLines.accountId)
    .as("posted_line_totals");

  const rows = await db
    .select({
      accountId: chartAccounts.id,
      accountCode: chartAccounts.code,
      accountName: chartAccounts.name,
      accountType: chartAccounts.type,
      totalDebits: sql<string>`COALESCE(${postedLineTotals.totalDebits}, 0)`,
      totalCredits: sql<string>`COALESCE(${postedLineTotals.totalCredits}, 0)`,
    })
    .from(chartAccounts)
    .leftJoin(postedLineTotals, eq(postedLineTotals.accountId, chartAccounts.id))
    .where(and(...accountConditions))
    .orderBy(asc(chartAccounts.code));

  return rows.map((r) => ({
    ...r,
    totalDebits: Number(r.totalDebits),
    totalCredits: Number(r.totalCredits),
    balance: Number(r.totalDebits) - Number(r.totalCredits),
  }));
}

// ── Profit & Loss ─────────────────────────────────────────────────────────────

export type ProfitAndLossRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  amount: number;
};

export type ProfitAndLossResult = {
  revenue: ProfitAndLossRow[];
  totalRevenue: number;
  expenses: ProfitAndLossRow[];
  totalExpenses: number;
  netProfit: number;
};

/**
 * Returns Profit & Loss data for a given period.
 * Revenue accounts: credits - debits (positive = income)
 * Expense accounts: debits - credits (positive = expense)
 * Uses a subquery to ensure only journal lines belonging to posted entries
 * are aggregated — void/draft entries are excluded.
 */
export async function getProfitAndLoss(period?: string): Promise<ProfitAndLossResult> {
  const entryConditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (period) entryConditions.push(eq(journalEntries.period, period));

  const accountConditions = [
    eq(chartAccounts.isPostingAccount, true),
    eq(chartAccounts.isActive, true),
  ];

  // Subquery: aggregate debits/credits only from posted journal entries
  // Note: raw SQL fields in subqueries MUST have an explicit .as('alias')
  // for Drizzle ORM to be able to reference them from the outer query.
  const postedLineTotals = db
    .select({
      accountId: journalLines.accountId,
      totalDebits: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`.as("totalDebits"),
      totalCredits: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`.as("totalCredits"),
    })
    .from(journalLines)
    .innerJoin(
      journalEntries,
      and(
        eq(journalLines.journalEntryId, journalEntries.id),
        ...entryConditions
      )
    )
    .groupBy(journalLines.accountId)
    .as("posted_line_totals");

  const rows = await db
    .select({
      accountId: chartAccounts.id,
      accountCode: chartAccounts.code,
      accountName: chartAccounts.name,
      accountType: chartAccounts.type,
      totalDebits: sql<string>`COALESCE(${postedLineTotals.totalDebits}, 0)`,
      totalCredits: sql<string>`COALESCE(${postedLineTotals.totalCredits}, 0)`,
    })
    .from(chartAccounts)
    .leftJoin(postedLineTotals, eq(postedLineTotals.accountId, chartAccounts.id))
    .where(and(...accountConditions))
    .orderBy(asc(chartAccounts.code));

  const revenue: ProfitAndLossRow[] = [];
  const expenses: ProfitAndLossRow[] = [];

  for (const r of rows) {
    const debits = Number(r.totalDebits);
    const credits = Number(r.totalCredits);
    if (r.accountType === "revenue") {
      const amount = credits - debits;
      if (Math.abs(amount) > 0.01) revenue.push({ ...r, amount });
    } else if (r.accountType === "expense") {
      const amount = debits - credits;
      if (Math.abs(amount) > 0.01) expenses.push({ ...r, amount });
    }
  }

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  return {
    revenue,
    totalRevenue,
    expenses,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  };
}

// ── General Ledger ────────────────────────────────────────────────────────────

export type GeneralLedgerRow = {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  lineDescription: string | null;
  sourceModule: string | null;
  sourceDocumentNumber: string | null;
};

/**
 * Returns general ledger lines with account info, for a date range and/or account.
 * Ordered by date, then entry number.
 */
export async function getGeneralLedger({
  startDate,
  endDate,
  accountId,
  page = 1,
  pageSize = 50,
}: {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const conditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (startDate) conditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
  if (endDate) conditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);
  if (accountId) conditions.push(eq(journalLines.accountId, accountId));

  const where = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(where);

  const rows = await db
    .select({
      id: journalLines.id,
      entryNumber: journalEntries.entryNumber,
      entryDate: journalEntries.entryDate,
      description: journalEntries.description,
      accountId: journalLines.accountId,
      accountCode: chartAccounts.code,
      accountName: chartAccounts.name,
      debit: sql<string>`COALESCE(${journalLines.debit}, '0')`,
      credit: sql<string>`COALESCE(${journalLines.credit}, '0')`,
      lineDescription: journalLines.description,
      sourceModule: journalEntries.sourceModule,
      sourceDocumentNumber: journalEntries.sourceDocumentNumber,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
    .where(where)
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.entryNumber))
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return {
    data: rows.map((r) => ({
      ...r,
      debit: Number(r.debit),
      credit: Number(r.credit),
    })),
    total: countResult?.count ?? 0,
    page,
    pageSize,
  };
}

// ── Accounting Overview ───────────────────────────────────────────────────────

export type AccountingOverview = {
  totalAccounts: number;
  totalPostedEntries: number;
  totalDraftEntries: number;
  currentPeriod: string | null;
  currentPeriodStatus: string | null;
};

/**
 * Returns summary stats for the accounting overview page.
 */
export async function getAccountingOverview(): Promise<AccountingOverview> {
  const [accountCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chartAccounts)
    .where(eq(chartAccounts.isActive, true));

  const [postedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalEntries)
    .where(eq(journalEntries.status, "posted"));

  const [draftCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalEntries)
    .where(eq(journalEntries.status, "draft"));

  const period = await getCurrentOpenPeriod();

  return {
    totalAccounts: accountCount?.count ?? 0,
    totalPostedEntries: postedCount?.count ?? 0,
    totalDraftEntries: draftCount?.count ?? 0,
    currentPeriod: period?.period ?? null,
    currentPeriodStatus: period?.status ?? null,
  };
}

// ── Period Management ────────────────────────────────────────────────────────

/**
 * Creates a new open period or returns the existing one.
 */
export async function ensureOpenPeriod(period: string) {
  const [existing] = await db
    .select()
    .from(accountingPeriods)
    .where(eq(accountingPeriods.period, period))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(accountingPeriods)
    .values({ period, status: "open" })
    .returning();

  return created;
}

/**
 * Closes a period (prevents new journal entries).
 */
export async function closePeriod(period: string, closedBy: string) {
  await ensureOpenPeriod(period);
  await db
    .update(accountingPeriods)
    .set({
      status: "closed",
      closedAt: new Date(),
      closedBy,
      updatedAt: new Date(),
    })
    .where(eq(accountingPeriods.period, period));
}

/**
 * Locks a period permanently (cannot be reopened).
 */
export async function lockPeriod(period: string, lockedBy: string) {
  await db
    .update(accountingPeriods)
    .set({
      status: "locked",
      lockedAt: new Date(),
      lockedBy,
      updatedAt: new Date(),
    })
    .where(eq(accountingPeriods.period, period));
}

/**
 * Reopens a closed period (not locked).
 */
export async function reopenPeriod(period: string) {
  await db
    .update(accountingPeriods)
    .set({
      status: "open",
      closedAt: null,
      closedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(accountingPeriods.period, period));
}
