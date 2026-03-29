import type { Metadata } from 'next'
import { getFinancialSummary, getDivisionRevenue, getLeadCounts } from '@/lib/financial'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { SalaryCard } from '@/components/dashboard/salary-card'
import { AllocationBar } from '@/components/dashboard/allocation-bar'
import { DivisionRevenue } from '@/components/dashboard/division-revenue'
import { LeadsSummary } from '@/components/dashboard/leads-summary'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const [summary, divisions, leads] = await Promise.all([
    getFinancialSummary(),
    getDivisionRevenue(),
    getLeadCounts(),
  ])

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue"   value={summary.revenue}  />
        <KpiCard label="Total Expenses"  value={summary.expenses} />
        <KpiCard label="PMG Share (20%)" value={summary.pmgShare} />
        <KpiCard label="Profit Pool"     value={summary.profitPool} />
      </div>

      {/* Salary + Allocation row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalaryCard salary={summary.salary} />
        <div className="lg:col-span-2">
          <AllocationBar summary={summary} />
        </div>
      </div>

      {/* Division revenue + Leads row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DivisionRevenue divisions={divisions} />
        <LeadsSummary leads={leads} />
      </div>
    </div>
  )
}
