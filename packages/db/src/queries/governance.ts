import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  chartAccounts,
  dividendPayouts,
  dividendPolicies,
  journalEntries,
  journalLines,
  type DividendPayout,
} from '../schema';
import { getProfitAndLoss } from './accounting';
import { getBankingOverview } from './banking';
import { getCurrentFiscalYear } from './budgets';

export const VAT_COMPULSORY_THRESHOLD = 1_000_000;

export type FiscalQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/**
 * Returns the 3 YYYY-MM periods for each South African fiscal quarter (Mar–Feb).
 */
export function getFiscalQuarterMonths(
  fiscalYear: number,
): Record<FiscalQuarter, [string, string, string]> {
  const startYear = fiscalYear - 1;
  return {
    Q1: [`${startYear}-03`, `${startYear}-04`, `${startYear}-05`],
    Q2: [`${startYear}-06`, `${startYear}-07`, `${startYear}-08`],
    Q3: [`${startYear}-09`, `${startYear}-10`, `${startYear}-11`],
    Q4: [`${startYear}-12`, `${fiscalYear}-01`, `${fiscalYear}-02`],
  };
}

/**
 * Returns all completed (closed) quarters for a fiscal year as of `todayIso`.
 * A quarter is closed once its final month is strictly before the current calendar month.
 */
export function getClosedFiscalQuarters(fiscalYear: number, todayIso: string): FiscalQuarter[] {
  const currentPeriod = todayIso.slice(0, 7);
  const quarterMonths = getFiscalQuarterMonths(fiscalYear);
  const ordered: FiscalQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  return ordered.filter((q) => quarterMonths[q][2] < currentPeriod);
}

/**
 * Pure calculation for the Cumulative Carry-Forward Bonus Pool.
 *
 * - Earned Pool = payoutRatio% of closed-quarter net profit above the Base Reserve Floor.
 * - Remaining Unclaimed Pool = max(0, Earned Pool - Already Taken YTD).
 *   Unclaimed shares from earlier closed quarters automatically carry forward.
 * - Max Safe Distribution Today = min(Remaining Unclaimed Pool, True Spendable Cash above Floor).
 *   Once the pool is fully claimed, Max Safe Distribution drops to R0.00 (no halving loop).
 */
export function calculateCarryForwardBonusPool(input: {
  closedQuartersNetProfit: number;
  minCashReserve: number;
  payoutRatioPercent: number;
  totalDeclaredYtd: number;
  trueSpendableCash: number;
  closedQuartersCount: number;
}) {
  const payoutFraction = input.payoutRatioPercent / 100;
  const profitExcessAboveFloor = Math.max(0, input.closedQuartersNetProfit - input.minCashReserve);
  const cumulativeEarnedPool = Number((profitExcessAboveFloor * payoutFraction).toFixed(2));
  const remainingUnclaimedPool = Math.max(
    0,
    Number((cumulativeEarnedPool - input.totalDeclaredYtd).toFixed(2)),
  );
  const cashExcessAboveFloor = Math.max(
    0,
    Number((input.trueSpendableCash - input.minCashReserve).toFixed(2)),
  );
  const maxSafeDistribution =
    input.closedQuartersCount > 0 &&
    input.trueSpendableCash > input.minCashReserve &&
    remainingUnclaimedPool > 0
      ? Number(Math.min(remainingUnclaimedPool, cashExcessAboveFloor).toFixed(2))
      : 0;

  return {
    cumulativeEarnedPool,
    remainingUnclaimedPool,
    cashExcessAboveFloor,
    maxSafeDistribution,
  };
}

/**
 * South African Small Business Corporation (SBC — s12E) progressive tax tables.
 */
export function calculateSbcTax(taxableIncome: number): number {
  if (taxableIncome <= 95_750) return 0;
  if (taxableIncome <= 365_000) {
    return Number(((taxableIncome - 95_750) * 0.07).toFixed(2));
  }
  if (taxableIncome <= 550_000) {
    return Number((18_848 + (taxableIncome - 365_000) * 0.21).toFixed(2));
  }
  return Number((57_698 + (taxableIncome - 550_000) * 0.27).toFixed(2));
}

