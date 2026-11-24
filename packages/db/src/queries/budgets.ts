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

/**
 * Returns the South African fiscal year (ending year) for an ISO date or YYYY-MM string.
 * E.g. '2026-11-23' -> 2027 (FY2026/27, Mar 2026 – Feb 2027).
 */
export function getCurrentFiscalYear(dateStr?: string): number {
  const iso = dateStr ?? new Date().toISOString().slice(0, 10);
  const [yStr, mStr] = iso.split('-');
  const year = parseInt(yStr || '2026', 10);
  const month = parseInt(mStr || '1', 10);
  return month >= 3 ? year + 1 : year;
}

export function getPeriodFiscalYear(period: string): number {
  const [yStr, mStr] = period.split('-');
  const year = parseInt(yStr || '2026', 10);
  const month = parseInt(mStr || '1', 10);
  return month >= 3 ? year + 1 : year;
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

export type FiscalYearOption = {
  value: number;
  label: string;
};

export type FiscalYearBudgetOverview = {
  fiscalYear: number;
  label: string;
  startPeriod: string;
  endPeriod: string;
  hasBudget: boolean;
  availableFiscalYears: FiscalYearOption[];
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

  // Auto-seed the planned FY2026/27 (2027 = R100k) or FY2027/28 (2028 = R240k) seasonalized budget once if not yet present
  if (fiscalYear === 2027 || fiscalYear === 2028) {
    const existingPlan = await db
      .select({ id: budgetMonthlyPlan.id })
      .from(budgetMonthlyPlan)
      .where(eq(budgetMonthlyPlan.fiscalYear, fiscalYear))
      .limit(1)
      .catch(() => []);
    if (existingPlan.length === 0) {
      await seedSeasonalizedBudgetPlan(fiscalYear).catch(() => {});
    }
  }

  const [
    planRows,
    divTargetRows,
    snapshotRows,
    allDivisions,
    glMonthlyRows,
    glDivRows,
    distinctBudgetFys,
    distinctSnapPeriods,
    distinctGlPeriods,
  ] = await Promise.all([
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
    db
      .selectDistinct({ fiscalYear: budgetMonthlyPlan.fiscalYear })
      .from(budgetMonthlyPlan)
      .catch(() => []),
    db
      .selectDistinct({ period: snapshots.period })
      .from(snapshots)
      .catch(() => []),
    db
      .selectDistinct({ period: journalEntries.period })
      .from(journalEntries)
      .where(eq(journalEntries.status, 'posted'))
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

  // Build dynamic list of fiscal years from actual DB records + current FY + planned FY2027/28 (2028)
  const fySet = new Set<number>([getCurrentFiscalYear(), 2028, fiscalYear]);
  for (const row of distinctBudgetFys) {
    if (row.fiscalYear >= 2024 && row.fiscalYear <= 2040) fySet.add(row.fiscalYear);
  }
  for (const row of distinctSnapPeriods) {
    if (row.period) fySet.add(getPeriodFiscalYear(row.period));
  }
  for (const row of distinctGlPeriods) {
    if (row.period) fySet.add(getPeriodFiscalYear(row.period));
  }
  const availableFiscalYears: FiscalYearOption[] = Array.from(fySet)
    .filter((fy) => fy >= 2027 && fy <= 2040)
    .sort((a, b) => a - b)
    .map((fy) => ({
      value: fy,
      label: `${formatFiscalYearLabel(fy)} (Mar ${fy - 1} – Feb ${fy})`,
    }));

  return {
    fiscalYear,
    label: formatFiscalYearLabel(fiscalYear),
    startPeriod: periods[0]!,
    endPeriod: periods[periods.length - 1]!,
    hasBudget: planRows.length > 0,
    availableFiscalYears,
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

// Exact monthly targets from PMG_FY2027_28_Financial_Plan.xlsx:
// - Sheet 1 (Transition Runway Nov 2026–Feb 2027) & FY2026/27 R100,000 plan (Dec R10,000, Jan R4,000, Feb R12,000)
// - Sheet 2 (FY2027/28 R240,000 Seasonalized Plan: TES R210k | AWS R18k | PMG R12k, with Dec R13,000 & Jan R7,500)
const FY2027_MONTHLY_TARGETS: Array<{
  tes: number;
  aws: number;
  pmg: number;
  opex: number;
  salary: number;
  taxReserve: number;
}> = [
  { tes: 5500, aws: 500, pmg: 300, opex: 1600, salary: 0, taxReserve: 500 }, // Mar 2026 (R6,300)
  { tes: 6500, aws: 550, pmg: 350, opex: 1600, salary: 0, taxReserve: 500 }, // Apr 2026 (R7,400)
  { tes: 7000, aws: 600, pmg: 400, opex: 1600, salary: 0, taxReserve: 500 }, // May 2026 (R8,000)
  { tes: 7400, aws: 650, pmg: 450, opex: 1600, salary: 0, taxReserve: 500 }, // Jun 2026 (R8,500)
  { tes: 7800, aws: 700, pmg: 500, opex: 1600, salary: 0, taxReserve: 500 }, // Jul 2026 (R9,000)
  { tes: 8300, aws: 700, pmg: 500, opex: 1600, salary: 0, taxReserve: 500 }, // Aug 2026 (R9,500)
  { tes: 8300, aws: 700, pmg: 500, opex: 1600, salary: 0, taxReserve: 500 }, // Sep 2026 (R9,500)
  { tes: 8550, aws: 750, pmg: 500, opex: 1600, salary: 0, taxReserve: 500 }, // Oct 2026 (R9,800)
  { tes: 7000, aws: 600, pmg: 400, opex: 1600, salary: 0, taxReserve: 500 }, // Nov 2026 (R8,000)
  { tes: 8750, aws: 750, pmg: 500, opex: 1600, salary: 0, taxReserve: 500 }, // Dec 2026 (R10,000 — agreed R8k–R10k before 18 Dec holiday close)
  { tes: 3500, aws: 300, pmg: 200, opex: 1600, salary: 0, taxReserve: 500 }, // Jan 2027 (R4,000 — agreed slow Jan month)
  { tes: 8900, aws: 700, pmg: 400, opex: 1600, salary: 0, taxReserve: 500 }, // Feb 2027 (R10,000 — year-end recovery; FY total = R100,000)
];

const FY2028_MONTHLY_TARGETS: Array<{
  tes: number;
  aws: number;
  pmg: number;
  opex: number;
  salary: number;
  taxReserve: number;
}> = [
  { tes: 18500, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1220 }, // Mar 2027 (R21,000)
  { tes: 17000, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1070 }, // Apr 2027 (R19,500)
  { tes: 18250, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1195 }, // May 2027 (R20,750)
  { tes: 18750, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1245 }, // Jun 2027 (R21,250)
  { tes: 19500, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1320 }, // Jul 2027 (R22,000)
  { tes: 21000, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1470 }, // Aug 2027 (R23,500)
  { tes: 20500, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1420 }, // Sep 2027 (R23,000)
  { tes: 22000, aws: 1750, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1595 }, // Oct 2027 (R24,750)
  { tes: 20500, aws: 1750, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1445 }, // Nov 2027 (R23,250)
  { tes: 10750, aws: 1250, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 420 }, // Dec 2027 (R13,000)
  { tes: 5250, aws: 1250, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 0 }, // Jan 2028 (R7,500)
  { tes: 18000, aws: 1500, pmg: 1000, opex: 3800, salary: 5000, taxReserve: 1170 }, // Feb 2028 (R20,500)
];

/**
 * Seeds the seasonalized annual budget plan from PMG_FY2027_28_Financial_Plan.xlsx:
 * - FY2026/27 (2027): R100,000 (TES R87,500 | AWS R7,500 | PMG R5,000), Dec R10,000, Jan R4,000, Feb R10,000
 * - FY2027/28 (2028): R240,000 (TES R210,000 | AWS R18,000 | PMG R12,000) matching Sheet 2 of the Excel Financial Plan
 */
export async function seedSeasonalizedBudgetPlan(fiscalYear: number) {
  const periods = getFiscalYearPeriods(fiscalYear);
  const allDivisions = await db.select({ id: divisions.id, name: divisions.name }).from(divisions);

  const tesDiv = allDivisions.find((d) => d.name.toLowerCase().includes('tender'));
  const awsDiv = allDivisions.find((d) => d.name.toLowerCase().includes('apex'));
  const pmgDiv = allDivisions.find((d) => d.name.toLowerCase().includes('playhouse'));

  const isFy2027 = fiscalYear === 2027;
  const schedule = isFy2027 ? FY2027_MONTHLY_TARGETS : FY2028_MONTHLY_TARGETS;
  const PLAN_NOTE = isFy2027
    ? 'Seeded FY2026/27 seasonalized R100k plan (Dec R10k, Jan R4k)'
    : 'Seeded FY2027/28 seasonalized R240k plan from Excel Financial Plan';

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i]!;
    const row = schedule[i]!;
    const revTotal = row.tes + row.aws + row.pmg;

    const divisionTargets: Array<{ divisionId: string; targetAmount: number }> = [];
    if (tesDiv) divisionTargets.push({ divisionId: tesDiv.id, targetAmount: row.tes });
    if (awsDiv) divisionTargets.push({ divisionId: awsDiv.id, targetAmount: row.aws });
    if (pmgDiv) divisionTargets.push({ divisionId: pmgDiv.id, targetAmount: row.pmg });

    await upsertMonthlyBudgetPlan({
      fiscalYear,
      period,
      revenueTarget: revTotal,
      expenseBudget: row.opex,
      directorSalaryBudget: row.salary,
      taxReserveTarget: row.taxReserve,
      notes: PLAN_NOTE,
      divisionTargets,
    });
  }
}
