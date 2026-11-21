'use client';

import * as React from 'react';
import { CalendarPlus, History, Info, AlertCircle, Sparkles, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveType } from '@pmg/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createLeaveEntry } from '@/actions/leave';
import { formatLeaveDate, validateAutoLeaveDates } from '@/lib/leave';
import { LeaveDatePicker } from './leave-date-picker';

interface LeaveEntryFormProps {
  todayDate: string;
}

export function LeaveEntryForm({ todayDate }: LeaveEntryFormProps) {
  const [type, setType] = React.useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && (!endDate || endDate < val)) {
      setEndDate(val);
    }
  };

  const validation = React.useMemo(() => {
    if (!startDate || !endDate) return null;
    return validateAutoLeaveDates(startDate, endDate, todayDate);
  }, [startDate, endDate, todayDate]);

  const inferredStatus = validation?.inferredStatus;
  const isOngoing = Boolean(validation?.isOngoing);
  const canSubmit = Boolean(startDate && endDate && validation?.valid && !isPending);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const res = await createLeaveEntry({
        type,
        startDate,
        endDate,
        notes,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      const days = validation?.preview?.workingDays ?? 0;
      toast.success(
        inferredStatus === 'TAKEN'
          ? `Taken leave logged (${days} working ${days === 1 ? 'day' : 'days'}).`
          : `Planned leave logged (${days} working ${days === 1 ? 'day' : 'days'}).`,
      );
      setStartDate('');
      setEndDate('');
      setNotes('');
    });
  };

  return (
    <Card size="sm" className="bg-card border border-border/80 shadow-sm gap-4">
      <CardHeader className="px-4 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div>
            <CardTitle className="text-base">Log Leave Entry</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Pick any dates — past/today logs as Taken, future logs as Planned.
            </CardDescription>
          </div>

          {/* Auto-Detected Status Indicator */}
          <div className="self-start sm:self-auto">
            {inferredStatus === 'PLANNED' && isOngoing ? (
              <Badge
                variant="outline"
                className="gap-1.5 px-2.5 py-1 text-xs font-medium border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200"
              >
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                Auto: In Progress
              </Badge>
            ) : inferredStatus === 'PLANNED' ? (
              <Badge
                variant="outline"
                className="gap-1.5 px-2.5 py-1 text-xs font-medium border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300"
              >
                <CalendarPlus className="size-3.5" />
                Auto: Planned (Future)
              </Badge>
            ) : inferredStatus === 'TAKEN' ? (
              <Badge
                variant="outline"
                className="gap-1.5 px-2.5 py-1 text-xs font-medium border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              >
                <History className="size-3.5" />
                Auto: Taken (Back-Date)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1.5 px-2.5 py-1 text-xs font-normal text-muted-foreground"
              >
                <CalendarClock className="size-3.5" />
                Auto-detects Planned or Taken
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 sm:gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
              <Label htmlFor="leave-type" className="text-xs">
                Leave Type
              </Label>
              <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                <SelectTrigger id="leave-type" className="h-10 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Annual Leave
                    </span>
                  </SelectItem>
                  <SelectItem value="SICK">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-sky-500" />
                      Sick Leave
                    </span>
                  </SelectItem>
                  <SelectItem value="FAMILY_RESPONSIBILITY">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-violet-500" />
                      Family Responsibility
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <Label htmlFor="leave-start" className="text-xs">
                Start Date
              </Label>
              <LeaveDatePicker
                id="leave-start"
                value={startDate}
                onChange={handleStartDateChange}
                todayDate={todayDate}
                rangeStart={startDate}
                rangeEnd={endDate}
                placeholder="Start date"
                className="h-10 sm:h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <Label htmlFor="leave-end" className="text-xs">
                End Date
              </Label>
              <LeaveDatePicker
                id="leave-end"
                value={endDate}
                onChange={setEndDate}
                todayDate={todayDate}
                minDate={startDate || undefined}
                rangeStart={startDate}
                rangeEnd={endDate}
                placeholder="End date"
                className="h-10 sm:h-9"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="leave-notes" className="text-xs">
                Personal Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="leave-notes"
                className="h-10 sm:h-9"
                placeholder="e.g. Festive break, Manica Bridge trip, Flu recovery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </div>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={`h-10 sm:h-9 w-full sm:w-44 shrink-0 ${
                inferredStatus === 'TAKEN'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : inferredStatus === 'PLANNED'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : ''
              }`}
            >
              {isPending
                ? 'Saving...'
                : inferredStatus === 'TAKEN'
                  ? 'Log Taken Leave'
                  : inferredStatus === 'PLANNED'
                    ? 'Log Planned Leave'
                    : 'Log Leave'}
            </Button>
          </div>

          {/* Reserved-Height Working Days & Holiday Exclusion Preview (prevents vertical layout shift) */}
          <div
            aria-live="polite"
            className={`min-h-[3.5rem] flex items-center rounded-md border px-3 py-2 text-xs transition-colors ${
              !validation
                ? 'border-dashed border-border/70 bg-muted/20 text-muted-foreground'
                : validation.valid
                  ? inferredStatus === 'TAKEN'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground'
                    : 'border-blue-500/30 bg-blue-500/10 text-foreground'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            {!validation ? (
              <div className="flex items-center gap-2">
                <Info className="size-3.5 shrink-0 opacity-70" />
                <span>
                  Select a start and end date to preview working days and excluded SA public
                  holidays.
                </span>
              </div>
            ) : validation.valid && validation.preview ? (
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Info
                    className={`size-3.5 shrink-0 ${
                      inferredStatus === 'TAKEN'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                  <span>
                    Will log as{' '}
                    <strong
                      className={
                        inferredStatus === 'TAKEN'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-blue-700 dark:text-blue-300'
                      }
                    >
                      {inferredStatus === 'TAKEN' ? 'Taken' : 'Planned'}
                    </strong>{' '}
                    — deducts{' '}
                    <strong className="tabular-nums">
                      {validation.preview.workingDays}{' '}
                      {validation.preview.workingDays === 1 ? 'working day' : 'working days'}
                    </strong>{' '}
                    from {validation.preview.calendarDays} calendar{' '}
                    {validation.preview.calendarDays === 1 ? 'day' : 'days'}
                    {validation.preview.weekendDays > 0 &&
                      ` (${validation.preview.weekendDays} weekend ${
                        validation.preview.weekendDays === 1 ? 'day' : 'days'
                      } excluded)`}
                    .
                  </span>
                </div>
                {isOngoing && (
                  <p className="text-[11px] text-muted-foreground pl-5">
                    This range spans today — it will be logged as Planned and can be marked Taken
                    anytime.
                  </p>
                )}
                {validation.preview.excludedHolidays.length > 0 && (
                  <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                    <Sparkles className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      Excluded SA public{' '}
                      {validation.preview.excludedHolidays.length === 1 ? 'holiday' : 'holidays'}:{' '}
                      <strong>
                        {validation.preview.excludedHolidays
                          .map((h) => `${h.name} (${formatLeaveDate(h.date)})`)
                          .join(', ')}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{validation.error}</span>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
