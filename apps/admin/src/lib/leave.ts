import type { LeaveEntry, LeaveSettings, LeaveStatus, LeaveType } from '@pmg/db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SAPublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  weekdayName: string;
  isObserved: boolean;
  isBridgeable: boolean; // Tue (2) or Thu (4) -> 1 leave day gives 4-day weekend
}

export interface WorkingDaysResult {
  workingDays: number;
  calendarDays: number;
  weekendDays: number;
  excludedHolidays: SAPublicHoliday[];
}

export interface AnnualBalanceSummary {
  openingBalance: number;
  monthlyAccrual: number;
  maxCarryOver: number;
  completedMonthsSinceAnchor: number;
  accruedSinceAnchor: number;
  takenDays: number;
  availableNow: number;
  fyEndDate: string;
  fyEndLabel: string;
  remainingMonthsToFeb: number;
  fyPlannedDays: number;
  postFebPlannedDays: number;
  projectedFyEndBalance: number;
  atRiskOfForfeiture: number;
}

export interface SickBalanceSummary {
  cycleStartDate: string;
  cycleEndDate: string;
  cycleLabel: string;
  entitlement: number;
  openingBalance: number;
  takenInCycle: number;
  plannedDays: number;
  remaining: number;
}

export interface FamilyBalanceSummary {
  currentYear: number;
  nextYear: number;
  annualEntitlement: number;
  takenCurrentYear: number;
  plannedCurrentYear: number;
  nextYearPlanned: number;
  remaining: number;
  nextResetLabel: string;
}

export interface LeaveBalanceSummary {
  todayDate: string;
  annual: AnnualBalanceSummary;
  sick: SickBalanceSummary;
  family: FamilyBalanceSummary;
}

