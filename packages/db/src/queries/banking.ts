import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  bankReconciliations,
  chartAccounts,
  distributionSettings,
  journalEntries,
  journalLines,
  type BankReconciliation,
} from '../schema';
import { getTrialBalance } from './accounting';

export type BankAccountCode = '1010' | '1020' | '1030';

export type BankMovementRow = {
  id: string;
  entryNumber: string;
  entryDate: string;
  period: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  sourceModule: string | null;
};

export type BankingOverviewResult = {
  chequeBalance: number;
  savingsBalance: number;
  taxReserveBalance: number;
  totalBankCash: number;
  sarsPayableBalance: number;
  directorsLoanBalance: number;
  trueSpendableCash: number;
  recentMovements: BankMovementRow[];
  reconciliations: BankReconciliation[];
  isFy2027PmgShareSunset: boolean;
  isFy2027OpeningReconciled: boolean;
};

export type PeriodReconciliationStatus = {
  period: string;
  chequeRecord: BankReconciliation | null;
  savingsRecord: BankReconciliation | null;
  taxReserveRecord: BankReconciliation | null;
  isChequeReconciled: boolean;
  isSavingsReconciled: boolean;
  isFullyReconciled: boolean;
};

/**
 * Returns live GL bank & treasury balances, True Spendable Cash, recent bank
 * movements, reconciliation history, and FY2027/28 transition status.
 */
export async function getBankingOverview(asOfDate?: string): Promise<BankingOverviewResult> {
  const [trialBalance, recentRows, reconciliations, sunsetRows] = await Promise.all([
    getTrialBalance(undefined, undefined, undefined, asOfDate),
    db
      .select({
        id: journalLines.id,
        entryNumber: journalEntries.entryNumber,
        entryDate: journalEntries.entryDate,
        period: journalEntries.period,
        accountCode: chartAccounts.code,
        accountName: chartAccounts.name,
        description: journalEntries.description,
        debit: sql<string>`COALESCE(${journalLines.debit}, '0')`,
        credit: sql<string>`COALESCE(${journalLines.credit}, '0')`,
        sourceModule: journalEntries.sourceModule,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
      .where(
        and(
          eq(journalEntries.status, 'posted'),
          inArray(chartAccounts.code, ['1010', '1020', '1030', '1250']),
          ...(asOfDate ? [sql`${journalEntries.entryDate} <= ${asOfDate}`] : []),
        ),
      )
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
      .limit(15),
    db
      .select()
      .from(bankReconciliations)
      .orderBy(desc(bankReconciliations.period), asc(bankReconciliations.accountCode))
      .limit(50)
      .catch(() => [] as BankReconciliation[]),
    db
      .select({
        id: distributionSettings.id,
        rateValue: distributionSettings.rateValue,
        effectiveFrom: distributionSettings.effectiveFrom,
      })
      .from(distributionSettings)
      .where(
        and(
          eq(distributionSettings.rateKey, 'pmg_share'),
          sql`${distributionSettings.effectiveFrom} >= '2027-03-01'`,
          sql`${distributionSettings.rateValue}::numeric = 0`,
        ),
      )
      .limit(1)
      .catch(() => []),
  ]);

  const byCode = new Map(trialBalance.map((r) => [r.accountCode, r]));
  const chequeBalance = byCode.get('1010')?.balance ?? 0;
  const savingsBalance = byCode.get('1020')?.balance ?? 0;
  const taxReserveBalance = byCode.get('1030')?.balance ?? 0;
  const directorsLoanBalance = byCode.get('1250')?.balance ?? 0;
  // 2160 is a liability (normal credit balance): positive means owed to SARS
  const sarsRow = byCode.get('2160');
  const sarsPayableBalance = sarsRow ? sarsRow.totalCredits - sarsRow.totalDebits : 0;

  const totalBankCash = chequeBalance + savingsBalance + taxReserveBalance;
  const trueSpendableCash = totalBankCash - Math.max(0, sarsPayableBalance);

  const isFy2027OpeningReconciled = reconciliations.some(
    (r) => r.period === '2027-02' && r.accountCode === '1010' && r.status === 'reconciled',
  );

  return {
    chequeBalance,
    savingsBalance,
    taxReserveBalance,
    totalBankCash,
    sarsPayableBalance,
    directorsLoanBalance,
    trueSpendableCash,
    recentMovements: recentRows.map((r) => ({
      ...r,
      debit: Number(r.debit),
      credit: Number(r.credit),
    })),
    reconciliations,
    isFy2027PmgShareSunset: sunsetRows.length > 0,
    isFy2027OpeningReconciled,
  };
}

/**
 * Checks whether a closing period has zero-variance bank reconciliation records.
 */
export async function getReconciliationForPeriod(
  period: string,
): Promise<PeriodReconciliationStatus> {
  const rows = await db
    .select()
    .from(bankReconciliations)
    .where(eq(bankReconciliations.period, period))
    .catch(() => [] as BankReconciliation[]);

  const chequeRecord = rows.find((r) => r.accountCode === '1010') ?? null;
  const savingsRecord = rows.find((r) => r.accountCode === '1020') ?? null;
  const taxReserveRecord = rows.find((r) => r.accountCode === '1030') ?? null;

  const isChequeReconciled = chequeRecord?.status === 'reconciled';
  const isSavingsReconciled = savingsRecord ? savingsRecord.status === 'reconciled' : true;

  return {
    period,
    chequeRecord,
    savingsRecord,
    taxReserveRecord,
    isChequeReconciled,
    isSavingsReconciled,
    isFullyReconciled: isChequeReconciled && isSavingsReconciled,
  };
}

/**
 * Inserts or updates the authoritative bank reconciliation record for (period, accountCode).
 */
export async function upsertBankReconciliation(data: {
  period: string;
  accountCode: BankAccountCode;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  variance: number;
  adjustmentJournalId?: string | null;
  status: 'reconciled' | 'variance';
  notes?: string | null;
  reconciledBy?: string | null;
}): Promise<BankReconciliation> {
  const now = new Date();
  const [row] = await db
    .insert(bankReconciliations)
    .values({
      period: data.period,
      accountCode: data.accountCode,
      statementDate: data.statementDate,
      statementBalance: data.statementBalance.toFixed(2),
      bookBalance: data.bookBalance.toFixed(2),
      variance: data.variance.toFixed(2),
      adjustmentJournalId: data.adjustmentJournalId ?? null,
      status: data.status,
      notes: data.notes ?? null,
      reconciledBy: data.reconciledBy ?? null,
      reconciledAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [bankReconciliations.period, bankReconciliations.accountCode],
      set: {
        statementDate: data.statementDate,
        statementBalance: data.statementBalance.toFixed(2),
        bookBalance: data.bookBalance.toFixed(2),
        variance: data.variance.toFixed(2),
        adjustmentJournalId: data.adjustmentJournalId ?? null,
        status: data.status,
        notes: data.notes ?? null,
        reconciledBy: data.reconciledBy ?? null,
        reconciledAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return row!;
}
