import 'server-only'

import { getActiveRates } from '@pmg/db'
import {
  getTotalRevenue,
  getTotalExpenses,
  getRevenueByDivision,
  getExpensesByDivision,
  getLeadsByStatus,
  getMonthlyRevenueByDivision,
  getMonthlyFinancials,
  getMoMSnapshot,
  getCurrentMonthSummary,
  getPreviousMonthSummary,
  getYTDSummary,
  getPreviousYearYTDSummary,
  getLedgerEntriesCurrentMonth,
  getLedgerTotalByAllocation,
  getLedgerEntriesPreviousMonth,
  getLedgerEntriesYTD,
  getDivisionRevenueSeries,
  getDivisionRevenueCurrentMonth,
  getDivisionRevenueYTD,
  getDivisionRevenuePreviousMonth,
  getExpensesByCategoryForYear,
  getDistinctYears,
  getMonthlyFinancialsForYear,
  getMonthlyRevenueByDivisionForYear,
  getMonthlyRevenueVsInvoicedForYear,
  getAllSnapshots,
} from '@pmg/db'
import { fmtMonthYear, getSASTParts } from '@/lib/format'

// ── Re-export DB types ────────────────────────────────────────────────────────
export type { PeriodSummary } from '@pmg/db'

// ── Local types ───────────────────────────────────────────────────────────────
export type MonthlyRevenueByDivision = { month: string; [divisionName: string]: number | string }
export type MonthlyFinancials = { month: string; revenue: number; expenses: number }
export type MonthlyRevenueVsInvoiced = { month: string; received: number; invoiced: number }
export type MonthlyBudgetChartRow = { month: string; revenue: number; invoiced: number; expenses: number }
export type MoMSnapshot = { metric: string; current: number; previous: number }
export type FinancialSummary = {
  revenue: number; expenses: number; pmgShare: number; profitPool: number;
  salary: number; reinvest: number; reserve: number; flex: number;
}
export type DivisionRevenue = { divisionId?: string; divisionName: string; total: number }
export type LeadStatusCount = { status: string; count: number }

export type BucketBalances = {
  salary:    { expected: number; spent: number; available: number };
  reinvest:  { expected: number; spent: number; available: number };
  reserve:   { expected: number; spent: number; available: number };
  flex:      { expected: number; spent: number; available: number };
  pmg_share: { expected: number; spent: number; available: number };
};

export type DivisionSeriesRow = { month: string; divisionName: string; total: number }
export type DivisionSeriesChart = {
  series: MonthlyRevenueByDivision[]
  divisions: string[]
}

// ── Period label helpers ──────────────────────────────────────────────────────
export function getCurrentMonthLabel(): string {
  const { year, month } = getSASTParts()
  return fmtMonthYear(new Date(year, month, 1))
}
export function getPreviousMonthLabel(): string {
  const { year, month } = getSASTParts()
  return fmtMonthYear(new Date(year, month - 1, 1))
}
export function getYTDLabel(): string {
  const { year, month } = getSASTParts()
  const startYear = month < 2 ? year - 1 : year
  return `Mar ${startYear} - ${fmtMonthYear(new Date(year, month, 1), { short: true })}`
}

// ── All-time summary (YTD shortcut for totals) ────────────────────────────────
export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [revenue, expenses, rates] = await Promise.all([getTotalRevenue(), getTotalExpenses(), getActiveRates()])
  const pmgShare   = revenue * rates.pmg_share
  const profitPool = revenue - expenses - pmgShare
  return {
    revenue, expenses, pmgShare, profitPool,
    salary:   profitPool * rates.salary,
    reinvest: profitPool * rates.reinvest,
    reserve:  profitPool * rates.reserve,
    flex:     profitPool * rates.flex,
  }
}

// ── Period summaries ──────────────────────────────────────────────────────────
export { getCurrentMonthSummary, getPreviousMonthSummary, getYTDSummary, getPreviousYearYTDSummary }

// ── Ledger ────────────────────────────────────────────────────────────────────
export async function getLedgerBalances(): Promise<BucketBalances> {
  const summary = await getFinancialSummary();
  const [spentSalary, spentReinvest, spentReserve, spentFlex, spentPmgShare] = await Promise.all([
    getLedgerTotalByAllocation('salary'),
    getLedgerTotalByAllocation('reinvest'),
    getLedgerTotalByAllocation('reserve'),
    getLedgerTotalByAllocation('flex'),
    getLedgerTotalByAllocation('pmg_share'),
  ]);

  return {
    salary:    { expected: summary.salary,    spent: spentSalary,    available: summary.salary    - spentSalary    },
    reinvest:  { expected: summary.reinvest,  spent: spentReinvest,  available: summary.reinvest  - spentReinvest  },
    reserve:   { expected: summary.reserve,   spent: spentReserve,   available: summary.reserve   - spentReserve   },
    flex:      { expected: summary.flex,      spent: spentFlex,      available: summary.flex      - spentFlex      },
    pmg_share: { expected: summary.pmgShare,  spent: spentPmgShare,  available: summary.pmgShare  - spentPmgShare  },
  };
}

export async function getLedgerEntriesForPeriod(
  period: 'current' | 'previous' | 'ytd',
  allocationType?: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'
): Promise<{ total: number; entries: { date: string; description: string | null; amount: number }[] }> {
  if (period === 'current') return getLedgerEntriesCurrentMonth(allocationType);
  if (period === 'previous') return getLedgerEntriesPreviousMonth(allocationType);
  return getLedgerEntriesYTD(allocationType);
}

// ── Division revenue ──────────────────────────────────────────────────────────
export async function getDivisionRevenue(): Promise<DivisionRevenue[]> {
  return getRevenueByDivision()
}

