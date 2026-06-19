"use client";

import { useState } from "react";
import type { SnapshotRow } from "@pmg/db";
import { formatZAR, fmtMonthYear } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
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
  Globe,
  BarChart3,
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
  const [selectedId, setSelectedId] = useState<string>("all-time");

  if (snapshots.length === 0) {
    return (
      <div className="py-12 border border-dashed border-zinc-200 rounded-lg text-center bg-white dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">No monthly snapshots exist yet.</p>
        <p className="text-xs text-zinc-400 mt-1">Close a month on the Dashboard to create your first snapshot.</p>
      </div>
    );
  }

  const selectedSnapshot = selectedId === "all-time"
    ? null
    : snapshots.find((s) => s.id === selectedId);

  const isAllTime = selectedId === "all-time";

  // Sum all snapshots for all-time view
  const val = (key: keyof SnapshotRow): number => {
    if (isAllTime) return snapshots.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    return selectedSnapshot ? (Number(selectedSnapshot[key]) || 0) : 0;
  };

  const rev = val("revenue");
  const exp = val("expenses");
  const pmg = val("pmgShare");
  const pool = val("profitPool");

  const isProfitable = pool > 0;

  // Chart data: oldest → newest
  const chartData = [...snapshots]
    .reverse()
    .map((s) => ({
      period: fmtMonthYear(s.period),
      revenue: Number(s.revenue) || 0,
      expenses: Number(s.expenses) || 0,
      profitPool: Number(s.profitPool) || 0,
    }));

  // Bar data for current month selection
  const barData = selectedSnapshot
    ? [
        { name: "Revenue", amount: rev, fill: "#10b981" },
        { name: "PMG Share", amount: pmg, fill: "#3b82f6" },
        { name: "Expenses", amount: exp, fill: "#f59e0b" },
        { name: "Profit Pool", amount: Math.abs(pool), fill: isProfitable ? "#8b5cf6" : "#ef4444" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Period selector + summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: period list */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Closed Months ({snapshots.length})
          </span>

          <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
            {/* All-time */}
            <Card
              onClick={() => setSelectedId("all-time")}
              className={cn(
                "cursor-pointer transition-all duration-200 border-l-[4px] hover:bg-muted/50",
                selectedId === "all-time"
                  ? "border-l-blue-600 bg-muted font-medium"
                  : "border-l-zinc-300",
              )}
            >
              <CardHeader className="p-3 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="size-3.5 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold">All-Time Overview</span>
                </div>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 shrink-0">
                  All
                </Badge>
              </CardHeader>
            </Card>

            <Separator className="my-1" />

            {/* Individual months */}
            {snapshots.map((s) => {
              const sPool = Number(s.profitPool) || 0;
              const sRev = Number(s.revenue) || 0;
              const sIsProfitable = sPool > 0;
              const isActive = s.id === selectedId;

              return (
                <Card
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-l-[4px] hover:bg-muted/50",
                    isActive
                      ? "border-l-blue-600 bg-muted font-medium"
                      : sIsProfitable
                        ? "border-l-emerald-500"
                        : "border-l-red-500",
                  )}
                >
                  <CardHeader className="p-3 flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-semibold truncate">
                        {fmtMonthYear(s.period)}
                      </span>
                    </div>
                    <Badge
                      variant={sIsProfitable ? "success" : "destructive"}
                      className="shrink-0 text-[9px] px-1.5 py-0.5 tabular-nums"
                    >
                      {sIsProfitable ? "+" : ""}{formatZAR(sPool)}
                    </Badge>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Header */}
          <Card className="border-t-[4px] border-t-blue-600">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                <Calendar className="size-3.5" />
                <span>Financial Overview</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mt-1">
                {isAllTime ? "All-Time Performance" : fmtMonthYear(selectedSnapshot!.period)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isAllTime
                  ? "Cumulative totals across all closed months."
                  : `Figures locked for ${fmtMonthYear(selectedSnapshot!.period)}.`}
              </p>
            </CardHeader>
          </Card>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="p-4 flex flex-row items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">Gross Revenue</span>
                  <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatZAR(rev)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 shrink-0">
                  <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 flex flex-row items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">Operating Expenses</span>
                  <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {formatZAR(exp)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 shrink-0">
                  <TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 flex flex-row items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">Net Profit</span>
                  <span className={cn(
                    "text-lg font-bold tabular-nums",
                    isProfitable
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}>
                    {formatZAR(pool)}
                  </span>
                </div>
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  isProfitable
                    ? "bg-emerald-50 dark:bg-emerald-950/20"
                    : "bg-red-50 dark:bg-red-950/20",
                )}>
                  {isProfitable
                    ? <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                    : <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
                  }
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Revenue split bar */}
          {!isAllTime && selectedSnapshot && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-blue-600" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Stacked bar chart */}
                <ChartContainer config={chartConfig} className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
                      <Bar dataKey="amount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                {/* Simple legend */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="flex flex-col gap-0.5 border-l-2 border-l-emerald-500 pl-2">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-semibold tabular-nums">{formatZAR(rev)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-l-2 border-l-blue-600 pl-2">
                    <span className="text-muted-foreground">PMG Share</span>
                    <span className="font-semibold tabular-nums">{formatZAR(pmg)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-l-2 border-l-amber-500 pl-2">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="font-semibold tabular-nums">{formatZAR(exp)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-l-2 border-l-violet-500 pl-2">
                    <span className="text-muted-foreground">Profit Pool</span>
                    <span className="font-semibold tabular-nums">{formatZAR(pool)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All-time trend chart */}
          {isAllTime && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-blue-600" />
                  Monthly Performance Trend
                </CardTitle>
                <CardDescription>Revenue, expenses, and profit across all closed months.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ChartContainer config={chartConfig} className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPool" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
                      <Area type="monotone" dataKey="profitPool" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPool)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>

                <div className="flex justify-center items-center gap-6 mt-4 text-xs font-semibold">
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
                    <span className="text-zinc-900 dark:text-zinc-100">Profit</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
