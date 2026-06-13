'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { MoMSnapshot } from '@/lib/financial'

const NEG_COLOR = 'var(--color-destructive, #ef4444)'

type Props = { data: MoMSnapshot[]; currentMonthLabel?: string; previousMonthLabel?: string; onBarClick?: (metric: string) => void }

export function MoMComparisonChart({ data, currentMonthLabel, previousMonthLabel, onBarClick }: Props) {
  const config: ChartConfig = {
    current:  { label: currentMonthLabel ?? 'Current Month',  color: 'var(--chart-1)' },
    previous: { label: previousMonthLabel ?? 'Previous Month', color: 'var(--chart-4)' },
  }

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
              <ChartTooltip content={<ChartTooltipContent indicator="dot" formatter={(v) => formatZAR(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="current" fill="var(--color-current)" onClick={onBarClick ? (_data, index) => onBarClick(data[index]?.metric ?? '') : undefined} className={onBarClick ? 'cursor-pointer' : undefined}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.current < 0 ? NEG_COLOR : 'var(--color-current)'} />
                ))}
              </Bar>
              <Bar dataKey="previous" fill="var(--color-previous)" onClick={onBarClick ? (_data, index) => onBarClick(data[index]?.metric ?? '') : undefined} className={onBarClick ? 'cursor-pointer' : undefined}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.previous < 0 ? NEG_COLOR : 'var(--color-previous)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
