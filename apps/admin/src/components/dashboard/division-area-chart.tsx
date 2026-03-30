'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { DivisionSeriesChart } from '@/lib/financial'

type RangeKey = 'current' | 'last3' | 'last6' | 'ytd'

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'current', label: 'This Month' },
  { key: 'last3',   label: 'Last 3 Months' },
  { key: 'last6',   label: 'Last 6 Months' },
  { key: 'ytd',     label: 'Year to Date' },
]

// Tailwind CSS variables mapped to chart colours
const DIVISION_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

type Props = {
  seriesData: {
    current: DivisionSeriesChart
    last3:   DivisionSeriesChart
    last6:   DivisionSeriesChart
    ytd:     DivisionSeriesChart
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum: number, p: any) => sum + (Number(p.value) || 0), 0)
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-xl text-xs space-y-1.5 min-w-44">
      <p className="text-muted-foreground font-medium border-b border-border pb-1.5">{label}</p>
      {[...payload].reverse().map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-muted-foreground truncate max-w-28">{p.dataKey}</span>
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatZAR(Number(p.value))}
          </span>
        </div>
      ))}
      <div className="border-t border-border pt-1.5 flex justify-between">
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold text-foreground tabular-nums">{formatZAR(total)}</span>
      </div>
    </div>
  )
}

function CustomLegend({ payload }: any) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
      {payload.map((entry: any) => (
        <span key={entry.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: entry.color }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  )
}

export function DivisionAreaChart({ seriesData }: Props) {
  const [activeRange, setActiveRange] = useState<RangeKey>('last6')

  const { series, divisions } = seriesData[activeRange]

  // For single-month view: show day-of-month or just the single bar
  const isSingleMonth = activeRange === 'current'

  // Calculate totals per division for the selected period
  const divisionTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const row of series) {
      for (const div of divisions) {
        totals[div] = (totals[div] ?? 0) + (Number(row[div]) || 0)
      }
    }
    return totals
  }, [series, divisions])

  const grandTotal = Object.values(divisionTotals).reduce((a, b) => a + b, 0)

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-card-foreground text-sm font-medium">
              Revenue by Division
            </CardTitle>
            {grandTotal > 0 && (
              <p className="text-muted-foreground text-xs mt-0.5">
                Total: <span className="text-foreground font-semibold tabular-nums">{formatZAR(grandTotal)}</span>
              </p>
            )}
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg border border-border self-start sm:self-auto">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setActiveRange(opt.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  activeRange === opt.key
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {series.length === 0 ? (
          <div className="flex items-center justify-center h-52 text-muted-foreground/50 text-xs">
            No income data for this period.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={series}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  {divisions.map((div, i) => (
                    <linearGradient key={div} id={`divGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={DIVISION_COLORS[i % 5]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={DIVISION_COLORS[i % 5]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
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
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                <Legend content={<CustomLegend />} />
                {divisions.map((div, i) => (
                  <Area
                    key={div}
                    type="monotone"
                    dataKey={div}
                    stackId="divisions"
                    stroke={DIVISION_COLORS[i % 5]}
                    strokeWidth={1.5}
                    fill={`url(#divGrad${i})`}
                    activeDot={{ r: 4, strokeWidth: 0, fill: DIVISION_COLORS[i % 5] }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>

            {/* Division summary pills below chart */}
            {divisions.length > 0 && grandTotal > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                {divisions.map((div, i) => {
                  const total = divisionTotals[div] ?? 0
                  const pct   = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0
                  return (
                    <div key={div} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
                        style={{ background: DIVISION_COLORS[i % 5] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{div}</p>
                        <p className="text-xs font-semibold text-foreground tabular-nums">
                          {formatZAR(total)}
                          <span className="text-muted-foreground/60 font-normal ml-1">({pct}%)</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}