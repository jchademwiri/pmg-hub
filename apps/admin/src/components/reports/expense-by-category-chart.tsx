'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'

const config: ChartConfig = {
  total: { label: 'Total', color: 'var(--chart-3)' },
}

type Props = { data: { category: string; total: number }[] }

export function ExpenseByCategoryChart({ data }: Props) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle>Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No expense data for this year.</p>
        ) : (
          <ChartContainer config={config}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fill: 'var(--muted-foreground)' }}
                width={120}
              />
              <XAxis
                type="number"
                tickFormatter={formatZAR}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />}
              />
              <Bar dataKey="total" fill="var(--chart-3)" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
