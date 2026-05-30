"use client";

import { useState } from "react";
import type { SnapshotRow } from "@pmg/db";
import { formatZAR, fmtMonthYear } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
} from "lucide-react";

interface SnapshotsCockpitProps {
  snapshots: SnapshotRow[];
}

export function SnapshotsCockpit({ snapshots }: SnapshotsCockpitProps) {
  const [selectedId, setSelectedId] = useState<string>(
    snapshots[0]?.id || ""
  );

  const selectedSnapshot = snapshots.find((s) => s.id === selectedId);

  if (snapshots.length === 0 || !selectedSnapshot) {
    return (
      <div className="py-12 border border-dashed border-zinc-200 rounded-lg text-center bg-white dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">No monthly snapshots exist.</p>
      </div>
    );
  }

  const snap = selectedSnapshot;
  const rev = Number(snap.revenue) || 0;
  const exp = Number(snap.expenses) || 0;
  const pmg = Number(snap.pmgShare) || 0;
  const pool = Number(snap.profitPool) || 0;

  // Level 1 percentage splits of revenue
  const pmgPct = rev > 0 ? (pmg / rev) * 100 : 20;
  const expPct = rev > 0 ? (exp / rev) * 100 : 0;
  // If pool is negative, we show 0% for the split segment in the visual bar
  const poolPct = rev > 0 ? Math.max(0, (pool / rev) * 100) : 0;

  // Total calculated split percentage to adjust flex values if needed
  const isProfitable = pool > 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:items-start">
      {/* ── Left Sidebar (List of Months) ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Closed Periods ({snapshots.length})
          </span>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
            {snapshots.map((s) => {
              const isActive = s.id === selectedId;
              const sRev = Number(s.revenue) || 0;
              const sPool = Number(s.profitPool) || 0;
              const sIsProfitable = sPool > 0;

              return (
                <Card
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-l-[4px] hover:bg-muted/50 hover:translate-x-0.5",
                    isActive
                      ? "border-l-blue-600 border-foreground bg-muted font-medium"
                      : sIsProfitable
                      ? "border-l-emerald-500 border-border"
                      : "border-l-red-500 border-border"
                  )}
                >
                  <CardHeader className="p-3 flex flex-row items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold truncate text-foreground">
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
      </div>

      {/* ── Right Panel (Details Cockpit) ─────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:col-span-3">
        {/* Cockpit Header */}
        <Card className="border-t-[4px] border-t-blue-600">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Calendar className="size-3.5" />
              <span>Financial Overview</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mt-1 text-foreground">
              {fmtMonthYear(snap.period)} Snapshot
            </h3>
            <p className="text-xs text-muted-foreground">
              Calculated on a monthly basis. Figures locked on {new Date(snap.createdAt).toLocaleDateString()}.
            </p>
          </CardHeader>
        </Card>

        {/* Level 1 KPI Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Gross Revenue",
              value: formatZAR(rev),
              textColor: "text-emerald-600 dark:text-emerald-400",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
              icon: TrendingUp,
            },
            {
              label: "Operating Expenses",
              value: formatZAR(exp),
              textColor: "text-amber-600 dark:text-amber-400",
              bgColor: "bg-amber-50 dark:bg-amber-950/20",
              icon: TrendingDown,
            },
            {
              label: isProfitable ? "Profit Pool" : "Net Loss Pool",
              value: formatZAR(Math.abs(pool)) + (!isProfitable ? " CR" : ""),
              textColor: isProfitable
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
              bgColor: isProfitable
                ? "bg-emerald-50 dark:bg-emerald-950/20"
                : "bg-red-50 dark:bg-red-950/20",
              icon: isProfitable ? TrendingUp : TrendingDown,
            },
          ].map((k) => (
            <Card key={k.label} className={cn("overflow-hidden")}>
              <CardHeader className="p-4 flex flex-row items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
                  <span className={cn("text-lg font-bold tabular-nums tracking-tight", k.textColor)}>
                    {k.value}
                  </span>
                </div>
                <div className={cn("p-2 rounded-lg shrink-0", k.bgColor)}>
                  <k.icon className={cn("size-4", k.textColor)} />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Level 1 Visual Split Bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="size-4 text-blue-600" />
              Level 1 - Revenue Split (Gross)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Split bar container */}
            <div className="h-6 w-full rounded-lg overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
              {/* PMG Share (20%) */}
              <div
                className="bg-blue-600 transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold px-1"
                style={{ width: `${pmgPct}%` }}
                title={`PMG Contribution: ${pmgPct.toFixed(0)}%`}
              >
                {pmgPct >= 15 ? "PMG (20%)" : "PMG"}
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
      </div>
    </div>
  );
}
