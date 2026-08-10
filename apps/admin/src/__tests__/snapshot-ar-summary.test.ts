import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TrialBalanceRow } from '@pmg/db'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn(),
}))

vi.mock('@pmg/db', () => ({
  getSnapshotByPeriod: vi.fn(),
  getFinancialSummaryForPeriod: vi.fn(),
  insertSnapshot: vi.fn(),
  getUncategorizedExpensesCount: vi.fn(),
  getDraftInvoicesCount: vi.fn(),
  getPeriodTotals: vi.fn(),
  closePeriod: vi.fn(),
  getTrialBalance: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getTrialBalance } from '@pmg/db'
import { getSnapshotArSummary } from '@/app/actions/snapshots'

function makeTrialBalanceRow(overrides: Partial<TrialBalanceRow> = {}): TrialBalanceRow {
  return {
    accountId: 'acc-1',
    accountCode: '1100',
    accountName: 'Accounts Receivable',
    accountType: 'asset',
    debit: 0,
    credit: 0,
    totalDebits: 0,
    totalCredits: 0,
    balance: 0,
    ...overrides,
  } as TrialBalanceRow
}

describe('getSnapshotArSummary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects a non-YYYY-MM period without calling the database', async () => {
    const result = await getSnapshotArSummary('not-a-period')

    expect(result).toEqual({ error: 'Period must be YYYY-MM' })
    expect(getTrialBalance).not.toHaveBeenCalled()
  })

  it('extracts invoiced (debits) and paid (credits) from the month-scoped call, and the balance from the cumulative call', async () => {
    vi.mocked(getTrialBalance).mockImplementation(async (period) => {
      if (period === '2026-06') {
        return [makeTrialBalanceRow({ totalDebits: 50000, totalCredits: 30000, balance: 20000 })]
      }
      // Cumulative call (period undefined, only endDate set)
      return [makeTrialBalanceRow({ totalDebits: 500000, totalCredits: 410000, balance: 90000 })]
    })

    const result = await getSnapshotArSummary('2026-06')

    expect(result).toEqual({ invoiced: 50000, paid: 30000, arBalance: 90000 })
  })

  it('calls the cumulative lookup with only an end date (no lower bound) so it reflects the running balance since inception', async () => {
    vi.mocked(getTrialBalance).mockResolvedValue([])

    await getSnapshotArSummary('2026-06')

    expect(getTrialBalance).toHaveBeenCalledWith('2026-06')
    expect(getTrialBalance).toHaveBeenCalledWith(undefined, undefined, undefined, '2026-06-30')
  })

  it('resolves the correct month-end date across month lengths, including a leap-year February', async () => {
    vi.mocked(getTrialBalance).mockResolvedValue([])

    await getSnapshotArSummary('2026-02') // non-leap year
    expect(getTrialBalance).toHaveBeenCalledWith(undefined, undefined, undefined, '2026-02-28')

    await getSnapshotArSummary('2024-02') // leap year
    expect(getTrialBalance).toHaveBeenCalledWith(undefined, undefined, undefined, '2024-02-29')

    await getSnapshotArSummary('2026-12')
    expect(getTrialBalance).toHaveBeenCalledWith(undefined, undefined, undefined, '2026-12-31')
  })

  it('defaults to zero when the AR account has no activity and is filtered out of the trial balance', async () => {
    vi.mocked(getTrialBalance).mockResolvedValue([])

    const result = await getSnapshotArSummary('2026-06')

    expect(result).toEqual({ invoiced: 0, paid: 0, arBalance: 0 })
  })

  it('surfaces a query failure as an error result instead of throwing', async () => {
    vi.mocked(getTrialBalance).mockRejectedValue(new Error('connection lost'))

    const result = await getSnapshotArSummary('2026-06')

    expect(result).toEqual({ error: 'connection lost' })
  })
})
