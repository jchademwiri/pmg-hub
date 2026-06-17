'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR, fmtMonthYear } from '@/lib/format'
import type { MonthlyBudgetChartRow } from '@/lib/financial'

type Props = {
  data: MonthlyBudgetChartRow[]
}

const SERIES = [
  { key: 'revenue', label: 'Revenue', color: 'oklch(0.72 0.16 150)' },
  { key: 'invoiced', label: 'Invoiced', color: 'var(--chart-1)' },
  { key: 'expenses', label: 'Expenses', color: 'var(--chart-expense)' },
] as const

type TooltipPayload = {
  dataKey: string
  name?: string
  value: number | string
  color?: string
}

function formatYAxis(value: number) {
  if (Math.abs(value) >= 1000) return `R${Math.round(value / 1000)}k`
  return `R${value}`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-2 border-b border-border pb-1.5 font-medium text-muted-foreground">
        {fmtMonthYear(label)}
      </p>
      <div className="flex min-w-40 flex-col gap-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block size-2 rounded-sm"
                style={{ background: entry.color }}
              />
              {entry.name ?? entry.dataKey}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatZAR(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DivisionAreaChart({ data }: Props) {
  const totals = useMemo(
    () =>
      data.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          invoiced: acc.invoiced + row.invoiced,
          expenses: acc.expenses + row.expenses,
        }),
        { revenue: 0, invoiced: 0, expenses: 0 },
      ),
    [data],
  )

  const hasData = data.some((row) => row.revenue > 0 || row.invoiced > 0 || row.expenses > 0)

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Revenue, Invoiced, and Expenses
          </CardTitle>
          <span className="text-xs text-muted-foreground">This Fiscal Year</span>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground/50">
            No revenue, invoiced, or expense data for this fiscal year.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px]">
            <div className="min-w-0 rounded-md border border-border bg-background p-4">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="hsl(var(--border) / 0.55)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => fmtMonthYear(value, { short: true })}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickFormatter={(value) => formatYAxis(Number(value))}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.35)' }} />
                  {SERIES.map((item) => (
                    <Bar
                      key={item.key}
                      dataKey={item.key}
                      name={item.label}
                      fill={item.color}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col justify-center gap-6 text-right">
              <div>
                <p className="text-xs font-medium text-[color:oklch(0.72_0.16_150)]">Total Revenue</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.revenue)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[color:var(--chart-1)]">Total Invoiced</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.invoiced)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[color:var(--chart-expense)]">Total Expenses</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.expenses)}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          Revenue is payments received. Invoiced is client-facing invoice totals. Expenses are recorded expenses.
        </p>
      </CardContent>
    </Card>
  )
}
