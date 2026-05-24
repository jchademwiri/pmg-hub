import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type KpiCardProps = {
  label: string
  value: number
  sub?: string
  icon?: React.ReactNode
  delta?: number | null
  previousValue?: number | null
  /** When true, a positive delta is bad (expenses going up) */
  invertDelta?: boolean
  highlight?: 'success' | 'danger'
}

function DeltaBadge({
  delta,
  previousValue,
  invertDelta,
}: {
  delta: number | null | undefined
  previousValue: number | null | undefined
  invertDelta?: boolean
}) {
  if (delta == null || previousValue == null || previousValue === 0) return null

  const pct = Math.abs((delta / previousValue) * 100)
  const isUp = delta > 0
  const isGood = invertDelta ? !isUp : isUp
  const isFlat = Math.abs(pct) < 0.1

  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" />
        0%
      </span>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={isGood ? 'text-emerald-400' : 'text-red-400'}
    >
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? '+' : '-'}{pct.toFixed(1)}%
    </Badge>
  )
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  delta,
  previousValue,
  invertDelta,
  highlight,
}: KpiCardProps) {
  const borderClass =
    highlight === 'success'
      ? 'border-emerald-500/30'
      : highlight === 'danger'
      ? 'border-red-500/30'
      : 'border-border'

  const valueClass =
    highlight === 'danger' ? 'text-red-400' : 'text-foreground'

  return (
    <Card className={`rounded-xl border ${borderClass} bg-card shadow-none`}>
      <CardHeader className="pb-1">
        <CardDescription className="text-muted-foreground text-sm flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className={`${valueClass} text-2xl font-semibold tabular-nums`}>
          {formatZAR(value)}
        </p>
        <div className="flex items-center gap-2">
          <DeltaBadge
            delta={delta}
            previousValue={previousValue}
            invertDelta={invertDelta}
          />
          {previousValue != null && previousValue !== 0 && (
            <span className="text-xs text-muted-foreground/60">
              vs {formatZAR(previousValue)} last month
            </span>
          )}
        </div>
        {sub && <p className="text-muted-foreground/70 text-xs">{sub}</p>}
      </CardContent>
    </Card>
  )
}