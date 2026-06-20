'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  ComposedChart,
  Line,
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

  // Deduplicate entries by dataKey (since Bar and Line render the same series keys in 'both' mode)
  const seen = new Set<string>()
  const uniquePayload = payload.filter((entry) => {
    if (seen.has(entry.dataKey)) return false
    seen.add(entry.dataKey)
    return true
  })

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-2 border-b border-border pb-1.5 font-medium text-muted-foreground">
        {fmtMonthYear(label)}
      </p>
      <div className="flex min-w-40 flex-col gap-1.5">
        {uniquePayload.map((entry) => (
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
  const [chartType, setChartType] = useState<'line' | 'bar' | 'both'>('line')

  const currentMonthStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const elapsedData = useMemo(
    () => data.filter((row) => row.month <= currentMonthStr),
    [currentMonthStr, data],
  )

  // Prepare chartData to keep all 12 months for X-Axis, but set future values to undefined
  // so Recharts does not draw lines or bars for them.
  const chartData = useMemo(() => {
    return data.map((row) => {
      const isFuture = row.month > currentMonthStr
      return {
        ...row,
        revenue: isFuture ? undefined : row.revenue,
        invoiced: isFuture ? undefined : row.invoiced,
        expenses: isFuture ? undefined : row.expenses,
      }
    })
  }, [currentMonthStr, data])

  const totals = useMemo(
    () =>
      elapsedData.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          invoiced: acc.invoiced + row.invoiced,
          expenses: acc.expenses + row.expenses,
        }),
        { revenue: 0, invoiced: 0, expenses: 0 },
      ),
    [elapsedData],
  )

  const averages = useMemo(() => {
    const n = elapsedData.length || 1
    return {
      revenue: elapsedData.reduce((sum, row) => sum + row.revenue, 0) / n,
      invoiced: elapsedData.reduce((sum, row) => sum + row.invoiced, 0) / n,
      expenses: elapsedData.reduce((sum, row) => sum + row.expenses, 0) / n,
    }
  }, [elapsedData])

  const hasData = data.some((row) => row.revenue > 0 || row.invoiced > 0 || row.expenses > 0)

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-card-foreground">
              Revenue, Invoiced, and Expenses
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">This Fiscal Year</p>
          </div>

          {/* Interactive Chart Type Toggles */}
          <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50 text-[10px] font-medium text-muted-foreground select-none">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                chartType === 'line' ? 'bg-background text-foreground shadow-xs font-semibold' : 'hover:text-foreground'
              }`}
            >
              Line
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                chartType === 'bar' ? 'bg-background text-foreground shadow-xs font-semibold' : 'hover:text-foreground'
              }`}
            >
              Bar
            </button>
            <button
              type="button"
              onClick={() => setChartType('both')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                chartType === 'both' ? 'bg-background text-foreground shadow-xs font-semibold' : 'hover:text-foreground'
              }`}
            >
              Both
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground/50">
            No revenue, invoiced, or expense data for this fiscal year.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px]">
            <div className="min-w-0 rounded-md border border-border bg-background p-4">
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={chartData} barGap={0} barCategoryGap="25%" margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
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
                  <Tooltip content={<CustomTooltip />} cursor={chartType === 'bar' ? { fill: 'hsl(var(--muted) / 0.35)' } : { stroke: 'hsl(var(--muted))', strokeWidth: 1, strokeDasharray: '2 2' }} />
                  
                  {/* Column Bars */}
                  {(chartType === 'bar' || chartType === 'both') &&
                    SERIES.map((item) => (
                      <Bar
                        key={item.key}
                        dataKey={item.key}
                        name={item.label}
                        fill={item.color}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={18}
                      />
                    ))}

                  {/* Lines with dot markers */}
                  {(chartType === 'line' || chartType === 'both') &&
                    SERIES.map((item) => (
                      <Line
                        key={item.key}
                        type="monotone"
                        dataKey={item.key}
                        name={item.label}
                        stroke={item.color}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))', stroke: item.color }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col justify-center gap-6 text-right">
              <div>
                <p className="text-xs font-medium text-[color:oklch(0.72_0.16_150)]">Total Revenue</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.revenue)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Avg: {formatZAR(averages.revenue)}/mo
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[color:var(--chart-1)]">Total Invoiced</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.invoiced)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Avg: {formatZAR(averages.invoiced)}/mo
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[color:var(--chart-expense)]">Total Expenses</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.expenses)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Avg: {formatZAR(averages.expenses)}/mo
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
