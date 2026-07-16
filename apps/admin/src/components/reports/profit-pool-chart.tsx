'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR, fmtMonthYear } from '@/lib/format'

const config: ChartConfig = {
  profit: { label: 'Net Profit', color: 'var(--chart-1)' },
}

const NEG_COLOR = 'var(--color-destructive, #ef4444)'
const POS_COLOR = 'var(--chart-1)'

type Props = {
  data: { period: string; profit: number }[]
}

export function ProfitPoolChart({ data }: Props) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle>Net Profit Trend</CardTitle>
        <CardDescription>Monthly net profit generated</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No snapshot data for this year.</p>
        ) : (
          <ChartContainer config={config}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="period"
                tickFormatter={(v) => fmtMonthYear(v, { short: true })}
                tick={{ fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => fmtMonthYear(v)}
                    formatter={(v) => formatZAR(Number(v))}
                  />
                }
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.profit < 0 ? NEG_COLOR : POS_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
