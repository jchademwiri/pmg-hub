'use server'

import { getIncomeByPeriod, getExpensesByPeriod, getLedgerEntriesByPeriod } from '@pmg/db'

export type DrilldownType = 'revenue' | 'expenses' | 'salary' | 'reinvest' | 'reserve' | 'flex'

export type IncomeRow = {
  date: string
  divisionName: string
  clientName: string
  description: string | null
  amount: number
}

export type ExpenseRow = {
  date: string
  divisionName: string
  category: string
  clientName: string
  description: string | null
  amount: number
}

export type LedgerRow = {
  date: string
  description: string | null
  amount: number
  entryType: string
}

export type DrilldownResult =
  | { type: 'income'; total: number; rows: IncomeRow[] }
  | { type: 'expense'; total: number; rows: ExpenseRow[] }
  | { type: 'ledger'; total: number; rows: LedgerRow[] }

export async function getDrilldownData(
  period: string,
  drillType: DrilldownType,
): Promise<DrilldownResult> {
  if (drillType === 'revenue') {
    const rows = await getIncomeByPeriod(period)
    return { type: 'income', total: rows.reduce((s, r) => s + r.amount, 0), rows }
  }
  if (drillType === 'expenses') {
    const rows = await getExpensesByPeriod(period)
    return { type: 'expense', total: rows.reduce((s, r) => s + r.amount, 0), rows }
  }
  // For allocation types (salary, reinvest, reserve, flex) → ledger entries
  const rows = await getLedgerEntriesByPeriod(period, drillType)
  return { type: 'ledger', total: rows.total, rows: rows.entries }
}
