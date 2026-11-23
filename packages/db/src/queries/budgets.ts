import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  budgetMonthlyPlan,
  budgetRevenueTargets,
  chartAccounts,
  divisions,
  journalEntries,
  journalLines,
  snapshots,
} from '../schema';

export function getFiscalYearPeriods(fiscalYear: number): string[] {
  const startYear = fiscalYear - 1;
  const periods: string[] = [];
  for (let m = 3; m <= 12; m++) {
    periods.push(`${startYear}-${String(m).padStart(2, '0')}`);
  }
  periods.push(`${fiscalYear}-01`);
  periods.push(`${fiscalYear}-02`);
  return periods;
}

export function formatFiscalYearLabel(fiscalYear: number): string {
  const startYear = fiscalYear - 1;
  return `FY${startYear}/${String(fiscalYear).slice(-2)}`;
}

export type BudgetMonthRow = {
  period: string;
  isClosed: boolean;
  revenueTarget: number;
  actualRevenue: number;
  revenueVariance: number;
  expenseBudget: number;
  directorSalaryBudget: number;
  totalExpenseBudget: number;
  actualExpenses: number;
  expenseVariance: number;
  taxReserveTarget: number;
  budgetedProfit: number;
  actualProfit: number;
  notes: string | null;
  divisionTargets: Array<{ divisionId: string; divisionName: string; targetAmount: number }>;
};

export type DivisionBudgetSummaryRow = {
  divisionId: string;
  divisionName: string;
  annualTarget: number;
  actualRevenue: number;
  attainmentPercent: number;
};

export type FiscalYearBudgetOverview = {
  fiscalYear: number;
  label: string;
  startPeriod: string;
  endPeriod: string;
  hasBudget: boolean;
  months: BudgetMonthRow[];
  divisions: Array<{ id: string; name: string }>;
  divisionSummary: DivisionBudgetSummaryRow[];
  totals: {
    revenueTarget: number;
    actualRevenue: number;
    revenueAttainmentPercent: number;
    expenseBudget: number;
    directorSalaryBudget: number;
    totalExpenseBudget: number;
    actualExpenses: number;
    taxReserveTarget: number;
    budgetedProfit: number;
    actualProfit: number;
  };
};

/**
 * Returns the 12-month Budget vs. Actuals matrix for a South African fiscal year
 * (Mar–Feb). Closed months pull locked figures from `snapshots`, while open months
 * pull live posted GL figures from `journal_entries` + `journal_lines`.
 */
