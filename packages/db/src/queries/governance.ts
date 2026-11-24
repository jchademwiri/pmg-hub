import { and, desc, eq, sql } from 'drizzle-orm';
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

  const [policyRows, payoutRows, rawPnl, banking, rollingRevRows] = await Promise.all([
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

  // 2-Gate Dividend Evaluator
  const ytdDirectorRemuneration = pnl.expenses.find((e) => e.accountCode === '5120')?.amount ?? 0;
  const payeBonusHeadroom = Math.max(
    0,
    Number((policy.payeTaxFreeThreshold - ytdDirectorRemuneration).toFixed(2)),
  );

  const profitGatePassed = pnl.netProfit > 0;
  const cashGatePassed = banking.trueSpendableCash > policy.minCashReserve;
  const payoutFraction = policy.payoutRatioPercent / 100;
  // Both Gate 1 (Net Profit) and Gate 2 (True Spendable Cash) require filling the R25,000
  // Base Reserve Floor first; at most 50% (payoutRatioPercent) of the excess above R25,000 is distributable.
  const maxByProfit = Math.max(0, (pnl.netProfit - policy.minCashReserve) * payoutFraction);
  const maxByCash = Math.max(
    0,
    (banking.trueSpendableCash - policy.minCashReserve) * payoutFraction,
  );
  const maxSafeDistribution =
    profitGatePassed && cashGatePassed ? Number(Math.min(maxByProfit, maxByCash).toFixed(2)) : 0;

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
