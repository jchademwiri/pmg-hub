'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
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
import type { MonthlyRevenueByDivision } from '@/lib/financial'

const CHART_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

type Props = { series: MonthlyRevenueByDivision[]; divisions: string[] }

export function RevenueByDivisionChart({ series, divisions }: Props) {
  const config: ChartConfig = Object.fromEntries(
    divisions.map((d, i) => [d, { label: d, color: CHART_TOKENS[i % 5] }])
  )

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle>Revenue by Division — Last 6 Months</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No data for the last 6 months.</p>
        ) : (
          <ChartContainer config={config}>
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatZAR} tick={{ fill: 'var(--muted-foreground)' }} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {divisions.map((d, i) => (
                <Area
                  key={d}
                  type="monotone"
                  dataKey={d}
                  stackId="a"
                  fill={CHART_TOKENS[i % 5]}
                  stroke={CHART_TOKENS[i % 5]}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
