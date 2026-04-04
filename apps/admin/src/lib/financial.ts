import 'server-only'

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
  getWithdrawalsCurrentMonth,
  getTotalWithdrawalsYTD,
  getWithdrawalsPreviousMonth,
  getWithdrawalsYTDFull,
  getDivisionRevenueSeries,
  getDivisionRevenueCurrentMonth,
  getDivisionRevenueYTD,
  getDivisionRevenuePreviousMonth,
  getExpensesByCategoryForYear,
  getDistinctYears,
  getMonthlyFinancialsForYear,
  getMonthlyRevenueByDivisionForYear,
} from '@pmg/db'

// ── Re-export DB types ────────────────────────────────────────────────────────
export type { PeriodSummary } from '@pmg/db'

// ── Local types ───────────────────────────────────────────────────────────────
export type MonthlyRevenueByDivision = { month: string; [divisionName: string]: number | string }
export type MonthlyFinancials = { month: string; revenue: number; expenses: number }
export type MoMSnapshot = { metric: string; current: number; previous: number }
export type FinancialSummary = {
  revenue: number; expenses: number; pmgShare: number; profitPool: number;
  salary: number; reinvest: number; reserve: number; flex: number;
}
export type DivisionRevenue = { divisionName: string; total: number }
export type LeadStatusCount = { status: string; count: number }

export type WithdrawalSummary = {
  total: number;
  carryOver: number;
  entries: { date: string; description: string | null; amount: number }[];
}

export type DivisionSeriesRow = { month: string; divisionName: string; total: number }
export type DivisionSeriesChart = {
  series: MonthlyRevenueByDivision[]
  divisions: string[]
}

// ── Period label helpers ──────────────────────────────────────────────────────
export function getCurrentMonthLabel(): string {
  return new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' })
}
export function getPreviousMonthLabel(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleString('en-ZA', { month: 'long', year: 'numeric' })
}
export function getYTDLabel(): string {
  return `Jan – ${new Date().toLocaleString('en-ZA', { month: 'short', year: 'numeric' })}`
}

// ── All-time summary (YTD shortcut for totals) ────────────────────────────────
export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [revenue, expenses] = await Promise.all([getTotalRevenue(), getTotalExpenses()])
  const pmgShare   = revenue * 0.20
  const profitPool = revenue - expenses - pmgShare
  return {
    revenue, expenses, pmgShare, profitPool,
    salary:   profitPool * 0.35,
    reinvest: profitPool * 0.30,
    reserve:  profitPool * 0.30,
    flex:     profitPool * 0.05,
  }
}

// ── Period summaries ──────────────────────────────────────────────────────────
export { getCurrentMonthSummary, getPreviousMonthSummary, getYTDSummary }

// ── Withdrawals ───────────────────────────────────────────────────────────────
export async function getWithdrawals(): Promise<WithdrawalSummary> {
  const [current, ytdWithdrawn, ytdSummary, currentMonthSummary] = await Promise.all([
    getWithdrawalsCurrentMonth(),
    getTotalWithdrawalsYTD(),
    getYTDSummary(),
    getCurrentMonthSummary(),
  ])
  const prevMonthsSalary    = ytdSummary.salary - currentMonthSummary.salary
  const prevMonthsWithdrawn = ytdWithdrawn - current.total
  const carryOver = Math.max(0, prevMonthsSalary - prevMonthsWithdrawn)
  return { ...current, carryOver }
}

export async function getWithdrawalsPrevMonth(): Promise<WithdrawalSummary> {
  const [prev, ytdWithdrawn, ytdSummary, currentMonthSummary, previousMonthSummary] = await Promise.all([
    getWithdrawalsPreviousMonth(),
    getTotalWithdrawalsYTD(),
    getYTDSummary(),
    getCurrentMonthSummary(),
    getPreviousMonthSummary(),
  ])
  // Salary earned before the previous month (i.e. before 2 months ago)
  const beforePrevSalary    = ytdSummary.salary - currentMonthSummary.salary - previousMonthSummary.salary
  // Withdrawals made before the previous month
  const currentWithdrawn    = (await getWithdrawalsCurrentMonth()).total
  const beforePrevWithdrawn = ytdWithdrawn - prev.total - currentWithdrawn
  const carryOver = Math.max(0, beforePrevSalary - beforePrevWithdrawn)
  return { ...prev, carryOver }
}

export async function getWithdrawalsYTD(): Promise<WithdrawalSummary> {
  const ytd = await getWithdrawalsYTDFull()
  // No carry-over for YTD — it already covers the full year
  return { ...ytd, carryOver: 0 }
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

/** All series data for the interactive chart — fetched once, filtered client-side */
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
  const snap = await getMoMSnapshot()
  return [
    { metric: 'Revenue',     current: snap.currentRevenue,  previous: snap.previousRevenue },
    { metric: 'Expenses',    current: snap.currentExpenses, previous: snap.previousExpenses },
    {
      metric: 'Profit Pool',
      current:  snap.currentRevenue  - snap.currentExpenses  - (snap.currentRevenue  * 0.20),
      previous: snap.previousRevenue - snap.previousExpenses - (snap.previousRevenue * 0.20),
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