"use client";

import { useState, useCallback } from "react";
import type { SnapshotRow } from "@pmg/db";
import { formatZAR, fmtMonthYear, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SnapshotComparisonPanel } from "./snapshot-comparison-panel";
import { SnapshotDeltaBadge } from "./snapshot-delta-badge";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Globe,
  BarChart3,
  ArrowLeftRight,
  Lock,
} from "lucide-react";

interface SnapshotsCockpitProps {
  snapshots: SnapshotRow[];
}

const chartConfig: ChartConfig = {
  revenue: { label: "Gross Revenue", color: "var(--chart-1, #10b981)" },
  expenses: { label: "Operating Expenses", color: "var(--chart-2, #f59e0b)" },
  profitPool: { label: "Net Profits", color: "var(--chart-3, #3b82f6)" },
};

export function SnapshotsCockpit({ snapshots }: SnapshotsCockpitProps) {
  // Default to "all-time" as the starting overview
  const [selectedId, setSelectedId] = useState<string>("all-time");
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => !prev);
    setCompareIds([]);
    if (!compareMode) setSelectedId("all-time");
  }, [compareMode]);

  const toggleCompareSelection = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  if (snapshots.length === 0) {
    return (
      <div className="py-12 border border-dashed border-zinc-200 rounded-lg text-center bg-white dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">No monthly snapshots exist.</p>
      </div>
    );
  }

  // Calculate cumulative all-time stats
  const totalAllTimeRevenue = snapshots.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const totalAllTimeExpenses = snapshots.reduce((s, r) => s + (Number(r.expenses) || 0), 0);
  const totalAllTimePmgShare = snapshots.reduce((s, r) => s + (Number(r.pmgShare) || 0), 0);
  const totalAllTimeProfit = snapshots.reduce((s, r) => s + (Number(r.profitPool) || 0), 0);

  const selectedSnapshot = selectedId === "all-time" 
    ? null 
    : snapshots.find((s) => s.id === selectedId);

  // Set visual variables based on selected state (all-time vs specific month)
  const isAllTime = selectedId === "all-time";
  
  const periodLabel = isAllTime 
    ? "All-Time Performance" 
    : selectedSnapshot 
    ? fmtMonthYear(selectedSnapshot.period) 
    : "";

  const rev = isAllTime 
    ? totalAllTimeRevenue 
    : selectedSnapshot 
    ? (Number(selectedSnapshot.revenue) || 0) 
    : 0;

  const exp = isAllTime 
    ? totalAllTimeExpenses 
    : selectedSnapshot 
    ? (Number(selectedSnapshot.expenses) || 0) 
    : 0;

  const pmg = isAllTime 
    ? totalAllTimePmgShare 
    : selectedSnapshot 
    ? (Number(selectedSnapshot.pmgShare) || 0) 
    : 0;

  const pool = isAllTime 
    ? totalAllTimeProfit 
    : selectedSnapshot 
    ? (Number(selectedSnapshot.profitPool) || 0) 
    : 0;

  // Level 1 percentage splits of revenue
  const pmgPct = rev > 0 ? (pmg / rev) * 100 : 20;
  const expPct = rev > 0 ? (exp / rev) * 100 : 0;
  const poolPct = rev > 0 ? Math.max(0, (pool / rev) * 100) : 0;

  const isProfitable = pool > 0;

  // Find the previous snapshot for delta calculations
  const previousSnapshot = !isAllTime && selectedSnapshot
    ? snapshots.find((s) => s.period < selectedSnapshot.period) ?? null
    : null;
  const prevRev = previousSnapshot ? (Number(previousSnapshot.revenue) || 0) : 0;
  const prevExp = previousSnapshot ? (Number(previousSnapshot.expenses) || 0) : 0;
  const prevPool = previousSnapshot ? (Number(previousSnapshot.profitPool) || 0) : 0;

  // Prepare chronological chart data (oldest to newest)
  const chartData = [...snapshots]
    .reverse()
    .map((s) => ({
      period: fmtMonthYear(s.period),
      revenue: Number(s.revenue) || 0,
      expenses: Number(s.expenses) || 0,
      profitPool: Number(s.profitPool) || 0,
    }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:items-start">
      {/* ── Left Sidebar (List of Months & All-Time Card) ────────────────── */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Closed Periods ({snapshots.length})
            </span>
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={toggleCompareMode}
            >
              <ArrowLeftRight className="size-3" />
              {compareMode ? "Cancel" : "Compare"}
            </Button>
          </div>
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
            {!compareMode && (
              <>
                {/* 1. All-Time Overview Card (Always First) */}
                <Card
                  onClick={() => setSelectedId("all-time")}
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-l-[4px] hover:bg-muted/50 hover:translate-x-0.5",
                    selectedId === "all-time"
                      ? "border-l-blue-600 border-foreground bg-muted font-medium"
                      : "border-l-zinc-300 border-border"
                  )}
                >
                  <CardHeader className="p-3 flex flex-row items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Globe className="size-3.5 text-blue-600 shrink-0" />
                        All-Time Overview
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Historical metrics & trends
                      </span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[9px] px-1.5 py-0.5 font-bold">
                      All
                    </Badge>
                  </CardHeader>
                </Card>
                <Separator className="my-1" />
              </>
            )}
            {compareMode && (
              <p className="text-[10px] text-muted-foreground">
                Select 2 periods to compare ({compareIds.length}/2 selected)
              </p>
            )}

            {/* 2. Monthly List */}
            {snapshots.map((s) => {
              const isActive = compareMode
                ? compareIds.includes(s.id)
                : s.id === selectedId;
              const sRev = Number(s.revenue) || 0;
              const sPool = Number(s.profitPool) || 0;
              const sIsProfitable = sPool > 0;
              const compareIndex = compareIds.indexOf(s.id);

              return (
                <Card
                  key={s.id}
                  onClick={() =>
                    compareMode
                      ? toggleCompareSelection(s.id)
                      : setSelectedId(s.id)
                  }
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-l-[4px] hover:bg-muted/50 hover:translate-x-0.5",
                    isActive
                      ? compareMode
                        ? "border-l-blue-600 border-foreground bg-blue-50/50 dark:bg-blue-950/20 font-medium"
                        : "border-l-blue-600 border-foreground bg-muted font-medium"
                      : sIsProfitable
                      ? "border-l-emerald-500 border-border"
                      : "border-l-red-500 border-border"
                  )}
                >
                  <CardHeader className="p-3 flex flex-row items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold truncate text-foreground flex items-center gap-1.5">
                        <Lock className="size-3 text-muted-foreground shrink-0" />
                        {compareMode && isActive && (
                          <Badge variant="default" className="shrink-0 text-[8px] px-1 py-0 h-4">
                            {compareIndex === 0 ? "A" : "B"}
                          </Badge>
                        )}
                        {fmtMonthYear(s.period)}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        Rev: {formatZAR(sRev)}
                      </span>
                    </div>
                    <Badge
                      variant={sIsProfitable ? "success" : "destructive"}
                      className="shrink-0 tabular-nums text-[9px] px-1.5 py-0.5"
                    >
                      {sIsProfitable ? "+" : ""}
                      {formatZAR(sPool)}
                    </Badge>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>        {/* ── Right Panel (Details Cockpit) ─────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:col-span-3">
        {/* Cockpit Header (hidden in compare mode) */}
        {!compareMode && (
        <Card className="border-t-[4px] border-t-blue-600">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Calendar className="size-3.5" />
              <span>Financial Overview</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mt-1 text-foreground">
              {periodLabel}
            </h3>
            <p className="text-xs text-muted-foreground">
              Calculated on a monthly basis. {isAllTime ? "Cumulative totals spanning all locked periods." : selectedSnapshot ? `Figures locked on ${fmtDate(selectedSnapshot.createdAt)}.` : ''}
            </p>
          </CardHeader>
        </Card>
        )}

        {/* Level 1 KPI Strip (hidden in compare mode) */}
        {!compareMode && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: isAllTime ? "Cumulative Revenue" : "Gross Revenue",
              value: formatZAR(rev),
              textColor: "text-emerald-600 dark:text-emerald-400",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
              icon: TrendingUp,
              delta: !isAllTime && previousSnapshot ? { current: rev, previous: prevRev } : null,
              invertDelta: false,
            },
            {
              label: isAllTime ? "Cumulative Expenses" : "Operating Expenses",
              value: formatZAR(exp),
              textColor: "text-amber-600 dark:text-amber-400",
              bgColor: "bg-amber-50 dark:bg-amber-950/20",
              icon: TrendingDown,
              delta: !isAllTime && previousSnapshot ? { current: exp, previous: prevExp } : null,
              invertDelta: true,
            },
            {
              label: isAllTime ? "Cumulative Net Profit" : isProfitable ? "Profit Pool" : "Net Loss Pool",
              value: formatZAR(Math.abs(pool)) + (!isProfitable ? " CR" : ""),
              textColor: isProfitable
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
              bgColor: isProfitable
                ? "bg-emerald-50 dark:bg-emerald-950/20"
                : "bg-red-50 dark:bg-red-950/20",
              icon: isProfitable ? TrendingUp : TrendingDown,
              delta: !isAllTime && previousSnapshot ? { current: pool, previous: prevPool } : null,
              invertDelta: false,
            },
          ].map((k) => (
            <Card key={k.label} className={cn("overflow-hidden")}>
              <CardHeader className="p-4 flex flex-row items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
                  <span className={cn("text-lg font-bold tabular-nums tracking-tight", k.textColor)}>
                    {k.value}
                  </span>
                  {!isAllTime && k.delta && previousSnapshot && (
                    <SnapshotDeltaBadge
                      current={k.delta.current}
                      previous={k.delta.previous}
                      invertDelta={k.invertDelta}
                      label="vs prev"
                    />
                  )}
                </div>
                <div className={cn("p-2 rounded-lg shrink-0", k.bgColor)}>
                  <k.icon className={cn("size-4", k.textColor)} />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
        )}

        {/* Level 1 Visual Split Bar (hidden in compare mode) */}
        {!compareMode && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="size-4 text-blue-600" />
              Level 1 - Revenue Split (Gross)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="h-6 w-full rounded-lg overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
              {/* PMG Share */}
              <div
                className="bg-blue-600 transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold px-1"
                style={{ width: `${pmgPct}%` }}
                title={`PMG Contribution: ${pmgPct.toFixed(0)}%`}
              >
                {pmgPct >= 15 ? "PMG (25%)" : "PMG"}
              </div>

              {/* Expenses */}
              <div
                className="bg-amber-500 transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold px-1 border-l border-white/10"
                style={{ width: `${Math.min(100 - pmgPct, expPct)}%` }}
                title={`Expenses: ${expPct.toFixed(0)}%`}
              >
                {expPct >= 15 ? `Expenses (${expPct.toFixed(0)}%)` : "Exp"}
              </div>

              {/* Profit Pool */}
              {isProfitable && (
                <div
                  className="bg-emerald-500 transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold px-1 border-l border-white/10"
                  style={{ width: `${poolPct}%` }}
                  title={`Profit Pool: ${poolPct.toFixed(0)}%`}
                >
                  {poolPct >= 15 ? `Profit Pool (${poolPct.toFixed(0)}%)` : "Pool"}
                </div>
              )}
            </div>

            {/* Split legend */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col gap-0.5 border-l-2 border-l-blue-600 pl-2">
                <span className="text-muted-foreground font-medium">PMG Contribution</span>
                <span className="font-semibold text-blue-600 tabular-nums">{formatZAR(pmg)}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-l-2 border-l-amber-500 pl-2">
                <span className="text-muted-foreground font-medium">Operating Expenses</span>
                <span className="font-semibold text-amber-500 tabular-nums">{formatZAR(exp)}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-l-2 border-l-emerald-500 pl-2">
                <span className="text-muted-foreground font-medium">{isProfitable ? "Profit Pool" : "Deficit"}</span>
                <span className={cn("font-semibold tabular-nums", isProfitable ? "text-emerald-600" : "text-red-500")}>
                  {formatZAR(pool)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* ── New Component: All-Time Months Performance Chart ────────────── */}
        {isAllTime && (
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-blue-600" />
                Monthly Financial Performance Trend
              </CardTitle>
              <CardDescription>
                Chronological breakdown indicating monthly Gross Revenue, Operating Expenses, and Net Profits.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ChartContainer config={chartConfig} className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPool" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#f59e0b" 
                      fillOpacity={1} 
                      fill="url(#colorExp)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profitPool" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorPool)" 
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Chart Legend */}
              <div className="flex justify-center items-center gap-6 mt-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-zinc-600 dark:text-zinc-400">Gross Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                  <span className="text-zinc-600 dark:text-zinc-400">Operating Expenses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                  <span className="text-zinc-900 dark:text-zinc-100">Net Profits</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* ── Comparison Mode ───────────────────────────────────────────────── */}
        {compareMode && compareIds.length === 2 && (
          <SnapshotComparisonPanel
            left={snapshots.find((s) => s.id === compareIds[0])!}
            right={snapshots.find((s) => s.id === compareIds[1])!}
            allSnapshots={snapshots}
          />
        )}

        {/* ── Comparison mode: waiting for selection ──────────────────────────── */}
        {compareMode && compareIds.length < 2 && (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="p-3 rounded-full bg-muted/50">
                <ArrowLeftRight className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Select {compareIds.length === 0 ? "2 periods" : "1 more period"} from the sidebar to compare
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
