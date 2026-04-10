'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { ProfitPoolRow } from '@/lib/financial'

const config: ChartConfig = {
  salary:   { label: 'Salary',   color: 'var(--chart-1)' },
  reinvest: { label: 'Reinvest', color: 'var(--chart-2)' },
  reserve:  { label: 'Reserve',  color: 'var(--chart-3)' },
  flex:     { label: 'Flex',     color: 'var(--chart-4)' },
}

const NEG_COLOR = 'var(--color-destructive, #ef4444)'

const KEYS = ['salary', 'reinvest', 'reserve', 'flex'] as const
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']

type Props = { data: ProfitPoolRow[] }

export function ProfitPoolChart({ data }: Props) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle>Profit Pool Split</CardTitle>
        <CardDescription>Monthly breakdown — salary, reinvest, reserve, flex</CardDescription>
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
                content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {KEYS.map((key, ki) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={COLORS[ki]}
                  radius={ki === KEYS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={(entry[key] as number) < 0 ? NEG_COLOR : COLORS[ki]} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
