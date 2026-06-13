'use client'

import { useState } from 'react'
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
import type { AgingRow } from '@pmg/db'
import type { PeriodSummary, DivisionRevenue as DivisionRevenueType, LeadStatusCount, MonthlyFinancials, DivisionSeriesChart } from '@/lib/financial'

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
  divisionSeriesData: {
    last3: DivisionSeriesChart
    last6: DivisionSeriesChart
    ytd:   DivisionSeriesChart
    current: DivisionSeriesChart
    prev:    DivisionSeriesChart
  }
  expensesByDivision: { divisionName: string; total: number }[]
  hasSnapshot: boolean
  currentPeriod: string
  showCloseMonthButton: boolean
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
  divisionSeriesData,
  expensesByDivision,
  hasSnapshot,
  currentPeriod,
  showCloseMonthButton,
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
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <span className="text-xs text-muted-foreground/70">{activeLabel}</span>
          </div>

          {/* Close Month button on the far right of the tabs bar */}
          {hasSnapshot ? (
            <Badge variant="secondary">Month closed</Badge>
          ) : (
            showCloseMonthButton && (
              <CloseMonthButton period={currentPeriod} />
            )
          )}
        </div>
      </Tabs>

      {/* ── Row 1: KPI cards ── */}
      <KpiGrid
        summary={activeSummary}
        deltas={activeDeltas}
        previousSummary={activePreviousSummary}
        deltaLabel={activeDeltaLabel}
        sparklineData={sparklineData}
      />

      {/* ── Row 2: Accounts Receivable Ageing Overview ── */}
      <AgingReportGrid data={agingReport} />

      {/* ── Row 3: Division Area Chart ── */}
      <div className="w-full">
        <DivisionAreaChart seriesData={divisionSeriesData} />
      </div>

      {/* ── Row 4: Division revenue with expenses + Leads ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DivisionRevenue
          divisions={divisions}
          divisionExpenseMap={new Map(Object.entries(divisionExpenseMap))}
        />
        <LeadsSummary leads={leads} />
      </div>

      {/* ── Row 5: Expense breakdown ── */}
      <ExpenseSnapshot
        expensesByDivision={expensesByDivision}
        totalExpenses={activeSummary.expenses}
      />

    </div>
  )
}