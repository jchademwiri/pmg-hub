'use client'

import { useState } from 'react'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { BudgetCard } from '@/components/dashboard/budget-card'
import { DivisionAreaChart } from '@/components/dashboard/division-area-chart'
import { DivisionRevenue } from '@/components/dashboard/division-revenue'
import { LeadsSummary } from '@/components/dashboard/leads-summary'
import { ExpenseSnapshot } from '@/components/dashboard/expense-snapshot'
import CloseMonthButton from '@/components/dashboard/close-month-button'
import type { PeriodSummary, DivisionRevenue as DivisionRevenueType, LeadStatusCount, MonthlyFinancials, BucketBalances, DivisionSeriesChart } from '@/lib/financial'

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
  ledgerBalances: BucketBalances
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
  ledgerBalances,
  divisionSeriesData,
  expensesByDivision,
  hasSnapshot,
  currentPeriod,
  showCloseMonthButton,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('current')

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
    <div className="space-y-5">

      {/* ── Close Month button — only shown days 1–5 and only if not yet closed ── */}
      {!hasSnapshot && showCloseMonthButton && (
        <CloseMonthButton period={currentPeriod} />
      )}

      {/* ── Period tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg w-fit border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-3 pl-3 border-l border-border text-xs text-muted-foreground/70 pr-1">
          {activeLabel}
        </span>
      </div>

      {/* ── Row 1: KPI cards ── */}
      <KpiGrid
        summary={activeSummary}
        deltas={activeDeltas}
        previousSummary={activePreviousSummary}
        deltaLabel={activeDeltaLabel}
      />

      {/* ── Row 2: Ledger Balances ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <BudgetCard
          title="PMG Share"
          bucket={ledgerBalances.pmg_share}
          colorClass="text-violet-500"
          bgClass="bg-violet-500/10"
          borderClass="border-violet-500/20"
        />
        <BudgetCard
          title="Salary"
          bucket={ledgerBalances.salary}
          colorClass="text-green-500"
          bgClass="bg-green-500/10"
          borderClass="border-green-500/20"
        />
        <BudgetCard
          title="Reinvest"
          bucket={ledgerBalances.reinvest}
          colorClass="text-blue-500"
          bgClass="bg-blue-500/10"
          borderClass="border-blue-500/20"
        />
        <BudgetCard
          title="Reserve"
          bucket={ledgerBalances.reserve}
          colorClass="text-amber-500"
          bgClass="bg-amber-500/10"
          borderClass="border-amber-500/20"
        />
        <BudgetCard
          title="Flex"
          bucket={ledgerBalances.flex}
          colorClass="text-purple-500"
          bgClass="bg-purple-500/10"
          borderClass="border-purple-500/20"
        />
      </div>

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