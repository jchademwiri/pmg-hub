import { describe, it, expect } from 'vitest';
import {
  buildLeaveProofKey,
  buildLeaveReportCsv,
  buildLeaveReportData,
  calculateWorkingDays,
  canMarkEntryTaken,
  computeEasterSunday,
  computeLeaveBalances,
  formatFileSize,
  getFinancialYearRange,
  getNextAvailableWorkingDay,
  getSAPublicHolidays,
  getUpcomingSAPublicHolidays,
  inferLeaveStatusFromDates,
  isEntryInProgress,
  isValidLeaveProofKey,
  validateAutoLeaveDates,
  validateLeaveDates,
} from '../lib/leave';

const BASELINE_SETTINGS = {
  anchorDate: '2026-10-31',
  annualOpeningBalance: '16.50',
  annualMonthlyAccrual: '1.75',
  annualMaxCarryOver: 5,
  sickCycleStartDate: '2025-01-01',
  sickCycleEntitlement: 30,
  sickOpeningBalance: 25,
  familyOpeningBalance: 0,
  familyAnnualEntitlement: 3,
  familyResetMonth: 1,
};

describe('SA Public Holidays', () => {
  it('computes Easter Sunday accurately for 2026 and 2027', () => {
    expect(computeEasterSunday(2026)).toBe('2026-04-05');
    expect(computeEasterSunday(2027)).toBe('2027-03-28');
  });

  it('includes all 12 statutory holidays and Sunday-to-Monday observance for 2026', () => {
    const holidays2026 = getSAPublicHolidays(2026);
    const byDate = new Map(holidays2026.map((h) => [h.date, h]));

    expect(byDate.get('2026-04-03')?.name).toBe('Good Friday');
    expect(byDate.get('2026-04-06')?.name).toBe('Family Day');
    // 9 Aug 2026 is Sunday -> Monday 10 Aug 2026 observed
    expect(byDate.get('2026-08-09')?.name).toBe("National Women's Day");
    expect(byDate.get('2026-08-10')?.name).toBe("National Women's Day (Observed)");
    expect(byDate.get('2026-08-10')?.isObserved).toBe(true);
    // Bridge hints on Tue/Thu holidays
    expect(byDate.get('2026-06-16')?.isBridgeable).toBe(true); // Tuesday
    expect(byDate.get('2026-09-24')?.isBridgeable).toBe(true); // Thursday
    expect(byDate.get('2026-12-16')?.isBridgeable).toBe(false); // Wednesday
  });

  it('applies Sunday observance in 2027 (Human Rights Day & Day of Goodwill)', () => {
    const holidays2027 = getSAPublicHolidays(2027);
    const byDate = new Map(holidays2027.map((h) => [h.date, h]));

    expect(byDate.get('2027-03-22')?.name).toBe('Human Rights Day (Observed)');
    expect(byDate.get('2027-12-27')?.name).toBe('Day of Goodwill (Observed)');
    expect(byDate.get('2027-04-27')?.isBridgeable).toBe(true); // Tuesday
    expect(byDate.get('2027-12-16')?.isBridgeable).toBe(true); // Thursday
  });

  it('lists upcoming holidays starting from today across 2026–2027', () => {
    const upcoming = getUpcomingSAPublicHolidays('2026-11-20');
    expect(upcoming[0]?.date).toBe('2026-12-16');
    expect(upcoming[0]?.name).toBe('Day of Reconciliation');
    expect(upcoming.length).toBeGreaterThan(10);
  });
});

