import type { Metadata } from 'next'
import {
  getFinancialSummary,
  getCurrentMonthSummary,
  getPreviousMonthSummary,
  getYTDSummary,
  getDivisionRevenue,
  getLeadCounts,
  getMonthlyFinancialsSeries,
  getWithdrawals,
  getAllDivisionSeriesData,
  getMoMChartData,
  getExpensesByDivision,
  getCurrentMonthLabel,
  getPreviousMonthLabel,
  getYTDLabel,
} from '@/lib/financial'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const [
    ytdSummary,
    currentMonthSummary,
    previousMonthSummary,
    divisions,
    leads,
    monthlySeries,
    withdrawals,
    divisionSeriesData,
    momData,
    expensesByDivision,
  ] = await Promise.all([
    getYTDSummary(),
    getCurrentMonthSummary(),
    getPreviousMonthSummary(),
    getDivisionRevenue(),
    getLeadCounts(),
    getMonthlyFinancialsSeries(),
    getWithdrawals(),
    getAllDivisionSeriesData(),
    getMoMChartData(),
    getExpensesByDivision(),
  ])

  const labels = {
    current:  getCurrentMonthLabel(),
    previous: getPreviousMonthLabel(),
    ytd:      getYTDLabel(),
  }

  // Build MoM deltas (current vs previous month)
  const revenueSnap = momData.find((d) => d.metric === 'Revenue')
  const expenseSnap = momData.find((d) => d.metric === 'Expenses')
  const profitSnap  = momData.find((d) => d.metric === 'Profit Pool')

  const deltas = {
    revenue:  revenueSnap ? { current: revenueSnap.current,  previous: revenueSnap.previous  } : null,
    expenses: expenseSnap ? { current: expenseSnap.current,  previous: expenseSnap.previous  } : null,
    profit:   profitSnap  ? { current: profitSnap.current,   previous: profitSnap.previous   } : null,
  }

  // Build division expense map for the division revenue card
  const divisionExpenseMap = new Map(
    expensesByDivision.map((d) => [d.divisionName, d.total])
  )

  return (
    <DashboardShell
      // Period summaries
      ytdSummary={ytdSummary}
      currentMonthSummary={currentMonthSummary}
      previousMonthSummary={previousMonthSummary}
      labels={labels}
      deltas={deltas}
      // Supporting data
      divisions={divisions}
      divisionExpenseMap={Object.fromEntries(divisionExpenseMap)}
      leads={leads}
      monthlySeries={monthlySeries}
      sparklineData={monthlySeries.slice(-6)}
      withdrawals={withdrawals}
      divisionSeriesData={divisionSeriesData}
      expensesByDivision={expensesByDivision}
    />
  )
}