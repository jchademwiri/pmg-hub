'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { MonthlyFinancials } from '@/lib/financial'

const config: ChartConfig = {
  revenue:  { label: 'Revenue',  color: 'var(--chart-1)' },
  expenses: { label: 'Expenses', color: 'var(--chart-3)' },
}

type Props = { series: MonthlyFinancials[] }

export function RevenueVsExpensesChart({ series }: Props) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle>Revenue vs Expenses — Current Year</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No data for the current year.</p>
        ) : (
          <ChartContainer config={config}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatZAR} tick={{ fill: 'var(--muted-foreground)' }} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="revenue"  stroke="var(--chart-1)" dot={false} />
              <Line type="monotone" dataKey="expenses" stroke="var(--chart-3)" dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
