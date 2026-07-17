import type { Metadata } from 'next'
import {
  getDistinctReportYears,
  getMoMChartData,
  getBudgetChartSeriesForYear,
  getExpensesByCategory,
  getMonthlyFinancialsSeriesForYear,
  getLedgerBalances,
} from '@/lib/financial'
import { YearFilter } from '@/components/reports/year-filter'
import { ExportCsvButton } from '@/components/reports/export-csv-button'
import { EmptyState } from '@/components/ui/empty-state'
import { StickyPageHeader } from '@/components/ui/sticky-page-header'
import { ReportKpiStrip } from '@/components/reports/report-kpi-strip'
import { ReportsTabs } from '@/components/reports/reports-tabs'
import { fmtMonthYear, getSASTParts } from '@/lib/format'
import { getActiveRates } from '@pmg/db'

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

  const [years, momData, budgetChartSeries, expensesByCategory, monthlyFinancials, ledgerBalances, activeRates] =
    await Promise.all([
      getDistinctReportYears().catch((e) => { console.error('getDistinctReportYears failed:', e); return [] as number[] }),
      getMoMChartData().catch((e) => { console.error('getMoMChartData failed:', e); return [] }),
      getBudgetChartSeriesForYear(year).catch((e) => { console.error('getBudgetChartSeriesForYear failed:', e); return [] }),
      getExpensesByCategory(year).catch((e) => { console.error('getExpensesByCategory failed:', e); return [] }),
      getMonthlyFinancialsSeriesForYear(year).catch((e) => { console.error('getMonthlyFinancialsSeriesForYear failed:', e); return [] }),
      getLedgerBalances().catch((e) => { console.error('getLedgerBalances failed:', e); return undefined }),
      getActiveRates().catch((e) => { console.error('getActiveRates failed:', e); return { pmg_share: 0.25, salary: 0.35, reinvest: 0.30, reserve: 0.30, flex: 0.05 } }),
    ])

  const pmgShareRate = activeRates?.pmg_share ?? 0.25

  const hasData =
    momData.length > 0 ||
    budgetChartSeries.length > 0 ||
    expensesByCategory.length > 0

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Reports & Insights"
        description="Analyze revenue streams, expense distributions, and monthly profit splits"
        actions={
          <>
            <YearFilter years={years} currentYear={year} />
            <ExportCsvButton year={year} />
          </>
        }
      />

      {hasData ? (
        <div className="flex flex-col gap-6">
          <ReportKpiStrip data={{
            revenue: monthlyFinancials.reduce((s, m) => s + m.revenue, 0),
            expenses: monthlyFinancials.reduce((s, m) => s + m.expenses, 0),
            pmgShare: monthlyFinancials.reduce((s, m) => s + m.revenue, 0) * pmgShareRate,
            profitPool: monthlyFinancials.reduce((s, m) => s + (m.revenue * (1 - pmgShareRate) - m.expenses), 0),
            monthlyRevenue: monthlyFinancials.map((m) => m.revenue),
            monthlyExpenses: monthlyFinancials.map((m) => m.expenses),
            pmgShareRate,
          }} />
          <ReportsTabs
            momData={momData}
            budgetChartSeries={budgetChartSeries}
            expensesByCategory={expensesByCategory}
            monthlyFinancials={monthlyFinancials}
            currentPeriod={currentPeriod}
            previousPeriod={previousPeriod}
            currentMonthLabel={currentMonthLabel}
            previousMonthLabel={previousMonthLabel}
            ledgerBalances={ledgerBalances}
            pmgShareRate={pmgShareRate}
          />
        </div>
      ) : (
        <EmptyState message="No snapshot data available yet. Add income and expenses to generate reports." />
      )}
    </div>
  )
}
