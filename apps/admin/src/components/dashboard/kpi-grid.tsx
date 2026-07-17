import { useState } from 'react'
import { formatZAR } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PeriodSummary } from '@/lib/financial'

type Delta = { current: number; previous: number } | null

function DeltaBadge({
  current,
  previous,
  invertDelta,
  label = 'vs prev month',
}: {
  current: number
  previous: number
  invertDelta?: boolean
  label?: string
}) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) {
    const isGood = invertDelta ? false : true
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
        <TrendingUp className="size-3" />
        new {label}
      </span>
    )
  }
  const diff = current - previous
  const pct  = Math.abs((diff / previous) * 100)
  const isUp   = diff > 0
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
    <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
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
    <svg className={`w-16 sm:w-20 h-7 overflow-visible ${colorClass}`} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

type KpiCardProps = {
  label: string
  value: number
  delta?: Delta
  invertDelta?: boolean
  highlight?: 'danger' | 'success'
  deltaLabel?: string
  sparklineData?: number[]
  sparklineColor?: string
  textColorClass?: string
}

function KpiCard({
  label,
  value,
  delta,
  invertDelta,
  highlight,
  deltaLabel,
  sparklineData,
  sparklineColor,
  textColorClass,
}: KpiCardProps) {
  const borderClass =
    highlight === 'danger'  ? 'border-red-500/30 hover:border-red-500/50' :
    highlight === 'success' ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-border/60 hover:border-border/100'
  const valueClass = textColorClass || (
    highlight === 'danger'  ? 'text-red-600' :
    highlight === 'success' ? 'text-emerald-600' :
    invertDelta ? 'text-amber-600' : 'text-emerald-600'
  )

  return (
    <Card size="sm" className={`rounded-xl border ${borderClass} bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:-translate-y-1 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 group`}>
      <CardHeader className="pb-1">
        <CardDescription className="text-muted-foreground text-[10px] sm:text-xs font-medium tracking-wide uppercase group-hover:text-foreground/80 transition-colors duration-200">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-2 pt-0.5 w-full xl:flex-row xl:items-end xl:justify-between xl:gap-1.5">
        <div className="flex flex-col gap-0.5 min-w-0 w-full xl:w-auto">
          <p className={`${valueClass} text-base sm:text-lg lg:text-xl xl:text-2xl font-bold tabular-nums tracking-tight whitespace-nowrap`}>
            {formatZAR(value)}
          </p>
          {delta && (
            <DeltaBadge
              current={delta.current}
              previous={delta.previous}
              invertDelta={invertDelta}
              label={deltaLabel}
            />
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 shrink-0 mt-1 xl:mt-0">
            <Sparkline data={sparklineData} colorClass={sparklineColor} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type Props = {
  summary: PeriodSummary
  deltas: {
    revenue:  Delta
    expenses: Delta
    profit:   Delta
  } | null
  previousSummary: PeriodSummary | null
  deltaLabel?: string
  sparklineData?: { revenue: number; expenses: number }[]
  pmgShareRate?: number
}

export function KpiGrid({ summary, deltas, previousSummary, deltaLabel, sparklineData = [], pmgShareRate = 0.25 }: Props) {
  const [showAll, setShowAll] = useState(false)

  const pmgDelta: Delta = deltas?.revenue && previousSummary
    ? { current: summary.pmgShare, previous: previousSummary.pmgShare }
    : null

  // Map monthly data splits for the Sparkline components
  const revenueTrends = sparklineData.map((d) => d.revenue)
  const expensesTrends = sparklineData.map((d) => d.expenses)
  const pmgShareTrends = sparklineData.map((d) => d.revenue * pmgShareRate)
  const profitPoolTrends = sparklineData.map((d) => d.revenue * (1 - pmgShareRate) - d.expenses)

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={summary.revenue}
          delta={deltas?.revenue ?? undefined}
          deltaLabel={deltaLabel}
          sparklineData={revenueTrends}
          sparklineColor="text-emerald-500"
          textColorClass="text-emerald-600"
        />
        <KpiCard
          label="Profit Pool"
          value={summary.profitPool}
          delta={deltas?.profit ?? undefined}
          highlight={summary.profitPool < 0 ? 'danger' : 'success'}
          deltaLabel={deltaLabel}
          sparklineData={profitPoolTrends}
          sparklineColor={summary.profitPool < 0 ? 'text-red-500' : 'text-teal-500'}
          textColorClass={summary.profitPool < 0 ? 'text-red-600' : 'text-emerald-600'}
        />
        <div className={`col-span-1 ${showAll ? 'block' : 'hidden lg:block'}`}>
          <KpiCard
            label="Total Expenses"
            value={summary.expenses}
            delta={deltas?.expenses ?? undefined}
            invertDelta
            deltaLabel={deltaLabel}
            sparklineData={expensesTrends}
            sparklineColor="text-amber-500"
            textColorClass="text-red-600"
          />
        </div>
        <div className={`col-span-1 ${showAll ? 'block' : 'hidden lg:block'}`}>
          <KpiCard
            label="PMG Share (25%)"
            value={summary.pmgShare}
            delta={pmgDelta ?? undefined}
            deltaLabel={deltaLabel}
            sparklineData={pmgShareTrends}
            sparklineColor="text-blue-500"
            textColorClass="text-blue-600"
          />
        </div>
      </div>
      <div className="lg:hidden flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="text-xs text-muted-foreground">
          {showAll ? (
            <>Hide details <ChevronUp className="ml-1 size-3" /></>
          ) : (
            <>Show all KPIs <ChevronDown className="ml-1 size-3" /></>
          )}
        </Button>
      </div>
    </div>
  )
}