import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@pmg/db', () => ({
  getAllLeads: vi.fn(),
  getLeadById: vi.fn(),
  getLeadCountsByStatus: vi.fn(),
  getDistinctLeadSources: vi.fn(),
}))

vi.mock('@/app/actions/leads', () => ({
  updateLeadStatus: vi.fn(),
  updateLeadNotes: vi.fn(),
}))

// ─── LeadRow arbitrary ───────────────────────────────────────────────────────

const leadArb = fc.record({
  id: fc.uuid(),
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  email: fc.option(fc.emailAddress(), { nil: null }),
  phone: fc.option(fc.string({ minLength: 7, maxLength: 20 }), { nil: null }),
  message: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  source: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  serviceInterest: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  status: fc.constantFrom('new', 'contacted', 'converted', 'lost'),
  divisionId: fc.option(fc.uuid(), { nil: null }),
  divisionName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  updatedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: null }),
})

// ─── Placeholder describe block ──────────────────────────────────────────────

describe('leads test setup', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('leadArb generates valid LeadRow shapes', () => {
    // Validates: Requirements 10.5
    fc.assert(
      fc.property(leadArb, (lead) => {
        expect(typeof lead.id).toBe('string')
        expect(lead.name === null || typeof lead.name === 'string').toBe(true)
        expect(lead.email === null || typeof lead.email === 'string').toBe(true)
        expect(lead.phone === null || typeof lead.phone === 'string').toBe(true)
        expect(lead.message === null || typeof lead.message === 'string').toBe(true)
        expect(lead.source === null || typeof lead.source === 'string').toBe(true)
        expect(lead.serviceInterest === null || typeof lead.serviceInterest === 'string').toBe(true)
        expect(['new', 'contacted', 'converted', 'lost']).toContain(lead.status)
        expect(lead.divisionId === null || typeof lead.divisionId === 'string').toBe(true)
        expect(lead.divisionName === null || typeof lead.divisionName === 'string').toBe(true)
        expect(lead.notes === null || typeof lead.notes === 'string').toBe(true)
        expect(lead.createdAt).toBeInstanceOf(Date)
        expect(lead.updatedAt === null || lead.updatedAt instanceof Date).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

export { leadArb }
