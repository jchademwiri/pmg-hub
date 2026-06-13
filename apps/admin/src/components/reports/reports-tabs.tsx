'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoMComparisonChart } from './mom-comparison-chart'
import { RevenueByDivisionChart } from './revenue-by-division-chart'
import { ExpenseByCategoryChart } from './expense-by-category-chart'
import { ProfitPoolChart } from './profit-pool-chart'
import { TrendingUp, DollarSign, Receipt, PiggyBank } from 'lucide-react'
import type { MoMSnapshot, DivisionSeriesChart, ProfitPoolRow } from '@/lib/financial'

interface ReportsTabsProps {
  momData: MoMSnapshot[]
  divisionSeries: DivisionSeriesChart
  expensesByCategory: { category: string; total: number }[]
  profitPoolSeries: ProfitPoolRow[]
}

export function ReportsTabs({
  momData,
  divisionSeries,
  expensesByCategory,
  profitPoolSeries,
}: ReportsTabsProps) {
  return (
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
          <MoMComparisonChart data={momData} />
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
          <ExpenseByCategoryChart data={expensesByCategory} />
        </div>
      </TabsContent>

      {/* ── Profit Pool Tab ────────────────────────────────────────────── */}
      <TabsContent value="profit">
        <div className="grid grid-cols-1 gap-6">
          <ProfitPoolChart data={profitPoolSeries} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
