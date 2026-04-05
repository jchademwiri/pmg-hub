'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { MoMSnapshot } from '@/lib/financial'

const config: ChartConfig = {
  current:  { label: 'Current Month',  color: 'var(--chart-1)' },
  previous: { label: 'Previous Month', color: 'var(--chart-4)' },
}

const NEG_COLOR = 'var(--color-destructive, #ef4444)'

type Props = { data: MoMSnapshot[] }

export function MoMComparisonChart({ data }: Props) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader><CardTitle>Month-over-Month Comparison</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No comparison data available.</p>
        ) : (
          <ChartContainer config={config}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="metric" tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatZAR} tick={{ fill: 'var(--muted-foreground)' }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="current">
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.current < 0 ? NEG_COLOR : 'var(--chart-1)'} />
                ))}
              </Bar>
              <Bar dataKey="previous">
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.previous < 0 ? NEG_COLOR : 'var(--chart-4)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