/**
 * Standard South African Corporate Income Tax (CIT) flat 27%.
 */
export function calculateStandardCit(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  return Number((taxableIncome * 0.27).toFixed(2));
}

export type GovernancePolicyView = {
  fiscalYear: number;
  minCashReserve: number;
  payoutRatioPercent: number;
  payeTaxFreeThreshold: number;
  dwtRatePercent: number;
  isSbcQualified: boolean;
};

export type GovernanceOverviewResult = {
  fiscalYear: number;
  policy: GovernancePolicyView;
  payouts: Array<{
    id: string;
    quarter: string;
    payoutDate: string;
    payoutType: 'director_bonus' | 'dividend';
    grossAmount: number;
    dwtWithheld: number;
    loanOffsetAmount: number;
    netCashPaid: number;
    solvencySignedOff: boolean;
    notes: string | null;
  }>;
  gates: {
    ytdNetProfit: number;
    closedQuarters: FiscalQuarter[];
    latestClosedQuarter: FiscalQuarter | null;
    closedQuartersNetProfit: number;
    cumulativeEarnedPool: number;
    totalDeclaredYtd: number;
    remainingUnclaimedPool: number;
    trueSpendableCash: number;
    chequeBalance: number;
    savingsBalance: number;
    taxReserveBalance: number;
    recommendedAccountCode: '1010' | '1020' | '1030';
    directorsLoanBalance: number;
    profitGatePassed: boolean;
    cashGatePassed: boolean;
    maxSafeDistribution: number;
    ytdDirectorRemuneration: number;
    payeBonusHeadroom: number;
    recommendedPayoutType: 'director_bonus' | 'dividend';
  };
  tax: {
    ytdProfitBeforeTax: number;
    estimatedSbcTax: number;
    estimatedStandardCit: number;
    activeEstimatedTax: number;
    alreadyProvisionedTax: number;
    remainingProvisionNeeded: number;
    sarsPayableBalance: number;
    irp6FirstDueDate: string;
    irp6SecondDueDate: string;
    rolling12MonthTurnover: number;
    vatThresholdPercent: number;
    vatStatus: 'safe' | 'approaching' | 'required';
  };
};

/**
 * Returns the complete Phase 5 governance state for a fiscal year:
 * - Dividend policy & payout history
 * - 2-Gate Quarterly Dividend Evaluator + 0% PAYE Bonus Headroom
 * - SARS Tax Provisioning (SBC vs 27% CIT), IRP6 dates, and VAT R1M tracker
 */
