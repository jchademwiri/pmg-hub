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
  /** Total GL expenses (OpEx + Director Remuneration + Tax) */
  actualExpenses: number;
  /** Operating expenses only — excludes 5120 Director Remuneration and 5160 Income Tax */
  actualOpex: number;
  /** 5120 Staff Costs & Director Remuneration posted in this period */
  actualDirectorRemuneration: number;
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
    actualOpex: number;
    actualDirectorRemuneration: number;
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
  todayStr?: string,
): Promise<FiscalYearBudgetOverview> {
  const periods = getFiscalYearPeriods(fiscalYear);
  const todayIso = todayStr ?? new Date().toISOString().slice(0, 10);
  const currentPeriod = todayIso.slice(0, 7);
  const elapsedOrCurrentPeriods = periods.filter((p) => p <= currentPeriod);
  const periodsForLiveGl =
    elapsedOrCurrentPeriods.length > 0 ? elapsedOrCurrentPeriods : ['__none__'];

  // Auto-seed the planned FY2026/27 (2027 = R100k) or FY2027/28 (2028 = R186k, OpEx = R21.6k) seasonalized budget once if not yet present,
  // or upgrade ONLY if every existing month still has a legacy auto-seed note (preserving any user-edited custom months).
  if (fiscalYear === 2027 || fiscalYear === 2028) {
    const existingPlans = await db
      .select({ id: budgetMonthlyPlan.id, notes: budgetMonthlyPlan.notes })
      .from(budgetMonthlyPlan)
      .where(eq(budgetMonthlyPlan.fiscalYear, fiscalYear))
      .catch(() => []);
    const legacyNotes =
      fiscalYear === 2027
        ? new Set(['Seeded FY2026/27 seasonalized R100k plan (Dec R10k, Jan R4k)'])
        : new Set([
            'Seeded FY2027/28 seasonalized R240k plan from Excel Financial Plan',
            'Seeded FY2027/28 seasonalized R186k organic growth plan (+24.8% YoY)',
            'Seeded FY2027/28 seasonalized R186k plan (OpEx R21.6k, +24.8% YoY)',
          ]);
    const allLegacyUnmodified =
      existingPlans.length > 0 &&
      existingPlans.every((p) => p.notes !== null && legacyNotes.has(p.notes));
    if (existingPlans.length === 0 || allLegacyUnmodified) {
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
        accountCode: chartAccounts.code,
        totalDebits: sql<string>`COALESCE(SUM(${journalLines.debit}::numeric), 0)`,
        totalCredits: sql<string>`COALESCE(SUM(${journalLines.credit}::numeric), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(chartAccounts, eq(journalLines.accountId, chartAccounts.id))
      .where(
        and(
          eq(journalEntries.status, 'posted'),
          inArray(journalEntries.period, periodsForLiveGl),
          sql`${journalEntries.entryDate} <= ${todayIso}`,
          inArray(chartAccounts.type, ['revenue', 'expense']),
        ),
      )
      .groupBy(journalEntries.period, chartAccounts.type, chartAccounts.code)
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
          inArray(journalEntries.period, periodsForLiveGl),
          sql`${journalEntries.entryDate} <= ${todayIso}`,
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

  // Live GL actuals per period (split into OpEx vs 5120 Director Remuneration vs Total)
  const glRevByPeriod = new Map<string, number>();
  const glExpByPeriod = new Map<string, number>();
  const glOpexByPeriod = new Map<string, number>();
  const glDirectorRemByPeriod = new Map<string, number>();
  for (const r of glMonthlyRows) {
    const debits = Number(r.totalDebits || 0);
    const credits = Number(r.totalCredits || 0);
    if (r.accountType === 'revenue') {
      glRevByPeriod.set(r.period, (glRevByPeriod.get(r.period) ?? 0) + (credits - debits));
    } else if (r.accountType === 'expense') {
      const amt = debits - credits;
      glExpByPeriod.set(r.period, (glExpByPeriod.get(r.period) ?? 0) + amt);
      if (r.accountCode === '5120') {
        glDirectorRemByPeriod.set(r.period, (glDirectorRemByPeriod.get(r.period) ?? 0) + amt);
      } else if (r.accountCode !== '5160') {
        glOpexByPeriod.set(r.period, (glOpexByPeriod.get(r.period) ?? 0) + amt);
      }
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

    const isFutureUnclosed = !isClosed && period > currentPeriod;
    const actualRevenue = isClosed
      ? Number(snap!.revenue ?? 0)
      : isFutureUnclosed
        ? 0
        : (glRevByPeriod.get(period) ?? 0);
    const actualDirectorRemuneration = isFutureUnclosed
      ? 0
      : (glDirectorRemByPeriod.get(period) ?? 0);
    const actualExpenses = isClosed
      ? Number(snap!.expenses ?? 0)
      : isFutureUnclosed
        ? 0
        : (glExpByPeriod.get(period) ?? 0);
    const actualOpex = isClosed
      ? Math.max(0, Number(snap!.expenses ?? 0) - actualDirectorRemuneration)
      : isFutureUnclosed
        ? 0
        : (glOpexByPeriod.get(period) ?? 0);

    const budgetedProfit = revenueTarget - totalExpenseBudget;
    const actualProfit = actualRevenue - actualExpenses;
    const revenueVariance = isFutureUnclosed ? 0 : actualRevenue - revenueTarget;
    const expenseVariance = isFutureUnclosed ? 0 : totalExpenseBudget - actualExpenses;

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
      revenueVariance,
      expenseBudget,
      directorSalaryBudget,
      totalExpenseBudget,
      actualExpenses,
      actualOpex,
      actualDirectorRemuneration,
      expenseVariance,
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
      actualOpex: acc.actualOpex + m.actualOpex,
      actualDirectorRemuneration: acc.actualDirectorRemuneration + m.actualDirectorRemuneration,
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
      actualOpex: 0,
      actualDirectorRemuneration: 0,
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
  { tes: 5500, aws: 500, pmg: 300, opex: 1600, salary: 0, taxReserve: 0 }, // Mar 2026 (R6,300)
  { tes: 6500, aws: 550, pmg: 350, opex: 1600, salary: 0, taxReserve: 0 }, // Apr 2026 (R7,400)
  { tes: 7000, aws: 600, pmg: 400, opex: 1600, salary: 0, taxReserve: 0 }, // May 2026 (R8,000)
  { tes: 7400, aws: 650, pmg: 450, opex: 1600, salary: 0, taxReserve: 0 }, // Jun 2026 (R8,500)
  { tes: 7800, aws: 700, pmg: 500, opex: 1600, salary: 0, taxReserve: 0 }, // Jul 2026 (R9,000)
  { tes: 8300, aws: 700, pmg: 500, opex: 1600, salary: 0, taxReserve: 0 }, // Aug 2026 (R9,500)
  { tes: 8300, aws: 700, pmg: 500, opex: 1600, salary: 0, taxReserve: 0 }, // Sep 2026 (R9,500)
  { tes: 8550, aws: 750, pmg: 500, opex: 1600, salary: 0, taxReserve: 0 }, // Oct 2026 (R9,800)
  { tes: 7000, aws: 600, pmg: 400, opex: 1600, salary: 0, taxReserve: 0 }, // Nov 2026 (R8,000)
  { tes: 8750, aws: 750, pmg: 500, opex: 1600, salary: 0, taxReserve: 0 }, // Dec 2026 (R10,000 — agreed R8k–R10k before 18 Dec holiday close)
  { tes: 3500, aws: 300, pmg: 200, opex: 1600, salary: 0, taxReserve: 0 }, // Jan 2027 (R4,000 — agreed slow Jan month)
  { tes: 8900, aws: 700, pmg: 400, opex: 1600, salary: 0, taxReserve: 0 }, // Feb 2027 (R10,000 — year-end recovery; FY total = R100,000; 0% SBC tax bracket)
];

const FY2028_MONTHLY_TARGETS: Array<{
  tes: number;
  aws: number;
  pmg: number;
  opex: number;
  salary: number;
  taxReserve: number;
}> = [
  { tes: 14450, aws: 1250, pmg: 800, opex: 1900, salary: 5000, taxReserve: 0 }, // Mar 2027 (R16,500)
  { tes: 9200, aws: 800, pmg: 500, opex: 1300, salary: 5000, taxReserve: 0 }, // Apr 2027 (R10,500 — Easter dip)
  { tes: 10500, aws: 900, pmg: 600, opex: 1500, salary: 5000, taxReserve: 0 }, // May 2027 (R12,000)
  { tes: 12250, aws: 1050, pmg: 700, opex: 1700, salary: 5000, taxReserve: 0 }, // Jun 2027 (R14,000)
  { tes: 15750, aws: 1350, pmg: 900, opex: 2100, salary: 5000, taxReserve: 0 }, // Jul 2027 (R18,000)
  { tes: 21850, aws: 1900, pmg: 1250, opex: 2600, salary: 5000, taxReserve: 0 }, // Aug 2027 (R25,000 — Peak)
  { tes: 21000, aws: 1800, pmg: 1200, opex: 2500, salary: 5000, taxReserve: 0 }, // Sep 2027 (R24,000 — Peak)
  { tes: 14000, aws: 1200, pmg: 800, opex: 1900, salary: 5000, taxReserve: 0 }, // Oct 2027 (R16,000)
  { tes: 14850, aws: 1300, pmg: 850, opex: 2000, salary: 5000, taxReserve: 0 }, // Nov 2027 (R17,000)
  { tes: 9650, aws: 800, pmg: 550, opex: 1300, salary: 5000, taxReserve: 200 }, // Dec 2027 (R11,000 — Early close)
  { tes: 5700, aws: 500, pmg: 300, opex: 1000, salary: 5000, taxReserve: 100 }, // Jan 2028 (R6,500 — Holiday dip)
  { tes: 13550, aws: 1150, pmg: 800, opex: 1800, salary: 5000, taxReserve: 490 }, // Feb 2028 (R15,500 — Recovery; FY Total = R186,000, OpEx = R21,600, SBC/DWT Tax = R790)
];

/**
 * Seeds the seasonalized annual budget plan:
 * - FY2026/27 (2027): R100,000 (TES R87,500 | AWS R7,500 | PMG R5,000), Dec R10,000, Jan R4,000, Feb R10,000
 * - FY2027/28 (2028): R186,000 Option 2 Organic Growth Plan (TES R162,750 | AWS R14,000 | PMG R9,250)
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
    ? 'Seeded FY2026/27 seasonalized R100k plan (0% SBC tax bracket)'
    : 'Seeded FY2027/28 seasonalized R186k plan (OpEx R21.6k, SBC calibrated)';

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
