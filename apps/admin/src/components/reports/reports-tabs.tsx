'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoMComparisonChart } from './mom-comparison-chart'
import { RevenueByDivisionChart } from './revenue-by-division-chart'
import { ExpenseByCategoryChart } from './expense-by-category-chart'
import { ProfitPoolChart } from './profit-pool-chart'
import { WaterfallChart } from './waterfall-chart'
import { SankeyDiagram } from './sankey-diagram'
import { ReportCommentary } from './report-commentary'
import { FinancialDrilldownSheet } from '@/components/insights/financial-drilldown-sheet'
import type { DrilldownType } from '@/app/actions/drilldown'
import { TrendingUp, DollarSign, Receipt, PiggyBank } from 'lucide-react'
import type { MoMSnapshot, ProfitPoolRow, MonthlyFinancials, MonthlyBudgetChartRow, BucketBalances } from '@/lib/financial'

interface ReportsTabsProps {
  momData: MoMSnapshot[]
  budgetChartSeries: MonthlyBudgetChartRow[]
  expensesByCategory: { category: string; total: number }[]
  monthlyFinancials: MonthlyFinancials[]
  currentPeriod: string
  previousPeriod: string
  currentMonthLabel: string
  previousMonthLabel: string
  ledgerBalances?: BucketBalances
  pmgShareRate?: number
}

export function ReportsTabs({
  momData,
  budgetChartSeries,
  expensesByCategory,
  monthlyFinancials,
  currentPeriod,
  previousPeriod,
  currentMonthLabel,
  previousMonthLabel,
  ledgerBalances,
  pmgShareRate,
}: ReportsTabsProps) {
  const [drillOpen, setDrillOpen] = useState(false)
  const [drillPeriod, setDrillPeriod] = useState<string | null>(null)
  const [drillType, setDrillType] = useState<DrilldownType | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') || 'overview'

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', val)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

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

  // Calculate annual totals for waterfall and sankey flow diagram
  const totalRevenue = monthlyFinancials.reduce((sum, m) => sum + m.revenue, 0)
  const totalExpenses = monthlyFinancials.reduce((sum, m) => sum + m.expenses, 0)
  const PMG_SHARE_RATE = pmgShareRate ?? 0.25
  const totalPmgShare = totalRevenue * PMG_SHARE_RATE
  const totalProfitPool = totalRevenue - totalExpenses - totalPmgShare

  return (
    <>
    <FinancialDrilldownSheet
      open={drillOpen}
      onOpenChange={setDrillOpen}
      period={drillPeriod}
      drillType={drillType}
    />
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
          Net Profit
        </TabsTrigger>
      </TabsList>

      {/* ── Overview Tab ───────────────────────────────────────────────── */}
      <TabsContent value="overview">
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
            <MoMComparisonChart data={momData} currentMonthLabel={currentMonthLabel} previousMonthLabel={previousMonthLabel} onBarClick={(metric, periodType) => {
              const type = metricToDrillType[metric]
              if (type) {
                const targetPeriod = periodType === 'current' ? currentPeriod : previousPeriod
                openDrill(type, targetPeriod)
              }
            }} />
            <WaterfallChart
              revenue={totalRevenue}
              expenses={totalExpenses}
              pmgShare={totalPmgShare}
              profitPool={totalProfitPool}
            />
          </div>
          <ReportCommentary
            momData={momData}
            currentMonthLabel={currentMonthLabel}
            previousMonthLabel={previousMonthLabel}
          />
        </div>
      </TabsContent>

      {/* ── Revenue Tab ────────────────────────────────────────────────── */}
      <TabsContent value="revenue">
        <div className="grid grid-cols-1 gap-6 min-h-[400px]">
          <RevenueByDivisionChart
            data={budgetChartSeries}
          />
        </div>
      </TabsContent>

      {/* ── Expenses Tab ───────────────────────────────────────────────── */}
      <TabsContent value="expenses">
        <div className="grid grid-cols-1 gap-6 min-h-[400px]">
          <ExpenseByCategoryChart data={expensesByCategory} onBarClick={() => openDrill('expenses', currentPeriod)} />
        </div>
      </TabsContent>

      {/* ── Profit Pool Tab ────────────────────────────────────────────── */}
      <TabsContent value="profit">
        <div className="grid grid-cols-1 gap-6 min-h-[400px]">
          <SankeyDiagram
            revenue={totalRevenue}
            expenses={totalExpenses}
            pmgShare={totalPmgShare}
            profitPool={totalProfitPool}
            ledgerBalances={ledgerBalances}
          />
          <ProfitPoolChart
            data={monthlyFinancials.map(m => ({ period: m.month, profit: m.revenue * (1 - PMG_SHARE_RATE) - m.expenses }))}
          />
        </div>
      </TabsContent>
    </Tabs>
    </>
  )
}
