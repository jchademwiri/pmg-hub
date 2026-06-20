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

interface SnapshotsCockpitProps {
  snapshots: SnapshotRow[]
}

type SnapshotView = {
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit/Loss</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      aria-selected={selectedSnapshot?.id === row.id}
                      tabIndex={0}
                      data-state={selectedSnapshot?.id === row.id ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setSelectedId(row.id)
                        }
                      }}
                    >
                      <TableCell className="font-medium">{row.periodLabel}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={amountToneClass("revenue")}>{formatZAR(row.revenue)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={amountToneClass("expense")}>{formatZAR(row.expenses)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={amountToneClass(row.profitPool >= 0 ? "positive" : "negative")}>
                          {formatZAR(row.profitPool)}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{fmtDate(row.closedAt)}</TableCell>
                      <TableCell>
                        {row.notes ? (
                          <Badge variant="outline">
                            <FileText data-icon="inline-start" />
                            Yes
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

        {selectedSnapshot && <SnapshotDetail snapshot={selectedSnapshot} />}
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

function SnapshotDetail({ snapshot }: { snapshot: SnapshotView }) {
  const isProfitable = snapshot.profitPool >= 0

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
        <div className="grid grid-cols-2 gap-3">
          <DetailMetric label="Revenue" value={snapshot.revenue} tone="revenue" />
          <DetailMetric label="Expenses" value={snapshot.expenses} tone="expense" />
          <DetailMetric label="PMG Share" value={snapshot.pmgShare} tone="share" />
          <DetailMetric
            label={isProfitable ? "Profit Pool" : "Net Loss"}
            value={snapshot.profitPool}
            tone={isProfitable ? "positive" : "negative"}
          />
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <LockKeyhole className="size-4 text-muted-foreground" />
            Allocation
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailMetric label="Salary" value={snapshot.salary} tone="allocation" compact />
            <DetailMetric label="Reinvest" value={snapshot.reinvest} tone="allocation" compact />
            <DetailMetric label="Reserve" value={snapshot.reserve} tone="allocation" compact />
            <DetailMetric label="Flex" value={snapshot.flex} tone="allocation" compact />
          </div>
        </div>

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
  compact = false,
  tone = "default",
}: {
  label: string
  value: number
  compact?: boolean
  tone?: AmountTone
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          compact ? "text-sm" : "text-base",
          amountToneClass(tone),
        )}
      >
        {formatZAR(value)}
      </span>
    </div>
  )
}
