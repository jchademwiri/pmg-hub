'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatLeaveDate,
  getNextAvailableWorkingDay,
  getSAPublicHolidays,
  isValidISODate,
  type SAPublicHoliday,
} from '@/lib/leave';

interface LeaveDatePickerProps {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  todayDate: string;
  minDate?: string;
  rangeStart?: string;
  rangeEnd?: string;
  placeholder?: string;
  className?: string;
  /** Set true when rendered inside a Radix Dialog so focus/pointer events stay interactive */
  inDialog?: boolean;
}

const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function parseYearMonth(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y!, month: m! - 1 }; // month 0-indexed
}

function toISO(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function LeaveDatePicker({
  id,
  value,
  onChange,
  todayDate,
  minDate,
  rangeStart,
  rangeEnd,
  placeholder = 'Select working day',
  className,
  inDialog = false,
}: LeaveDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const nextAvailableDate = React.useMemo(() => {
    if (minDate && isValidISODate(minDate)) {
      return getNextAvailableWorkingDay(minDate, true);
    }
    return getNextAvailableWorkingDay(todayDate, false);
  }, [minDate, todayDate]);

  const initialAnchor = isValidISODate(value) ? value : nextAvailableDate;

  const [view, setView] = React.useState(() => parseYearMonth(initialAnchor));

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const target = isValidISODate(value) ? value : nextAvailableDate;
      setView(parseYearMonth(target));
    }
    setOpen(nextOpen);
  };

  const { year, month } = view;

  const holidaysInYear = React.useMemo(() => getSAPublicHolidays(year), [year]);

  const holidayMap = React.useMemo(() => {
    const map = new Map<string, SAPublicHoliday>();
    for (const h of holidaysInYear) {
      map.set(h.date, h);
    }
    return map;
  }, [holidaysInYear]);

  const monthHolidays = React.useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    return holidaysInYear.filter((h) => h.date.startsWith(prefix));
  }, [holidaysInYear, year, month]);

  // Build Monday-first calendar cells for (year, month)
  const cells = React.useMemo(() => {
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;

    const list: Array<{
      iso: string;
      day: number;
      isWeekend: boolean;
      holiday?: SAPublicHoliday;
      isBeforeMin: boolean;
    } | null> = [];

    for (let i = 0; i < leadingBlanks; i++) {
      list.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toISO(year, month, day);
      const dow = new Date(Date.UTC(year, month, day)).getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const holiday = holidayMap.get(iso);
      const isBeforeMin = Boolean(minDate && iso < minDate);
      list.push({ iso, day, isWeekend, holiday, isBeforeMin });
    }

    return list;
  }, [year, month, holidayMap, minDate]);

  const goPrevMonth = () => {
    setView((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 },
    );
  };

  const goNextMonth = () => {
    setView((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 },
    );
  };

  const handleSelect = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const displayLabel = isValidISODate(value) ? formatLeaveDate(value) : null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={inDialog}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-between font-normal px-3 text-left tabular-nums',
            !displayLabel && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{displayLabel ?? placeholder}</span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground ml-2" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[18.5rem] p-3" align="start">
        {/* Month / Year Navigation */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className="size-7"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="text-xs font-semibold text-foreground select-none">
            {MONTH_NAMES[month]} {year}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goNextMonth}
            aria-label="Next month"
            className="size-7"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Weekday Header Row (Mon–Sun) */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_HEADERS.map((wd, idx) => (
            <div
              key={wd}
              className={cn(
                'text-center text-[10px] font-medium py-1 select-none',
                idx >= 5 ? 'text-muted-foreground/50' : 'text-muted-foreground',
              )}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`blank-${idx}`} className="h-8" />;
            }

            const disabled = cell.isWeekend || Boolean(cell.holiday) || cell.isBeforeMin;
            const isSelected = cell.iso === value;
            const isNextAvailable = cell.iso === nextAvailableDate;
            const isInRange = Boolean(
              rangeStart &&
              rangeEnd &&
              rangeStart <= rangeEnd &&
              cell.iso >= rangeStart &&
              cell.iso <= rangeEnd &&
              !cell.isWeekend &&
              !cell.holiday,
            );

            const tooltip = cell.holiday
              ? `${cell.holiday.name} (SA Public Holiday — disabled)`
              : cell.isWeekend
                ? 'Weekend (non-working day)'
                : cell.isBeforeMin
                  ? 'Before start date'
                  : isNextAvailable && !value
                    ? `${formatLeaveDate(cell.iso)} (Next available working day)`
                    : formatLeaveDate(cell.iso);

            return (
              <button
                key={cell.iso}
                type="button"
                disabled={disabled}
                title={tooltip}
                onClick={() => handleSelect(cell.iso)}
                className={cn(
                  'relative h-8 w-full rounded-md text-xs tabular-nums flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  // Disabled states
                  cell.holiday &&
                    'bg-amber-500/10 text-amber-600/75 dark:text-amber-400/75 cursor-not-allowed',
                  !cell.holiday &&
                    cell.isWeekend &&
                    'text-muted-foreground/35 bg-muted/20 cursor-not-allowed',
                  !cell.holiday &&
                    !cell.isWeekend &&
                    cell.isBeforeMin &&
                    'text-muted-foreground/35 cursor-not-allowed',
                  // Interactive states
                  !disabled && 'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                  !disabled && isInRange && !isSelected && 'bg-primary/15 text-foreground',
                  !disabled &&
                    isSelected &&
                    'bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground',
                  isNextAvailable && !isSelected && !disabled && 'ring-1 ring-primary/60',
                )}
              >
                <span>{cell.day}</span>
                {cell.holiday && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 size-1 rounded-full bg-amber-500"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend + Holidays in Viewed Month */}
        <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-muted/60 border border-border/60" />
              Weekends disabled
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <span className="size-1.5 rounded-full bg-amber-500" />
              SA Holiday disabled
            </span>
          </div>

          {monthHolidays.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {monthHolidays.map((h) => (
                <span
                  key={`${h.date}-${h.name}`}
                  className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 text-[10px] text-amber-800 dark:text-amber-200 leading-tight"
                >
                  <strong className="tabular-nums">{Number(h.date.slice(8, 10))}</strong>
                  <span>{h.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
