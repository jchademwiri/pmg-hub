'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { formatZAR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getDrilldownData, type DrilldownType, type DrilldownResult } from '@/app/actions/drilldown'
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Shield, Zap, Loader2 } from 'lucide-react'

interface FinancialDrilldownSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: string | null
  drillType: DrilldownType | null
}

const TYPE_META: Record<DrilldownType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  revenue:   { label: 'Revenue',      icon: TrendingUp,  color: 'text-emerald-600', description: 'Income rows for this period' },
  expenses:  { label: 'Expenses',     icon: TrendingDown, color: 'text-amber-600',  description: 'Expense rows for this period' },
  salary:    { label: 'Salary',       icon: Wallet,      color: 'text-violet-600', description: 'Ledger entries for salary allocation' },
  reinvest:  { label: 'Reinvest',     icon: RefreshCw,   color: 'text-cyan-600',   description: 'Ledger entries for reinvest allocation' },
  reserve:   { label: 'Reserve',      icon: Shield,      color: 'text-sky-600',    description: 'Ledger entries for reserve allocation' },
  flex:      { label: 'Flex',         icon: Zap,         color: 'text-rose-500',   description: 'Ledger entries for flex allocation' },
}

export function FinancialDrilldownSheet({
  open,
  onOpenChange,
  period,
  drillType,
}: FinancialDrilldownSheetProps) {
  const [data, setData] = useState<DrilldownResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch data when sheet opens or params change
  useEffect(() => {
    if (!open || !period || !drillType) return
    let cancelled = false
    setLoading(true)
    getDrilldownData(period, drillType)
      .then((result) => { if (!cancelled) setData(result) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, period, drillType])

  // Reset data when sheet closes
  useEffect(() => {
    if (!open) setData(null)
  }, [open])

  const meta = drillType ? TYPE_META[drillType] : null
  const Icon = meta?.icon ?? TrendingUp

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {meta && <Icon className={cn('size-4', meta.color)} />}
            {meta?.label ?? 'Detail'}
          </SheetTitle>
          <SheetDescription>
            {meta?.description ?? ''} — {period ?? ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading details…</span>
            </div>
          )}

          {!loading && data && data.type === 'income' && (
            <IncomeTable rows={data.rows} total={data.total} />
          )}

          {!loading && data && data.type === 'expense' && (
            <ExpenseTable rows={data.rows} total={data.total} />
          )}

          {!loading && data && data.type === 'ledger' && (
            <LedgerTable rows={data.rows} total={data.total} />
          )}

          {!loading && data && data.rows.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No transactions found for this period.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Income Table ─────────────────────────────────────────────────────────────

function IncomeTable({ rows, total }: { rows: { date: string; divisionName: string; clientName: string; description: string | null; amount: number }[]; total: number }) {
  return (
    <>
      <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3">
        <span className="text-xs font-semibold text-muted-foreground">Total Income</span>
        <span className="text-sm font-bold text-emerald-600 tabular-nums">{formatZAR(total)}</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 hover:bg-muted/30 transition-colors">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">{row.clientName}</span>
                <Badge variant="secondary" className="text-[9px] shrink-0">{row.divisionName}</Badge>
              </div>
              {row.description && (
                <span className="text-[10px] text-muted-foreground truncate">{row.description}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{row.date}</span>
            </div>
            <span className="text-xs font-semibold text-emerald-600 tabular-nums shrink-0">+{formatZAR(row.amount)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Expense Table ────────────────────────────────────────────────────────────

function ExpenseTable({ rows, total }: { rows: { date: string; divisionName: string; category: string; clientName: string; description: string | null; amount: number }[]; total: number }) {
  return (
    <>
      <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3">
        <span className="text-xs font-semibold text-muted-foreground">Total Expenses</span>
        <span className="text-sm font-bold text-amber-600 tabular-nums">{formatZAR(total)}</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 hover:bg-muted/30 transition-colors">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">{row.category}</span>
                <Badge variant="secondary" className="text-[9px] shrink-0">{row.divisionName}</Badge>
              </div>
              {row.description && (
                <span className="text-[10px] text-muted-foreground truncate">{row.description}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{row.date}</span>
            </div>
            <span className="text-xs font-semibold text-amber-600 tabular-nums shrink-0">-{formatZAR(row.amount)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Ledger Table ─────────────────────────────────────────────────────────────

function LedgerTable({ rows, total }: { rows: { date: string; description: string | null; amount: number; entryType: string }[]; total: number }) {
  return (
    <>
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <span className="text-xs font-semibold text-muted-foreground">Total Spent</span>
        <span className="text-sm font-bold text-foreground tabular-nums">{formatZAR(total)}</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 hover:bg-muted/30 transition-colors">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">{row.description ?? '—'}</span>
                <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{row.entryType}</Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">{row.date}</span>
            </div>
            <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">-{formatZAR(row.amount)}</span>
          </div>
        ))}
      </div>
    </>
  )
}
