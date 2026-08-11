'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { DivisionAreaChart } from '@/components/dashboard/division-area-chart'
import { ExpenseSnapshot } from '@/components/dashboard/expense-snapshot'
import CloseMonthButton from '@/components/dashboard/close-month-button'
import { Badge } from '@/components/ui/badge'
import { AgingReportGrid } from '@/components/dashboard/aging-report-grid'
import { fmtMonthYear, formatZAR } from '@/lib/format'
import { summarizeAging } from '@/lib/aging-summary'
import type { AgingRow } from '@pmg/db'
import type { PeriodSummary, DivisionRevenue as DivisionRevenueType, MonthlyFinancials, MonthlyBudgetChartRow } from '@/lib/financial'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Tab = 'current' | 'previous' | 'ytd'

type Props = {
  ytdSummary: PeriodSummary
  previousYearYTDSummary: PeriodSummary
  currentMonthSummary: PeriodSummary
  previousMonthSummary: PeriodSummary
  labels: { current: string; previous: string; ytd: string }
  deltas: {
    revenue:  { current: number; previous: number } | null
    expenses: { current: number; previous: number } | null
    profit:   { current: number; previous: number } | null
  }
  divisions: DivisionRevenueType[]
  arByDivision: DivisionRevenueType[]
  invoicedByDivision: DivisionRevenueType[]
  monthlySeries: MonthlyFinancials[]
  sparklineData: MonthlyFinancials[]
  agingReport: AgingRow[]
  budgetChartSeries: MonthlyBudgetChartRow[]
  expensesByDivision: { divisionId?: string; divisionName: string; total: number }[]
  hasSnapshot: boolean
  currentPeriod: string
  showCloseMonthButton: boolean
  pmgShareRate?: number
}

const TABS: { key: Tab; label: string; shortLabel: string }[] = [
  { key: 'current',  label: 'Current Month',  shortLabel: 'Current' },
  { key: 'previous', label: 'Previous Month', shortLabel: 'Previous' },
  { key: 'ytd',      label: 'Year to Date',   shortLabel: 'YTD' },
]

export function DashboardShell({
  ytdSummary,
  previousYearYTDSummary,
  currentMonthSummary,
  previousMonthSummary,
  labels,
  deltas,
  divisions,
  arByDivision = [],
  invoicedByDivision = [],
  sparklineData = [],
  agingReport = [],
  budgetChartSeries = [],
  expensesByDivision = [],
  hasSnapshot,
  currentPeriod,
  showCloseMonthButton,
  pmgShareRate,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
 
  const activeTab = (searchParams.get('tab') as Tab) || 'current'
 
  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', val)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const summaryMap: Record<Tab, PeriodSummary> = {
    current:  currentMonthSummary,
    previous: previousMonthSummary,
    ytd:      ytdSummary,
  }

  const activeSummary = summaryMap[activeTab]
  const activeLabel   = labels[activeTab]

  // MoM deltas only make sense on Current Month tab
  const showDeltas = activeTab === 'current'

  // Build deltas and comparison label per tab
  const activeDeltas = activeTab === 'current' ? (showDeltas ? deltas : null) :
    activeTab === 'previous' ? {
      revenue:  { current: previousMonthSummary.revenue,    previous: currentMonthSummary.revenue },
      expenses: { current: previousMonthSummary.expenses,   previous: currentMonthSummary.expenses },
      profit:   { current: previousMonthSummary.profitPool, previous: currentMonthSummary.profitPool },
    } : {
      revenue:  { current: ytdSummary.revenue,    previous: previousYearYTDSummary.revenue },
      expenses: { current: ytdSummary.expenses,   previous: previousYearYTDSummary.expenses },
      profit:   { current: ytdSummary.profitPool, previous: previousYearYTDSummary.profitPool },
    }

  const activePreviousSummary = activeTab === 'current' ? previousMonthSummary :
    activeTab === 'previous' ? currentMonthSummary :
    previousYearYTDSummary

  const activeDeltaLabel = activeTab === 'current' ? 'vs prev month' :
    activeTab === 'previous' ? 'vs current month' :
    'vs prev year'

  const { current: currentBalance, over15: over15Balance, overdue: overdueBalance } = summarizeAging(agingReport);

  const resolvedPmgShareRate = pmgShareRate ?? 0.25

  return (
    <div className="flex flex-col gap-5">

      {/* ── Period tabs ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="min-w-0">
                  <span className="lg:hidden truncate">{tab.shortLabel}</span>
                  <span className="hidden lg:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Close Month button on the far right of the tabs bar */}
        <div className="hidden md:flex shrink-0 items-center">
          {hasSnapshot ? (
            <Badge
              variant="secondary"
              className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-border/40 bg-muted/80 text-muted-foreground shadow-2xs gap-1.5 whitespace-nowrap"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{fmtMonthYear(currentPeriod)} closed</span>
            </Badge>
          ) : (
            showCloseMonthButton && (
              <CloseMonthButton period={currentPeriod} />
            )
          )}
        </div>
      </div>

      {/* ── Mobile: Urgent Alerts Strip ── */}
      <div className="md:hidden flex flex-col gap-3">
        {overdueBalance > 0 && (
          <Alert variant="destructive" className="bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle>Outstanding Invoices</AlertTitle>
            <AlertDescription className="mt-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium opacity-80 uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Current</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatZAR(currentBalance)}</span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-xs font-medium opacity-80 uppercase tracking-wider text-red-600 dark:text-red-400">15+ Days</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{formatZAR(over15Balance)}</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Row 1: KPI cards ── */}
      <KpiGrid
        summary={activeSummary}
        deltas={activeDeltas}
        previousSummary={activePreviousSummary}
        deltaLabel={activeDeltaLabel}
        sparklineData={sparklineData}
        pmgShareRate={pmgShareRate}
      />

      {/* ── Row 3: Accounts Receivable Ageing Overview ── */}
      <section className="hidden md:block">
        <AgingReportGrid data={agingReport} />
      </section>

      {/* ── Row 4: Sales, receipts, and expenses budget chart ── */}
      <div className="w-full hidden md:block">
        <DivisionAreaChart data={budgetChartSeries} />
      </div>

      {/* ── Row 5: Division financial breakdown ── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Division Breakdown
        </h2>
        <ExpenseSnapshot
          divisions={divisions}
          invoicedByDivision={invoicedByDivision}
          expensesByDivision={expensesByDivision}
          arByDivision={arByDivision}
          pmgShareRate={resolvedPmgShareRate}
        />
      </section>

      {/* ── Mobile: View Full Analytics Link ── */}
      <div className="md:hidden mt-2">
        <Button variant="outline" className="w-full bg-card" asChild>
          <Link href="/insights/analysis" className="text-muted-foreground hover:text-foreground">
            View full analytics (Desktop)
          </Link>
        </Button>
      </div>

    </div>
  )
}