describe('calculateWorkingDays', () => {
  it('excludes 16 December 2026 (Day of Reconciliation) and lists it', () => {
    // Mon 14 Dec to Fri 18 Dec 2026 = 5 weekdays - 1 holiday (Wed 16 Dec) = 4 working days
    const res = calculateWorkingDays('2026-12-14', '2026-12-18');
    expect(res.workingDays).toBe(4);
    expect(res.weekendDays).toBe(0);
    expect(res.excludedHolidays).toHaveLength(1);
    expect(res.excludedHolidays[0]?.date).toBe('2026-12-16');
    expect(res.excludedHolidays[0]?.name).toBe('Day of Reconciliation');
  });

  it('returns 0 working days for a weekend-only or public-holiday-only range', () => {
    expect(calculateWorkingDays('2026-11-21', '2026-11-22').workingDays).toBe(0);
    expect(calculateWorkingDays('2026-12-16', '2026-12-16').workingDays).toBe(0);
  });

  it('excludes observed Monday holiday (10 Aug 2026)', () => {
    // Mon 10 Aug to Fri 14 Aug 2026 = 4 working days
    const res = calculateWorkingDays('2026-08-10', '2026-08-14');
    expect(res.workingDays).toBe(4);
    expect(res.excludedHolidays[0]?.date).toBe('2026-08-10');
  });
});

describe('computeLeaveBalances', () => {
  it('shows 18.25 Annual, 25 Sick, and 0 Family in November 2026 with baseline settings', () => {
    const summary = computeLeaveBalances(BASELINE_SETTINGS, [], '2026-11-20');
    expect(summary.annual.completedMonthsSinceAnchor).toBe(1);
    expect(summary.annual.availableNow).toBe(18.25);
    expect(summary.annual.fyEndDate).toBe('2027-02-28');
    // Dec, Jan, Feb = 3 remaining accrual months -> 18.25 + 5.25 = 23.50
    expect(summary.annual.remainingMonthsToFeb).toBe(3);
    expect(summary.annual.projectedFyEndBalance).toBe(23.5);
    // 23.50 - 5 cap = 18.50 at risk
    expect(summary.annual.atRiskOfForfeiture).toBe(18.5);

    expect(summary.sick.remaining).toBe(25);
    expect(summary.sick.takenInCycle).toBe(5);
    expect(summary.sick.cycleLabel).toBe('Jan 2025 – Dec 2027');

    expect(summary.family.remaining).toBe(0);
    expect(summary.family.takenCurrentYear).toBe(0);
    expect(summary.family.nextResetLabel).toBe('01 Jan 2027 (+3 d)');
  });

  it('protects post-Feb 28 PLANNED Annual leave from forfeiture without reducing the 5-day carry-over cap', () => {
    const entries = [
      {
        type: 'ANNUAL' as const,
        status: 'PLANNED' as const,
        startDate: '2027-03-01',
        endDate: '2027-03-05',
        daysCount: 5,
      },
    ];
    const summary = computeLeaveBalances(BASELINE_SETTINGS, entries, '2026-11-20');
    expect(summary.annual.fyPlannedDays).toBe(0);
    expect(summary.annual.postFebPlannedDays).toBe(5);
    expect(summary.annual.projectedFyEndBalance).toBe(23.5);
    // 23.50 - 5 cap - 5 post-Feb planned = 13.50
    expect(summary.annual.atRiskOfForfeiture).toBe(13.5);
  });

  it('splits a PLANNED Annual entry that spans 28 Feb 2027 accurately', () => {
    // Thu 25 Feb, Fri 26 Feb (2 FY days) + Mon 1 Mar, Tue 2 Mar (2 post-Feb days)
    const entries = [
      {
        type: 'ANNUAL' as const,
        status: 'PLANNED' as const,
        startDate: '2027-02-25',
        endDate: '2027-03-02',
        daysCount: 4,
      },
    ];
    const summary = computeLeaveBalances(BASELINE_SETTINGS, entries, '2026-11-20');
    expect(summary.annual.fyPlannedDays).toBe(2);
    expect(summary.annual.postFebPlannedDays).toBe(2);
    expect(summary.annual.projectedFyEndBalance).toBe(21.5);
    // 21.50 - 5 cap - 2 post-Feb = 14.50
    expect(summary.annual.atRiskOfForfeiture).toBe(14.5);
  });

  it('resets Family Responsibility balance to 3 days in 2027', () => {
    const summary = computeLeaveBalances(BASELINE_SETTINGS, [], '2027-01-05');
    expect(summary.family.remaining).toBe(3);
    expect(summary.family.nextResetLabel).toBe('01 Jan 2028 (+3 d)');
  });
});