export async function getGovernanceOverview(
  fiscalYear: number,
  todayStr?: string,
): Promise<GovernanceOverviewResult> {
  const fyPeriodKey = `${fiscalYear}-FY`;
  const todayIso = todayStr ?? new Date().toISOString().slice(0, 10);
  const currentFy = getCurrentFiscalYear(todayIso);
  const isFutureFy = fiscalYear > currentFy;
  const twelveMonthsAgo = new Date(`${todayIso}T00:00:00Z`);
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const rollingStartDate = twelveMonthsAgo.toISOString().slice(0, 10);

  const closedQuarters = getClosedFiscalQuarters(fiscalYear, todayIso);
  const latestClosedQuarter =
    closedQuarters.length > 0 ? closedQuarters[closedQuarters.length - 1]! : null;
  const quarterMonthsMap = getFiscalQuarterMonths(fiscalYear);
  const closedQuarterPeriods = closedQuarters.flatMap((q) => quarterMonthsMap[q]);

  const [policyRows, payoutRows, rawPnl, banking, rollingRevRows, closedQtrGlRows] =
    await Promise.all([
      db
        .select()
        .from(dividendPolicies)
        .where(eq(dividendPolicies.fiscalYear, fiscalYear))
        .limit(1)
        .catch(() => []),
      db
        .select()
        .from(dividendPayouts)
        .where(eq(dividendPayouts.fiscalYear, fiscalYear))
        .orderBy(desc(dividendPayouts.payoutDate))
        .catch(() => [] as DividendPayout[]),
      getProfitAndLoss(fyPeriodKey),
      getBankingOverview(),
      db
        .select({
          totalDebits: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`,
          totalCredits: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
        .where(
          and(
            eq(journalEntries.status, 'posted'),
            eq(chartAccounts.type, 'revenue'),
            sql`${journalEntries.entryDate} >= ${rollingStartDate}`,
            sql`${journalEntries.entryDate} <= ${todayIso}`,
          ),
        )
        .catch(() => []),
      closedQuarterPeriods.length > 0 && !isFutureFy
        ? db
            .select({
              accountType: chartAccounts.type,
              totalDebits: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`,
              totalCredits: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`,
            })
            .from(journalLines)
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
            .where(
              and(
                eq(journalEntries.status, 'posted'),
                inArray(journalEntries.period, closedQuarterPeriods),
                inArray(chartAccounts.type, ['revenue', 'expense']),
                sql`COALESCE(${journalEntries.sourceModule}, '') != 'governance'`,
              ),
            )
            .groupBy(chartAccounts.type)
            .catch(() => [])
        : Promise.resolve([]),
    ]);

  const pnl = isFutureFy
    ? {
        period: fyPeriodKey,
        revenue: [],
        expenses: [],
        totalRevenue: 0,
        totalExpenses: 0,
        operatingProfit: 0,
        otherIncome: 0,
        netProfitBeforeTax: 0,
        incomeTaxExpense: 0,
        netProfit: 0,
      }
    : rawPnl;

  const rawPolicy = policyRows[0];
  const policy: GovernancePolicyView = {
    fiscalYear,
    minCashReserve: Number(rawPolicy?.minCashReserve ?? 25000),
    payoutRatioPercent: Number(rawPolicy?.payoutRatioPercent ?? 50),
    payeTaxFreeThreshold: Number(rawPolicy?.payeTaxFreeThreshold ?? 95750),
    dwtRatePercent: Number(rawPolicy?.dwtRatePercent ?? 20),
    isSbcQualified: rawPolicy?.isSbcQualified ?? true,
  };

  // Tax calculations
  const alreadyProvisionedTax = pnl.expenses.find((e) => e.accountCode === '5160')?.amount ?? 0;
  const ytdProfitBeforeTax = pnl.netProfit + alreadyProvisionedTax;
  const estimatedSbcTax = calculateSbcTax(ytdProfitBeforeTax);
  const estimatedStandardCit = calculateStandardCit(ytdProfitBeforeTax);
  const activeEstimatedTax = policy.isSbcQualified ? estimatedSbcTax : estimatedStandardCit;
  const remainingProvisionNeeded = Math.max(
    0,
    Number((activeEstimatedTax - alreadyProvisionedTax).toFixed(2)),
  );

  // Rolling 12-month turnover for VAT R1M tracker
  const rollingRow = rollingRevRows[0];
  const rolling12MonthTurnover = rollingRow
    ? Math.max(0, Number(rollingRow.totalCredits || 0) - Number(rollingRow.totalDebits || 0))
    : 0;
  const vatThresholdPercent = Number(
    ((rolling12MonthTurnover / VAT_COMPULSORY_THRESHOLD) * 100).toFixed(1),
  );
  const vatStatus: 'safe' | 'approaching' | 'required' =
    vatThresholdPercent >= 100 ? 'required' : vatThresholdPercent >= 75 ? 'approaching' : 'safe';

  // 2-Gate Dividend Evaluator (Closed-Quarter Cumulative Carry-Forward Pool)
  const ytdDirectorRemuneration = pnl.expenses.find((e) => e.accountCode === '5120')?.amount ?? 0;
  const payeBonusHeadroom = Math.max(
    0,
    Number((policy.payeTaxFreeThreshold - ytdDirectorRemuneration).toFixed(2)),
  );

  const closedQtrRevenue = closedQtrGlRows
    .filter((r) => r.accountType === 'revenue')
    .reduce((sum, r) => sum + (Number(r.totalCredits || 0) - Number(r.totalDebits || 0)), 0);
  const closedQtrExpenses = closedQtrGlRows
    .filter((r) => r.accountType === 'expense')
    .reduce((sum, r) => sum + (Number(r.totalDebits || 0) - Number(r.totalCredits || 0)), 0);
  const closedQuartersNetProfit = Number((closedQtrRevenue - closedQtrExpenses).toFixed(2));

  const totalDeclaredYtd = Number(
    payoutRows
      .filter((p) => p.payoutDate <= todayIso)
      .reduce((sum, p) => sum + Number(p.grossAmount || 0), 0)
      .toFixed(2),
  );

  const profitGatePassed = closedQuarters.length > 0 && closedQuartersNetProfit > 0;
  const cashGatePassed = banking.trueSpendableCash > policy.minCashReserve;

  const { cumulativeEarnedPool, remainingUnclaimedPool, maxSafeDistribution } =
    calculateCarryForwardBonusPool({
      closedQuartersNetProfit,
      minCashReserve: policy.minCashReserve,
      payoutRatioPercent: policy.payoutRatioPercent,
      totalDeclaredYtd,
      trueSpendableCash: banking.trueSpendableCash,
      closedQuartersCount: closedQuarters.length,
    });

  const startYear = fiscalYear - 1;
  const irp6FirstDueDate = `${startYear}-08-31`;
  const irp6SecondDueDate = `${fiscalYear}-02-28`;

  return {
    fiscalYear,
    policy,
    payouts: payoutRows.map((p) => ({
      id: p.id,
      quarter: p.quarter,
      payoutDate: p.payoutDate,
      payoutType: p.payoutType,
      grossAmount: Number(p.grossAmount),
      dwtWithheld: Number(p.dwtWithheld),
      loanOffsetAmount: Number(p.loanOffsetAmount),
      netCashPaid: Number(p.netCashPaid),
      solvencySignedOff: p.solvencySignedOff,
      notes: p.notes,
    })),
    gates: {
      ytdNetProfit: pnl.netProfit,
      closedQuarters,
      latestClosedQuarter,
      closedQuartersNetProfit,
      cumulativeEarnedPool,
      totalDeclaredYtd,
      remainingUnclaimedPool,
      trueSpendableCash: banking.trueSpendableCash,
      chequeBalance: banking.chequeBalance,
      savingsBalance: banking.savingsBalance,
      taxReserveBalance: banking.taxReserveBalance,
      recommendedAccountCode:
        banking.chequeBalance >= maxSafeDistribution && banking.chequeBalance > 0
          ? '1010'
          : banking.savingsBalance > banking.chequeBalance
            ? '1020'
            : '1010',
      directorsLoanBalance: banking.directorsLoanBalance,
      profitGatePassed,
      cashGatePassed,
      maxSafeDistribution,
      ytdDirectorRemuneration,
      payeBonusHeadroom,
      recommendedPayoutType: payeBonusHeadroom > 0 ? 'director_bonus' : 'dividend',
    },
    tax: {
      ytdProfitBeforeTax,
      estimatedSbcTax,
      estimatedStandardCit,
      activeEstimatedTax,
      alreadyProvisionedTax,
      remainingProvisionNeeded,
      sarsPayableBalance: banking.sarsPayableBalance,
      irp6FirstDueDate,
      irp6SecondDueDate,
      rolling12MonthTurnover,
      vatThresholdPercent,
      vatStatus,
    },
  };
}

/**
 * Upserts the dividend & tax governance policy for a fiscal year.
 */
export async function upsertDividendPolicy(data: GovernancePolicyView) {
  const now = new Date();
  await db
    .insert(dividendPolicies)
    .values({
      fiscalYear: data.fiscalYear,
      minCashReserve: data.minCashReserve.toFixed(2),
      payoutRatioPercent: data.payoutRatioPercent.toFixed(2),
      payeTaxFreeThreshold: data.payeTaxFreeThreshold.toFixed(2),
      dwtRatePercent: data.dwtRatePercent.toFixed(2),
      isSbcQualified: data.isSbcQualified,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [dividendPolicies.fiscalYear],
      set: {
        minCashReserve: data.minCashReserve.toFixed(2),
        payoutRatioPercent: data.payoutRatioPercent.toFixed(2),
        payeTaxFreeThreshold: data.payeTaxFreeThreshold.toFixed(2),
        dwtRatePercent: data.dwtRatePercent.toFixed(2),
        isSbcQualified: data.isSbcQualified,
        updatedAt: now,
      },
    });
}