export async function getLeadCounts(): Promise<LeadStatusCount[]> {
  return getLeadsByStatus()
}

// ── Division chart series builder ─────────────────────────────────────────────
function buildDivisionSeries(
  rows: DivisionSeriesRow[]
): DivisionSeriesChart {
  const divisionSet = new Set(rows.map((r) => r.divisionName))
  const divisions = [...divisionSet].sort()
  const monthMap = new Map<string, MonthlyRevenueByDivision>()
  for (const row of rows) {
    if (!monthMap.has(row.month)) {
      const entry: MonthlyRevenueByDivision = { month: row.month }
      for (const d of divisions) entry[d] = 0
      monthMap.set(row.month, entry)
    }
    monthMap.get(row.month)![row.divisionName] = row.total
  }
  const series = [...monthMap.values()].sort((a, b) =>
    String(a.month).localeCompare(String(b.month))
  )
  return { series, divisions }
}

export async function getRevenueByDivisionSeries(): Promise<DivisionSeriesChart> {
  const rows = await getMonthlyRevenueByDivision(6)
  return buildDivisionSeries(rows)
}

/** All series data for the interactive chart - fetched once, filtered client-side */
export async function getAllDivisionSeriesData(): Promise<{
  last3:    DivisionSeriesChart
  last6:    DivisionSeriesChart
  ytd:      DivisionSeriesChart
  current:  DivisionSeriesChart
  prev:     DivisionSeriesChart
}> {
  const [rows3, rows6, rowsYTD, rowsCurrent, rowsPrev] = await Promise.all([
    getDivisionRevenueSeries(3),
    getDivisionRevenueSeries(6),
    getDivisionRevenueYTD(),
    getDivisionRevenueCurrentMonth(),
    getDivisionRevenuePreviousMonth(),
  ])
  return {
    last3:   buildDivisionSeries(rows3),
    last6:   buildDivisionSeries(rows6),
    ytd:     buildDivisionSeries(rowsYTD),
    current: buildDivisionSeries(rowsCurrent),
    prev:    buildDivisionSeries(rowsPrev),
  }
}

export async function getMonthlyFinancialsSeries(): Promise<MonthlyFinancials[]> {
  return getMonthlyFinancials()
}

export async function getMoMChartData(): Promise<MoMSnapshot[]> {
  const [snap, rates] = await Promise.all([getMoMSnapshot(), getActiveRates()])
  return [
    { metric: 'Revenue',     current: snap.currentRevenue,  previous: snap.previousRevenue },
    { metric: 'Expenses',    current: snap.currentExpenses, previous: snap.previousExpenses },
    {
      metric: 'Profit Pool',
      current:  snap.currentRevenue  - snap.currentExpenses  - (snap.currentRevenue  * rates.pmg_share),
      previous: snap.previousRevenue - snap.previousExpenses - (snap.previousRevenue * rates.pmg_share),
    },
  ]
}

export { getExpensesByDivision }
export { formatZAR } from '@/lib/format'

// ── Reporting & Insights helpers ──────────────────────────────────────────────
export async function getExpensesByCategory(
  year: number
): Promise<{ category: string; total: number }[]> {
  return getExpensesByCategoryForYear(year)
}

export async function getDistinctReportYears(): Promise<number[]> {
  return getDistinctYears()
}

export async function getMonthlyFinancialsSeriesForYear(
  year: number
): Promise<MonthlyFinancials[]> {
  return getMonthlyFinancialsForYear(year)
}

export async function getRevenueByDivisionSeriesForYear(
  year: number
): Promise<DivisionSeriesChart> {
  const rows = await getMonthlyRevenueByDivisionForYear(year)
  return buildDivisionSeries(rows)
}

export async function getRevenueVsInvoicedSeriesForYear(
  year: number
): Promise<MonthlyRevenueVsInvoiced[]> {
  return getMonthlyRevenueVsInvoicedForYear(year)
}

export async function getBudgetChartSeriesForYear(
  year: number
): Promise<MonthlyBudgetChartRow[]> {
  const [revenueVsInvoiced, monthlyFinancials] = await Promise.all([
    getRevenueVsInvoicedSeriesForYear(year),
    getMonthlyFinancialsSeriesForYear(year),
  ])

  const monthMap = new Map<string, MonthlyBudgetChartRow>()
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(year, 2 + i, 1)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(month, { month, revenue: 0, invoiced: 0, expenses: 0 })
  }

  for (const row of revenueVsInvoiced) {
    const entry = monthMap.get(row.month) ?? { month: row.month, revenue: 0, invoiced: 0, expenses: 0 }
    entry.revenue = row.received
    entry.invoiced = row.invoiced
    monthMap.set(row.month, entry)
  }

  for (const row of monthlyFinancials) {
    const entry = monthMap.get(row.month) ?? { month: row.month, revenue: 0, invoiced: 0, expenses: 0 }
    entry.expenses = row.expenses
    monthMap.set(row.month, entry)
  }

  return [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month))
}

// ── Profit Pool split series ──────────────────────────────────────────────────
export type ProfitPoolRow = {
  period: string
  profitPool: number
  salary: number
  reinvest: number
  reserve: number
  flex: number
}

export async function getProfitPoolSeriesForYear(year: number): Promise<ProfitPoolRow[]> {
  const all = await getAllSnapshots()
  return all
    .filter((s) => {
      const [pYear, pMonth] = s.period.split('-').map(Number)
      const fy = pMonth <= 2 ? pYear - 1 : pYear
      return fy === year
    })
    .map((s) => ({
      period: s.period,
      profitPool: Number(s.profitPool),
      salary: Number(s.salary),
      reinvest: Number(s.reinvest),
      reserve: Number(s.reserve),
      flex: Number(s.flex),
    }))
    .sort((a, b) => a.period.localeCompare(b.period))
}
