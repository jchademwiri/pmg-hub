'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoMComparisonChart } from './mom-comparison-chart'
import { RevenueByDivisionChart } from './revenue-by-division-chart'
import { ExpenseByCategoryChart } from './expense-by-category-chart'
import { ProfitPoolChart } from './profit-pool-chart'
import { FinancialDrilldownSheet } from '@/components/insights/financial-drilldown-sheet'
import type { DrilldownType } from '@/app/actions/drilldown'
import { TrendingUp, DollarSign, Receipt, PiggyBank } from 'lucide-react'
import type { MoMSnapshot, DivisionSeriesChart, ProfitPoolRow } from '@/lib/financial'

interface ReportsTabsProps {
  momData: MoMSnapshot[]
  divisionSeries: DivisionSeriesChart
  expensesByCategory: { category: string; total: number }[]
  profitPoolSeries: ProfitPoolRow[]
  currentPeriod: string
  previousPeriod: string
  currentMonthLabel: string
  previousMonthLabel: string
}

export function ReportsTabs({
  momData,
  divisionSeries,
  expensesByCategory,
  profitPoolSeries,
  currentPeriod,
  previousPeriod,
  currentMonthLabel,
  previousMonthLabel,
}: ReportsTabsProps) {
  const [drillOpen, setDrillOpen] = useState(false)
  const [drillPeriod, setDrillPeriod] = useState<string | null>(null)
  const [drillType, setDrillType] = useState<DrilldownType | null>(null)

  const openDrill = (type: DrilldownType, period: string) => {
    setDrillType(type)
    setDrillPeriod(period)
    setDrillOpen(true)
  }

  // Map MoM metric names to drill-down types
  const metricToDrillType: Record<string, DrilldownType> = {
    'Revenue': 'revenue',
    'Expenses': 'expenses',
  }

  return (
    <>
    <FinancialDrilldownSheet
      open={drillOpen}
      onOpenChange={setDrillOpen}
      period={drillPeriod}
      drillType={drillType}
    />
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="overview" className="gap-1.5">
          <TrendingUp className="size-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="revenue" className="gap-1.5">
          <DollarSign className="size-3.5" />
          Revenue
        </TabsTrigger>
        <TabsTrigger value="expenses" className="gap-1.5">
          <Receipt className="size-3.5" />
          Expenses
        </TabsTrigger>
        <TabsTrigger value="profit" className="gap-1.5">
          <PiggyBank className="size-3.5" />
          Profit Pool
        </TabsTrigger>
      </TabsList>

      {/* ── Overview Tab ───────────────────────────────────────────────── */}
      <TabsContent value="overview">
        <div className="grid grid-cols-1 gap-6">
          <MoMComparisonChart data={momData} currentMonthLabel={currentMonthLabel} previousMonthLabel={previousMonthLabel} onBarClick={(metric, periodType) => {
            const type = metricToDrillType[metric]
            if (type) {
              const targetPeriod = periodType === 'current' ? currentPeriod : previousPeriod
              openDrill(type, targetPeriod)
            }
          }} />
        </div>
      </TabsContent>

      {/* ── Revenue Tab ────────────────────────────────────────────────── */}
      <TabsContent value="revenue">
        <div className="grid grid-cols-1 gap-6">
          <RevenueByDivisionChart
            series={divisionSeries.series}
            divisions={divisionSeries.divisions}
          />
        </div>
      </TabsContent>

      {/* ── Expenses Tab ───────────────────────────────────────────────── */}
      <TabsContent value="expenses">
        <div className="grid grid-cols-1 gap-6">
          <ExpenseByCategoryChart data={expensesByCategory} onBarClick={() => openDrill('expenses', currentPeriod)} />
        </div>
      </TabsContent>

      {/* ── Profit Pool Tab ────────────────────────────────────────────── */}
      <TabsContent value="profit">
        <div className="grid grid-cols-1 gap-6">
          <ProfitPoolChart
            data={profitPoolSeries}
            onBarClick={(type, period) => openDrill(type, period)}
          />
        </div>
      </TabsContent>
    </Tabs>
    </>
  )
}