describe('Temporal & Lifecycle Guards', () => {
  it('enforces strict future dates for PLANNED entries', () => {
    expect(validateLeaveDates('PLANNED', '2026-11-20', '2026-11-20', '2026-11-20').valid).toBe(
      false,
    );
    expect(validateLeaveDates('PLANNED', '2026-11-19', '2026-11-23', '2026-11-20').valid).toBe(
      false,
    );
    expect(validateLeaveDates('PLANNED', '2026-11-23', '2026-11-24', '2026-11-20').valid).toBe(
      true,
    );
  });

  it('enforces today or past dates for TAKEN entries', () => {
    expect(validateLeaveDates('TAKEN', '2026-11-23', '2026-11-24', '2026-11-20').valid).toBe(false);
    expect(validateLeaveDates('TAKEN', '2026-11-19', '2026-11-20', '2026-11-20').valid).toBe(true);
  });

  it('rejects entries with 0 working days', () => {
    const res = validateLeaveDates('PLANNED', '2026-12-16', '2026-12-16', '2026-11-20');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('0 working days');
  });

  it('only allows Mark Taken on PLANNED rows whose start_date <= today', () => {
    expect(canMarkEntryTaken({ status: 'PLANNED', startDate: '2026-11-21' }, '2026-11-20')).toBe(
      false,
    );
    expect(canMarkEntryTaken({ status: 'PLANNED', startDate: '2026-11-20' }, '2026-11-20')).toBe(
      true,
    );
    expect(canMarkEntryTaken({ status: 'PLANNED', startDate: '2026-11-18' }, '2026-11-20')).toBe(
      true,
    );
    expect(canMarkEntryTaken({ status: 'TAKEN', startDate: '2026-11-18' }, '2026-11-20')).toBe(
      false,
    );
  });

  it('auto-infers TAKEN for past/today ranges and PLANNED for future/ongoing ranges', () => {
    expect(inferLeaveStatusFromDates('2026-11-18', '2026-11-20', '2026-11-20')).toBe('TAKEN');
    expect(inferLeaveStatusFromDates('2026-11-23', '2026-11-25', '2026-11-20')).toBe('PLANNED');
    expect(inferLeaveStatusFromDates('2026-11-19', '2026-11-24', '2026-11-20')).toBe('PLANNED');

    const ongoing = validateAutoLeaveDates('2026-11-19', '2026-11-24', '2026-11-20');
    expect(ongoing.valid).toBe(true);
    expect(ongoing.inferredStatus).toBe('PLANNED');
    expect(ongoing.isOngoing).toBe(true);
  });

  it('marks PLANNED entries spanning today as In Progress', () => {
    expect(
      isEntryInProgress(
        { status: 'PLANNED', startDate: '2026-11-19', endDate: '2026-11-24' },
        '2026-11-20',
      ),
    ).toBe(true);
    expect(
      isEntryInProgress(
        { status: 'PLANNED', startDate: '2026-11-23', endDate: '2026-11-25' },
        '2026-11-20',
      ),
    ).toBe(false);
    expect(
      isEntryInProgress(
        { status: 'TAKEN', startDate: '2026-11-19', endDate: '2026-11-24' },
        '2026-11-20',
      ),
    ).toBe(false);
  });
});

