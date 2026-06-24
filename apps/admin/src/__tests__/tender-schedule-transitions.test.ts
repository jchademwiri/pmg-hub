/**
 * Server action unit tests for tender status transitions.
 *
 * Validates:
 * - All allowed transitions succeed (planned→in_progress, planned→cancelled,
 *   in_progress→completed, completed→submitted, submitted→planned)
 * - All blocked transitions return error messages
 * - Invalid status strings are rejected
 * - Non-existent entries return "Tender not found."
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockEntryStatus = 'planned'

function makeMockDb(entryStatus: string) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'tender-1', status: entryStatus }]),
        }),
      }),
    }),
  }
}

const mockGetDb = vi.fn().mockReturnValue(makeMockDb('planned'))
const mockTransitionStatus = vi.fn()
const mockRevalidatePath = vi.fn()
const mockGetSession = vi.fn().mockResolvedValue({ user: { id: 'user-1' } })

vi.mock('@pmg/db', () => ({
  getDb: () => mockGetDb(),
  tenderScheduleEntries: { id: 'tender_schedule_entries_id', status: 'tender_schedule_entries_status' },
  eq: vi.fn(),
  transitionTenderStatus: mockTransitionStatus,
}))

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/auth', () => ({ getSessionOrRedirect: mockGetSession }))

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setupEntryStatus(status: string) {
  mockGetDb.mockReturnValue(makeMockDb(status))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('transitionTenderStatusAction — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('rejects an invalid status string', async () => {
    const { transitionTenderStatusAction } = await import('@/app/actions/tender-schedule')
    await setupEntryStatus('planned')
    const result = await transitionTenderStatusAction('tender-1', 'nonexistent')
    expect(result.error).toBe('Invalid status transition.')
  })

  it('returns Tender not found for missing entry', async () => {
    const { transitionTenderStatusAction } = await import('@/app/actions/tender-schedule')
    mockGetDb.mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })
    const result = await transitionTenderStatusAction('missing-id', 'in_progress')
    expect(result.error).toBe('Tender not found.')
  })
})

describe('transitionTenderStatusAction — allowed transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockTransitionStatus.mockResolvedValue({ id: 'tender-1' })
  })

  const allowedCases: [string, string][] = [
    ['planned', 'in_progress'],
    ['planned', 'cancelled'],
    ['in_progress', 'completed'],
    ['in_progress', 'cancelled'],
    ['completed', 'submitted'],
    ['completed', 'cancelled'],
    ['submitted', 'planned'],
  ]

  it.each(allowedCases)('allows %s → %s', async (from, to) => {
    const { transitionTenderStatusAction } = await import('@/app/actions/tender-schedule')
    await setupEntryStatus(from)

    const result = await transitionTenderStatusAction('tender-1', to)
    expect(result.error).toBeUndefined()
    expect(mockTransitionStatus).toHaveBeenCalledWith('tender-1', to)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/scheduling')
  })
})

describe('transitionTenderStatusAction — blocked transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  const blockedCases: [string, string, string][] = [
    ['planned', 'completed', "'planned' to 'completed'"],
    ['planned', 'submitted', "'planned' to 'submitted'"],
    ['in_progress', 'planned', "'in_progress' to 'planned'"],
    ['in_progress', 'submitted', "'in_progress' to 'submitted'"],
    ['completed', 'planned', "'completed' to 'planned'"],
    ['completed', 'in_progress', "'completed' to 'in_progress'"],
    ['submitted', 'in_progress', "'submitted' to 'in_progress'"],
    ['submitted', 'completed', "'submitted' to 'completed'"],
  ]

  it.each(blockedCases)('blocks %s → %s', async (from, to, expected) => {
    const { transitionTenderStatusAction } = await import('@/app/actions/tender-schedule')
    await setupEntryStatus(from)

    const result = await transitionTenderStatusAction('tender-1', to)
    expect(result.error).toContain(expected)
    expect(mockTransitionStatus).not.toHaveBeenCalled()
  })

  it('blocks all transitions from cancelled status', async () => {
    const { transitionTenderStatusAction } = await import('@/app/actions/tender-schedule')
    await setupEntryStatus('cancelled')

    const result1 = await transitionTenderStatusAction('tender-1', 'planned')
    const result2 = await transitionTenderStatusAction('tender-1', 'in_progress')
    const result3 = await transitionTenderStatusAction('tender-1', 'completed')
    const result4 = await transitionTenderStatusAction('tender-1', 'submitted')

    expect(result1.error).toContain("Cannot transition from 'cancelled'")
    expect(result2.error).toContain("Cannot transition from 'cancelled'")
    expect(result3.error).toContain("Cannot transition from 'cancelled'")
    expect(result4.error).toContain("Cannot transition from 'cancelled'")
    expect(mockTransitionStatus).not.toHaveBeenCalled()
  })
})
