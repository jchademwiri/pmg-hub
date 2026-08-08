import { db } from "../client";
import {
  chartAccounts,
  journalEntries,
  journalLines,
  accountingPeriods,
} from "../schema/accounting";
import { user } from "../schema/auth";
import { snapshots } from "../schema/snapshots";
import { divisions } from "../schema/divisions";
import { invoices } from "../schema/billing";
import { income } from "../schema/income";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

// ── Chart of Accounts ─────────────────────────────────────────────────────────

export async function ensurePmgShareReserveAccount() {
  try {
    const [inserted] = await db
      .insert(chartAccounts)
      .values({
        code: "3150",
        name: "PMG Share Equity Reserve",
        type: "equity",
        description: "Accumulated PMG Share retained reserve from billing income",
        isActive: true,
        isPostingAccount: true,
      })
      .onConflictDoNothing({ target: chartAccounts.code })
      .returning({ id: chartAccounts.id });

    let pmgAccountId = inserted?.id;
    if (!pmgAccountId) {
      const [existing] = await db
        .select({ id: chartAccounts.id })
        .from(chartAccounts)
        .where(eq(chartAccounts.code, "3150"))
        .limit(1);
      pmgAccountId = existing?.id;
    }

    if (pmgAccountId) {
      const [bankAccount] = await db
        .select({ id: chartAccounts.id })
        .from(chartAccounts)
        .where(eq(chartAccounts.code, "1010"))
        .limit(1);

      if (bankAccount) {
        const pmgEntries = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(sql`${journalEntries.description} LIKE 'PMG Share%'`);

        if (pmgEntries.length > 0) {
          const entryIds = pmgEntries.map((e) => e.id);
          await db
            .update(journalLines)
            .set({ accountId: pmgAccountId })
            .where(
              and(
                inArray(journalLines.journalEntryId, entryIds),
                eq(journalLines.accountId, bankAccount.id),
                sql`${journalLines.credit} IS NOT NULL`
              )
            );
        }
      }
    }
  } catch (err) {
    console.error("ensurePmgShareReserveAccount error:", err);
  }
}

/**
 * Returns all chart accounts ordered by code.
 */
export async function getAllChartAccounts() {
  await ensurePmgShareReserveAccount();
  return db
    .select()
    .from(chartAccounts)
    .orderBy(asc(chartAccounts.code));
}

/**
 * Returns only active chart accounts ordered by code.
 */
