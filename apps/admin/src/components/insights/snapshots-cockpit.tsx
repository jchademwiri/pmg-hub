"use client"

import { useMemo, useState } from "react"
import { CalendarCheck, FileText, LockKeyhole, TrendingDown, TrendingUp } from "lucide-react"
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
  salary: number
  reinvest: number
  reserve: number
  flex: number
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
        salary: toMoney(snapshot.salary),
        reinvest: toMoney(snapshot.reinvest),
        reserve: toMoney(snapshot.reserve),
        flex: toMoney(snapshot.flex),
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

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          expenses: acc.expenses + row.expenses,
          profitPool: acc.profitPool + row.profitPool,
        }),
        { revenue: 0, expenses: 0, profitPool: 0 },
      ),
    [rows],
  )

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
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Closed months" value={String(rows.length)} icon={CalendarCheck} />
        <SummaryMetric
          label="Total revenue"
          value={formatZAR(totals.revenue)}
          icon={TrendingUp}
          tone="revenue"
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
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                    <TableHead className="font-semibold text-foreground py-4">Status</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Revenue</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Expenses</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Profit/Loss</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">Closed</TableHead>
                    <TableHead className="text-center font-semibold text-foreground py-4">Notes</TableHead>
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
                      <TableCell className="font-medium py-4">{row.periodLabel}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass("revenue")}>{formatZAR(row.revenue)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass("expense")}>{formatZAR(row.expenses)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-semibold">
                        <span className={amountToneClass(row.profitPool >= 0 ? "positive" : "negative")}>
                          {formatZAR(row.profitPool)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 text-muted-foreground">{fmtDate(row.closedAt)}</TableCell>
                      <TableCell className="text-center py-4">
                        {row.notes ? (
                          <Badge variant="outline" className="inline-flex items-center gap-1 mx-auto">
                            <FileText className="size-3" />
                            <span>Yes</span>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone?: AmountTone
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle
            className={cn(
              "truncate text-xl tabular-nums",
              amountToneClass(tone),
            )}
          >
            {value}
          </CardTitle>
        </div>
        <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" />
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
}: {
  snapshot: SnapshotView
  previous: SnapshotView | undefined
  yoySnapshot: SnapshotView | undefined
  sparklineData: number[]
  streak: number
}) {
  const isProfitable = snapshot.profitPool >= 0
  const margin = snapshot.revenue > 0 ? (snapshot.profitPool / snapshot.revenue) * 100 : 0
  const previousMargin =
    previous && previous.revenue > 0 ? (previous.profitPool / previous.revenue) * 100 : null
  const marginDelta = previousMargin !== null ? margin - previousMargin : null

  return (
    <Card>
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

        <div className="grid grid-cols-2 gap-3">
          <DetailMetric
            label="Profit margin"
            formattedValue={`${margin.toFixed(1)}%`}
            tone={isProfitable ? "positive" : "negative"}
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">vs last month</span>
            <span
              className={cn(
                "text-base font-semibold tabular-nums",
                marginDelta === null
                  ? "text-muted-foreground"
                  : marginDelta >= 0
                    ? "text-emerald-600"
                    : "text-destructive",
              )}
            >
              {marginDelta === null ? "—" : `${marginDelta >= 0 ? "+" : ""}${marginDelta.toFixed(1)}pp`}
            </span>
          </div>
        </div>

        {sparklineData.length > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Profit pool trend</span>
              <span className="text-xs text-muted-foreground">last {sparklineData.length} months</span>
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

function DetailMetric({
  label,
  value,
  formattedValue,
  tone = "default",
}: {
  label: string
  value?: number
  formattedValue?: string
  tone?: AmountTone
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-base font-semibold tabular-nums", amountToneClass(tone))}>
        {formattedValue ?? formatZAR(value ?? 0)}
      </span>
    </div>
  )
}
