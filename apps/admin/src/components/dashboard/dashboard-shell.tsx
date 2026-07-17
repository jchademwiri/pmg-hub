'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { DivisionAreaChart } from '@/components/dashboard/division-area-chart'
import { DivisionRevenue } from '@/components/dashboard/division-revenue'
import { LeadsSummary } from '@/components/dashboard/leads-summary'
import { ExpenseSnapshot } from '@/components/dashboard/expense-snapshot'
import CloseMonthButton from '@/components/dashboard/close-month-button'
import { Badge } from '@/components/ui/badge'
import { AgingReportGrid } from '@/components/dashboard/aging-report-grid'
import { ProjectSummaryCard } from '@/components/dashboard/project-summary-card'
import type { TenderSummaryData } from '@/components/dashboard/project-summary-card'
import { fmtMonthYear } from '@/lib/format'
import type { AgingRow } from '@pmg/db'
import type { PeriodSummary, DivisionRevenue as DivisionRevenueType, LeadStatusCount, MonthlyFinancials, MonthlyBudgetChartRow } from '@/lib/financial'
import type { ProjectScheduleEntry, CurrentWorkload } from '@pmg/db'
import { AlertCircle, Clock, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'

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
  divisionExpenseMap: Record<string, number>
  leads: LeadStatusCount[]
  monthlySeries: MonthlyFinancials[]
  sparklineData: MonthlyFinancials[]
  agingReport: AgingRow[]
  budgetChartSeries: MonthlyBudgetChartRow[]
  expensesByDivision: { divisionName: string; total: number }[]
  hasSnapshot: boolean
  currentPeriod: string
  showCloseMonthButton: boolean
  projectScheduleSummary: TenderSummaryData
  pmgShareRate?: number
  projectsAtRisk: ProjectScheduleEntry[]
  currentWorkload: CurrentWorkload
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'current',  label: 'Current Month' },
  { key: 'previous', label: 'Previous Month' },
  { key: 'ytd',      label: 'Year to Date' },
]

export function DashboardShell({
  ytdSummary,
  previousYearYTDSummary,
  currentMonthSummary,
  previousMonthSummary,
  labels,
  deltas,
  divisions,
  divisionExpenseMap,
  leads,
  sparklineData,
  agingReport,
  budgetChartSeries,
  expensesByDivision,
  projectScheduleSummary,
  hasSnapshot,
  currentPeriod,
  showCloseMonthButton,
  pmgShareRate,
  projectsAtRisk,
  currentWorkload,
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

  return (
    <div className="flex flex-col gap-5">

      {/* ── Period tabs ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <span className="text-xs text-muted-foreground/70">{activeLabel}</span>
        </div>

        {/* Close Month button on the far right of the tabs bar */}
        {hasSnapshot ? (
          <Badge variant="secondary">{fmtMonthYear(currentPeriod)} closed</Badge>
        ) : (
          showCloseMonthButton && (
            <CloseMonthButton period={currentPeriod} />
          )
        )}
      </div>

      {/* ── Mobile: Urgent Alerts Strip ── */}
      <div className="md:hidden flex flex-col gap-3">
        {projectsAtRisk.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              {projectsAtRisk.length} project{projectsAtRisk.length === 1 ? ' is' : 's are'} currently at risk.
            </AlertDescription>
          </Alert>
        )}
        {agingReport.reduce((acc, row) => acc + (row.bucket30 + row.bucket60 + row.bucket90 + row.bucket120), 0) > 0 && (
          <Alert variant="destructive" className="bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle>Outstanding Invoices</AlertTitle>
            <AlertDescription>
              There are overdue invoices requiring attention.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Mobile: Today's Projects ── */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Today's Active Projects</h2>
          <Link href="/projects" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {currentWorkload.inProgress.slice(0, 3).map(project => (
            <div key={project.id} className="p-3 border border-border rounded-lg bg-card shadow-sm flex flex-col gap-2">
               <div className="flex justify-between items-start">
                  <span className="font-medium text-sm text-foreground">{project.title || project.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{project.status}</Badge>
               </div>
               {project.closingDate && (
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Due {new Date(project.closingDate).toLocaleDateString()}
                 </div>
               )}
            </div>
          ))}
          {currentWorkload.inProgress.length === 0 && (
            <div className="text-sm text-muted-foreground p-3 border border-border border-dashed rounded-lg text-center">
              No active projects for today.
            </div>
          )}
        </div>
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

      {/* ── Row 2: Project schedule summary ── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Project Schedule
        </h2>
        <ProjectSummaryCard data={projectScheduleSummary} />
      </section>

      {/* ── Row 3: Accounts Receivable Ageing Overview ── */}
      <section className="hidden md:block">
        <AgingReportGrid data={agingReport} />
      </section>

      {/* ── Row 4: Sales, receipts, and expenses budget chart ── */}
      <div className="w-full hidden md:block">
        <DivisionAreaChart data={budgetChartSeries} />
      </div>

      {/* ── Row 5: Division revenue with expenses + Leads ── */}
      <div className="flex-col gap-2 hidden md:flex">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Revenue & Leads
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DivisionRevenue
            divisions={divisions}
            divisionExpenseMap={new Map(Object.entries(divisionExpenseMap))}
          />
          <LeadsSummary leads={leads} />
        </div>
      </div>

      {/* ── Row 6: Expense breakdown ── */}
      <section className="flex-col gap-2 hidden md:flex">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Expense Breakdown
        </h2>
        <ExpenseSnapshot
          expensesByDivision={expensesByDivision}
          totalExpenses={activeSummary.expenses}
        />
      </section>

      {/* ── Mobile: View Full Analytics Link ── */}
      <div className="md:hidden mt-2">
        <Button variant="outline" className="w-full bg-card" asChild>
          <Link href="/analytics" className="text-muted-foreground hover:text-foreground">
            View full analytics (Desktop)
          </Link>
        </Button>
      </div>

    </div>
  )
}
