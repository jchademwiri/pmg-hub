"use client"

import { useEffect, useMemo, useState } from "react"
import { LockKeyhole, Percent, TrendingDown, TrendingUp } from "lucide-react"
import type { SnapshotRow } from "@pmg/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fmtDate, formatZAR, fmtMonthYear } from "@/lib/format"
import { DeltaBadge, Sparkline } from "@/components/reports/report-kpi-strip"
import { getSnapshotArSummary } from "@/app/actions/snapshots"

type ArSummary = { invoiced: number; paid: number; arBalance: number }

interface SnapshotsCockpitProps {
  snapshots: SnapshotRow[]
}

export type SnapshotView = {
  id: string
  period: string
  periodLabel: string
  shortPeriodLabel: string
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
  status: string
  notes: string | null
  closedAt: Date
}

type AmountTone = "default" | "revenue" | "expense" | "positive" | "negative" | "share" | "allocation"

function toMoney(value: string) {
  return Number(value) || 0
}

/** Shifts a "YYYY-MM" period by `months` (negative to go back). */
export function shiftPeriod(period: string, months: number): string {
  const [yearStr, monthStr] = period.split("-")
  const totalMonths = Number(yearStr) * 12 + (Number(monthStr) - 1) + months
  const year = Math.floor(totalMonths / 12)
  const month = (totalMonths % 12) + 1
  return `${year}-${String(month).padStart(2, "0")}`
}

/**
 * The current South African fiscal year (March -> Feb, named by the ending
 * year — e.g. "2027-FY" spans 2026-03 to 2027-02), as a "YYYY-MM" range.
 * Mirrors resolvePeriodDateRange's "-FY" convention in packages/db.
 */
export function getCurrentFinancialYearRange(referenceDate: Date = new Date()): {
  startPeriod: string
  endPeriod: string
} {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() + 1 // 1-12
  const fyEndYear = month >= 3 ? year + 1 : year
  const fyStartYear = fyEndYear - 1
  return {
    startPeriod: `${fyStartYear}-03`,
    endPeriod: `${fyEndYear}-02`,
  }
}

/** Consecutive closed months (starting at `fromIndex`, walking toward older rows) on the same side of profit/loss. */
export function computeStreak(rows: SnapshotView[], fromIndex: number): number {
  const isProfitable = rows[fromIndex].profitPool >= 0
  let streak = 0
  for (let i = fromIndex; i < rows.length; i++) {
    if ((rows[i].profitPool >= 0) !== isProfitable) break
    streak++
  }
  return streak
}

function amountToneClass(tone: AmountTone) {
  return cn(
    tone === "revenue" && "text-emerald-600",
    tone === "expense" && "text-destructive",
    tone === "positive" && "text-emerald-600",
    tone === "negative" && "text-destructive",
    tone === "share" && "text-[color:var(--chart-3)]",
    tone === "allocation" && "text-[color:var(--chart-4)]",
  )
}

