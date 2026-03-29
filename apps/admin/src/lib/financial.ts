import 'server-only'

import {
  getTotalRevenue,
  getTotalExpenses,
  getRevenueByDivision,
  getLeadsByStatus,
  getMonthlyRevenueByDivision,
  getMonthlyFinancials,
  getMoMSnapshot,
} from '@pmg/db'

export type MonthlyRevenueByDivision = { month: string; [divisionName: string]: number | string }
export type MonthlyFinancials = { month: string; revenue: number; expenses: number }
export type MoMSnapshot = { metric: string; current: number; previous: number }

export type FinancialSummary = {
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
  salary: number
  reinvest: number
  reserve: number
  flex: number
}

export type DivisionRevenue = { divisionName: string; total: number }

export type LeadStatusCount = { status: string; count: number }

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [revenue, expenses] = await Promise.all([
    getTotalRevenue(),
    getTotalExpenses(),
  ])

  const pmgShare = revenue * 0.20
  const profitPool = revenue - expenses - pmgShare

  const salary = profitPool * 0.35
  const reinvest = profitPool * 0.30
  const reserve = profitPool * 0.30
  const flex = profitPool * 0.05

  return { revenue, expenses, pmgShare, profitPool, salary, reinvest, reserve, flex }
}

export async function getDivisionRevenue(): Promise<DivisionRevenue[]> {
  return getRevenueByDivision()
}

export async function getLeadCounts(): Promise<LeadStatusCount[]> {
  return getLeadsByStatus()
}

export async function getRevenueByDivisionSeries(): Promise<{
  series: MonthlyRevenueByDivision[]
  divisions: string[]
}> {
  const rows = await getMonthlyRevenueByDivision(6)
  const divisionSet = new Set(rows.map(r => r.divisionName))
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
  const series = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month))
  return { series, divisions }
}

export async function getMonthlyFinancialsSeries(): Promise<MonthlyFinancials[]> {
  return getMonthlyFinancials()
}

export async function getMoMChartData(): Promise<MoMSnapshot[]> {
  const snap = await getMoMSnapshot()
  return [
    { metric: 'Revenue',     current: snap.currentRevenue,   previous: snap.previousRevenue },
    { metric: 'Expenses',    current: snap.currentExpenses,  previous: snap.previousExpenses },
    { metric: 'Profit Pool', current: snap.currentRevenue - snap.currentExpenses,
                             previous: snap.previousRevenue - snap.previousExpenses },
  ]
}

export { formatZAR } from '@/lib/format'
