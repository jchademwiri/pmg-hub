import type { Metadata } from 'next'
import {
  getDistinctReportYears,
  getMoMChartData,
  getRevenueByDivisionSeriesForYear,
  getExpensesByCategory,
  getProfitPoolSeriesForYear,
  getMonthlyFinancialsSeriesForYear,
} from '@/lib/financial'
import { YearFilter } from '@/components/reports/year-filter'
import { ExportCsvButton } from '@/components/reports/export-csv-button'
import { EmptyState } from '@/components/ui/empty-state'
import { ReportKpiStrip } from '@/components/reports/report-kpi-strip'
import { ReportsTabs } from '@/components/reports/reports-tabs'
import { fmtMonthYear, getSASTParts } from '@/lib/format'

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

  // Current period for drill-down (YYYY-MM) in SAST
  const { year: sastYear, month: sastMonth } = getSASTParts()
  const currentPeriod = `${sastYear}-${String(sastMonth + 1).padStart(2, '0')}`
  const prevDate = new Date(sastYear, sastMonth - 1, 1)
  const previousPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  // Human-readable month labels for MoM chart legend
  const currentMonthLabel = fmtMonthYear(new Date(sastYear, sastMonth, 1))
  const previousMonthLabel = fmtMonthYear(new Date(sastYear, sastMonth - 1, 1))

  const [years, momData, divisionSeries, expensesByCategory, profitPoolSeries, monthlyFinancials] =
    await Promise.all([
      getDistinctReportYears().catch((e) => { console.error('getDistinctReportYears failed:', e); return [] as number[] }),
      getMoMChartData().catch((e) => { console.error('getMoMChartData failed:', e); return [] }),
      getRevenueByDivisionSeriesForYear(year).catch((e) => { console.error('getRevenueByDivisionSeriesForYear failed:', e); return { series: [], divisions: [] } }),
      getExpensesByCategory(year).catch((e) => { console.error('getExpensesByCategory failed:', e); return [] }),
      getProfitPoolSeriesForYear(year).catch((e) => { console.error('getProfitPoolSeriesForYear failed:', e); return [] }),
      getMonthlyFinancialsSeriesForYear(year).catch((e) => { console.error('getMonthlyFinancialsSeriesForYear failed:', e); return [] }),
    ])

  const hasData =
    momData.length > 0 ||
    divisionSeries.series.length > 0 ||
    expensesByCategory.length > 0 ||
    profitPoolSeries.length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 -mx-6 px-6 py-4 -mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Reports & Insights</h2>
            <p className="text-sm text-muted-foreground">Analyze revenue streams, expense distributions, and monthly profit splits</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <YearFilter years={years} currentYear={year} />
            <ExportCsvButton year={year} />
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="flex flex-col gap-6">
          <ReportKpiStrip data={{
            revenue: monthlyFinancials.reduce((s, m) => s + m.revenue, 0),
            expenses: monthlyFinancials.reduce((s, m) => s + m.expenses, 0),
            pmgShare: monthlyFinancials.reduce((s, m) => s + m.revenue, 0) * 0.25,
            profitPool: monthlyFinancials.reduce((s, m) => s + (m.revenue * 0.75 - m.expenses), 0),
            monthlyRevenue: monthlyFinancials.map((m) => m.revenue),
            monthlyExpenses: monthlyFinancials.map((m) => m.expenses),
          }} />
          <ReportsTabs
            momData={momData}
            divisionSeries={divisionSeries}
            expensesByCategory={expensesByCategory}
            profitPoolSeries={profitPoolSeries}
            currentPeriod={currentPeriod}
            previousPeriod={previousPeriod}
            currentMonthLabel={currentMonthLabel}
            previousMonthLabel={previousMonthLabel}
          />
        </div>
      ) : (
        <EmptyState message="No snapshot data available yet. Add income and expenses to generate reports." />
      )}
    </div>
  )
}
