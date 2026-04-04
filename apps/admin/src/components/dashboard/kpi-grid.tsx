import { formatZAR } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
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
  // If previous was 0 but current is not, show as new/100% change
  if (previous === 0) {
    const isGood = invertDelta ? false : true
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
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
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? '+' : '-'}{pct.toFixed(1)}% {label}
    </span>
  )
}

type KpiCardProps = {
  label: string
  value: number
  delta?: Delta
  invertDelta?: boolean
  highlight?: 'danger' | 'success'
  deltaLabel?: string
}

function KpiCard({ label, value, delta, invertDelta, highlight, deltaLabel }: KpiCardProps) {
  const borderClass =
    highlight === 'danger'  ? 'border-red-500/30' :
    highlight === 'success' ? 'border-emerald-500/30' : 'border-border'
  const valueClass =
    highlight === 'danger' ? 'text-red-400' : 'text-foreground'

  return (
    <Card className={`rounded-xl border ${borderClass} bg-card shadow-none`}>
      <CardHeader className="pb-1">
        <CardDescription className="text-muted-foreground text-sm">{label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={`${valueClass} text-2xl font-semibold tabular-nums`}>
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
}

export function KpiGrid({ summary, deltas, previousSummary, deltaLabel }: Props) {
  const pmgDelta: Delta = deltas?.revenue && previousSummary
    ? { current: summary.pmgShare, previous: previousSummary.pmgShare }
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Total Revenue"
        value={summary.revenue}
        delta={deltas?.revenue ?? undefined}
        deltaLabel={deltaLabel}
      />
      <KpiCard
        label="Total Expenses"
        value={summary.expenses}
        delta={deltas?.expenses ?? undefined}
        invertDelta
        deltaLabel={deltaLabel}
      />
      <KpiCard
        label="PMG Share (20%)"
        value={summary.pmgShare}
        delta={pmgDelta ?? undefined}
        deltaLabel={deltaLabel}
      />
      <KpiCard
        label="Profit Pool"
        value={summary.profitPool}
        delta={deltas?.profit ?? undefined}
        highlight={summary.profitPool < 0 ? 'danger' : undefined}
        deltaLabel={deltaLabel}
      />
    </div>
  )
}