'use client';

import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  HeartHandshake,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LeaveBalanceSummary } from '@/lib/leave';

interface LeaveBalanceCardsProps {
  summary: LeaveBalanceSummary;
}

export function LeaveBalanceCards({ summary }: LeaveBalanceCardsProps) {
  const { annual, sick, family } = summary;
  const hasForfeitureRisk = annual.atRiskOfForfeiture > 0;
  const sickLow = sick.remaining <= 5;
  const familyDepleted = family.remaining === 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
      {/* Annual Leave Card — full-width on mobile, 1 col on md+ */}
      <Card
        size="sm"
        className={`col-span-2 md:col-span-1 bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-3 border-t-2 ${
          hasForfeitureRisk ? 'border-t-amber-500' : 'border-t-emerald-500'
        }`}
      >
        <CardHeader className="px-4 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CalendarCheck2 className="size-3.5 shrink-0" />
              </span>
              Annual Leave
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[11px] font-mono tabular-nums px-1.5 py-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              +{annual.monthlyAccrual.toFixed(2)} d/mo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 flex flex-col gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
              {annual.availableNow.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">days available</span>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-2 text-center">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">FY Plan</p>
              <p className="text-xs font-semibold tabular-nums mt-0.5 text-blue-600 dark:text-blue-400">
                {annual.fyPlannedDays} d
              </p>
            </div>
            <div className="min-w-0 border-x border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Post-Feb</p>
              <p className="text-xs font-semibold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                {annual.postFebPlannedDays} d
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {annual.fyEndLabel}
              </p>
              <p
                className={`text-xs font-semibold tabular-nums mt-0.5 ${
                  hasForfeitureRisk
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {annual.projectedFyEndBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {hasForfeitureRisk ? (
            <div className="min-h-[3rem] flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/15 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong className="tabular-nums font-semibold">
                  {annual.atRiskOfForfeiture.toFixed(2)} d
                </strong>{' '}
                at risk on {annual.fyEndLabel} (cap {annual.maxCarryOver} d) unless booked in
                advance.
              </span>
            </div>
          ) : (
            <div className="min-h-[3rem] flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>No carry-over days at risk for {annual.fyEndLabel}.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sick Leave Card — side-by-side with Family on mobile */}
      <Card
        size="sm"
        className="bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-3 border-t-2 border-t-sky-500"
      >
        <CardHeader className="px-3.5 sm:px-5">
          <div className="flex items-center justify-between gap-1.5">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="inline-flex size-5 sm:size-6 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
                <Stethoscope className="size-3 sm:size-3.5 shrink-0" />
              </span>
              <span className="truncate">Sick Leave</span>
            </CardTitle>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[11px] px-1.5 py-0 border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 shrink-0"
            >
              BCEA 36-Mo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3.5 sm:px-5 flex flex-col gap-2.5 sm:gap-3">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight ${
                sickLow ? 'text-amber-600 dark:text-amber-400' : 'text-sky-700 dark:text-sky-400'
              }`}
            >
              {sick.remaining}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">
              / {sick.entitlement} left
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 rounded-md border bg-muted/30 p-1.5 sm:p-2 text-center">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                2026 Taken
              </p>
              <p className="text-xs font-semibold tabular-nums mt-0.5 text-foreground">
                {sick.takenInCycle} d
              </p>
            </div>
            <div className="border-l border-border/60 min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                Planned
              </p>
              <p className="text-xs font-semibold tabular-nums mt-0.5 text-blue-600 dark:text-blue-400">
                {sick.plannedDays} d
              </p>
            </div>
          </div>

          <div className="min-h-[2.25rem] sm:min-h-[3rem] flex items-center">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
              Cycle: {sick.cycleLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Family Responsibility Card — side-by-side with Sick on mobile */}
      <Card
        size="sm"
        className={`bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-3 border-t-2 ${
          familyDepleted ? 'border-t-rose-500/70' : 'border-t-violet-500'
        }`}
      >
        <CardHeader className="px-3.5 sm:px-5">
          <div className="flex items-center justify-between gap-1.5">
            <CardTitle className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="inline-flex size-5 sm:size-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0">
                <HeartHandshake className="size-3 sm:size-3.5 shrink-0" />
              </span>
              <span className="truncate">Family Resp.</span>
            </CardTitle>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[11px] px-1.5 py-0 border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 shrink-0"
            >
              {family.annualEntitlement} Days / Yr
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3.5 sm:px-5 flex flex-col gap-2.5 sm:gap-3">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span
              className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight ${
                familyDepleted
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-violet-700 dark:text-violet-400'
              }`}
            >
              {family.remaining}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">days left</span>
            {familyDepleted && (
              <Badge
                variant="outline"
                className="ml-auto text-[9px] sm:text-[10px] px-1.5 py-0 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              >
                Exhausted
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 rounded-md border bg-muted/30 p-1.5 sm:p-2 text-center">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {family.currentYear} Taken
              </p>
              <p className="text-xs font-semibold tabular-nums mt-0.5 text-foreground">
                {family.takenCurrentYear} d
              </p>
            </div>
            <div className="border-l border-border/60 min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {family.nextYear} Plan
              </p>
              <p className="text-xs font-semibold tabular-nums mt-0.5 text-blue-600 dark:text-blue-400">
                {family.nextYearPlanned} d
              </p>
            </div>
          </div>

          <div className="min-h-[2.25rem] sm:min-h-[3rem] flex items-center">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
              Resets:{' '}
              <span className="font-medium text-violet-700 dark:text-violet-300">
                {family.nextResetLabel}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
