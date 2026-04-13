'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import { Wallet, ArrowDownCircle, CheckCircle2, AlertTriangle } from 'lucide-react'

type BudgetCardProps = {
  title: string
  bucket: { expected: number; spent: number; available: number }
  colorClass: string
  bgClass: string
  borderClass: string
}

export function BudgetCard({
  title, bucket, colorClass, bgClass, borderClass
}: BudgetCardProps) {
  const isOverdrawn = bucket.available < 0
  const hasSpends = bucket.spent > 0

  return (
    <Card className={`rounded-xl border ${borderClass} ${bgClass} shadow-none`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className={`${colorClass} text-sm font-normal flex items-center gap-1.5`}>
            <Wallet className="size-4" />
            {title}
          </CardTitle>
          <span className={`text-xs ${colorClass} opacity-50`}>All-Time</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className={`text-3xl font-bold tabular-nums ${isOverdrawn ? 'text-red-400' : 'text-foreground'}`}>
            {formatZAR(bucket.available)}
          </p>
          <p className={`${colorClass} opacity-80 text-xs mt-0.5`}>
            available · of {formatZAR(bucket.expected)} expected
          </p>
        </div>

        <div className={`rounded-lg ${bgClass} border ${borderClass} p-3 space-y-1.5`}>
          <div className="flex justify-between text-xs">
            <span className={`${colorClass} flex items-center gap-1.5`}>
              <ArrowDownCircle className="size-3" />
              Ledger Spends
            </span>
            <span className={`font-medium tabular-nums ${hasSpends ? 'opacity-80' : 'opacity-40'} ${colorClass}`}>
              {hasSpends ? `-${formatZAR(bucket.spent)}` : 'Nothing yet'}
            </span>
          </div>

          <div className={`flex justify-between text-xs font-semibold pt-1.5 border-t ${
            isOverdrawn ? 'border-red-500/30 text-red-400' : `${borderClass} ${colorClass}`
          }`}>
            <span className="flex items-center gap-1">
              {isOverdrawn ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
              {isOverdrawn ? 'Overdrawn' : 'Balance remaining'}
            </span>
            <span className="tabular-nums">{formatZAR(Math.abs(bucket.available))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
