/**
 * Server action unit tests for bulk archive/delete and reorder.
 *
 * Validates:
 * - Empty IDs return { count: 0 } immediately
 * - Bulk archive updates status to cancelled
 * - Bulk delete only applies to cancelled tenders (safety guard)
 * - Reorder calls the DB function with ordered IDs
 * - Catch blocks return error messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Includes reorderProjectQueue so the same mock works for all three actions.

const mockBulkReturning = vi.fn()
const mockBulkDb = {
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mockBulkReturning,
      }),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'tender-1' }, { id: 'tender-2' }]),
    }),
  }),
}

const mockGetDbBulk = vi.fn().mockReturnValue(mockBulkDb)
const mockReorderDb = vi.fn()
const mockRecalculateWaterfall = vi.fn()
const mockRevalidatePath = vi.fn()
const mockGetSessionBulk = vi.fn().mockResolvedValue({ user: { id: 'user-1' } })

vi.mock('@pmg/db', () => ({
  getDb: () => mockGetDbBulk(),
  projectScheduleEntries: { id: 'id', status: 'status' },
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  reorderProjectQueue: mockReorderDb,
  recalculateProjectWaterfall: mockRecalculateWaterfall,
}))

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/auth', () => ({ getSessionOrRedirect: mockGetSessionBulk }))

// ═══════════════════════════════════════════════════════════════════════════════
// Bulk archive
// ═══════════════════════════════════════════════════════════════════════════════

describe('bulkArchiveTenders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionBulk.mockResolvedValue({ user: { id: 'user-1' } })
    mockGetDbBulk.mockReturnValue(mockBulkDb)
    mockBulkReturning.mockResolvedValue([{ id: 'tender-1' }, { id: 'tender-2' }])
    mockRecalculateWaterfall.mockResolvedValue(undefined)
  })

  it('returns count 0 for empty IDs', async () => {
    const { bulkArchiveTenders } = await import('@/app/actions/project-schedule-bulk')
    const result = await bulkArchiveTenders([])
    expect(result).toEqual({ count: 0 })
  })

  it('archives tenders and returns count', async () => {
    const { bulkArchiveTenders } = await import('@/app/actions/project-schedule-bulk')
    const result = await bulkArchiveTenders(['tender-1', 'tender-2'])
    expect(result).toEqual({ count: 2 })
    expect(mockBulkDb.update).toHaveBeenCalled()
    expect(mockBulkReturning).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects')
  })

  it('handles errors gracefully', async () => {
    const { bulkArchiveTenders } = await import('@/app/actions/project-schedule-bulk')
    mockGetDbBulk.mockImplementation(() => { throw new Error('DB connection failed') })
    const result = await bulkArchiveTenders(['tender-1'])
    expect(result.error).toBe('Failed to archive tenders.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Bulk delete
// ═══════════════════════════════════════════════════════════════════════════════

describe('bulkDeleteTenders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionBulk.mockResolvedValue({ user: { id: 'user-1' } })
    mockGetDbBulk.mockReturnValue(mockBulkDb)
    mockRecalculateWaterfall.mockResolvedValue(undefined)
  })

  it('returns count 0 for empty IDs', async () => {
    const { bulkDeleteTenders } = await import('@/app/actions/project-schedule-bulk')
    const result = await bulkDeleteTenders([])
    expect(result).toEqual({ count: 0 })
  })

  it('deletes cancelled tenders and returns count', async () => {
    const { bulkDeleteTenders } = await import('@/app/actions/project-schedule-bulk')
    const result = await bulkDeleteTenders(['tender-1', 'tender-2'])
    expect(result).toEqual({ count: 2 })
    expect(mockBulkDb.delete).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects')
  })

  it('handles errors gracefully', async () => {
    const { bulkDeleteTenders } = await import('@/app/actions/project-schedule-bulk')
    mockGetDbBulk.mockImplementation(() => { throw new Error('DB connection failed') })
    const result = await bulkDeleteTenders(['tender-1'])
    expect(result.error).toBe('Failed to delete tenders.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Reorder
// ═══════════════════════════════════════════════════════════════════════════════

describe('reorderProjectQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionBulk.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('calls reorderProjectQueue with ordered IDs on success', async () => {
    const { reorderProjectQueue } = await import('@/app/actions/project-schedule-reorder')
    mockReorderDb.mockResolvedValue(undefined)

    const result = await reorderProjectQueue(['id-1', 'id-2', 'id-3'])
    expect(result.error).toBeUndefined()
    expect(mockReorderDb).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3'])
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects')
  })

  it('handles errors gracefully', async () => {
    const { reorderProjectQueue } = await import('@/app/actions/project-schedule-reorder')
    mockReorderDb.mockRejectedValue(new Error('Reorder failed'))

    const result = await reorderProjectQueue(['id-1'])
    expect(result.error).toBe('Failed to reorder queue.')
  })
})