export async function getBudgetVsActualsForFiscalYear(
  fiscalYear: number,
): Promise<FiscalYearBudgetOverview> {
  const periods = getFiscalYearPeriods(fiscalYear);

  const [planRows, divTargetRows, snapshotRows, allDivisions, glMonthlyRows, glDivRows] =
    await Promise.all([
      db
        .select()
        .from(budgetMonthlyPlan)
        .where(eq(budgetMonthlyPlan.fiscalYear, fiscalYear))
        .orderBy(asc(budgetMonthlyPlan.period))
        .catch(() => []),
      db
        .select({
          period: budgetRevenueTargets.period,
          divisionId: budgetRevenueTargets.divisionId,
          targetAmount: budgetRevenueTargets.targetAmount,
        })
        .from(budgetRevenueTargets)
        .where(eq(budgetRevenueTargets.fiscalYear, fiscalYear))
        .catch(() => []),
      db
        .select({
          period: snapshots.period,
          revenue: snapshots.revenue,
          expenses: snapshots.expenses,
        })
        .from(snapshots)
        .where(inArray(snapshots.period, periods))
        .catch(() => []),
      db
        .select({ id: divisions.id, name: divisions.name })
        .from(divisions)
        .orderBy(asc(divisions.name)),
      db
        .select({
          period: journalEntries.period,
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
            inArray(journalEntries.period, periods),
            inArray(chartAccounts.type, ['revenue', 'expense']),
          ),
        )
        .groupBy(journalEntries.period, chartAccounts.type)
        .catch(() => []),
      db
        .select({
          divisionId: journalEntries.divisionId,
          totalDebits: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`,
          totalCredits: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
        .where(
          and(
            eq(journalEntries.status, 'posted'),
            inArray(journalEntries.period, periods),
            eq(chartAccounts.type, 'revenue'),
          ),
        )
        .groupBy(journalEntries.divisionId)
        .catch(() => []),
    ]);

  const planByPeriod = new Map(planRows.map((p) => [p.period, p]));
  const snapByPeriod = new Map(snapshotRows.map((s) => [s.period, s]));
  const divNameMap = new Map(allDivisions.map((d) => [d.id, d.name]));

  // Live GL actuals per period
  const glRevByPeriod = new Map<string, number>();
  const glExpByPeriod = new Map<string, number>();
  for (const r of glMonthlyRows) {
    const debits = Number(r.totalDebits || 0);
    const credits = Number(r.totalCredits || 0);
    if (r.accountType === 'revenue') {
      glRevByPeriod.set(r.period, (glRevByPeriod.get(r.period) ?? 0) + (credits - debits));
    } else if (r.accountType === 'expense') {
      glExpByPeriod.set(r.period, (glExpByPeriod.get(r.period) ?? 0) + (debits - credits));
    }
  }

  // Division actual revenue for the FY
  const divActualMap = new Map<string, number>();
  for (const r of glDivRows) {
    const rev = Number(r.totalCredits || 0) - Number(r.totalDebits || 0);
    divActualMap.set(r.divisionId, rev);
  }

  // Division targets grouped by period and summed for FY
  const targetsByPeriod = new Map<string, Map<string, number>>();
  const annualDivTargetMap = new Map<string, number>();
  for (const dt of divTargetRows) {
    const amt = Number(dt.targetAmount || 0);
    if (!targetsByPeriod.has(dt.period)) targetsByPeriod.set(dt.period, new Map());
    targetsByPeriod.get(dt.period)!.set(dt.divisionId, amt);
    annualDivTargetMap.set(dt.divisionId, (annualDivTargetMap.get(dt.divisionId) ?? 0) + amt);
  }

  const months: BudgetMonthRow[] = periods.map((period) => {
    const plan = planByPeriod.get(period);
    const snap = snapByPeriod.get(period);
    const isClosed = Boolean(snap);

    const revenueTarget = Number(plan?.revenueTarget ?? 0);
    const expenseBudget = Number(plan?.expenseBudget ?? 0);
    const directorSalaryBudget = Number(plan?.directorSalaryBudget ?? 0);
    const totalExpenseBudget = expenseBudget + directorSalaryBudget;
    const taxReserveTarget = Number(plan?.taxReserveTarget ?? 0);

    const actualRevenue = isClosed ? Number(snap!.revenue ?? 0) : (glRevByPeriod.get(period) ?? 0);
    const actualExpenses = isClosed
      ? Number(snap!.expenses ?? 0)
      : (glExpByPeriod.get(period) ?? 0);

    const budgetedProfit = revenueTarget - totalExpenseBudget;
    const actualProfit = actualRevenue - actualExpenses;

    const pDivMap = targetsByPeriod.get(period);
    const divisionTargets = allDivisions.map((d) => ({
      divisionId: d.id,
      divisionName: d.name,
      targetAmount: pDivMap?.get(d.id) ?? 0,
    }));

    return {
      period,
      isClosed,
      revenueTarget,
      actualRevenue,
      revenueVariance: actualRevenue - revenueTarget,
      expenseBudget,
      directorSalaryBudget,
      totalExpenseBudget,
      actualExpenses,
      expenseVariance: totalExpenseBudget - actualExpenses, // positive = under budget (good)
      taxReserveTarget,
      budgetedProfit,
      actualProfit,
      notes: plan?.notes ?? null,
      divisionTargets,
    };
  });

  const totals = months.reduce(
    (acc, m) => ({
      revenueTarget: acc.revenueTarget + m.revenueTarget,
      actualRevenue: acc.actualRevenue + m.actualRevenue,
      expenseBudget: acc.expenseBudget + m.expenseBudget,
      directorSalaryBudget: acc.directorSalaryBudget + m.directorSalaryBudget,
      totalExpenseBudget: acc.totalExpenseBudget + m.totalExpenseBudget,
      actualExpenses: acc.actualExpenses + m.actualExpenses,
      taxReserveTarget: acc.taxReserveTarget + m.taxReserveTarget,
      budgetedProfit: acc.budgetedProfit + m.budgetedProfit,
      actualProfit: acc.actualProfit + m.actualProfit,
    }),
    {
      revenueTarget: 0,
      actualRevenue: 0,
      expenseBudget: 0,
      directorSalaryBudget: 0,
      totalExpenseBudget: 0,
      actualExpenses: 0,
      taxReserveTarget: 0,
      budgetedProfit: 0,
      actualProfit: 0,
    },
  );

  const revenueAttainmentPercent =
    totals.revenueTarget > 0 ? (totals.actualRevenue / totals.revenueTarget) * 100 : 0;

  const divisionSummary: DivisionBudgetSummaryRow[] = allDivisions.map((d) => {
    const annualTarget = annualDivTargetMap.get(d.id) ?? 0;
    const actualRevenue = divActualMap.get(d.id) ?? 0;
    return {
      divisionId: d.id,
      divisionName: divNameMap.get(d.id) ?? d.name,
      annualTarget,
      actualRevenue,
      attainmentPercent: annualTarget > 0 ? (actualRevenue / annualTarget) * 100 : 0,
    };
  });

  return {
    fiscalYear,
    label: formatFiscalYearLabel(fiscalYear),
    startPeriod: periods[0]!,
    endPeriod: periods[periods.length - 1]!,
    hasBudget: planRows.length > 0,
    months,
    divisions: allDivisions,
    divisionSummary,
    totals: {
      ...totals,
      revenueAttainmentPercent,
    },
  };
}

/**
 * Upserts a single month's budget plan and optional per-division revenue targets.
 */
export async function upsertMonthlyBudgetPlan(data: {
  fiscalYear: number;
  period: string;
  revenueTarget: number;
  expenseBudget: number;
  directorSalaryBudget: number;
  taxReserveTarget: number;
  notes?: string | null;
  divisionTargets?: Array<{ divisionId: string; targetAmount: number }>;
}) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(budgetMonthlyPlan)
      .values({
        fiscalYear: data.fiscalYear,
        period: data.period,
        revenueTarget: data.revenueTarget.toFixed(2),
        expenseBudget: data.expenseBudget.toFixed(2),
        directorSalaryBudget: data.directorSalaryBudget.toFixed(2),
        taxReserveTarget: data.taxReserveTarget.toFixed(2),
        notes: data.notes ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [budgetMonthlyPlan.period],
        set: {
          fiscalYear: data.fiscalYear,
          revenueTarget: data.revenueTarget.toFixed(2),
          expenseBudget: data.expenseBudget.toFixed(2),
          directorSalaryBudget: data.directorSalaryBudget.toFixed(2),
          taxReserveTarget: data.taxReserveTarget.toFixed(2),
          notes: data.notes ?? null,
          updatedAt: now,
        },
      });

    if (data.divisionTargets && data.divisionTargets.length > 0) {
      for (const dt of data.divisionTargets) {
        await tx
          .insert(budgetRevenueTargets)
          .values({
            fiscalYear: data.fiscalYear,
            period: data.period,
            divisionId: dt.divisionId,
            targetAmount: dt.targetAmount.toFixed(2),
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [budgetRevenueTargets.period, budgetRevenueTargets.divisionId],
            set: {
              fiscalYear: data.fiscalYear,
              targetAmount: dt.targetAmount.toFixed(2),
              updatedAt: now,
            },
          });
      }
    }
  });
}

// Seasonal weights across SA fiscal year (Mar–Feb) summing to 1.00:
// Lighter in Dec/Jan SA holiday period; stronger in Q2–Q3 tender season.
const SEASONAL_WEIGHTS = [
  0.075, // Mar
  0.08, // Apr
  0.085, // May
  0.09, // Jun
  0.095, // Jul
  0.095, // Aug
  0.095, // Sep
  0.095, // Oct
  0.09, // Nov
  0.055, // Dec
  0.06, // Jan
  0.085, // Feb
];

/**
 * Seeds a seasonalized R240,000 annual plan (TES R210k | AWS R18k | PMG R12k)
 * for the specified fiscal year (e.g. 2028 = FY2027/28).
 */
export async function seedSeasonalizedBudgetPlan(fiscalYear: number) {
  const periods = getFiscalYearPeriods(fiscalYear);
  const allDivisions = await db.select({ id: divisions.id, name: divisions.name }).from(divisions);

  const tesDiv = allDivisions.find((d) => d.name.toLowerCase().includes('tender'));
  const awsDiv = allDivisions.find((d) => d.name.toLowerCase().includes('apex'));
  const pmgDiv = allDivisions.find((d) => d.name.toLowerCase().includes('playhouse'));

  const ANNUAL_TES = 210000;
  const ANNUAL_AWS = 18000;
  const ANNUAL_PMG = 12000;
  const MONTHLY_OPEX = 3500;
  const MONTHLY_DIRECTOR_SALARY = 5000;
  const MONTHLY_TAX_RESERVE = 1500;

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i]!;
    const w = SEASONAL_WEIGHTS[i]!;

    const tesAmt = Math.round(ANNUAL_TES * w);
    const awsAmt = Math.round(ANNUAL_AWS * w);
    const pmgAmt = Math.round(ANNUAL_PMG * w);
    const revTotal = tesAmt + awsAmt + pmgAmt;

    const divisionTargets: Array<{ divisionId: string; targetAmount: number }> = [];
    if (tesDiv) divisionTargets.push({ divisionId: tesDiv.id, targetAmount: tesAmt });
    if (awsDiv) divisionTargets.push({ divisionId: awsDiv.id, targetAmount: awsAmt });
    if (pmgDiv) divisionTargets.push({ divisionId: pmgDiv.id, targetAmount: pmgAmt });

    await upsertMonthlyBudgetPlan({
      fiscalYear,
      period,
      revenueTarget: revTotal,
      expenseBudget: MONTHLY_OPEX,
      directorSalaryBudget: MONTHLY_DIRECTOR_SALARY,
      taxReserveTarget: MONTHLY_TAX_RESERVE,
      notes: 'Seeded FY2027/28 seasonalized R240k plan',
      divisionTargets,
    });
  }
}
