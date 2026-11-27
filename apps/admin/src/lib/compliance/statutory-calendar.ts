/**
 * Statutory SARS & CIPC compliance calendar for South African (Pty) Ltd companies
 * with a February financial year-end (1 March – 28/29 February).
 *
 * Pure date math — zero DB queries, links to `/finance/projections?tab=tax` for SBC tax figures.
 */

export type StatutoryAuthority = 'SARS' | 'CIPC';
export type StatutorySeverity = 'overdue' | 'critical' | 'upcoming' | 'ok';

export interface StatutoryDeadline {
  id: string;
  title: string;
  authority: StatutoryAuthority;
  dueDate: string; // YYYY-MM-DD
  daysLeft: number;
  severity: StatutorySeverity;
  description: string;
  actionHref: string;
  actionLabel: string;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function febLastDay(year: number): string {
  return `${year}-02-${isLeapYear(year) ? '29' : '28'}`;
}

/**
 * SARS requires provisional tax payments falling on a Saturday or Sunday
 * to be made on the preceding business day (Friday).
 */
function toPrecedingBusinessDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0 = Sun, 6 = Sat
  if (dow === 6) dt.setUTCDate(dt.getUTCDate() - 1);
  else if (dow === 0) dt.setUTCDate(dt.getUTCDate() - 2);
  return dt.toISOString().slice(0, 10);
}

function diffDaysISO(targetDateStr: string, todayStr: string): number {
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [ny, nm, nd] = todayStr.split('-').map(Number);
  if (!ty || !tm || !td || !ny || !nm || !nd) return 0;
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(ny, nm - 1, nd)) / 86_400_000);
}

function classifySeverity(daysLeft: number): StatutorySeverity {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 14) return 'critical';
  if (daysLeft <= 60) return 'upcoming';
  return 'ok';
}

/**
 * Returns the next occurrence of a fixed annual month/day on or after `todayStr`.
 */
function nextAnnualDate(
  month: number,
  dayOrFebEnd: number | 'feb_end',
  todayStr: string,
  adjustToBusinessDay = false,
): string {
  const [y] = todayStr.split('-').map(Number);
  const year = y || 2026;

  const makeDate = (yr: number) => {
    const raw =
      dayOrFebEnd === 'feb_end'
        ? febLastDay(yr)
        : `${yr}-${String(month).padStart(2, '0')}-${String(dayOrFebEnd).padStart(2, '0')}`;
    return adjustToBusinessDay ? toPrecedingBusinessDay(raw) : raw;
  };

  const thisYearDate = makeDate(year);
  return thisYearDate >= todayStr ? thisYearDate : makeDate(year + 1);
}

/**
 * Computes upcoming SARS & CIPC statutory deadlines relative to `todayStr` (YYYY-MM-DD).
 * @param todayStr ISO date string in SAST (YYYY-MM-DD)
 * @param cipcAnniversaryMonth Registration anniversary month (1–12), defaults to 3 (March)
 */
export function getStatutoryDeadlines(
  todayStr: string,
  cipcAnniversaryMonth = 3,
): StatutoryDeadline[] {
  const irp6FirstDate = nextAnnualDate(8, 31, todayStr, true);
  const irp6SecondDate = nextAnnualDate(2, 'feb_end', todayStr, true);
  // ITR14 is due within 12 months of the February FY-end (i.e. next Feb 28/29)
  const itr14Date = nextAnnualDate(2, 'feb_end', todayStr, false);

  // CIPC Annual Return & Beneficial Ownership due within 30 business days of registration anniversary month
  const cipcMonth = Math.min(Math.max(1, cipcAnniversaryMonth), 12);
  const [currY] = todayStr.split('-').map(Number);
  const baseYear = currY || 2026;
  const lastDayOfCipcMonth = (yr: number) =>
    new Date(Date.UTC(yr, cipcMonth, 0)).toISOString().slice(0, 10);
  const cipcDate =
    lastDayOfCipcMonth(baseYear) >= todayStr
      ? lastDayOfCipcMonth(baseYear)
      : lastDayOfCipcMonth(baseYear + 1);

  const items: Array<Omit<StatutoryDeadline, 'daysLeft' | 'severity'>> = [
    {
      id: 'sars-irp6-1',
      title: '1st Provisional Tax (IRP6)',
      authority: 'SARS',
      dueDate: irp6FirstDate,
      description: 'Mid-year provisional corporate tax estimate & payment (6 months into FY).',
      actionHref: '/finance/projections?tab=tax',
      actionLabel: 'Review Tax Reserve',
    },
    {
      id: 'sars-irp6-2',
      title: '2nd Provisional Tax (IRP6)',
      authority: 'SARS',
      dueDate: irp6SecondDate,
      description: 'Year-end provisional tax top-up to avoid SARS underestimation penalties.',
      actionHref: '/finance/projections?tab=tax',
      actionLabel: 'Check SBC Tax & 1030',
    },
    {
      id: 'sars-itr14',
      title: 'Annual Income Tax Return (ITR14)',
      authority: 'SARS',
      dueDate: itr14Date,
      description:
        'Annual corporate tax return due within 12 months of February financial year-end.',
      actionHref: '/insights/financial-reports',
      actionLabel: 'Open AFS Reports',
    },
    {
      id: 'cipc-annual-bo',
      title: 'CIPC Annual Return & Beneficial Ownership',
      authority: 'CIPC',
      dueDate: cipcDate,
      description: 'Mandatory annual CIPC return + Beneficial Ownership declaration filing.',
      actionHref: '/settings/organisation',
      actionLabel: 'Org Details',
    },
  ];

  return items
    .map((item) => {
      const daysLeft = diffDaysISO(item.dueDate, todayStr);
      return {
        ...item,
        daysLeft,
        severity: classifySeverity(daysLeft),
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
