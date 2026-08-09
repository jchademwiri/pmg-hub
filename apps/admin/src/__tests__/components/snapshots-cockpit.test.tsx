import { describe, it, expect, vi } from 'vitest'

// snapshots-cockpit.tsx imports the getSnapshotArSummary server action, which
// transitively pulls in auth.ts ('server-only') — stub it out since these
// tests only exercise the module's pure helper functions.
vi.mock('@/app/actions/snapshots', () => ({
  getSnapshotArSummary: vi.fn(),
}))

import { shiftPeriod, computeStreak, type SnapshotView } from '@/components/insights/snapshots-cockpit'

function makeRow(period: string, profitPool: number): SnapshotView {
  return {
    id: period,
    period,
    periodLabel: period,
    shortPeriodLabel: period,
    revenue: 0,
    expenses: 0,
    pmgShare: 0,
    profitPool,
    salary: 0,
    reinvest: 0,
    reserve: 0,
    flex: 0,
    status: 'locked',
    notes: null,
    closedAt: new Date(),
  }
}

describe('shiftPeriod', () => {
  it('shifts back within the same year', () => {
    expect(shiftPeriod('2026-06', -1)).toBe('2026-05')
  })

  it('shifts back across a year boundary', () => {
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12')
  })

  it('shifts back a full year (the YoY case)', () => {
    expect(shiftPeriod('2026-03', -12)).toBe('2025-03')
  })

  it('shifts forward across a year boundary', () => {
    expect(shiftPeriod('2025-12', 1)).toBe('2026-01')
  })
})

describe('computeStreak', () => {
  it('counts consecutive profitable months starting from the given index', () => {
    // Newest -> oldest, matching getAllSnapshots() ordering.
    const rows = [
      makeRow('2026-06', 100),
      makeRow('2026-05', 50),
      makeRow('2026-04', 10),
      makeRow('2026-03', -20),
      makeRow('2026-02', 30),
    ]
    expect(computeStreak(rows, 0)).toBe(3)
  })

  it('counts consecutive loss months starting from the given index', () => {
    const rows = [
      makeRow('2026-06', -5),
      makeRow('2026-05', -1),
      makeRow('2026-04', 10),
    ]
    expect(computeStreak(rows, 0)).toBe(2)
  })

  it('treats a zero profit pool as profitable, not a loss', () => {
    const rows = [makeRow('2026-06', 0), makeRow('2026-05', 5)]
    expect(computeStreak(rows, 0)).toBe(2)
  })

  it('returns 1 when the selected month is the only one on its side', () => {
    const rows = [makeRow('2026-06', 100), makeRow('2026-05', -10)]
    expect(computeStreak(rows, 0)).toBe(1)
  })

  it('returns 1 for the oldest row regardless of what came before it', () => {
    const rows = [makeRow('2026-06', 100), makeRow('2026-05', -10)]
    expect(computeStreak(rows, 1)).toBe(1)
  })
})