export async function getActiveChartAccounts() {
  await ensurePmgShareReserveAccount();
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
  divisionId,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  period?: string;
  year?: number;
  divisionId?: string;
} = {}) {
  const conditions = [];
  if (status) conditions.push(eq(journalEntries.status, status as any));
  if (period) conditions.push(eq(journalEntries.period, period));
  if (divisionId) conditions.push(eq(journalEntries.divisionId, divisionId));
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

export type MonthlyJournalSummary = {
  month: string;
  count: number;
  postedCount: number;
  draftCount: number;
  totalPostedValue: number;
};

/**
 * Returns a monthly summary of journal entries for a given financial year.
 */
export async function getJournalMonthlySummaries(
  year: number,
  status?: string
): Promise<MonthlyJournalSummary[]> {
  const conditions = [
    sql`${journalEntries.period} >= ${`${year}-03`}`,
    sql`${journalEntries.period} <= ${`${year + 1}-02`}`
  ];

  if (status) conditions.push(eq(journalEntries.status, status as any));

  const result = await db
    .select({
      month: journalEntries.period,
      count: sql<number>`count(DISTINCT ${journalEntries.id})::int`,
      postedCount: sql<number>`count(DISTINCT CASE WHEN ${journalEntries.status} = 'posted' THEN ${journalEntries.id} ELSE NULL END)::int`,
      draftCount: sql<number>`count(DISTINCT CASE WHEN ${journalEntries.status} = 'draft' THEN ${journalEntries.id} ELSE NULL END)::int`,
      totalPostedValue: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.status} = 'posted' THEN ${journalLines.debit} ELSE 0 END), 0)::numeric`,
    })
    .from(journalEntries)
    .leftJoin(journalLines, eq(journalEntries.id, journalLines.journalEntryId))
    .where(and(...conditions))
    .groupBy(journalEntries.period)
    .orderBy(desc(journalEntries.period));

  return result.map((r) => ({
    month: r.month,
    count: r.count,
    postedCount: r.postedCount,
    draftCount: r.draftCount,
    totalPostedValue: Number(r.totalPostedValue),
  }));
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

export type JournalEntryLineRow = {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string | null;
};

/**
 * Returns all journal lines (with account code/name joined) for a batch of
 * journal entry ids in a single query — used by report generation that
 * needs every entry's lines without the N+1 cost of calling
 * getJournalEntryWithLines per entry.
 */
export async function getJournalLinesForEntries(entryIds: string[]): Promise<JournalEntryLineRow[]> {
  if (entryIds.length === 0) return [];

  const rows = await db
    .select({
      id: journalLines.id,
      journalEntryId: journalLines.journalEntryId,
      accountId: journalLines.accountId,
      accountCode: chartAccounts.code,
      accountName: chartAccounts.name,
      debit: journalLines.debit,
      credit: journalLines.credit,
      description: journalLines.description,
    })
    .from(journalLines)
    .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
    .where(inArray(journalLines.journalEntryId, entryIds))
    .orderBy(asc(journalLines.createdAt));

  return rows.map((r) => ({
    ...r,
    debit: Number(r.debit ?? 0),
    credit: Number(r.credit ?? 0),
  }));
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
  debit: number;
  credit: number;
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
export async function getTrialBalance(period?: string, divisionId?: string, startDate?: string, endDate?: string): Promise<TrialBalanceRow[]> {
  const entryConditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (period) entryConditions.push(eq(journalEntries.period, period));
  if (divisionId) entryConditions.push(eq(journalEntries.divisionId, divisionId));
  if (startDate) entryConditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
  if (endDate) entryConditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);

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

  return rows
    .map((r) => {
      const debits = Number(r.totalDebits);
      const credits = Number(r.totalCredits);
      return {
        ...r,
        debit: debits,
        credit: credits,
        totalDebits: debits,
        totalCredits: credits,
        balance: debits - credits,
      };
    })
    .filter((r) => Math.abs(r.totalDebits) >= 0.01 || Math.abs(r.totalCredits) >= 0.01);
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

export type BalanceSheetAccountRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  amount: number;
};

export type BalanceSheetResult = {
  assets: BalanceSheetAccountRow[];
  totalAssets: number;
  liabilities: BalanceSheetAccountRow[];
  totalLiabilities: number;
  equity: BalanceSheetAccountRow[];
  totalEquity: number;
  netIncome: number;
  totalLiabilitiesAndEquity: number;
};

export async function getBalanceSheet(
  period?: string,
  divisionId?: string,
  startDate?: string,
  endDate?: string
): Promise<BalanceSheetResult> {
  const entryConditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (period) entryConditions.push(eq(journalEntries.period, period));
  if (divisionId) entryConditions.push(eq(journalEntries.divisionId, divisionId));
  if (startDate) entryConditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
  if (endDate) entryConditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);

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
    .where(and(eq(chartAccounts.isPostingAccount, true), eq(chartAccounts.isActive, true)))
    .orderBy(asc(chartAccounts.code));

  const assets: BalanceSheetAccountRow[] = [];
  const liabilities: BalanceSheetAccountRow[] = [];
  const equity: BalanceSheetAccountRow[] = [];

  let totalRev = 0;
  let totalExp = 0;

  for (const r of rows) {
    const debits = Number(r.totalDebits);
    const credits = Number(r.totalCredits);

    if (r.accountType === "asset") {
      const amount = debits - credits;
      if (Math.abs(amount) > 0.01) assets.push({ ...r, amount });
    } else if (r.accountType === "liability") {
      const amount = credits - debits;
      if (Math.abs(amount) > 0.01) liabilities.push({ ...r, amount });
    } else if (r.accountType === "equity") {
      const amount = credits - debits;
      if (Math.abs(amount) > 0.01) equity.push({ ...r, amount });
    } else if (r.accountType === "revenue") {
      totalRev += credits - debits;
    } else if (r.accountType === "expense") {
      totalExp += debits - credits;
    }
  }

  const netIncome = totalRev - totalExp;
  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0) + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
    netIncome,
    totalLiabilitiesAndEquity,
  };
}

// ── Cash Flow Statement ───────────────────────────────────────────────────────

export type CashFlowCategoryRow = {
  description: string;
  amount: number;
};

export type CashFlowResult = {
  operatingActivities: CashFlowCategoryRow[];
  netOperatingCashFlow: number;
  investingFinancingActivities: CashFlowCategoryRow[];
  netInvestingFinancingCashFlow: number;
  netCashIncrease: number;
  startingCashBalance: number;
  endingCashBalance: number;
};

export async function getCashFlowStatement(
  period?: string,
  divisionId?: string,
  startDate?: string,
  endDate?: string
): Promise<CashFlowResult> {
  const pnl = await getProfitAndLoss(period, divisionId, startDate, endDate);
  const bs = await getBalanceSheet(period, divisionId, startDate, endDate);
  const divPerf = await getProfitAndLossByDivision(period, startDate, endDate);

  const totalCashCollected = divPerf.reduce((sum, d) => sum + d.totalIncome, 0);
  const totalOperatingExpenses = pnl.totalExpenses;

  const operatingActivities: CashFlowCategoryRow[] = [
    { description: 'Cash Receipts from Customers / Sales Collections', amount: totalCashCollected },
    { description: 'Cash Payments for Operating Expenses', amount: -totalOperatingExpenses },
  ];

  const netOperatingCashFlow = totalCashCollected - totalOperatingExpenses;

  const investingFinancingActivities: CashFlowCategoryRow[] = [];
  const netInvestingFinancingCashFlow = 0;

  const netCashIncrease = netOperatingCashFlow + netInvestingFinancingCashFlow;
  
  const bankAccounts = bs.assets.filter((a) => a.accountCode.startsWith('10'));
  const endingCashBalance = bankAccounts.reduce((sum, a) => sum + a.amount, 0);
  const startingCashBalance = Math.max(0, endingCashBalance - netCashIncrease);

  return {
    operatingActivities,
    netOperatingCashFlow,
    investingFinancingActivities,
    netInvestingFinancingCashFlow,
    netCashIncrease,
    startingCashBalance,
    endingCashBalance,
  };
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
export async function getProfitAndLoss(period?: string, divisionId?: string, startDate?: string, endDate?: string): Promise<ProfitAndLossResult> {
  const entryConditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (period) entryConditions.push(eq(journalEntries.period, period));
  if (divisionId) entryConditions.push(eq(journalEntries.divisionId, divisionId));
  if (startDate) entryConditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
  if (endDate) entryConditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);

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

export type ProfitAndLossByDivisionRow = {
  divisionId: string;
  divisionName: string;
  totalRevenue: number;
  totalIncome: number;
  totalOutstandingAr: number;
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
  distributionPercent: number;
};

/**
 * Returns revenue/income/AR/expenses/net profit grouped by division, for a given
 * period. Includes division margin % and group distribution %.
 * Sorted by totalRevenue descending (highest-earning division first).
 */
export async function getProfitAndLossByDivision(period?: string, startDate?: string, endDate?: string): Promise<ProfitAndLossByDivisionRow[]> {
  const entryConditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (period) entryConditions.push(eq(journalEntries.period, period));
  if (startDate) entryConditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
  if (endDate) entryConditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);

  const rows = await db
    .select({
      divisionId: journalEntries.divisionId,
      accountType: chartAccounts.type,
      totalDebits: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`,
      totalCredits: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, and(eq(journalLines.journalEntryId, journalEntries.id), ...entryConditions))
    .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
    .where(inArray(chartAccounts.type, ["revenue", "expense"]))
    .groupBy(journalEntries.divisionId, chartAccounts.type);

  // Fetch actual cash income collected per division
  const incomeRows = await db
    .select({
      divisionId: income.divisionId,
      totalIncome: sql<string>`COALESCE(SUM(${income.amount}::numeric), 0)`,
    })
    .from(income)
    .groupBy(income.divisionId);

  const incomeMap = new Map(incomeRows.map((i) => [i.divisionId, Number(i.totalIncome)]));

  const allDivisions = await db.select({ id: divisions.id, name: divisions.name }).from(divisions);
  const divisionNames = new Map(allDivisions.map((d) => [d.id, d.name]));

  const byDivision = new Map<string, { totalRevenue: number; totalExpenses: number }>();
  for (const r of rows) {
    const totals = byDivision.get(r.divisionId) ?? { totalRevenue: 0, totalExpenses: 0 };
    const debits = Number(r.totalDebits);
    const credits = Number(r.totalCredits);
    if (r.accountType === "revenue") totals.totalRevenue += credits - debits;
    else if (r.accountType === "expense") totals.totalExpenses += debits - credits;
    byDivision.set(r.divisionId, totals);
  }

  const groupTotalRevenue = Array.from(byDivision.values()).reduce((sum, d) => sum + Math.max(0, d.totalRevenue), 0);

  const result: ProfitAndLossByDivisionRow[] = [];
  for (const [divisionId, totals] of byDivision) {
    if (Math.abs(totals.totalRevenue) < 0.01 && Math.abs(totals.totalExpenses) < 0.01) continue;
    const cashIncome = incomeMap.get(divisionId) ?? 0;
    const netProfit = totals.totalRevenue - totals.totalExpenses;
    const marginPercent = totals.totalRevenue > 0 ? (netProfit / totals.totalRevenue) * 100 : 0;
    const distributionPercent = groupTotalRevenue > 0 ? (totals.totalRevenue / groupTotalRevenue) * 100 : 0;
    const totalOutstandingAr = Math.max(0, totals.totalRevenue - cashIncome);

    result.push({
      divisionId,
      divisionName: divisionNames.get(divisionId) ?? "Unknown Division",
      totalRevenue: totals.totalRevenue,
      totalIncome: cashIncome,
      totalOutstandingAr,
      totalExpenses: totals.totalExpenses,
      netProfit,
      marginPercent,
      distributionPercent,
    });
  }

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
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
  divisionId,
  page = 1,
  pageSize = 50,
}: {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  divisionId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const conditions = [
    eq(journalEntries.status, "posted"),
  ];
  if (startDate) conditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
  if (endDate) conditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);
  if (accountId) conditions.push(eq(journalLines.accountId, accountId));
  if (divisionId) conditions.push(eq(journalEntries.divisionId, divisionId));

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

