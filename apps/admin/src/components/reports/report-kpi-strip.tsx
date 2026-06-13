'use client'

import { formatZAR } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Delta = { current: number; previous: number } | null

function DeltaBadge({
  current,
  previous,
  invertDelta,
  label = 'vs prev year',
}: {
  current: number
  previous: number
  invertDelta?: boolean
  label?: string
}) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-emerald-500">
        <TrendingUp className="size-3" />
        new {label}
      </span>
    )
  }
  const diff = current - previous
  const pct = Math.abs((diff / previous) * 100)
  const isUp = diff > 0
  const isGood = invertDelta ? !isUp : isUp
  const isFlat = pct < 0.05

  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold', isGood ? 'text-emerald-500' : 'text-red-500')}>
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? '+' : '-'}{pct.toFixed(1)}% {label}
    </span>
  )
}

function Sparkline({ data, colorClass = 'text-emerald-500' }: { data: number[]; colorClass?: string }) {
  if (!data || data.length <= 1) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min === 0 ? 1 : max - min
  const width = 100
  const height = 30
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className={cn('w-16 sm:w-20 h-7 overflow-visible', colorClass)} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

export type ReportKpiData = {
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
  monthlyRevenue: number[]
  monthlyExpenses: number[]
}

export function ReportKpiStrip({ data }: { data: ReportKpiData }) {
  const profitMargin = data.revenue > 0 ? (data.profitPool / data.revenue) * 100 : 0

  const monthlyPmg = data.monthlyRevenue.map((r) => r * 0.25)
  const monthlyProfit = data.monthlyRevenue.map((r, i) => r * 0.75 - (data.monthlyExpenses[i] || 0))

  const cards = [
    {
      label: 'Total Revenue',
      value: data.revenue,
      textColor: 'text-emerald-600 dark:text-emerald-400',
      sparklineData: data.monthlyRevenue,
      sparklineColor: 'text-emerald-500',
    },
    {
      label: 'Total Expenses',
      value: data.expenses,
      invertDelta: true,
      textColor: 'text-amber-600 dark:text-amber-400',
      sparklineData: data.monthlyExpenses,
      sparklineColor: 'text-amber-500',
    },
    {
      label: 'PMG Share (25%)',
      value: data.pmgShare,
      textColor: 'text-blue-600 dark:text-blue-400',
      sparklineData: monthlyPmg,
      sparklineColor: 'text-blue-500',
    },
    {
      label: `Profit Pool · ${profitMargin.toFixed(0)}% margin`,
      value: data.profitPool,
      highlight: data.profitPool < 0 ? 'danger' : 'success',
      textColor: data.profitPool >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      sparklineData: monthlyProfit,
      sparklineColor: data.profitPool < 0 ? 'text-red-500' : 'text-teal-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((k) => {
        const borderClass =
          k.highlight === 'danger' ? 'border-red-500/30 hover:border-red-500/50' :
          k.highlight === 'success' ? 'border-emerald-500/30 hover:border-emerald-500/50' :
          'border-border/60 hover:border-border/100'

        return (
          <Card
            key={k.label}
            className={cn(
              'rounded-xl border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:-translate-y-1 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 group',
              borderClass
            )}
          >
            <CardHeader className="pb-1">
              <CardDescription className="text-muted-foreground text-xs font-medium tracking-wide uppercase group-hover:text-foreground/80 transition-colors duration-200">
                {k.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-1.5 pt-0.5">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className={cn('text-lg sm:text-2xl font-bold tabular-nums tracking-tight truncate', k.textColor)}>
                  {formatZAR(k.value)}
                </p>
              </div>
              {k.sparklineData && k.sparklineData.length > 0 && (
                <div className="mb-1 opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 shrink-0">
                  <Sparkline data={k.sparklineData} colorClass={k.sparklineColor} />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
