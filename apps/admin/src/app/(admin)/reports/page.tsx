import type { Metadata } from 'next'
import { getRevenueByDivisionSeries, getMonthlyFinancialsSeries, getMoMChartData } from '@/lib/financial'
import { RevenueByDivisionChart } from '@/components/reports/revenue-by-division-chart'
import { RevenueVsExpensesChart } from '@/components/reports/revenue-vs-expenses-chart'
import { MoMComparisonChart } from '@/components/reports/mom-comparison-chart'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const [{ series: divSeries, divisions }, financialsSeries, momData] = await Promise.all([
    getRevenueByDivisionSeries(),
    getMonthlyFinancialsSeries(),
    getMoMChartData(),
  ])

  return (
    <div className="space-y-6">
      <RevenueByDivisionChart series={divSeries} divisions={divisions} />
      <RevenueVsExpensesChart series={financialsSeries} />
      <MoMComparisonChart data={momData} />
    </div>
  )
}
