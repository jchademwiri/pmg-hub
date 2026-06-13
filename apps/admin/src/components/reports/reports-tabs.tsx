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
import type { MoMSnapshot, DivisionSeriesChart, ProfitPoolRow, MonthlyFinancials, BucketBalances } from '@/lib/financial'

interface ReportsTabsProps {
  momData: MoMSnapshot[]
  divisionSeries: DivisionSeriesChart
  expensesByCategory: { category: string; total: number }[]
  profitPoolSeries: ProfitPoolRow[]
  monthlyFinancials: MonthlyFinancials[]
  currentPeriod: string
  previousPeriod: string
  currentMonthLabel: string
  previousMonthLabel: string
  ledgerBalances?: BucketBalances
}

export function ReportsTabs({
  momData,
  divisionSeries,
  expensesByCategory,
  profitPoolSeries,
  monthlyFinancials,
  currentPeriod,
  previousPeriod,
  currentMonthLabel,
  previousMonthLabel,
  ledgerBalances,
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
  const totalPmgShare = totalRevenue * 0.25
  const totalProfitPool = totalRevenue - totalExpenses - totalPmgShare
  const totalSalary = totalProfitPool * 0.35
  const totalReinvest = totalProfitPool * 0.30
  const totalReserve = totalProfitPool * 0.30
  const totalFlex = totalProfitPool * 0.05

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
          Profit Pool
        </TabsTrigger>
      </TabsList>

      {/* ── Overview Tab ───────────────────────────────────────────────── */}
      <TabsContent value="overview">
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <ReportCommentary momData={momData} />
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
          <SankeyDiagram
            revenue={totalRevenue}
            expenses={totalExpenses}
            pmgShare={totalPmgShare}
            profitPool={totalProfitPool}
            salary={totalSalary}
            reinvest={totalReinvest}
            reserve={totalReserve}
            flex={totalFlex}
            ledgerBalances={ledgerBalances}
          />
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
