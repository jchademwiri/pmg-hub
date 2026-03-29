'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { MoMSnapshot } from '@/lib/financial'

const config: ChartConfig = {
  current:  { label: 'Current Month',  color: 'var(--chart-1)' },
  previous: { label: 'Previous Month', color: 'var(--chart-4)' },
}

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
              <Bar dataKey="current"  fill="var(--chart-1)" />
              <Bar dataKey="previous" fill="var(--chart-4)" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
