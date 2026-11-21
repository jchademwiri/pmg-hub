'use client';

import * as React from 'react';
import { AlertTriangle, CalendarCheck2, HeartHandshake, Stethoscope } from 'lucide-react';
import type { LeaveEntry, LeaveSettings } from '@pmg/db';
import { computeLeaveBalances } from '@/lib/leave';
import { usePageHeader } from '@/components/navigation/page-header-context';
import { LeaveBalanceCards } from './leave-balance-cards';
import { LeaveEntryForm } from './leave-entry-form';
import { LeaveHistoryTable } from './leave-history-table';
import { SAPublicHolidaysSidebar } from './sa-holidays-sidebar';
import { LeaveSettingsDialog } from './leave-settings-dialog';
import { LeaveExportMenu } from './leave-export-menu';

interface LeaveWorkspaceProps {
  settings: LeaveSettings;
  entries: LeaveEntry[];
  todayDate: string;
}

export function LeaveWorkspace({ settings, entries, todayDate }: LeaveWorkspaceProps) {
  const summary = React.useMemo(
    () => computeLeaveBalances(settings, entries, todayDate),
    [settings, entries, todayDate],
  );

  const { setRightContent } = usePageHeader();

  // Push key live leave balances into TopNav right next to ThemeToggle
  React.useEffect(() => {
    const { annual, sick, family } = summary;
    const hasRisk = annual.atRiskOfForfeiture > 0;

    setRightContent(
      <div
        aria-label="Key leave balances"
        className="flex items-center gap-1.5 mr-1 text-xs font-medium tabular-nums"
      >
        <span
          title={`Annual Leave available now (+${annual.monthlyAccrual.toFixed(2)} d/mo)`}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-700 dark:text-emerald-300"
        >
          <CalendarCheck2 className="size-3 shrink-0" />
          <span className="hidden sm:inline">Annual</span>
          <strong className="font-semibold">{annual.availableNow.toFixed(2)}d</strong>
        </span>

        {hasRisk && (
          <span
            title={`At risk of forfeiture on ${annual.fyEndLabel} (cap ${annual.maxCarryOver} d)`}
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 sm:px-2.5 py-0.5 text-amber-800 dark:text-amber-200"
          >
            <AlertTriangle className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Risk</span>
            <strong className="font-semibold">{annual.atRiskOfForfeiture.toFixed(2)}d</strong>
          </span>
        )}

        <span
          title={`Sick Leave remaining (${sick.cycleLabel})`}
          className="hidden md:inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-sky-700 dark:text-sky-300"
        >
          <Stethoscope className="size-3 shrink-0" />
          <span>Sick</span>
          <strong className="font-semibold">{sick.remaining}d</strong>
        </span>

        <span
          title={`Family Responsibility remaining (Resets ${family.nextResetLabel})`}
          className={`hidden lg:inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 ${
            family.remaining === 0
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
          }`}
        >
          <HeartHandshake className="size-3 shrink-0" />
          <span>Family</span>
          <strong className="font-semibold">{family.remaining}d</strong>
        </span>
      </div>,
    );

    return () => setRightContent(null);
  }, [summary, setRightContent]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Page Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 border-b border-border/50 pb-3.5 sm:pb-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            Personal Leave Tracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track annual accrual, February 28 carry-over risk, BCEA sick &amp; family leave, and SA
            public holidays.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LeaveExportMenu entries={entries} todayDate={todayDate} />
          <LeaveSettingsDialog settings={settings} />
        </div>
      </div>

      {/* 2-Column Desktop Split (8 cols primary left / 4 cols sticky right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6 min-w-0">
          <LeaveBalanceCards summary={summary} />
          <LeaveEntryForm todayDate={todayDate} />
          <LeaveHistoryTable entries={entries} todayDate={todayDate} />
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-20 min-w-0">
          <SAPublicHolidaysSidebar todayDate={todayDate} />
        </aside>
      </div>
    </div>
  );
}
