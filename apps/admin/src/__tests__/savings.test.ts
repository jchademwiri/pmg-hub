import { describe, it, expect } from 'vitest';
import {
  roundTarget,
  computeProgress,
  monthsBetween,
  computeSavingRate,
  computePayback,
  computePaybackWindows,
} from '@/lib/savings';

describe('roundTarget', () => {
  it('rounds a price up to the nearest R500', () => {
    expect(roundTarget(4295)).toBe(4500);
    expect(roundTarget(4501)).toBe(5000);
    expect(roundTarget(6115)).toBe(6500);
  });

  it('leaves an exact multiple alone', () => {
    expect(roundTarget(4500)).toBe(4500);
  });

  it('honours a custom step', () => {
    expect(roundTarget(4295, 1000)).toBe(5000);
    expect(roundTarget(4295, 100)).toBe(4300);
  });

  it('returns 0 for non-positive or non-finite input', () => {
    expect(roundTarget(0)).toBe(0);
    expect(roundTarget(-100)).toBe(0);
    expect(roundTarget(NaN)).toBe(0);
    expect(roundTarget(Infinity)).toBe(0);
  });
});

describe('computeProgress', () => {
  it('reports remaining and fraction', () => {
    const p = computeProgress(1500, 4500);
    expect(p.remaining).toBe(3000);
    expect(p.fraction).toBeCloseTo(1 / 3);
    expect(p.percent).toBeCloseTo(33.33, 1);
    expect(p.isFunded).toBe(false);
  });

  it('clamps the bar at 100% but reports the true percentage', () => {
    const p = computeProgress(5000, 4500);
    expect(p.fraction).toBe(1);
    expect(p.percent).toBeCloseTo(111.1, 1);
    expect(p.remaining).toBe(0);
    expect(p.isFunded).toBe(true);
  });

  it('does not divide by zero on a zero target', () => {
    const p = computeProgress(100, 0);
    expect(p.fraction).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.isFunded).toBe(false);
  });
});

describe('monthsBetween', () => {
  it('counts distinct calendar months inclusive, not elapsed months', () => {
    // 19 May -> 15 Aug is 2 months 27 days, which rounds to 3 and overstates a
    // monthly rate by a third. It touches 4 calendar months.
    expect(monthsBetween('2026-05-19', '2026-08-15')).toBe(4);
  });

  it('returns 1 for a single month', () => {
    expect(monthsBetween('2026-07-01', '2026-07-28')).toBe(1);
  });

  it('spans a year boundary', () => {
    expect(monthsBetween('2025-11-01', '2026-02-01')).toBe(4);
  });

  it('floors at 1 when dates are missing', () => {
    expect(monthsBetween(null, null)).toBe(1);
    expect(monthsBetween('2026-05-01', null)).toBe(1);
  });
});

describe('computeSavingRate', () => {
  it('projects a completion date from the observed rate', () => {
    // R2,000 over 4 months = R500/month; R2,500 remaining = 5 months.
    const r = computeSavingRate(2000, 4500, '2026-05-01', '2026-08-01', new Date('2026-08-16'));
    expect(r.perMonth).toBe(500);
    expect(r.monthsSaving).toBe(4);
    expect(r.monthsToTarget).toBe(5);
    expect(r.projectedDate).toBe('2027-01-16');
  });

  it('returns 0 months when already funded', () => {
    const r = computeSavingRate(4500, 4500, '2026-05-01', '2026-08-01');
    expect(r.monthsToTarget).toBe(0);
    expect(r.projectedDate).toBeNull();
  });

  it('returns null rather than Infinity when nothing is saved', () => {
    const r = computeSavingRate(0, 4500, null, null);
    expect(r.perMonth).toBe(0);
    expect(r.monthsToTarget).toBeNull();
    expect(r.projectedDate).toBeNull();
  });
});

describe('computePayback', () => {
  it('divides price by the monthly saving', () => {
    expect(computePayback(4295, 429).paybackMonths).toBeCloseTo(10.01, 1);
    expect(computePayback(4295, 712).paybackMonths).toBeCloseTo(6.03, 1);
  });

  it('subtracts running costs before dividing', () => {
    // R638/month spend, R138/month to run = R500 net saving.
    expect(computePayback(4500, 638, 138).paybackMonths).toBe(9);
  });

  it('returns null when running costs cancel out the saving', () => {
    expect(computePayback(4295, 400, 400).paybackMonths).toBeNull();
    expect(computePayback(4295, 400, 500).paybackMonths).toBeNull();
  });

  it('returns null on a zero price', () => {
    expect(computePayback(0, 400).paybackMonths).toBeNull();
  });
});

describe('computePaybackWindows', () => {
  // The measured scanning baseline: May-Aug 2026, R1,714 all-in.
  const monthly = [
    { month: '2026-05', total: 165 },
    { month: '2026-06', total: 125 },
    { month: '2026-07', total: 786 },
    { month: '2026-08', total: 638 }, // month in progress
  ];

  it('reproduces the measured baseline against the R4,295 printer', () => {
    const [allTime, last3, lastComplete] = computePaybackWindows(4295, monthly);

    // R1,714 / 4 months = R428.50
    expect(allTime!.monthlySpend).toBeCloseTo(428.5, 2);
    expect(allTime!.paybackMonths).toBeCloseTo(10.02, 1);

    // (125 + 786 + 638) / 3 = R516.33
    expect(last3!.monthlySpend).toBeCloseTo(516.33, 1);

    // July is the last COMPLETE month; August is still in progress.
    expect(lastComplete!.monthlySpend).toBe(786);
    expect(lastComplete!.paybackMonths).toBeCloseTo(5.46, 1);
  });

  it('excludes the in-progress month from the last-complete window', () => {
    const [, , lastComplete] = computePaybackWindows(4295, monthly);
    expect(lastComplete!.monthlySpend).not.toBe(638);
  });

  it('falls back to the only month when there is just one', () => {
    const [, , lastComplete] = computePaybackWindows(4295, [{ month: '2026-08', total: 638 }]);
    expect(lastComplete!.monthlySpend).toBe(638);
  });

  it('returns nothing when there is no spend history', () => {
    expect(computePaybackWindows(4295, [])).toEqual([]);
  });
});
