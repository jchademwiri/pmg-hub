'use client'

import type { SnapshotRow } from '@pmg/db'
import { formatZAR, fmtMonthYear, fmtDate } from '@/lib/format'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SnapshotDeltaBadge } from './snapshot-delta-badge'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Layers,
  BarChart3,
  Scale,
} from 'lucide-react'

interface SnapshotComparisonPanelProps {
  left: SnapshotRow
  right: SnapshotRow
  allSnapshots: SnapshotRow[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function num(s: SnapshotRow, key: keyof SnapshotRow): number {
  return Number(s[key]) || 0
}

function ComparisonRow({
  label,
  leftVal,
  rightVal,
  invertDelta,
  icon: Icon,
  iconColor,
}: {
  label: string
  leftVal: number
  rightVal: number
  invertDelta?: boolean
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
      <div className={cn('p-2 rounded-lg shrink-0', iconColor)}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatZAR(leftVal)}
          </span>
          <span className="text-muted-foreground text-xs">→</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatZAR(rightVal)}
          </span>
        </div>
      </div>
      <div className="shrink-0">
        <SnapshotDeltaBadge
          current={rightVal}
          previous={leftVal}
          invertDelta={invertDelta}
        />
      </div>
    </div>
  )
}

function AllocationBar({
  label,
  leftVal,
  rightVal,
  leftPct,
  rightPct,
  color,
}: {
  label: string
  leftVal: number
  rightVal: number
  leftPct: number
  rightPct: number
  color: string
}) {
  const pctDiff = rightPct - leftPct
  const isUp = pctDiff > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {leftPct.toFixed(1)}% → {rightPct.toFixed(1)}%
          {Math.abs(pctDiff) >= 0.1 && (
            <span className={cn('ml-1', isUp ? 'text-emerald-500' : 'text-red-500')}>
              {isUp ? '+' : ''}{pctDiff.toFixed(1)}pp
            </span>
          )}
        </span>
      </div>
      <div className="flex h-5 w-full rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 gap-1">
        <div
          className="rounded-l-md flex items-center justify-center text-[9px] text-white font-bold transition-all duration-300"
          style={{ width: `${leftPct}%`, backgroundColor: color, opacity: 0.7 }}
          title={`${label} (left): ${formatZAR(leftVal)}`}
        >
          {leftPct >= 12 && formatZAR(leftVal)}
        </div>
        <div
          className="rounded-r-md flex items-center justify-center text-[9px] text-white font-bold transition-all duration-300"
          style={{ width: `${rightPct}%`, backgroundColor: color }}
          title={`${label} (right): ${formatZAR(rightVal)}`}
        >
          {rightPct >= 12 && formatZAR(rightVal)}
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{formatZAR(leftVal)}</span>
        <span>{formatZAR(rightVal)}</span>
      </div>
    </div>
  )
}

// ── Chart Config ─────────────────────────────────────────────────────────────

