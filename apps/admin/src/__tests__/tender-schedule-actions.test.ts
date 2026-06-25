/**
 * Server action unit tests for tender schedule.
 *
 * Validates:
 * - Zod validation (clientId, tenderReference, effortDays, closingDate required)
 * - Date calculation (targetCompletionDate = startDate + effortDays)
 * - Division __none__ → null passthrough
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDbReturn = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 'client-1' }]),
      }),
    }),
  }),
}

const mockGetDb = vi.fn().mockReturnValue(mockDbReturn)
const mockDbCreateEntry = vi.fn()
const mockRecalculateWaterfall = vi.fn()
const mockRevalidatePath = vi.fn()
const mockGetSession = vi.fn().mockResolvedValue({ user: { id: 'user-1' } })

vi.mock('@pmg/db', () => ({
  getDb: () => mockGetDb(),
  clients: { id: 'clients_id' },
  eq: vi.fn(),
  createTenderScheduleEntry: mockDbCreateEntry,
  recalculateTenderWaterfall: mockRecalculateWaterfall,
  tenderScheduleEntries: {},
}))

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/auth', () => ({ getSessionOrRedirect: mockGetSession }))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createTenderScheduleEntry — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockGetDb.mockReturnValue(mockDbReturn)
    mockRecalculateWaterfall.mockResolvedValue(undefined)
  })

  it('rejects empty clientId', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', '')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '3')
    fd.set('startDate', '2026-07-01')

    const result = await createTenderScheduleEntry(fd)
    expect(result.error).toBe('A client is required.')
  })

  it('rejects empty tenderReference', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', '')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '3')
    fd.set('startDate', '2026-07-01')

    const result = await createTenderScheduleEntry(fd)
    expect(result.error).toBe('Tender reference is required.')
  })

  it('rejects effortDays of 0', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '0')
    fd.set('startDate', '2026-07-01')

    const result = await createTenderScheduleEntry(fd)
    expect(result.error).toMatch(/Effort must be greater than 0/)
  })

  it('rejects missing closingDate', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '')
    fd.set('effortDays', '3')
    fd.set('startDate', '2026-07-01')

    const result = await createTenderScheduleEntry(fd)
    expect(result.error).toBe('Closing date is required.')
  })
})

describe('createTenderScheduleEntry — success & date calc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockGetDb.mockReturnValue(mockDbReturn)
    mockDbCreateEntry.mockResolvedValue({ id: 'new-tender-id' })
    mockRecalculateWaterfall.mockResolvedValue(undefined)
  })

  it('succeeds with valid data', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '3')
    fd.set('startDate', '2026-07-01')
    fd.set('priority', 'high')
    fd.set('notes', 'Test notes')
    fd.set('blockers', 'No blockers')

    const result = await createTenderScheduleEntry(fd)
    expect(result.error).toBeUndefined()
    expect(mockDbCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        tenderReference: 'T12/2026',
        closingDate: '2026-07-14',
        effortDays: 3,
        startDate: '2026-07-01',
        priority: 'high',
        notes: 'Test notes',
        blockers: 'No blockers',
        createdBy: 'user-1',
      }),
    )
  })

  it('calculates targetCompletionDate = startDate + effortDays', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '5')
    fd.set('startDate', '2026-07-01')

    await createTenderScheduleEntry(fd)
    expect(mockDbCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2026-07-01',
        targetCompletionDate: '2026-07-06',
        effortDays: 5,
      }),
    )
  })

  it('defaults bufferDays to 5 when omitted', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '5')

    await createTenderScheduleEntry(fd)
    expect(mockDbCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        bufferDays: 5,
        startDate: '2026-07-04',
        targetCompletionDate: '2026-07-09',
      }),
    )
  })

  it('accepts custom bufferDays', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '5')
    fd.set('bufferDays', '1')

    await createTenderScheduleEntry(fd)
    expect(mockDbCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        bufferDays: 1,
        startDate: '2026-07-08',
        targetCompletionDate: '2026-07-13',
      }),
    )
  })

  it('recalculates the waterfall after creation', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '3')

    await createTenderScheduleEntry(fd)
    expect(mockRecalculateWaterfall).toHaveBeenCalled()
  })

  it('converts __none__ divisionId to null', async () => {
    const { createTenderScheduleEntry } = await import('@/app/actions/tender-schedule')
    const fd = new FormData()
    fd.set('clientId', 'client-1')
    fd.set('tenderReference', 'T12/2026')
    fd.set('closingDate', '2026-07-14')
    fd.set('effortDays', '3')
    fd.set('startDate', '2026-07-01')
    fd.set('divisionId', '__none__')

    await createTenderScheduleEntry(fd)
    expect(mockDbCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        divisionId: null,
      }),
    )
  })
})
