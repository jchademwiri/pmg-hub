'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SnapshotDeltaBadgeProps {
  current: number
  previous: number
  invertDelta?: boolean
  label?: string
  className?: string
}

export function SnapshotDeltaBadge({
  current,
  previous,
  invertDelta = false,
  label,
  className,
}: SnapshotDeltaBadgeProps) {
  if (previous === 0 && current === 0) return null

  if (previous === 0) {
    const isGood = !invertDelta
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold',
          isGood ? 'text-emerald-500' : 'text-red-500',
          className
        )}
      >
        <TrendingUp className="size-3" />
        new {label ?? ''}
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
      <span className={cn('inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground', className)}>
        <Minus className="size-3" /> 0%
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold',
        isGood ? 'text-emerald-500' : 'text-red-500',
        className
      )}
    >
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? '+' : '-'}{pct.toFixed(1)}%
      {label && <span className="text-muted-foreground font-normal">{label}</span>}
    </span>
  )
}