const trendConfig: ChartConfig = {
  leftRevenue: { label: 'Revenue (A)', color: '#10b981' },
  rightRevenue: { label: 'Revenue (B)', color: '#10b981' },
  leftExpenses: { label: 'Expenses (A)', color: '#f59e0b' },
  rightExpenses: { label: 'Expenses (B)', color: '#f59e0b' },
  leftProfit: { label: 'Profit (A)', color: '#3b82f6' },
  rightProfit: { label: 'Profit (B)', color: '#3b82f6' },
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SnapshotComparisonPanel({
  left,
  right,
  allSnapshots,
}: SnapshotComparisonPanelProps) {
  // Ensure chronological order: left is earlier, right is later
  const [a, b] = left.period < right.period ? [left, right] : [right, left]

  const aRev = num(a, 'revenue')
  const aExp = num(a, 'expenses')
  const aPmg = num(a, 'pmgShare')
  const aPool = num(a, 'profitPool')
  const aSalary = num(a, 'salary')
  const aReinvest = num(a, 'reinvest')
  const aReserve = num(a, 'reserve')
  const aFlex = num(a, 'flex')

  const bRev = num(b, 'revenue')
  const bExp = num(b, 'expenses')
  const bPmg = num(b, 'pmgShare')
  const bPool = num(b, 'profitPool')
  const bSalary = num(b, 'salary')
  const bReinvest = num(b, 'reinvest')
  const bReserve = num(b, 'reserve')
  const bFlex = num(b, 'flex')

  const aExpPct = aRev > 0 ? (aExp / aRev) * 100 : 0
  const bExpPct = bRev > 0 ? (bExp / bRev) * 100 : 0
  const aPmgPct = aRev > 0 ? (aPmg / aRev) * 100 : 0
  const bPmgPct = bRev > 0 ? (bPmg / bRev) * 100 : 0
  const aPoolPct = aRev > 0 ? Math.max(0, (aPool / aRev) * 100) : 0
  const bPoolPct = bRev > 0 ? Math.max(0, (bPool / bRev) * 100) : 0

  // Build trend data: find the 3 snapshots around each period
  const aIdx = allSnapshots.findIndex((s) => s.id === a.id)
  const bIdx = allSnapshots.findIndex((s) => s.id === b.id)
  const trendStart = Math.max(0, Math.min(aIdx, bIdx) - 1)
  const trendEnd = Math.min(allSnapshots.length - 1, Math.max(aIdx, bIdx) + 1)
  const trendSnapshots = allSnapshots.slice(trendStart, trendEnd + 1).reverse() // chronological

  const trendData = trendSnapshots.map((s) => ({
    period: fmtMonthYear(s.period, { short: true }),
    leftRevenue: s.id === a.id ? aRev : undefined,
    rightRevenue: s.id === b.id ? bRev : undefined,
    leftExpenses: s.id === a.id ? aExp : undefined,
    rightExpenses: s.id === b.id ? bExp : undefined,
    leftProfit: s.id === a.id ? aPool : undefined,
    rightProfit: s.id === b.id ? bPool : undefined,
    isA: s.id === a.id,
    isB: s.id === b.id,
  }))

  return (
    <Card className="border-t-[4px] border-t-blue-600">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          <ArrowLeftRight className="size-3.5" />
          <span>Period Comparison</span>
        </div>
        <h3 className="text-lg font-bold tracking-tight mt-1 text-foreground">
          {fmtMonthYear(a.period)} vs {fmtMonthYear(b.period)}
        </h3>
        <p className="text-xs text-muted-foreground">
          Comparing {fmtMonthYear(a.period)} (locked {fmtDate(a.createdAt)}) with {fmtMonthYear(b.period)} (locked {fmtDate(b.createdAt)}).
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="gap-1.5">
              <Scale className="size-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="allocations" className="gap-1.5">
              <Layers className="size-3.5" />
              Allocations
            </TabsTrigger>
            <TabsTrigger value="trend" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              Trend
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Overview ────────────────────────────────────────── */}
          <TabsContent value="overview">
            <div className="flex flex-col gap-4">
              {/* Period labels */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                <Badge variant="secondary" className="justify-center">
                  {fmtMonthYear(a.period, { short: true })}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">vs</span>
                <Badge variant="secondary" className="justify-center">
                  {fmtMonthYear(b.period, { short: true })}
                </Badge>
              </div>

              {/* KPI comparison rows */}
              <ComparisonRow
                label="Gross Revenue"
                leftVal={aRev}
                rightVal={bRev}
                icon={TrendingUp}
                iconColor="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
              />
              <ComparisonRow
                label="Operating Expenses"
                leftVal={aExp}
                rightVal={bExp}
                invertDelta
                icon={TrendingDown}
                iconColor="bg-amber-50 dark:bg-amber-950/20 text-amber-600"
              />
              <ComparisonRow
                label="PMG Share (25%)"
                leftVal={aPmg}
                rightVal={bPmg}
                icon={TrendingUp}
                iconColor="bg-blue-50 dark:bg-blue-950/20 text-blue-600"
              />
              <ComparisonRow
                label={aPool >= 0 && bPool >= 0 ? 'Profit Pool' : aPool < 0 && bPool < 0 ? 'Net Loss' : 'Profit / Loss'}
                leftVal={aPool}
                rightVal={bPool}
                icon={aPool >= 0 ? TrendingUp : TrendingDown}
                iconColor={bPool >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-red-50 dark:bg-red-950/20 text-red-600'}
              />

              {/* Revenue split comparison */}
              <div className="mt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Revenue Split Comparison
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Left period split bar */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground text-center">
                      {fmtMonthYear(a.period, { short: true })}
                    </span>
                    <div className="h-5 w-full rounded-md overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="bg-blue-600 transition-all duration-300 flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ width: `${aPmgPct}%` }}
                        title={`PMG: ${aPmgPct.toFixed(0)}%`}
                      >
                        {aPmgPct >= 15 ? 'PMG' : ''}
                      </div>
                      <div
                        className="bg-amber-500 transition-all duration-300 flex items-center justify-center text-[9px] text-white font-bold border-l border-white/10"
                        style={{ width: `${Math.min(100 - aPmgPct, aExpPct)}%` }}
                        title={`Expenses: ${aExpPct.toFixed(0)}%`}
                      >
                        {aExpPct >= 15 ? 'Exp' : ''}
                      </div>
                      {aPool >= 0 && (
                        <div
                          className="bg-emerald-500 transition-all duration-300 flex items-center justify-center text-[9px] text-white font-bold border-l border-white/10"
                          style={{ width: `${aPoolPct}%` }}
                          title={`Pool: ${aPoolPct.toFixed(0)}%`}
                        >
                          {aPoolPct >= 15 ? 'Pool' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right period split bar */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground text-center">
                      {fmtMonthYear(b.period, { short: true })}
                    </span>
                    <div className="h-5 w-full rounded-md overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="bg-blue-600 transition-all duration-300 flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ width: `${bPmgPct}%` }}
                        title={`PMG: ${bPmgPct.toFixed(0)}%`}
                      >
                        {bPmgPct >= 15 ? 'PMG' : ''}
                      </div>
                      <div
                        className="bg-amber-500 transition-all duration-300 flex items-center justify-center text-[9px] text-white font-bold border-l border-white/10"
                        style={{ width: `${Math.min(100 - bPmgPct, bExpPct)}%` }}
                        title={`Expenses: ${bExpPct.toFixed(0)}%`}
                      >
                        {bExpPct >= 15 ? 'Exp' : ''}
                      </div>
                      {bPool >= 0 && (
                        <div
                          className="bg-emerald-500 transition-all duration-300 flex items-center justify-center text-[9px] text-white font-bold border-l border-white/10"
                          style={{ width: `${bPoolPct}%` }}
                          title={`Pool: ${bPoolPct.toFixed(0)}%`}
                        >
                          {bPoolPct >= 15 ? 'Pool' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 2: Allocations ─────────────────────────────────────── */}
          <TabsContent value="allocations">
            <div className="flex flex-col gap-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Profit Pool Allocation Comparison
              </h4>

              <AllocationBar
                label="Salary"
                leftVal={aSalary}
                rightVal={bSalary}
                leftPct={aPool !== 0 ? (aSalary / aPool) * 100 : 0}
                rightPct={bPool !== 0 ? (bSalary / bPool) * 100 : 0}
                color="var(--chart-1)"
              />
              <AllocationBar
                label="Reinvest"
                leftVal={aReinvest}
                rightVal={bReinvest}
                leftPct={aPool !== 0 ? (aReinvest / aPool) * 100 : 0}
                rightPct={bPool !== 0 ? (bReinvest / bPool) * 100 : 0}
                color="var(--chart-2)"
              />
              <AllocationBar
                label="Reserve"
                leftVal={aReserve}
                rightVal={bReserve}
                leftPct={aPool !== 0 ? (aReserve / aPool) * 100 : 0}
                rightPct={bPool !== 0 ? (bReserve / bPool) * 100 : 0}
                color="var(--chart-3)"
              />
              <AllocationBar
                label="Flex"
                leftVal={aFlex}
                rightVal={bFlex}
                leftPct={aPool !== 0 ? (aFlex / aPool) * 100 : 0}
                rightPct={bPool !== 0 ? (bFlex / bPool) * 100 : 0}
                color="var(--chart-4)"
              />

              {/* Stacked bar comparison */}
              <div className="mt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Side-by-Side Allocation Totals
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  {/* Left */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground text-center">
                      {fmtMonthYear(a.period, { short: true })}
                    </span>
                    <ChartContainer config={trendConfig} className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[{
                            period: fmtMonthYear(a.period, { short: true }),
                            salary: aSalary,
                            reinvest: aReinvest,
                            reserve: aReserve,
                            flex: aFlex,
                          }]}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={52} />                          <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
                          <Bar dataKey="salary" stackId="a" fill="var(--chart-1)" name="Salary" />
                          <Bar dataKey="reinvest" stackId="a" fill="var(--chart-2)" name="Reinvest" />
                          <Bar dataKey="reserve" stackId="a" fill="var(--chart-3)" name="Reserve" />
                          <Bar dataKey="flex" stackId="a" fill="var(--chart-4)" name="Flex" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  {/* Right */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground text-center">
                      {fmtMonthYear(b.period, { short: true })}
                    </span>
                    <ChartContainer config={trendConfig} className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[{
                            period: fmtMonthYear(b.period, { short: true }),
                            salary: bSalary,
                            reinvest: bReinvest,
                            reserve: bReserve,
                            flex: bFlex,
                          }]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={52} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
                          <Bar dataKey="salary" stackId="a" fill="var(--chart-1)" name="Salary" />
                          <Bar dataKey="reinvest" stackId="a" fill="var(--chart-2)" name="Reinvest" />
                          <Bar dataKey="reserve" stackId="a" fill="var(--chart-3)" name="Reserve" />
                          <Bar dataKey="flex" stackId="a" fill="var(--chart-4)" name="Flex" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Trend ──────────────────────────────────────────── */}
          <TabsContent value="trend">
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Financial performance trend showing {fmtMonthYear(a.period, { short: true })} and {fmtMonthYear(b.period, { short: true })} highlighted against their surrounding months.
              </p>

              <ChartContainer config={trendConfig} className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trendExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trendPool" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="leftRevenue"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#trendRev)"
                      strokeWidth={2}
                      name="Revenue"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="rightRevenue"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#trendRev)"
                      strokeWidth={2.5}
                      strokeDasharray="8 4"
                      name="Revenue"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="leftExpenses"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#trendExp)"
                      strokeWidth={2}
                      name="Expenses"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="rightExpenses"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#trendExp)"
                      strokeWidth={2.5}
                      strokeDasharray="8 4"
                      name="Expenses"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="leftProfit"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#trendPool)"
                      strokeWidth={2}
                      name="Profit Pool"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="rightProfit"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#trendPool)"
                      strokeWidth={2.5}
                      strokeDasharray="8 4"
                      name="Profit Pool"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Legend */}
              <div className="flex justify-center items-center gap-6 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-zinc-600 dark:text-zinc-400">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                  <span className="text-zinc-600 dark:text-zinc-400">Expenses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                  <span className="text-zinc-900 dark:text-zinc-100">Profit Pool</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-foreground" />
                  <span className="text-muted-foreground">{fmtMonthYear(a.period, { short: true })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-foreground border-dashed" style={{ borderTop: '2px dashed var(--foreground)' }} />
                  <span className="text-muted-foreground">{fmtMonthYear(b.period, { short: true })}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
