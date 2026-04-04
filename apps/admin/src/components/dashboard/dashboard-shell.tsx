'use client'

import { useState } from 'react'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { SalaryCard } from '@/components/dashboard/salary-card'
import { DivisionAreaChart } from '@/components/dashboard/division-area-chart'
import { DivisionRevenue } from '@/components/dashboard/division-revenue'
import { LeadsSummary } from '@/components/dashboard/leads-summary'
import { ExpenseSnapshot } from '@/components/dashboard/expense-snapshot'
import CloseMonthButton from '@/components/dashboard/close-month-button'
import { Badge } from '@/components/ui/badge'
import type { PeriodSummary, DivisionRevenue as DivisionRevenueType, LeadStatusCount, MonthlyFinancials, WithdrawalSummary, DivisionSeriesChart } from '@/lib/financial'
import type { SnapshotRow } from '@pmg/db'

type Tab = 'current' | 'previous' | 'ytd'

type Props = {
  ytdSummary: PeriodSummary
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
  withdrawals: WithdrawalSummary
  withdrawalsPrevMonth: WithdrawalSummary
  withdrawalsYTD: WithdrawalSummary
  divisionSeriesData: {
    last3: DivisionSeriesChart
    last6: DivisionSeriesChart
    ytd:   DivisionSeriesChart
    current: DivisionSeriesChart
    prev:    DivisionSeriesChart
  }
  expensesByDivision: { divisionName: string; total: number }[]
  currentPeriodSnapshot: SnapshotRow | null
  currentPeriod: string
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'current',  label: 'Current Month' },
  { key: 'previous', label: 'Previous Month' },
  { key: 'ytd',      label: 'Year to Date' },
]

export function DashboardShell({
  ytdSummary,
  currentMonthSummary,
  previousMonthSummary,
  labels,
  deltas,
  divisions,
  divisionExpenseMap,
  leads,
  sparklineData,
  withdrawals,
  withdrawalsPrevMonth,
  withdrawalsYTD,
  divisionSeriesData,
  expensesByDivision,
  currentPeriodSnapshot,
  currentPeriod,
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

  return (
    <div className="space-y-5">

      {/* ── Close Month / Month closed ── */}
      {currentPeriodSnapshot === null ? (
        <CloseMonthButton period={currentPeriod} />
      ) : (
        <Badge variant="secondary">Month closed</Badge>
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
        deltas={showDeltas ? deltas : null}
        previousSummary={showDeltas ? previousMonthSummary : null}
      />

      {/* ── Row 2: Salary card + Division Area Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalaryCard
          salary={activeSummary.salary}
          ytdSalary={ytdSummary.salary}
          profitPool={activeSummary.profitPool}
          periodLabel={activeLabel}
          withdrawals={
            activeTab === 'current'  ? withdrawals :
            activeTab === 'previous' ? withdrawalsPrevMonth :
            withdrawalsYTD
          }
          carryOver={
            activeTab === 'current'  ? withdrawals.carryOver :
            activeTab === 'previous' ? withdrawalsPrevMonth.carryOver :
            0
          }
          showWithdrawButton={activeTab === 'current'}
          withdrawLabel={
            activeTab === 'ytd' ? 'Withdrawn YTD' : 'Withdrawn this month'
          }
        />
        <div className="lg:col-span-2">
          <DivisionAreaChart seriesData={divisionSeriesData} />
        </div>
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