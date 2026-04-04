import type { Metadata } from 'next'
import {
  getDistinctReportYears,
  getMoMChartData,
  getMonthlyFinancialsSeriesForYear,
  getRevenueByDivisionSeriesForYear,
  getExpensesByCategory,
} from '@/lib/financial'
import { MoMComparisonChart } from '@/components/reports/mom-comparison-chart'
import { RevenueByDivisionChart } from '@/components/reports/revenue-by-division-chart'
import { RevenueVsExpensesChart } from '@/components/reports/revenue-vs-expenses-chart'
import { ExpenseByCategoryChart } from '@/components/reports/expense-by-category-chart'
import { YearFilter } from '@/components/reports/year-filter'
import { ExportCsvButton } from '@/components/reports/export-csv-button'

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
  return new Date().getFullYear()
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { year: yearParam } = await searchParams
  const year = resolveYear(yearParam)

  const [years, momData, monthlySeries, divisionSeries, expensesByCategory] =
    await Promise.all([
      getDistinctReportYears().catch((e) => { console.error('getDistinctReportYears failed:', e); return [] as number[] }),
      getMoMChartData().catch((e) => { console.error('getMoMChartData failed:', e); return [] }),
      getMonthlyFinancialsSeriesForYear(year).catch((e) => { console.error('getMonthlyFinancialsSeriesForYear failed:', e); return [] }),
      getRevenueByDivisionSeriesForYear(year).catch((e) => { console.error('getRevenueByDivisionSeriesForYear failed:', e); return { series: [], divisions: [] } }),
      getExpensesByCategory(year).catch((e) => { console.error('getExpensesByCategory failed:', e); return [] }),
    ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports &amp; Insights</h1>
        <div className="flex items-center gap-2">
          <YearFilter years={years} currentYear={year} />
          <ExportCsvButton year={year} />
        </div>
      </div>

      <MoMComparisonChart data={momData} />
      <RevenueByDivisionChart
        series={divisionSeries.series}
        divisions={divisionSeries.divisions}
      />
      <RevenueVsExpensesChart series={monthlySeries} />
      <ExpenseByCategoryChart data={expensesByCategory} />
    </div>
  )
}
