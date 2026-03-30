import type { Metadata } from 'next'
import {
  getFinancialSummary,
  getDivisionRevenue,
  getLeadCounts,
  getMonthlyFinancialsSeries,
  getMoMChartData,
} from '@/lib/financial'
import { getExpensesByDivision } from '@pmg/db'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { SalaryCard } from '@/components/dashboard/salary-card'
import { AllocationBar } from '@/components/dashboard/allocation-bar'
import { DivisionRevenue } from '@/components/dashboard/division-revenue'
import { LeadsSummary } from '@/components/dashboard/leads-summary'
import { RevenueSparkline } from '@/components/dashboard/revenue-sparkline'
import { ExpenseSnapshot } from '@/components/dashboard/expense-snapshot'


export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const [summary, divisions, leads, monthlySeries, momData, expensesByDivision] =
    await Promise.all([
      getFinancialSummary(),
      getDivisionRevenue(),
      getLeadCounts(),
      getMonthlyFinancialsSeries(),
      getMoMChartData(),
      getExpensesByDivision(),
    ])

  // Build MoM deltas for each KPI card
  const revenueSnap = momData.find((d) => d.metric === 'Revenue')
  const expenseSnap = momData.find((d) => d.metric === 'Expenses')
  const profitSnap  = momData.find((d) => d.metric === 'Profit Pool')

  const revDelta  = revenueSnap  ? revenueSnap.current  - revenueSnap.previous  : null
  const expDelta  = expenseSnap  ? expenseSnap.current  - expenseSnap.previous  : null
  const profDelta = profitSnap   ? profitSnap.current   - profitSnap.previous   : null
  const pmgDelta  = revDelta     ? revDelta * 0.20 : null

  // Last 6 months for sparkline
  const sparklineData = monthlySeries.slice(-6)

  // Build expense breakdown by category across all divisions
  // We'll pass division expenses for the Division card enhancement
  const divisionExpenseMap = new Map(
    expensesByDivision.map((d) => [d.divisionName, d.total])
  )

  return (
    <div className="space-y-5">
      {/* ── Row 1: KPI grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={summary.revenue}
          delta={revDelta}
          previousValue={revenueSnap?.previous ?? null}
        />
        <KpiCard
          label="Total Expenses"
          value={summary.expenses}
          delta={expDelta}
          previousValue={expenseSnap?.previous ?? null}
          invertDelta
        />
        <KpiCard
          label="PMG Share (20%)"
          value={summary.pmgShare}
          delta={pmgDelta}
          previousValue={revenueSnap ? revenueSnap.previous * 0.20 : null}
        />
        <KpiCard
          label="Profit Pool"
          value={summary.profitPool}
          delta={profDelta}
          previousValue={profitSnap?.previous ?? null}
          highlight={summary.profitPool < 0 ? 'danger' : summary.profitPool > 0 ? 'success' : undefined}
        />
      </div>

      {/* ── Row 2: Salary + Sparkline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalaryCard salary={summary.salary} profitPool={summary.profitPool} />
        <div className="lg:col-span-2">
          <RevenueSparkline data={sparklineData} />
        </div>
      </div>

      {/* ── Row 3: Allocation bar (only when profit pool is positive) ── */}
      {summary.profitPool > 0 && (
        <AllocationBar summary={summary} />
      )}

      {/* ── Row 4: Division Revenue (with expenses) + Leads ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DivisionRevenue
          divisions={divisions}
          divisionExpenseMap={divisionExpenseMap}
        />
        <LeadsSummary leads={leads} />
      </div>

      {/* ── Row 5: Expense snapshot ── */}
      <ExpenseSnapshot expensesByDivision={expensesByDivision} totalExpenses={summary.expenses} />
    </div>
  )
}