describe('Leave Proof R2 Path & Validation Helpers', () => {
  it('builds a chronologically sortable R2 key with year and lowercase month name', () => {
    const key = buildLeaveProofKey(
      '2026-12-16',
      14,
      'Signed Leave Form (Final).pdf',
      1795233600000,
    );
    expect(key).toBe(
      'leave-proofs/2026/12-december/14/1795233600000-Signed_Leave_Form__Final_.pdf',
    );

    const marKey = buildLeaveProofKey('2027-03-05', 21, 'doctor-note.jpg', 1804032000000);
    expect(marKey).toBe('leave-proofs/2027/03-march/21/1804032000000-doctor-note.jpg');
  });

  it('rejects path traversal and non-leave-proofs prefixes', () => {
    expect(isValidLeaveProofKey('leave-proofs/2026/12-december/14/123-form.pdf')).toBe(true);
    expect(isValidLeaveProofKey('leave-proofs/../receipts/secret.pdf')).toBe(false);
    expect(isValidLeaveProofKey('receipts/123-file.pdf')).toBe(false);
  });

  it('formats file sizes cleanly', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('finds the next available working day skipping weekends and SA public holidays', () => {
    // Saturday 21 Nov 2026 -> Monday 23 Nov 2026
    expect(getNextAvailableWorkingDay('2026-11-21')).toBe('2026-11-23');
    // Thursday 24 Dec 2026 -> skips Fri 25 (Christmas), Sat 26, Sun 27 -> Mon 28 Dec 2026
    expect(getNextAvailableWorkingDay('2026-12-24')).toBe('2026-12-28');
    // Saturday 31 Oct 2026 -> Monday 2 Nov 2026 (next month)
    expect(getNextAvailableWorkingDay('2026-10-31')).toBe('2026-11-02');
  });
});

describe('Financial Year Leave Report & CSV Builder', () => {
  it('computes South African FY bounds including leap years', () => {
    const fy27 = getFinancialYearRange(2027);
    expect(fy27.fyStartDate).toBe('2026-03-01');
    expect(fy27.fyEndDate).toBe('2027-02-28');
    expect(fy27.label).toBe('FY 2026/27');
    expect(fy27.slug).toBe('FY2026-27');

    const fy28 = getFinancialYearRange(2028);
    expect(fy28.fyStartDate).toBe('2027-03-01');
    expect(fy28.fyEndDate).toBe('2028-02-29');
  });

  it('filters to the active FY, respects taken scope, sorts chronologically, and totals by type', () => {
    const entries = [
      {
        id: 2,
        type: 'ANNUAL' as const,
        status: 'PLANNED' as const,
        startDate: '2026-12-14',
        endDate: '2026-12-18',
        daysCount: 4,
        notes: 'Festive, "family" break',
        proofFileName: null,
      },
      {
        id: 1,
        type: 'SICK' as const,
        status: 'TAKEN' as const,
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        daysCount: 2,
        notes: 'Flu',
        proofFileName: 'dr-note.pdf',
      },
      {
        id: 3,
        type: 'ANNUAL' as const,
        status: 'PLANNED' as const,
        startDate: '2027-03-04',
        endDate: '2027-03-05',
        daysCount: 2,
        notes: 'Next FY trip',
        proofFileName: null,
      },
    ];

    const fullReport = buildLeaveReportData(
      { ...BASELINE_SETTINGS, employmentStartDate: '2022-01-01' },
      entries,
      { fyEndYear: 2027, scope: 'all', todayDate: '2026-11-21' },
    );

    expect(fullReport.rows).toHaveLength(2);
    expect(fullReport.rows[0]?.id).toBe(1); // chronological oldest -> newest
    expect(fullReport.rows[1]?.id).toBe(2);
    expect(fullReport.rows[1]?.excludedHolidays[0]?.name).toBe('Day of Reconciliation');
    expect(fullReport.grandTotalTaken).toBe(2);
    expect(fullReport.grandTotalPlanned).toBe(4);
    expect(fullReport.grandTotalDays).toBe(6);

    const takenOnly = buildLeaveReportData(
      { ...BASELINE_SETTINGS, employmentStartDate: '2022-01-01' },
      entries,
      { fyEndYear: 2027, scope: 'taken', todayDate: '2026-11-21' },
    );
    expect(takenOnly.rows).toHaveLength(1);
    expect(takenOnly.grandTotalDays).toBe(2);

    const csv = buildLeaveReportCsv(fullReport);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Festive, ""family"" break"');
    expect(csv).toContain('Day of Reconciliation (2026-12-16)');
    expect(csv).toContain('dr-note.pdf');
  });
});
