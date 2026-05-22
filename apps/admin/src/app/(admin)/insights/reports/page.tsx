import type { Metadata } from 'next'
import {
  getDistinctReportYears,
  getMoMChartData,
  getRevenueByDivisionSeriesForYear,
  getExpensesByCategory,
  getProfitPoolSeriesForYear,
} from '@/lib/financial'
import { MoMComparisonChart } from '@/components/reports/mom-comparison-chart'
import { RevenueByDivisionChart } from '@/components/reports/revenue-by-division-chart'
import { ExpenseByCategoryChart } from '@/components/reports/expense-by-category-chart'
import { ProfitPoolChart } from '@/components/reports/profit-pool-chart'
import { YearFilter } from '@/components/reports/year-filter'
import { ExportCsvButton } from '@/components/reports/export-csv-button'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Reports & Insights' }

interface ReportsPageProps {
  searchParams: Promise<{ year?: string }>
}

export function resolveYear(param: string | undefined): number {
  if (param !== undefined && /^\d{4}$/.test(param)) {
    const n = parseInt(param, 10)
    if (n >= 1000 && n <= 9999) return n
  }
  const now = new Date()
  return now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear()
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { year: yearParam } = await searchParams
  const year = resolveYear(yearParam)

  const [years, momData, divisionSeries, expensesByCategory, profitPoolSeries] =
    await Promise.all([
      getDistinctReportYears().catch((e) => { console.error('getDistinctReportYears failed:', e); return [] as number[] }),
      getMoMChartData().catch((e) => { console.error('getMoMChartData failed:', e); return [] }),
      getRevenueByDivisionSeriesForYear(year).catch((e) => { console.error('getRevenueByDivisionSeriesForYear failed:', e); return { series: [], divisions: [] } }),
      getExpensesByCategory(year).catch((e) => { console.error('getExpensesByCategory failed:', e); return [] }),
      getProfitPoolSeriesForYear(year).catch((e) => { console.error('getProfitPoolSeriesForYear failed:', e); return [] }),
    ])

  const hasData =
    momData.length > 0 ||
    divisionSeries.series.length > 0 ||
    expensesByCategory.length > 0 ||
    profitPoolSeries.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        <YearFilter years={years} currentYear={year} />
        <ExportCsvButton year={year} />
      </div>

      {hasData ? (
        <>
          <MoMComparisonChart data={momData} />
          <RevenueByDivisionChart
            series={divisionSeries.series}
            divisions={divisionSeries.divisions}
          />
          <ProfitPoolChart data={profitPoolSeries} />
          <ExpenseByCategoryChart data={expensesByCategory} />
        </>
      ) : (
        <EmptyState message="No snapshot data available yet. Add income and expenses to generate reports." />
      )}
    </div>
  )
}