export function SnapshotsCockpit({ snapshots }: SnapshotsCockpitProps) {
  const rows = useMemo<SnapshotView[]>(
    () =>
      snapshots.map((snapshot) => ({
        id: snapshot.id,
        period: snapshot.period,
        periodLabel: fmtMonthYear(snapshot.period),
        shortPeriodLabel: fmtMonthYear(snapshot.period, { short: true }),
        revenue: toMoney(snapshot.revenue),
        expenses: toMoney(snapshot.expenses),
        pmgShare: toMoney(snapshot.pmgShare),
        profitPool: toMoney(snapshot.profitPool),
        status: snapshot.status,
        notes: snapshot.notes,
        closedAt: snapshot.closedAt,
      })),
    [snapshots],
  )

  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "")
  const selectedSnapshot = rows.find((row) => row.id === selectedId) ?? rows[0]

  const detail = useMemo(() => {
    if (!selectedSnapshot) return null
    const index = rows.findIndex((row) => row.id === selectedSnapshot.id)
    const previous = rows[index + 1]
    const yoyPeriod = shiftPeriod(selectedSnapshot.period, -12)
    const yoySnapshot = rows.find((row) => row.period === yoyPeriod)
    const sparklineData = rows
      .slice(index, index + 6)
      .reverse()
      .map((row) => row.profitPool)
    const streak = computeStreak(rows, index)
    return { previous, yoySnapshot, sparklineData, streak }
  }, [rows, selectedSnapshot])

  const [arSummary, setArSummary] = useState<{
    selected: ArSummary | null
    previous: ArSummary | null
    loading: boolean
    error: string | null
  }>({ selected: null, previous: null, loading: false, error: null })

  useEffect(() => {
    if (!selectedSnapshot) return
    let cancelled = false
    setArSummary((state) => ({ ...state, loading: true, error: null }))

    const previousPeriod = detail?.previous?.period
    Promise.all([
      getSnapshotArSummary(selectedSnapshot.period),
      previousPeriod ? getSnapshotArSummary(previousPeriod) : Promise.resolve(null),
    ]).then(([selectedResult, previousResult]) => {
      if (cancelled) return
      if (selectedResult && "error" in selectedResult) {
        setArSummary({ selected: null, previous: null, loading: false, error: selectedResult.error })
        return
      }
      setArSummary({
        selected: selectedResult,
        previous: previousResult && !("error" in previousResult) ? previousResult : null,
        loading: false,
        error: null,
      })
    })

    return () => {
      cancelled = true
    }
  }, [selectedSnapshot?.id, detail?.previous?.period])

  const { startPeriod: fyStartPeriod, endPeriod: fyEndPeriod } = useMemo(
    () => getCurrentFinancialYearRange(),
    [],
  )
  const fyRows = useMemo(
    () => rows.filter((row) => row.period >= fyStartPeriod && row.period <= fyEndPeriod),
    [rows, fyStartPeriod, fyEndPeriod],
  )

  const totals = useMemo(
    () =>
      fyRows.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          expenses: acc.expenses + row.expenses,
          pmgShare: acc.pmgShare + row.pmgShare,
          profitPool: acc.profitPool + row.profitPool,
        }),
        { revenue: 0, expenses: 0, pmgShare: 0, profitPool: 0 },
      ),
    [fyRows],
  )
  const grossMarginPct = totals.revenue > 0 ? ((totals.revenue - totals.expenses) / totals.revenue) * 100 : 0
  const netMarginPct = totals.revenue > 0 ? (totals.profitPool / totals.revenue) * 100 : 0

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No closed months yet"
        message="Close a month from Dashboard to create your first locked monthly financial record."
        ctaLabel="Go to Dashboard"
        ctaHref="/dashboard"
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[11px] font-medium text-muted-foreground">
        Financial year {fmtMonthYear(fyStartPeriod, { short: true })} – {fmtMonthYear(fyEndPeriod, { short: true })}
      </span>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryMetric
          label="Total revenue"
          value={formatZAR(totals.revenue)}
          icon={TrendingUp}
          tone="revenue"
        />
        <SummaryMetric
          label="PMG Share"
          value={formatZAR(totals.pmgShare)}
          icon={TrendingUp}
          tone="share"
        />
        <SummaryMetric
          label="Total expenses"
          value={formatZAR(totals.expenses)}
          icon={TrendingDown}
          tone="expense"
        />
        <SummaryMetric
          label="Total profit/loss"
          value={formatZAR(totals.profitPool)}
          icon={totals.profitPool >= 0 ? TrendingUp : TrendingDown}
          tone={totals.profitPool >= 0 ? "positive" : "negative"}
        />
        <SummaryMetric
          label="Profit percentage"
          value={`${grossMarginPct.toFixed(1)}%`}
          icon={Percent}
          tone={grossMarginPct >= 0 ? "positive" : "negative"}
          hint="Total profit retained in the business (Revenue − Expenses) ÷ Revenue — includes the PMG growth & investment reserve, since that stays within the organisation."
        />
        <SummaryMetric
          label="Distributable margin"
          value={`${netMarginPct.toFixed(1)}%`}
          icon={Percent}
          tone={netMarginPct >= 0 ? "positive" : "negative"}
          hint="Profit Pool ÷ Revenue — what's left for salary, reinvestment, reserve & flex allocations after the PMG cross-divisional growth reserve is set aside."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Closed months</CardTitle>
            <CardDescription>Select a month to review the locked figures.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground py-4">Month</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Revenue</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Expenses</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">PMG Share</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Profit/Loss</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      aria-selected={selectedSnapshot?.id === row.id}
                      tabIndex={0}
                      data-state={selectedSnapshot?.id === row.id ? "selected" : undefined}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedId(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setSelectedId(row.id)
                        }
                      }}
                    >
                      <TableCell className="font-medium py-4">
                        <span className="inline-flex items-center gap-1.5">
                          {row.status === "locked" && (
                            <LockKeyhole className="size-3 shrink-0 text-muted-foreground" aria-label="Locked" />
                          )}
                          {row.periodLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass("revenue")}>{formatZAR(row.revenue)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass("expense")}>{formatZAR(row.expenses)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass("share")}>{formatZAR(row.pmgShare)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-semibold">
                        <span className={amountToneClass(row.profitPool >= 0 ? "positive" : "negative")}>
                          {formatZAR(row.profitPool)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 text-muted-foreground">{fmtDate(row.closedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 md:hidden">
              {rows.map((row) => (
                <Button
                  key={row.id}
                  type="button"
                  variant={selectedSnapshot?.id === row.id ? "secondary" : "outline"}
                  aria-pressed={selectedSnapshot?.id === row.id}
                  className="h-auto justify-between gap-3 px-3 py-3"
                  onClick={() => setSelectedId(row.id)}
                >
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <span className="truncate font-medium">{row.periodLabel}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(row.closedAt)}</span>
                  </span>
                  <span
                    className={cn(
                      "text-right text-sm font-semibold tabular-nums",
                      amountToneClass(row.profitPool >= 0 ? "positive" : "negative"),
                    )}
                  >
                    {formatZAR(row.profitPool)}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedSnapshot && detail && (
          <SnapshotDetail
            snapshot={selectedSnapshot}
            previous={detail.previous}
            yoySnapshot={detail.yoySnapshot}
            sparklineData={detail.sparklineData}
            streak={detail.streak}
            arSelected={arSummary.selected}
            arPrevious={arSummary.previous}
            arLoading={arSummary.loading}
            arError={arSummary.error}
          />
        )}
      </div>
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone?: AmountTone
  hint?: string
}) {
  return (
    <Card size="sm" title={hint}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardDescription className="text-xs">{label}</CardDescription>
          <CardTitle
            className={cn(
              "truncate text-base tabular-nums",
              amountToneClass(tone),
            )}
          >
            {value}
          </CardTitle>
        </div>
        <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone === "default" ? "text-muted-foreground" : amountToneClass(tone))} />
      </CardHeader>
    </Card>
  )
}

