import 'server-only';
import { getSnapshotByPeriod } from '@pmg/db';

export async function getMinAllowedDate(): Promise<string> {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();

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
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (period === currentPeriod) return false;

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  if (period < prevPeriod) return true;

  const snapshot = await getSnapshotByPeriod(period);
  if (snapshot) return true;

  const day = now.getDate();
  if (day > 5) return true;

  return false;
}

export function getMinDateErrorMessage(minDate: string): string {
  const [y, m] = minDate.split('-');
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-ZA', {
    month: 'long',
    year: 'numeric',
  });
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
