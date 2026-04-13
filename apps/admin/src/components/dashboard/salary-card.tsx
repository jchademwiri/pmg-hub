'use client'

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import { AlertTriangle, Wallet, ArrowDownCircle, CheckCircle2 } from 'lucide-react'

type SalaryCardProps = {
  bucket: { expected: number; spent: number; available: number }
  profitPool: number
  periodLabel?: string
}

export function SalaryCard({
  bucket, profitPool, periodLabel = "All-Time"
}: SalaryCardProps) {
  const isNegative     = profitPool < 0
  const isOverdrawn    = bucket.available < 0
  const hasWithdrawals = bucket.spent > 0

  if (isNegative) {
    return (
      <Card className="rounded-xl border border-red-500/30 bg-red-500/5 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-red-400 text-sm font-normal flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Profit Pool Warning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-400 text-3xl font-bold tabular-nums">{formatZAR(bucket.expected)}</p>
          <CardDescription className="text-red-400/70 text-xs mt-1">
            Profit pool is negative ({formatZAR(profitPool)}). Do not withdraw salary this period.
          </CardDescription>
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-red-300 text-xs leading-relaxed">
              Expenses exceed net revenue. Review costs or accelerate income before withdrawing.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border border-chart-1/40 bg-chart-1/10 shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-chart-1 text-sm font-normal flex items-center gap-1.5">
            <Wallet className="size-4" />
            Owner Salary
          </CardTitle>
          <span className="text-xs text-chart-1/50">{periodLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary salary figure */}
        <div>
          <p className={`text-3xl font-bold tabular-nums ${isOverdrawn ? 'text-red-400' : 'text-green-400'}`}>
            {formatZAR(bucket.available)}
          </p>
          <p className="text-chart-1/50 text-xs mt-0.5">
            available · of {formatZAR(bucket.expected)} expected
          </p>
        </div>

        {/* Financial breakdown */}
        <div className="rounded-lg bg-chart-1/10 border border-chart-1/20 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-chart-1/60">Profit pool</span>
            <span className={`font-medium tabular-nums ${profitPool < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatZAR(profitPool)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-chart-1/60">Recommended bucket</span>
            <span className="text-green-500 font-semibold tabular-nums">{formatZAR(bucket.expected)}</span>
          </div>

          <div className="border-t border-chart-1/20 pt-1.5">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-chart-1/60">
                <ArrowDownCircle className="size-3" />
                Ledger Spends
              </span>
              <span className={`font-medium tabular-nums ${hasWithdrawals ? 'text-amber-400' : 'text-chart-1/40'}`}>
                {hasWithdrawals ? `-${formatZAR(bucket.spent)}` : 'Nothing yet'}
              </span>
            </div>
          </div>

          <div className={`flex justify-between text-xs font-semibold pt-0.5 border-t ${
            isOverdrawn ? 'border-red-500/30 text-red-400' : 'border-chart-1/20 text-chart-1'
          }`}>
            <span className="flex items-center gap-1">
              {isOverdrawn ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
              {isOverdrawn ? 'Overdrawn' : 'Balance remaining'}
            </span>
            <span className="tabular-nums">{formatZAR(Math.abs(bucket.available))}</span>
          </div>

        {!hasWithdrawals && (
          <p className="text-xs text-chart-1/40 pt-0.5">
            Record a spend on the Corporate Ledger page.
          </p>
        )}
        </div>
      </CardContent>
    </Card>
  )
}