function SnapshotDetail({
  snapshot,
  previous,
  yoySnapshot,
  sparklineData,
  streak,
  arSelected,
  arPrevious,
  arLoading,
  arError,
}: {
  snapshot: SnapshotView
  previous: SnapshotView | undefined
  yoySnapshot: SnapshotView | undefined
  sparklineData: number[]
  streak: number
  arSelected: ArSummary | null
  arPrevious: ArSummary | null
  arLoading: boolean
  arError: string | null
}) {
  const isProfitable = snapshot.profitPool >= 0

  // Gross margin: total profit retained in the business — PMG Share is an
  // internal growth/investment reserve, not an external cost, so it's still
  // counted as profit here.
  const grossMargin = snapshot.revenue > 0 ? ((snapshot.revenue - snapshot.expenses) / snapshot.revenue) * 100 : 0
  const previousGrossMargin =
    previous && previous.revenue > 0 ? ((previous.revenue - previous.expenses) / previous.revenue) * 100 : null

  // Distributable margin: what's left for salary/reinvest/reserve/flex after
  // the PMG cross-divisional growth reserve is set aside.
  const netMargin = snapshot.revenue > 0 ? (snapshot.profitPool / snapshot.revenue) * 100 : 0
  const previousNetMargin =
    previous && previous.revenue > 0 ? (previous.profitPool / previous.revenue) * 100 : null

  return (
    <Card className="xl:sticky xl:top-24 xl:self-start">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{snapshot.periodLabel}</CardTitle>
            <CardDescription>Locked on {fmtDate(snapshot.closedAt)}</CardDescription>
          </div>
          <Badge variant={isProfitable ? "success" : "destructive"}>
            {isProfitable ? "Profit" : "Loss"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {previous ? (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <span className="text-xs font-medium text-muted-foreground">vs {previous.periodLabel}</span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Revenue</span>
                <DeltaBadge current={snapshot.revenue} previous={previous.revenue} label="" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Expenses</span>
                <DeltaBadge current={snapshot.expenses} previous={previous.expenses} invertDelta label="" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Profit Pool</span>
                <DeltaBadge current={snapshot.profitPool} previous={previous.profitPool} label="" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            First closed month — no prior month to compare against.
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <span className="text-xs font-medium text-muted-foreground">Billing &amp; AR</span>
          {arError ? (
            <p className="text-sm text-destructive">{arError}</p>
          ) : arLoading || !arSelected ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Invoiced</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatZAR(arSelected.invoiced)}</span>
                  {arPrevious && <DeltaBadge current={arSelected.invoiced} previous={arPrevious.invoiced} label="" />}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Paid</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatZAR(arSelected.paid)}</span>
                  {arPrevious && <DeltaBadge current={arSelected.paid} previous={arPrevious.paid} label="" />}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">AR at close</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatZAR(arSelected.arBalance)}</span>
                  {arPrevious && (
                    <DeltaBadge current={arSelected.arBalance} previous={arPrevious.arBalance} invertDelta label="" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <MarginRow
            label="Gross margin"
            hint="Total profit retained in the business (Revenue − Expenses) ÷ Revenue — includes the PMG growth & investment reserve, since that stays within the organisation."
            value={grossMargin}
            previousValue={previousGrossMargin}
          />
          <div className="h-px bg-border" />
          <MarginRow
            label="Distributable margin"
            hint="Profit Pool ÷ Revenue — what's left for salary, reinvestment, reserve & flex allocations after the PMG cross-divisional growth reserve is set aside."
            value={netMargin}
            previousValue={previousNetMargin}
          />
        </div>

        {sparklineData.length > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Profit pool trend</span>
              <span className="text-xs text-muted-foreground">last {sparklineData.length} months</span>
              <DeltaBadge
                current={sparklineData[sparklineData.length - 1]}
                previous={sparklineData[0]}
                label={`over ${sparklineData.length} mo`}
              />
            </div>
            <Sparkline data={sparklineData} colorClass={isProfitable ? "text-emerald-500" : "text-red-500"} />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-md border border-border p-3">
          {isProfitable ? (
            <TrendingUp className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <TrendingDown className="size-4 shrink-0 text-destructive" />
          )}
          <span className="text-sm">
            <span className="font-semibold">{streak}</span> consecutive{" "}
            {isProfitable ? "profitable" : "loss"} month{streak === 1 ? "" : "s"}
          </span>
        </div>

        {yoySnapshot && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
            <span className="text-sm">vs {yoySnapshot.periodLabel}</span>
            <DeltaBadge current={snapshot.revenue} previous={yoySnapshot.revenue} label="revenue" />
          </div>
        )}

        <div className="flex flex-col gap-1 rounded-md border border-border p-3">
          <span className="text-sm font-medium">Notes</span>
          <p className="text-sm text-muted-foreground">
            {snapshot.notes || "No notes were added for this closed month."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function MarginRow({
  label,
  hint,
  value,
  previousValue,
}: {
  label: string
  hint: string
  value: number
  previousValue: number | null
}) {
  const improved = previousValue !== null && value >= previousValue
  return (
    <div className="flex items-center justify-between gap-2" title={hint}>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-base font-semibold tabular-nums",
            value >= 0 ? "text-emerald-600" : "text-destructive",
          )}
        >
          {value.toFixed(1)}%
        </span>
      </div>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          previousValue === null ? "text-muted-foreground" : improved ? "text-emerald-600" : "text-destructive",
        )}
      >
        {previousValue === null ? "First month" : `${previousValue.toFixed(1)}% last month`}
      </span>
    </div>
  )
}