export interface DateValidationResult {
  valid: boolean;
  error?: string;
  preview?: WorkingDaysResult;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const FULL_MONTH_NAMES = [
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Date Helpers (UTC + SAST) ─────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Returns today's calendar date (YYYY-MM-DD) in South African Standard Time
 * (Africa/Johannesburg, UTC+2) so Vercel UTC servers don't drift between
 * 00:00 and 02:00 SAST.
 */
export function getTodaySAST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isValidISODate(dateStr: string): boolean {
  if (!ISO_DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d;
}

function parseUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function formatUTCDate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addCalendarDays(dateStr: string, days: number): string {
  const dt = parseUTCDate(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatUTCDate(dt);
}

/**
 * Returns the next valid working day (Mon–Fri, excluding SA public holidays).
 * By default starts checking from the day strictly after `fromDate`; pass
 * `includeFromDate = true` to return `fromDate` itself if it is already a working day.
 */
export function getNextAvailableWorkingDay(
  fromDate: string,
  includeFromDate: boolean = false,
): string {
  let candidate = includeFromDate ? fromDate : addCalendarDays(fromDate, 1);
  // Guard loop (at most 14 iterations is more than enough to skip any holiday + weekend cluster)
  for (let i = 0; i < 31; i++) {
    const dt = parseUTCDate(candidate);
    const dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const yr = dt.getUTCFullYear();
      const isHoliday = getSAPublicHolidays(yr).some((h) => h.date === candidate);
      if (!isHoliday) return candidate;
    }
    candidate = addCalendarDays(candidate, 1);
  }
  return candidate;
}

export function diffCalendarDays(fromDate: string, toDate: string): number {
  const fromMs = parseUTCDate(fromDate).getTime();
  const toMs = parseUTCDate(toDate).getTime();
  return Math.round((toMs - fromMs) / 86_400_000);
}

export function formatLeaveDate(dateStr: string): string {
  if (!isValidISODate(dateStr)) return dateStr;
  const dt = parseUTCDate(dateStr);
  const day = String(dt.getUTCDate()).padStart(2, '0');
  const month = SHORT_MONTH_NAMES[dt.getUTCMonth()];
  const year = dt.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function formatLongDateWithWeekday(dateStr: string): string {
  if (!isValidISODate(dateStr)) return dateStr;
  const dt = parseUTCDate(dateStr);
  const weekday = WEEKDAY_NAMES[dt.getUTCDay()];
  const day = dt.getUTCDate();
  const month = FULL_MONTH_NAMES[dt.getUTCMonth()];
  const year = dt.getUTCFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

// ── South African Public Holidays (Public Holidays Act 36 of 1994) ────────────

/**
 * Anonymous Gregorian (Meeus/Jones/Butcher) algorithm for Easter Sunday.
 */
export function computeEasterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Mar, 4 = Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function makeHoliday(date: string, name: string, isObserved: boolean): SAPublicHoliday {
  const dt = parseUTCDate(date);
  const dayOfWeek = dt.getUTCDay();
  return {
    date,
    name,
    dayOfWeek,
    weekdayName: WEEKDAY_NAMES[dayOfWeek]!,
    isObserved,
    isBridgeable: dayOfWeek === 2 || dayOfWeek === 4,
  };
}

const holidayYearCache = new Map<number, SAPublicHoliday[]>();

/**
 * Computes all 12 South African statutory public holidays for a given calendar
 * year, plus Monday observance dates whenever a fixed holiday falls on a Sunday
 * (Public Holidays Act 36 of 1994, s 2(1)).
 */
export function getSAPublicHolidays(year: number): SAPublicHoliday[] {
  const cached = holidayYearCache.get(year);
  if (cached) return cached;

  const easterSunday = computeEasterSunday(year);
  const goodFriday = addCalendarDays(easterSunday, -2);
  const familyDay = addCalendarDays(easterSunday, 1);

  const fixed: Array<{ date: string; name: string }> = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-03-21`, name: 'Human Rights Day' },
    { date: `${year}-04-27`, name: 'Freedom Day' },
    { date: `${year}-05-01`, name: "Workers' Day" },
    { date: `${year}-06-16`, name: 'Youth Day' },
    { date: `${year}-08-09`, name: "National Women's Day" },
    { date: `${year}-09-24`, name: 'Heritage Day' },
    { date: `${year}-12-16`, name: 'Day of Reconciliation' },
    { date: `${year}-12-25`, name: 'Christmas Day' },
    { date: `${year}-12-26`, name: 'Day of Goodwill' },
  ];

  const baseHolidays: SAPublicHoliday[] = [
    ...fixed.map((h) => makeHoliday(h.date, h.name, false)),
    makeHoliday(goodFriday, 'Good Friday', false),
    makeHoliday(familyDay, 'Family Day', false),
  ];

  const existingDates = new Set(baseHolidays.map((h) => h.date));
  const observed: SAPublicHoliday[] = [];

  for (const h of fixed) {
    const dt = parseUTCDate(h.date);
    if (dt.getUTCDay() === 0) {
      const mondayDate = addCalendarDays(h.date, 1);
      if (!existingDates.has(mondayDate)) {
        observed.push(makeHoliday(mondayDate, `${h.name} (Observed)`, true));
        existingDates.add(mondayDate);
      }
    }
  }

  const all = [...baseHolidays, ...observed].sort((a, b) => a.date.localeCompare(b.date));
  holidayYearCache.set(year, all);
  return all;
}

/**
 * Returns upcoming SA public holidays on or after `todayDate`, spanning
 * `todayYear` and `todayYear + 1` (e.g., 2026–2027) by default.
 */
export function getUpcomingSAPublicHolidays(
  todayDate: string,
  years?: number[],
): SAPublicHoliday[] {
  const baseYear = Number(todayDate.slice(0, 4));
  const targetYears = years ?? [baseYear, baseYear + 1];
  const merged = targetYears.flatMap((y) => getSAPublicHolidays(y));
  return merged.filter((h) => h.date >= todayDate).sort((a, b) => a.date.localeCompare(b.date));
}

// ── Working Days Calculator ───────────────────────────────────────────────────

/**
 * Counts inclusive Mon–Fri working days between `startDate` and `endDate` (UTC),
 * excluding all South African public holidays (including Sunday-observed Mondays).
 */
export function calculateWorkingDays(startDate: string, endDate: string): WorkingDaysResult {
  if (!isValidISODate(startDate) || !isValidISODate(endDate) || endDate < startDate) {
    return { workingDays: 0, calendarDays: 0, weekendDays: 0, excludedHolidays: [] };
  }

  const holidayMapByYear = new Map<number, Map<string, SAPublicHoliday>>();
  const getHolidayForDate = (dateStr: string): SAPublicHoliday | undefined => {
    const yr = Number(dateStr.slice(0, 4));
    let yrMap = holidayMapByYear.get(yr);
    if (!yrMap) {
      yrMap = new Map(getSAPublicHolidays(yr).map((h) => [h.date, h]));
      holidayMapByYear.set(yr, yrMap);
    }
    return yrMap.get(dateStr);
  };

  let workingDays = 0;
  let calendarDays = 0;
  let weekendDays = 0;
  const excludedHolidays: SAPublicHoliday[] = [];

  const cur = parseUTCDate(startDate);
  const end = parseUTCDate(endDate);

  while (cur.getTime() <= end.getTime()) {
    calendarDays += 1;
    const dow = cur.getUTCDay();
    const iso = formatUTCDate(cur);

    if (dow === 0 || dow === 6) {
      weekendDays += 1;
    } else {
      const holiday = getHolidayForDate(iso);
      if (holiday) {
        excludedHolidays.push(holiday);
      } else {
        workingDays += 1;
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return { workingDays, calendarDays, weekendDays, excludedHolidays };
}

// ── Accrual, FY End & Balance Engine ──────────────────────────────────────────

/**
 * Number of completed 1st-of-month accrual credits since `anchorDate` (e.g.
 * 2026-10-31 -> 2026-11-21 = 1 month credited on 1 Nov 2026).
 */
export function getCompletedMonthsSinceAnchor(anchorDate: string, todayDate: string): number {
  const [ay, am] = anchorDate.split('-').map(Number);
  const [ty, tm] = todayDate.split('-').map(Number);
  return Math.max(0, (ty! - ay!) * 12 + (tm! - am!));
}

/**
 * Returns the financial year end date (`28 Feb` or `29 Feb` in leap years) for
 * the active `1 March – 28/29 February` cycle containing `todayDate`.
 */
export function getCurrentFYEndDate(todayDate: string): string {
  const [y, m] = todayDate.split('-').map(Number);
  const fyEndYear = m! >= 3 ? y! + 1 : y!;
  // Day 0 of March (month index 2) is the last day of February (28 or 29).
  const lastFeb = new Date(Date.UTC(fyEndYear, 2, 0));
  return formatUTCDate(lastFeb);
}

/**
 * Number of remaining 1st-of-month accrual credits strictly after `todayDate`
 * up to and including `fyEndDate`.
 */
export function getRemainingMonthsToFYEnd(todayDate: string, fyEndDate: string): number {
  const [ty, tm] = todayDate.split('-').map(Number);
  const [fy, fm] = fyEndDate.split('-').map(Number);
  return Math.max(0, (fy! - ty!) * 12 + (fm! - tm!));
}

function getSickCycleEndDate(cycleStartDate: string): string {
  const dt = parseUTCDate(cycleStartDate);
  // 36 months later minus 1 day (e.g. 2025-01-01 -> 2027-12-31)
  dt.setUTCMonth(dt.getUTCMonth() + 36);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return formatUTCDate(dt);
}

function formatMonthYear(dateStr: string): string {
  const dt = parseUTCDate(dateStr);
  return `${SHORT_MONTH_NAMES[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

export function computeLeaveBalances(
  settings: Pick<
    LeaveSettings,
    | 'anchorDate'
    | 'annualOpeningBalance'
    | 'annualMonthlyAccrual'
    | 'annualMaxCarryOver'
    | 'sickCycleStartDate'
    | 'sickCycleEntitlement'
    | 'sickOpeningBalance'
    | 'familyOpeningBalance'
    | 'familyAnnualEntitlement'
    | 'familyResetMonth'
  >,
  entries: Array<Pick<LeaveEntry, 'type' | 'status' | 'startDate' | 'endDate' | 'daysCount'>>,
  todayDate: string = getTodaySAST(),
): LeaveBalanceSummary {
  const activeEntries = entries.filter((e) => e.status !== 'CANCELLED');

  // ── 1. Annual Leave ─────────────────────────────────────────────────────────
  const openingBalance = Number(settings.annualOpeningBalance);
  const monthlyAccrual = Number(settings.annualMonthlyAccrual);
  const maxCarryOver = settings.annualMaxCarryOver;

  const completedMonthsSinceAnchor = getCompletedMonthsSinceAnchor(settings.anchorDate, todayDate);
  const accruedSinceAnchor = round2(completedMonthsSinceAnchor * monthlyAccrual);

  const takenAnnualDays = activeEntries
    .filter((e) => e.type === 'ANNUAL' && e.status === 'TAKEN')
    .reduce((sum, e) => sum + e.daysCount, 0);

  const availableNow = round2(openingBalance + accruedSinceAnchor - takenAnnualDays);

  const fyEndDate = getCurrentFYEndDate(todayDate);
  const fyEndDt = parseUTCDate(fyEndDate);
  const fyEndLabel = `${fyEndDt.getUTCDate()} ${SHORT_MONTH_NAMES[fyEndDt.getUTCMonth()]}`;
  const remainingMonthsToFeb = getRemainingMonthsToFYEnd(todayDate, fyEndDate);

  let fyPlannedDays = 0;
  let postFebPlannedDays = 0;

  for (const entry of activeEntries) {
    if (entry.type !== 'ANNUAL' || entry.status !== 'PLANNED') continue;
    if (entry.endDate <= fyEndDate) {
      fyPlannedDays += entry.daysCount;
    } else if (entry.startDate > fyEndDate) {
      postFebPlannedDays += entry.daysCount;
    } else {
      // Entry spans across Feb 28/29: split accurately by working days
      const beforePart = calculateWorkingDays(entry.startDate, fyEndDate).workingDays;
      const afterPart = calculateWorkingDays(
        addCalendarDays(fyEndDate, 1),
        entry.endDate,
      ).workingDays;
      fyPlannedDays += beforePart;
      postFebPlannedDays += afterPart;
    }
  }

  const projectedFyEndBalance = round2(
    availableNow + remainingMonthsToFeb * monthlyAccrual - fyPlannedDays,
  );
  const atRiskOfForfeiture = round2(
    Math.max(0, projectedFyEndBalance - maxCarryOver - postFebPlannedDays),
  );

  // ── 2. Sick Leave (SA BCEA 36-Month Cycle) ──────────────────────────────────
  const sickCycleEndDate = getSickCycleEndDate(settings.sickCycleStartDate);
  const sickCycleLabel = `${formatMonthYear(settings.sickCycleStartDate)} – ${formatMonthYear(sickCycleEndDate)}`;
  const priorTakenInCycle = Math.max(
    0,
    settings.sickCycleEntitlement - settings.sickOpeningBalance,
  );

  const takenSickSinceAnchor = activeEntries
    .filter((e) => e.type === 'SICK' && e.status === 'TAKEN')
    .reduce((sum, e) => sum + e.daysCount, 0);

  const plannedSickDays = activeEntries
    .filter((e) => e.type === 'SICK' && e.status === 'PLANNED')
    .reduce((sum, e) => sum + e.daysCount, 0);

  const sickRemaining = Math.max(0, settings.sickOpeningBalance - takenSickSinceAnchor);
  const sickTakenInCycle = priorTakenInCycle + takenSickSinceAnchor;

  // ── 3. Family Responsibility Leave (Annual Reset) ───────────────────────────
  const anchorYear = Number(settings.anchorDate.slice(0, 4));
  const currentYear = Number(todayDate.slice(0, 4));
  const nextYear = currentYear + 1;
  const resetMonthIndex = Math.min(12, Math.max(1, settings.familyResetMonth)) - 1;

  const takenFamilyCurrentYear = activeEntries
    .filter(
      (e) =>
        e.type === 'FAMILY_RESPONSIBILITY' &&
        e.status === 'TAKEN' &&
        Number(e.startDate.slice(0, 4)) === currentYear,
    )
    .reduce((sum, e) => sum + e.daysCount, 0);

  const plannedFamilyCurrentYear = activeEntries
    .filter(
      (e) =>
        e.type === 'FAMILY_RESPONSIBILITY' &&
        e.status === 'PLANNED' &&
        Number(e.startDate.slice(0, 4)) === currentYear,
    )
    .reduce((sum, e) => sum + e.daysCount, 0);

  const nextYearPlannedFamily = activeEntries
    .filter(
      (e) =>
        e.type === 'FAMILY_RESPONSIBILITY' &&
        e.status === 'PLANNED' &&
        Number(e.startDate.slice(0, 4)) === nextYear,
    )
    .reduce((sum, e) => sum + e.daysCount, 0);

  const familyBaseAllowance =
    currentYear === anchorYear ? settings.familyOpeningBalance : settings.familyAnnualEntitlement;
  const familyRemaining = Math.max(0, familyBaseAllowance - takenFamilyCurrentYear);
  const nextResetLabel = `01 ${SHORT_MONTH_NAMES[resetMonthIndex]} ${nextYear} (+${settings.familyAnnualEntitlement} d)`;

  return {
    todayDate,
    annual: {
      openingBalance,
      monthlyAccrual,
      maxCarryOver,
      completedMonthsSinceAnchor,
      accruedSinceAnchor,
      takenDays: takenAnnualDays,
      availableNow,
      fyEndDate,
      fyEndLabel,
      remainingMonthsToFeb,
      fyPlannedDays,
      postFebPlannedDays,
      projectedFyEndBalance,
      atRiskOfForfeiture,
    },
    sick: {
      cycleStartDate: settings.sickCycleStartDate,
      cycleEndDate: sickCycleEndDate,
      cycleLabel: sickCycleLabel,
      entitlement: settings.sickCycleEntitlement,
      openingBalance: settings.sickOpeningBalance,
      takenInCycle: sickTakenInCycle,
      plannedDays: plannedSickDays,
      remaining: sickRemaining,
    },
    family: {
      currentYear,
      nextYear,
      annualEntitlement: settings.familyAnnualEntitlement,
      takenCurrentYear: takenFamilyCurrentYear,
      plannedCurrentYear: plannedFamilyCurrentYear,
      nextYearPlanned: nextYearPlannedFamily,
      remaining: familyRemaining,
      nextResetLabel,
    },
  };
}

// ── Temporal & Lifecycle Validation Guards ────────────────────────────────────

export function validateLeaveDates(
  status: Extract<LeaveStatus, 'PLANNED' | 'TAKEN'>,
  startDate: string,
  endDate: string,
  todayDate: string = getTodaySAST(),
): DateValidationResult {
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    return { valid: false, error: 'Please select valid start and end dates.' };
  }

  if (endDate < startDate) {
    return { valid: false, error: 'End date must be on or after start date.' };
  }

  if (status === 'PLANNED') {
    if (startDate <= todayDate || endDate <= todayDate) {
      return {
        valid: false,
        error: 'Planned leave requires future dates strictly after today.',
      };
    }
  } else if (status === 'TAKEN') {
    if (startDate > todayDate || endDate > todayDate) {
      return {
        valid: false,
        error: 'Taken leave can only be logged for today or past dates.',
      };
    }
  }

  const preview = calculateWorkingDays(startDate, endDate);
  if (preview.workingDays < 1) {
    return {
      valid: false,
      error: 'Selected range contains 0 working days (weekends and/or SA public holidays only).',
      preview,
    };
  }

  return { valid: true, preview };
}

export interface AutoDateValidationResult extends DateValidationResult {
  inferredStatus?: Extract<LeaveStatus, 'PLANNED' | 'TAKEN'>;
  isOngoing?: boolean;
}

/**
 * Automatically infers whether a leave range is TAKEN or PLANNED based on today:
 * - Entire range on or before today (`endDate <= todayDate`) -> 'TAKEN'
 * - Future or ongoing range (`endDate > todayDate`) -> 'PLANNED'
 */
export function inferLeaveStatusFromDates(
  startDate: string,
  endDate: string,
  todayDate: string = getTodaySAST(),
): Extract<LeaveStatus, 'PLANNED' | 'TAKEN'> {
  return endDate <= todayDate ? 'TAKEN' : 'PLANNED';
}

/**
 * Unified validation that checks date validity, ordering, and >= 1 working day,
 * then automatically infers PLANNED vs TAKEN from the date range.
 */
export function validateAutoLeaveDates(
  startDate: string,
  endDate: string,
  todayDate: string = getTodaySAST(),
): AutoDateValidationResult {
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    return { valid: false, error: 'Please select valid start and end dates.' };
  }

  if (endDate < startDate) {
    return { valid: false, error: 'End date must be on or after start date.' };
  }

  const inferredStatus = inferLeaveStatusFromDates(startDate, endDate, todayDate);
  const isOngoing = startDate <= todayDate && endDate > todayDate;
  const preview = calculateWorkingDays(startDate, endDate);

  if (preview.workingDays < 1) {
    return {
      valid: false,
      inferredStatus,
      isOngoing,
      error: 'Selected range contains 0 working days (weekends and/or SA public holidays only).',
      preview,
    };
  }

  return { valid: true, inferredStatus, isOngoing, preview };
}

/**
 * Returns true when a PLANNED leave entry is currently active today
 * (`startDate <= todayDate && endDate >= todayDate`).
 */
export function isEntryInProgress(
  entry: Pick<LeaveEntry, 'status' | 'startDate' | 'endDate'>,
  todayDate: string = getTodaySAST(),
): boolean {
  return entry.status === 'PLANNED' && entry.startDate <= todayDate && entry.endDate >= todayDate;
}

/**
 * Date-gated eligibility rule: "Mark Taken" is only allowed on PLANNED rows
 * whose start_date is on or before today.
 */
export function canMarkEntryTaken(
  entry: Pick<LeaveEntry, 'status' | 'startDate'>,
  todayDate: string = getTodaySAST(),
): boolean {
  return entry.status === 'PLANNED' && entry.startDate <= todayDate;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: 'Annual Leave',
  SICK: 'Sick Leave',
  FAMILY_RESPONSIBILITY: 'Family Responsibility',
};

// ── Proof Document Path & Validation Helpers ──────────────────────────────────

export const MAX_LEAVE_PROOF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_LEAVE_PROOF_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

/**
 * Builds a private, chronologically sortable R2 object key with year + month name
 * derived from `startDate` (`YYYY-MM-DD`):
 * `leave-proofs/{year}/{MM}-{monthName}/{entryId}/{timestamp}-{cleanFileName}`
 */
export function buildLeaveProofKey(
  startDate: string,
  entryId: number,
  fileName: string,
  now: number = Date.now(),
): string {
  const safeDate = isValidISODate(startDate) ? startDate : getTodaySAST();
  const [yearStr, monthStr] = safeDate.split('-');
  const monthIdx = Math.min(12, Math.max(1, Number(monthStr))) - 1;
  const monthSlug = FULL_MONTH_NAMES[monthIdx]!.toLowerCase();
  const cleanFileName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_') || 'proof';

  return `leave-proofs/${yearStr}/${monthStr}-${monthSlug}/${entryId}/${now}-${cleanFileName}`;
}

export function isValidLeaveProofKey(key: string): boolean {
  const normalized = key.trim();
  return normalized.startsWith('leave-proofs/') && !normalized.includes('..');
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Financial Year Report & CSV Helpers ───────────────────────────────────────

export type LeaveReportScope = 'all' | 'taken';

export interface FinancialYearRange {
  fyEndYear: number;
  fyStartDate: string;
  fyEndDate: string;
  label: string; // e.g. "FY 2026/27"
  periodLabel: string; // e.g. "01 Mar 2026 – 28 Feb 2027"
  slug: string; // e.g. "FY2026-27"
}

export interface LeaveReportRow {
  id: number;
  type: LeaveType;
  typeLabel: string;
  status: LeaveStatus;
  displayStatus: 'Taken' | 'In Progress' | 'Planned';
  startDate: string;
  endDate: string;
  dateRangeLabel: string;
  daysCount: number;
  excludedHolidays: SAPublicHoliday[];
  proofFileName: string | null;
  notes: string | null;
}

export interface LeaveReportTypeTotals {
  takenDays: number;
  plannedDays: number;
  totalDays: number;
}

export interface LeaveReportData {
  employeeName: string;
  employmentStartDate: string;
  anchorDate: string;
  generatedDate: string;
  scope: LeaveReportScope;
  fy: FinancialYearRange;
  balances: LeaveBalanceSummary;
  rows: LeaveReportRow[];
  totalsByType: Record<LeaveType, LeaveReportTypeTotals>;
  grandTotalTaken: number;
  grandTotalPlanned: number;
  grandTotalDays: number;
}

/**
 * Returns the South African financial year bounds (`1 March – 28/29 February`)
 * ending in `fyEndYear` (leap-year safe).
 */
export function getFinancialYearRange(fyEndYear: number): FinancialYearRange {
  const startYear = fyEndYear - 1;
  const fyStartDate = `${startYear}-03-01`;
  const lastFeb = new Date(Date.UTC(fyEndYear, 2, 0));
  const fyEndDate = formatUTCDate(lastFeb);
  const shortEnd = String(fyEndYear).slice(-2);
  return {
    fyEndYear,
    fyStartDate,
    fyEndDate,
    label: `FY ${startYear}/${shortEnd}`,
    periodLabel: `${formatLeaveDate(fyStartDate)} – ${formatLeaveDate(fyEndDate)}`,
    slug: `FY${startYear}-${shortEnd}`,
  };
}

/**
 * Returns the financial year end-year (e.g. 2027 for `2026-11-21`) containing `dateStr`.
 */
export function getFYEndYearForDate(dateStr: string): number {
  const [y, m] = dateStr.split('-').map(Number);
  return m! >= 3 ? y! + 1 : y!;
}

/**
 * Returns selectable financial years sorted newest-first, always including the
 * active financial year plus any FY overlapped by logged entries.
 */
export function getAvailableLeaveFinancialYears(
  entries: Array<Pick<LeaveEntry, 'startDate' | 'endDate' | 'status'>>,
  todayDate: string = getTodaySAST(),
): FinancialYearRange[] {
  const years = new Set<number>([getFYEndYearForDate(todayDate)]);
  for (const e of entries) {
    if (e.status === 'CANCELLED') continue;
    years.add(getFYEndYearForDate(e.startDate));
    years.add(getFYEndYearForDate(e.endDate));
  }
  return Array.from(years)
    .sort((a, b) => b - a)
    .map(getFinancialYearRange);
}

export function buildLeaveReportData(
  settings: Pick<
    LeaveSettings,
    | 'employmentStartDate'
    | 'anchorDate'
    | 'annualOpeningBalance'
    | 'annualMonthlyAccrual'
    | 'annualMaxCarryOver'
    | 'sickCycleStartDate'
    | 'sickCycleEntitlement'
    | 'sickOpeningBalance'
    | 'familyOpeningBalance'
    | 'familyAnnualEntitlement'
    | 'familyResetMonth'
  >,
  entries: Array<
    Pick<
      LeaveEntry,
      'id' | 'type' | 'status' | 'startDate' | 'endDate' | 'daysCount' | 'notes' | 'proofFileName'
    >
  >,
  options: {
    fyEndYear?: number;
    scope?: LeaveReportScope;
    todayDate?: string;
    employeeName?: string;
  } = {},
): LeaveReportData {
  const todayDate = options.todayDate ?? getTodaySAST();
  const fyEndYear = options.fyEndYear ?? getFYEndYearForDate(todayDate);
  const scope: LeaveReportScope = options.scope ?? 'all';
  const fy = getFinancialYearRange(fyEndYear);
  const balances = computeLeaveBalances(settings, entries, todayDate);

  const filtered = entries
    .filter((e) => e.status !== 'CANCELLED')
    .filter((e) => e.startDate <= fy.fyEndDate && e.endDate >= fy.fyStartDate)
    .filter((e) => (scope === 'taken' ? e.status === 'TAKEN' : true))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id);

  const totalsByType: Record<LeaveType, LeaveReportTypeTotals> = {
    ANNUAL: { takenDays: 0, plannedDays: 0, totalDays: 0 },
    SICK: { takenDays: 0, plannedDays: 0, totalDays: 0 },
    FAMILY_RESPONSIBILITY: { takenDays: 0, plannedDays: 0, totalDays: 0 },
  };

  let grandTotalTaken = 0;
  let grandTotalPlanned = 0;

  const rows: LeaveReportRow[] = filtered.map((entry) => {
    const working = calculateWorkingDays(entry.startDate, entry.endDate);
    const displayStatus: LeaveReportRow['displayStatus'] =
      entry.status === 'TAKEN'
        ? 'Taken'
        : isEntryInProgress(entry, todayDate)
          ? 'In Progress'
          : 'Planned';

    const bucket = totalsByType[entry.type];
    if (entry.status === 'TAKEN') {
      bucket.takenDays += entry.daysCount;
      grandTotalTaken += entry.daysCount;
    } else {
      bucket.plannedDays += entry.daysCount;
      grandTotalPlanned += entry.daysCount;
    }
    bucket.totalDays += entry.daysCount;

    const dateRangeLabel =
      entry.startDate === entry.endDate
        ? formatLeaveDate(entry.startDate)
        : `${formatLeaveDate(entry.startDate)} – ${formatLeaveDate(entry.endDate)}`;

    return {
      id: entry.id,
      type: entry.type,
      typeLabel: LEAVE_TYPE_LABELS[entry.type],
      status: entry.status,
      displayStatus,
      startDate: entry.startDate,
      endDate: entry.endDate,
      dateRangeLabel,
      daysCount: entry.daysCount,
      excludedHolidays: working.excludedHolidays,
      proofFileName: entry.proofFileName ?? null,
      notes: entry.notes ?? null,
    };
  });

  return {
    employeeName: options.employeeName || 'Jacob Chademwiri',
    employmentStartDate: settings.employmentStartDate,
    anchorDate: settings.anchorDate,
    generatedDate: todayDate,
    scope,
    fy,
    balances,
    rows,
    totalsByType,
    grandTotalTaken,
    grandTotalPlanned,
    grandTotalDays: grandTotalTaken + grandTotalPlanned,
  };
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Generates a UTF-8 BOM CSV spreadsheet of the leave report (Excel-friendly).
 */
export function buildLeaveReportCsv(report: LeaveReportData): string {
  const headers = [
    'Start Date',
    'End Date',
    'Leave Type',
    'Status',
    'Working Days',
    'Excluded SA Holidays',
    'Proof Document',
    'Personal Notes',
  ];

  const rows = report.rows.map((r) => [
    r.startDate,
    r.endDate,
    r.typeLabel,
    r.displayStatus,
    r.daysCount,
    r.excludedHolidays.map((h) => `${h.name} (${h.date})`).join('; '),
    r.proofFileName ?? '',
    r.notes ?? '',
  ]);

  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];

  return '\uFEFF' + lines.join('\r\n');
}