export type MonthlyLedgerSummary = {
  month: string;
  count: number;
  totalDebits: number;
  totalCredits: number;
};

/**
 * Returns a monthly summary of ledger entries for a given financial year.
 */
export async function getLedgerMonthlySummaries(
  year: number,
  accountId?: string
): Promise<MonthlyLedgerSummary[]> {
  const conditions = [
    eq(journalEntries.status, "posted"),
    sql`${journalEntries.period} >= ${`${year}-03`}`,
    sql`${journalEntries.period} <= ${`${year + 1}-02`}`
  ];

  if (accountId) conditions.push(eq(journalLines.accountId, accountId));

  const result = await db
    .select({
      month: journalEntries.period,
      count: sql<number>`count(*)::int`,
      totalDebits: sql<number>`COALESCE(SUM(${journalLines.debit}), 0)::numeric`,
      totalCredits: sql<number>`COALESCE(SUM(${journalLines.credit}), 0)::numeric`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(and(...conditions))
    .groupBy(journalEntries.period)
    .orderBy(desc(journalEntries.period));

  return result.map((r) => ({
    month: r.month,
    count: r.count,
    totalDebits: Number(r.totalDebits),
    totalCredits: Number(r.totalCredits),
  }));
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

export type UnpostedInvoiceReconciliationRow = {
  id: string;
  documentNumber: string;
  status: string;
  total: number;
};

/**
 * Sweeps for active invoices (issued, partially_paid, paid, written_off)
 * that have 0 debits/credits posted in the general ledger.
 */
export async function getUnpostedInvoicesReconciliation(): Promise<UnpostedInvoiceReconciliationRow[]> {
  const result = await db.execute(sql`
    SELECT i.id, i.document_number AS "documentNumber", i.status, CAST(i.total AS NUMERIC) AS total
    FROM invoices i
    LEFT JOIN journal_entries je ON je.source_table = 'invoices' AND je.source_id = i.id
    LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE i.status IN ('paid', 'written_off', 'issued', 'partially_paid')
    GROUP BY i.id, i.document_number, i.status, i.total
    HAVING COALESCE(SUM(jl.debit), 0) = 0 AND COALESCE(SUM(jl.credit), 0) = 0
  `);

  return (result.rows as any[]).map((r) => ({
    id: String(r.id),
    documentNumber: String(r.documentNumber),
    status: String(r.status),
    total: Number(r.total),
  }));
}

// ── Annual Financial Statements (AFS) ─────────────────────────────────────────

export type AfsNoteRow = {
  label: string;
  amount: number;
  code?: string;
};

export type AnnualFinancialStatementsResult = {
  generalInfo: {
    companyName: string;
    registrationNumber: string;
    taxReferenceNumber: string;
    registeredAddress: string;
    postalAddress: string;
    directorName: string;
    financialYearEnd: string;
    financialYear: string;
  };
  directorsReport: {
    principalActivities: string;
    financialResultsSummary: string;
    goingConcernStatement: string;
    eventsAfterReportingPeriod: string;
  };
  statementOfPosition: BalanceSheetResult;
  statementOfProfitLoss: ProfitAndLossResult;
  statementOfChangesInEquity: {
    openingShareCapital: number;
    closingShareCapital: number;
    openingRetainedIncome: number;
    currentYearNetProfit: number;
    closingRetainedIncome: number;
    totalOpeningEquity: number;
    totalClosingEquity: number;
  };
  statementOfCashFlows: CashFlowStatementResult;
  notes: {
    note1BasisOfPreparation: string;
    note2RevenueBreakdown: AfsNoteRow[];
    note3OperatingExpenses: AfsNoteRow[];
    note4TradeReceivables: {
      grossReceivables: number;
      allowanceForBadDebts: number;
      netReceivables: number;
    };
    note5CashAndCashEquivalents: AfsNoteRow[];
    note6TradeAndOtherPayables: {
      tradePayables: number;
      clientCredits: number;
      totalPayables: number;
    };
  };
};

/**
 * Returns a complete Annual Financial Statements (AFS) package for CIPC & IFRS compliance.
 */
export async function getAnnualFinancialStatements(
  period?: string,
  divisionId?: string,
  startDate?: string,
  endDate?: string
): Promise<AnnualFinancialStatementsResult> {
  const [orgSettings, balanceSheet, pnl, cashFlow, pnlDivisions] = await Promise.all([
    getOrganisationSettings(),
    getBalanceSheet(period, divisionId, startDate, endDate),
    getProfitAndLoss(period, divisionId, startDate, endDate),
    getCashFlowStatement(period, divisionId, startDate, endDate),
    getProfitAndLossByDivision(period, startDate, endDate),
  ]);

  const currentYear = new Date().getFullYear();
  const yearLabel = period ? (period.includes('-FY') ? `FY${period.split('-')[0]}` : period) : `FY${currentYear}`;

  const street = orgSettings?.addressStreet || '285 ERASMUS AVENUE, RASLOUW AH';
  const city = orgSettings?.addressCity || 'CENTURION';
  const postal = orgSettings?.addressPostal || '0157';
  const province = orgSettings?.addressProvince || 'GAUTENG';
  const regAddress = `${street}, ${city}, ${province}, ${postal}`;

  // Calculate changes in equity
  const openingShareCapital = 100.00;
  const closingShareCapital = 100.00;
  const currentNetProfit = pnl.netProfit;
  const openingRetained = balanceSheet.totalEquity - closingShareCapital - currentNetProfit;

  // Notes data
  const revenueNotes: AfsNoteRow[] = pnlDivisions.map((div) => ({
    label: `Revenue — ${div.divisionName}`,
    amount: div.revenue,
  }));

  const expenseNotes: AfsNoteRow[] = pnl.expenses.map((exp) => ({
    code: exp.accountCode,
    label: exp.accountName,
    amount: exp.amount,
  }));

  const cashNotes: AfsNoteRow[] = balanceSheet.assets
    .filter((a) => a.accountName.toLowerCase().includes('bank') || a.accountName.toLowerCase().includes('cash') || a.accountName.toLowerCase().includes('savings'))
    .map((a) => ({ code: a.accountCode, label: a.accountName, amount: a.amount }));

  const arAsset = balanceSheet.assets.find((a) => a.accountName.toLowerCase().includes('receivable') || a.accountCode === '1100');
  const badDebtExp = pnl.expenses.find((e) => e.accountName.toLowerCase().includes('bad debt') || e.accountCode === '5150');
  const grossAR = (arAsset?.amount || 0) + (badDebtExp?.amount || 0);
  const allowanceAR = badDebtExp?.amount || 0;

  const clientCreditsLiability = balanceSheet.liabilities.find((l) => l.accountName.toLowerCase().includes('credit') || l.accountCode === '2200');
  const otherPayables = balanceSheet.totalLiabilities - (clientCreditsLiability?.amount || 0);

  return {
    generalInfo: {
      companyName: orgSettings?.companyName || 'PLAYHOUSE MEDIA GROUP (PTY) LTD',
      registrationNumber: orgSettings?.registrationNumber || '2023/683669/07',
      taxReferenceNumber: orgSettings?.vatNumber || '9876543210',
      registeredAddress: regAddress,
      postalAddress: regAddress,
      directorName: 'JACOB CHADEMWIRI',
      financialYearEnd: '28 February',
      financialYear: yearLabel,
    },
    directorsReport: {
      principalActivities: 'Software development, digital agency services, domain & hosting solutions, and professional technology consulting.',
      financialResultsSummary: `The corporate net operating financial result for ${yearLabel} reflects a Net Operating Profit of R ${pnl.netProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} on Total Sales Revenue of R ${pnl.totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}.`,
      goingConcernStatement: 'The directors believe that the company has adequate financial resources to continue in operation for the foreseeable future and accordingly the annual financial statements have been prepared on a going concern basis.',
      eventsAfterReportingPeriod: 'The directors are not aware of any material matter or circumstance arising since the end of the financial year that would significantly impact these financial statements.',
    },
    statementOfPosition: balanceSheet,
    statementOfProfitLoss: pnl,
    statementOfChangesInEquity: {
      openingShareCapital,
      closingShareCapital,
      openingRetainedIncome: Math.max(0, openingRetained),
      currentYearNetProfit: currentNetProfit,
      closingRetainedIncome: Math.max(0, openingRetained) + currentNetProfit,
      totalOpeningEquity: openingShareCapital + Math.max(0, openingRetained),
      totalClosingEquity: balanceSheet.totalEquity,
    },
    statementOfCashFlows: cashFlow,
    notes: {
      note1BasisOfPreparation: 'The annual financial statements have been prepared in accordance with International Financial Reporting Standards for Small and Medium-sized Entities (IFRS for SMEs) and the South African Companies Act No. 71 of 2008. The financial statements have been prepared on the historical cost basis and incorporate the principal accounting policies set out below.',
      note2RevenueBreakdown: revenueNotes.length > 0 ? revenueNotes : [{ label: 'Gross Sales Revenue', amount: pnl.totalRevenue }],
      note3OperatingExpenses: expenseNotes,
      note4TradeReceivables: {
        grossReceivables: grossAR,
        allowanceForBadDebts: allowanceAR,
        netReceivables: arAsset?.amount || 0,
      },
      note5CashAndCashEquivalents: cashNotes.length > 0 ? cashNotes : [{ label: 'Main Bank Account Balance', amount: cashFlow.endingCashBalance }],
      note6TradeAndOtherPayables: {
        tradePayables: Math.max(0, otherPayables),
        clientCredits: clientCreditsLiability?.amount || 0,
        totalPayables: balanceSheet.totalLiabilities,
      },
    },
  };
}
