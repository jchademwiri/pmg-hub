import type { Metadata } from 'next'
import {
  getFinancialSummary,
  getCurrentMonthSummary,
  getPreviousMonthSummary,
  getYTDSummary,
  getPreviousYearYTDSummary,
  getDivisionRevenue,
  getLeadCounts,
  getMonthlyFinancialsSeries,
  getWithdrawals,
  getWithdrawalsPrevMonth,
  getWithdrawalsYTD,
  getAllDivisionSeriesData,
  getMoMChartData,
  getExpensesByDivision,
  getCurrentMonthLabel,
  getPreviousMonthLabel,
  getYTDLabel,
} from '@/lib/financial'
import { getSnapshotByPeriod } from '@pmg/db'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const currentPeriod = new Date().toISOString().slice(0, 7)

  const [
    ytdSummary,
    previousYearYTDSummary,
    currentMonthSummary,
    previousMonthSummary,
    divisions,
    leads,
    monthlySeries,
    withdrawals,
    withdrawalsPrevMonth,
    withdrawalsYTD,
    divisionSeriesData,
    momData,
    expensesByDivision,
    currentPeriodSnapshot,
  ] = await Promise.all([
    getYTDSummary(),
    getPreviousYearYTDSummary(),
    getCurrentMonthSummary(),
    getPreviousMonthSummary(),
    getDivisionRevenue(),
    getLeadCounts(),
    getMonthlyFinancialsSeries(),
    getWithdrawals(),
    getWithdrawalsPrevMonth(),
    getWithdrawalsYTD(),
    getAllDivisionSeriesData(),
    getMoMChartData(),
    getExpensesByDivision(),
    getSnapshotByPeriod(currentPeriod),
  ])

  const labels = {
    current:  getCurrentMonthLabel(),
    previous: getPreviousMonthLabel(),
    ytd:      getYTDLabel(),
  }

  const hasSnapshot = currentPeriodSnapshot !== null

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
      previousYearYTDSummary={previousYearYTDSummary}
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
      withdrawalsPrevMonth={withdrawalsPrevMonth}
      withdrawalsYTD={withdrawalsYTD}
      divisionSeriesData={divisionSeriesData}
      expensesByDivision={expensesByDivision}
      // Snapshot
      currentPeriodSnapshot={currentPeriodSnapshot}
      currentPeriod={currentPeriod}
      hasSnapshot={hasSnapshot}
    />
  )
}