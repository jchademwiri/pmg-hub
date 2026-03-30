'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { formatZAR } from '@/lib/format'
import type { MonthlyFinancials } from '@/lib/financial'

type Props = { data: MonthlyFinancials[] }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            {p.dataKey === 'revenue' ? 'Revenue' : 'Expenses'}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatZAR(Number(p.value))}
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="border-t border-border pt-1 flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Net</span>
          <span
            className={`font-semibold tabular-nums ${
              payload[0].value - payload[1].value >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {formatZAR(payload[0].value - payload[1].value)}
          </span>
        </div>
      )}
    </div>
  )
}

export function RevenueSparkline({ data }: Props) {
  if (!data.length) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-none h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-card-foreground text-sm font-medium">
            Revenue vs Expenses — Last 6 Months
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground/50 text-xs">No data yet.</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate trend: compare first and last data points
  const first = data[0]?.revenue ?? 0
  const last  = data[data.length - 1]?.revenue ?? 0
  const trend = first > 0 ? ((last - first) / first) * 100 : 0
  const trendLabel =
    trend > 0
      ? `↑ ${trend.toFixed(1)}% over period`
      : trend < 0
      ? `↓ ${Math.abs(trend).toFixed(1)}% over period`
      : 'Flat over period'
  const trendColor = trend >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-card-foreground text-sm font-medium">
            Revenue vs Expenses — Last 6 Months
          </CardTitle>
          <span className={`text-xs font-medium ${trendColor}`}>
            {trendLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--chart-1)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--chart-3)" stopOpacity={0.20} />
                <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border) / 0.5)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#revGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--chart-1)' }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="var(--chart-3)"
              strokeWidth={2}
              fill="url(#expGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--chart-3)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-chart-1" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-chart-3" />
            Expenses
          </span>
        </div>
      </CardContent>
    </Card>
  )
}