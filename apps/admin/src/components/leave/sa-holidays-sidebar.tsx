'use client';

import * as React from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  diffCalendarDays,
  formatLeaveDate,
  formatLongDateWithWeekday,
  getUpcomingSAPublicHolidays,
} from '@/lib/leave';

interface SAPublicHolidaysSidebarProps {
  todayDate: string;
}

const DEFAULT_VISIBLE_COUNT = 10;

export function SAPublicHolidaysSidebar({ todayDate }: SAPublicHolidaysSidebarProps) {
  const [showAll, setShowAll] = React.useState(false);

  const upcomingHolidays = React.useMemo(() => getUpcomingSAPublicHolidays(todayDate), [todayDate]);

  const nextHoliday = upcomingHolidays[0] ?? null;
  const daysUntilNext = nextHoliday ? diffCalendarDays(todayDate, nextHoliday.date) : null;
  const nextIsSoon = daysUntilNext !== null && daysUntilNext <= 14;

  const visibleHolidays = showAll
    ? upcomingHolidays
    : upcomingHolidays.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenCount = Math.max(0, upcomingHolidays.length - DEFAULT_VISIBLE_COUNT);

  const currentYear = Number(todayDate.slice(0, 4));
  const nextYear = currentYear + 1;

  return (
    <Card
      size="sm"
      className="bg-card border border-border/80 shadow-sm gap-3 border-t-2 border-t-indigo-500"
    >
      <CardHeader className="px-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="size-3.5 shrink-0" />
            </span>
            SA Public Holidays
          </CardTitle>
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
          >
            {currentYear}–{nextYear}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Non-deductible statutory holidays &amp; 4-day weekend bridge opportunities.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 sm:px-5 flex flex-col gap-3">
        {/* Next Upcoming Holiday Highlight Banner */}
        {nextHoliday && daysUntilNext !== null && (
          <div
            className={`rounded-lg border p-3 ${
              nextIsSoon
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-indigo-500/30 bg-indigo-500/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  nextIsSoon
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                    : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                <Sparkles className="size-3" />
                {daysUntilNext === 0
                  ? 'Today'
                  : daysUntilNext === 1
                    ? 'Tomorrow'
                    : `In ${daysUntilNext} days`}
              </span>
              {nextHoliday.isBridgeable && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                >
                  Bridge
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold mt-1.5 text-foreground">{nextHoliday.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatLongDateWithWeekday(nextHoliday.date)}
            </p>
          </div>
        )}

        {/* Holiday List (Natural Page Flow, No Internal Scrollbar) */}
        <ul className="divide-y divide-border/60">
          {visibleHolidays.map((holiday) => {
            const [dayNum, monthShort] = formatLeaveDate(holiday.date).split(' ');
            const yearShort = holiday.date.slice(0, 4);

            return (
              <li
                key={`${holiday.date}-${holiday.name}`}
                className={`py-2 px-1.5 -mx-1.5 rounded-md flex items-center justify-between gap-2.5 ${
                  holiday.isBridgeable ? 'bg-amber-500/[0.06]' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Compact Date Chip */}
                  <div
                    className={`flex flex-col items-center justify-center rounded-md border px-1.5 py-1 min-w-[2.75rem] shrink-0 text-center leading-none ${
                      holiday.isBridgeable
                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                        : holiday.isObserved
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200'
                          : 'border-border bg-muted/40 text-foreground'
                    }`}
                  >
                    <span className="text-xs font-bold tabular-nums">{dayNum}</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">
                      {monthShort}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug truncate">
                      {holiday.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {holiday.weekdayName.slice(0, 3)} · {yearShort}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {holiday.isObserved && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    >
                      Observed
                    </Badge>
                  )}
                  {holiday.isBridgeable && (
                    <Badge
                      variant="outline"
                      title="Take 1 leave day for a 4-day long weekend"
                      className="text-[10px] px-1.5 py-0 border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200 font-medium"
                    >
                      Bridge
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Progressive Disclosure Toggle */}
        {hiddenCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
            className="w-full h-10 sm:h-8 text-xs text-muted-foreground hover:text-foreground border-t rounded-t-none -mb-2"
          >
            {showAll ? (
              <>
                <ChevronUp className="size-3.5 mr-1" />
                Show Next {DEFAULT_VISIBLE_COUNT} Only
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5 mr-1" />
                Show All ({hiddenCount} more)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
