import 'server-only'

import {
  getTotalRevenue,
  getTotalExpenses,
  getRevenueByDivision,
  getLeadsByStatus,
} from '@pmg/db'

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

export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
