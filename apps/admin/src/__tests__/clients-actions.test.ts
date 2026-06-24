/**
 * Server action unit tests for client CRUD operations.
 *
 * Validates:
 * - Zod validation (empty name, invalid email)
 * - __none__ division → null passthrough
 * - deleteClient guards (income, invoices, quotes, tender entries)
 * - toggleClientActive
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbDelete = vi.fn()

const mockDb = {
  insert: vi.fn().mockReturnValue({ values: mockDbInsert }),
  update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: mockDbUpdate }) }),
  delete: vi.fn().mockReturnValue({ where: mockDbDelete }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
}

const mockSetClientActive = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@pmg/db', () => ({
  db: mockDb,
  clients: { id: 'clients_id' },
  income: { id: 'income_id', clientId: 'client_id' },
  invoices: { id: 'invoices_id', clientId: 'client_id' },
  quotations: { id: 'quotations_id', clientId: 'client_id' },
  tenderScheduleEntries: { id: 'tender_schedule_id', clientId: 'client_id' },
  eq: vi.fn(),
  setClientActive: mockSetClientActive,
}))

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

// ─── Tests: createClient ─────────────────────────────────────────────────────

describe('createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbInsert.mockResolvedValue([{ id: 'new-client-id' }])
  })

  it('rejects empty name', async () => {
    const { createClient } = await import('@/app/actions/clients')
    const fd = new FormData()
    fd.set('name', '')
    fd.set('businessName', '')
    fd.set('email', '')

    const result = await createClient(fd)
    expect(result.error).toBeDefined()
  })

  it('rejects invalid email', async () => {
    const { createClient } = await import('@/app/actions/clients')
    const fd = new FormData()
    fd.set('name', 'Acme Corp')
    fd.set('email', 'not-an-email')

    const result = await createClient(fd)
    expect(result.error).toBeDefined()
  })

  it('succeeds with valid data', async () => {
    const { createClient } = await import('@/app/actions/clients')
    const fd = new FormData()
    fd.set('name', 'Acme Corp')
    fd.set('businessName', 'Acme Pty Ltd')
    fd.set('email', 'billing@acme.com')
    fd.set('phone', '+27 82 123 4567')

    const result = await createClient(fd)
    expect(result.error).toBeUndefined()
    expect(mockDbInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Corp',
        businessName: 'Acme Pty Ltd',
        email: 'billing@acme.com',
        phone: '+27 82 123 4567',
        divisionId: null,
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/relationships/clients')
  })

  it('converts __none__ divisionId to null', async () => {
    const { createClient } = await import('@/app/actions/clients')
    const fd = new FormData()
    fd.set('name', 'Acme Corp')
    fd.set('divisionId', '__none__')

    const result = await createClient(fd)
    expect(result.error).toBeUndefined()
    expect(mockDbInsert).toHaveBeenCalledWith(
      expect.objectContaining({ divisionId: null }),
    )
  })

  it('strips empty optional fields', async () => {
    const { createClient } = await import('@/app/actions/clients')
    const fd = new FormData()
    fd.set('name', 'Acme Corp')
    fd.set('businessName', '')
    fd.set('email', '')
    fd.set('phone', '')

    const result = await createClient(fd)
    expect(result.error).toBeUndefined()
    expect(mockDbInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Corp',
        businessName: null,
        email: null,
        phone: null,
      }),
    )
  })
})

// ─── Tests: updateClient ─────────────────────────────────────────────────────

describe('updateClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbUpdate.mockResolvedValue(true)
  })

  it('succeeds with valid data', async () => {
    const { updateClient } = await import('@/app/actions/clients')
    const fd = new FormData()
    fd.set('name', 'Updated Corp')
    fd.set('email', 'updated@acme.com')

    const result = await updateClient('client-1', fd)
    expect(result.error).toBeUndefined()
    expect(mockDbUpdate).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/relationships/clients')
  })

  it('converts __none__ divisionId to null', async () => {
    const { updateClient } = await import('@/app/actions/clients')
    const fd = new FormData()
    fd.set('name', 'Updated Corp')
    fd.set('divisionId', '__none__')

    await updateClient('client-1', fd)
    expect(mockDbUpdate).toHaveBeenCalled()
  })
})

// ─── Tests: toggleClientActive ───────────────────────────────────────────────

describe('toggleClientActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetClientActive.mockResolvedValue(undefined)
  })

  it('toggles client active status', async () => {
    const { toggleClientActive } = await import('@/app/actions/clients')
    const result = await toggleClientActive('client-1', false)
    expect(result.error).toBeUndefined()
    expect(mockSetClientActive).toHaveBeenCalledWith('client-1', false)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/relationships/clients')
  })

  it('handles errors gracefully', async () => {
    const { toggleClientActive } = await import('@/app/actions/clients')
    mockSetClientActive.mockRejectedValue(new Error('DB error'))
    const result = await toggleClientActive('client-1', true)
    expect(result.error).toBe('Failed to update client status.')
  })
})

// ─── Tests: deleteClient ─────────────────────────────────────────────────────

describe('deleteClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbDelete.mockResolvedValue(true)
  })

  it('blocks deletion when client has income records', async () => {
    const { deleteClient } = await import('@/app/actions/clients')
    // Mock income check to return a record
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'income-1' }]),
        }),
      }),
    })

    const result = await deleteClient('client-1')
    expect(result.error).toContain('payment records')
    expect(mockDbDelete).not.toHaveBeenCalled()
  })

  it('blocks deletion when client has invoices', async () => {
    const { deleteClient } = await import('@/app/actions/clients')
    let callCount = 0
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++
            // First call (income) returns empty, second call (invoices) returns record
            if (callCount === 1) return Promise.resolve([])
            return Promise.resolve([{ id: 'invoice-1' }])
          }),
        }),
      }),
    })

    const result = await deleteClient('client-1')
    expect(result.error).toContain('invoices')
    expect(mockDbDelete).not.toHaveBeenCalled()
  })

  it('blocks deletion when client has quotes', async () => {
    const { deleteClient } = await import('@/app/actions/clients')
    let callCount = 0
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++
            // First two calls return empty, third returns quote
            if (callCount <= 2) return Promise.resolve([])
            return Promise.resolve([{ id: 'quote-1' }])
          }),
        }),
      }),
    })

    const result = await deleteClient('client-1')
    expect(result.error).toContain('quotes')
    expect(mockDbDelete).not.toHaveBeenCalled()
  })

  it('blocks deletion when client has tender entries', async () => {
    const { deleteClient } = await import('@/app/actions/clients')
    let callCount = 0
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount <= 3) return Promise.resolve([])
            return Promise.resolve([{ id: 'tender-1' }])
          }),
        }),
      }),
    })

    const result = await deleteClient('client-1')
    expect(result.error).toContain('tender schedule entries')
    expect(mockDbDelete).not.toHaveBeenCalled()
  })

  it('succeeds when no records reference the client', async () => {
    const { deleteClient } = await import('@/app/actions/clients')
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const result = await deleteClient('client-1')
    expect(result.error).toBeUndefined()
    expect(mockDbDelete).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/relationships/clients')
  })

  it('handles errors gracefully', async () => {
    const { deleteClient } = await import('@/app/actions/clients')
    mockDb.select = vi.fn().mockImplementation(() => { throw new Error('DB error') })

    const result = await deleteClient('client-1')
    expect(result.error).toBe('Failed to delete. Please try again.')
  })
})
