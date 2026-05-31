import 'server-only';
import { getSnapshotByPeriod } from '@pmg/db';
import { fmtMonthYear } from '@/lib/format';

/** Get the current Date parts in South African Standard Time (SAST, UTC+2) */
export function getSASTParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1; // 0-indexed
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

export async function getMinAllowedDate(): Promise<string> {
  const { year, month, day } = getSASTParts();

  const currentMonthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  if (day > 5) return currentMonthStart;

  const prevDate = new Date(year, month - 1, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const snapshot = await getSnapshotByPeriod(prevPeriod);

  if (snapshot) return currentMonthStart;

  return `${prevPeriod}-01`;
}

export async function isPeriodClosed(date: string): Promise<boolean> {
  const period = date.slice(0, 7);
  const { year, month, day } = getSASTParts();
  const currentPeriod = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Future periods are always open
  if (period > currentPeriod) return false;

  if (period === currentPeriod) return false;

  const prevDate = new Date(year, month - 1, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  if (period < prevPeriod) return true;

  const snapshot = await getSnapshotByPeriod(period);
  if (snapshot) return true;

  if (day > 5) return true;

  return false;
}

export function getMinDateErrorMessage(minDate: string): string {
  const label = fmtMonthYear(minDate);
  return `Date must be ${label} or later - this financial period is closed.`;
}

export async function getClosedPeriodsFromDates(dates: string[]): Promise<string[]> {
  const uniquePeriods = [...new Set(dates.map((d) => d.slice(0, 7)))];

  const results = await Promise.all(
    uniquePeriods.map(async (period) => ({
      period,
      closed: await isPeriodClosed(period + '-01'),
    })),
  );

  return results.filter((r) => r.closed).map((r) => r.period);
}
