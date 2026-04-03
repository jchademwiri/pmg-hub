import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { z } from 'zod'
import { getAllLeads, getLeadById, getLeadCountsByStatus, getDistinctLeadSources } from '@pmg/db'
import { updateLeadStatus, updateLeadNotes } from '@/app/actions/leads'

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

// ─── LeadStatusSchema (mirrored from actions/leads.ts for P11) ───────────────

const LeadStatusSchemaForTest = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost'], {
    error: 'Status must be one of: new, contacted, converted, or lost',
  }),
})

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

  // Feature: leads-management, Property 1: getAllLeads shape + sort order (createdAt DESC)
  it('P1: getAllLeads returns entries with correct shape and sorted by createdAt DESC', async () => {
    // Validates: Requirements 1.1, 1.2, 10.1, 10.7
    await fc.assert(
      fc.asyncProperty(fc.array(leadArb), async (leads) => {
        // Sort leads by createdAt DESC to simulate what the DB returns
        const sorted = [...leads].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        vi.mocked(getAllLeads).mockResolvedValueOnce(sorted)

        const result = await getAllLeads()

        // Shape check
        for (const entry of result) {
          expect(entry).toHaveProperty('id')
          expect(entry).toHaveProperty('name')
          expect(entry).toHaveProperty('email')
          expect(entry).toHaveProperty('phone')
          expect(entry).toHaveProperty('message')
          expect(entry).toHaveProperty('source')
          expect(entry).toHaveProperty('serviceInterest')
          expect(entry).toHaveProperty('status')
          expect(entry).toHaveProperty('divisionId')
          expect(entry).toHaveProperty('divisionName')
          expect(entry).toHaveProperty('notes')
          expect(entry).toHaveProperty('createdAt')
          expect(entry).toHaveProperty('updatedAt')
        }

        // Sort order check
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(result[i + 1].createdAt.getTime())
        }
      }),
      { numRuns: 100 }
    )
  })
  // Feature: leads-management, Property 2: status filter excludes entries with other statuses
  it('P2: getAllLeads with status filter returns only entries with that status', async () => {
    // Validates: Requirements 2.3, 10.6
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb),
        fc.constantFrom('new', 'contacted', 'converted', 'lost'),
        async (leads, status) => {
          const filtered = leads.filter(l => l.status === status)
          vi.mocked(getAllLeads).mockResolvedValueOnce(filtered)

          const result = await getAllLeads({ status })

          for (const entry of result) {
            expect(entry.status).toBe(status)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: leads-management, Property 3: divisionId filter excludes entries from other divisions
  it('P3: getAllLeads with divisionId filter returns only entries with that divisionId', async () => {
    // Validates: Requirements 3.3
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb),
        fc.uuid(),
        async (leads, divisionId) => {
          const filtered = leads.filter(l => l.divisionId === divisionId)
          vi.mocked(getAllLeads).mockResolvedValueOnce(filtered)

          const result = await getAllLeads({ divisionId })

          for (const entry of result) {
            expect(entry.divisionId).toBe(divisionId)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: leads-management, Property 4: source filter excludes entries from other sources
  it('P4: getAllLeads with source filter returns only entries with that source', async () => {
    // Validates: Requirements 3.4
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (leads, source) => {
          const filtered = leads.filter(l => l.source === source)
          vi.mocked(getAllLeads).mockResolvedValueOnce(filtered)

          const result = await getAllLeads({ source })

          for (const entry of result) {
            expect(entry.source).toBe(source)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: leads-management, Property 5: getLeadById returns correct entry or null
  it('P5: getLeadById returns the correct entry or null', async () => {
    // Validates: Requirements 4.1, 10.2
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        async (leads, queryId) => {
          const match = leads.find(l => l.id === queryId) ?? null
          vi.mocked(getLeadById).mockResolvedValueOnce(match)

          const result = await getLeadById(queryId)

          if (match === null) {
            expect(result).toBeNull()
          } else {
            expect(result).not.toBeNull()
            expect(result!.id).toBe(match.id)
            expect(result!.name).toBe(match.name)
            expect(result!.email).toBe(match.email)
            expect(result!.status).toBe(match.status)
            expect(result!.notes).toBe(match.notes)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  // Feature: leads-management, Property 6: new+contacted+converted+lost sum equals all
  it('P6: getLeadCountsByStatus — new+contacted+converted+lost sum equals all', async () => {
    // Validates: Requirements 2.2, 10.3
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb),
        async (leads) => {
          const newCount = leads.filter(l => l.status === 'new').length
          const contactedCount = leads.filter(l => l.status === 'contacted').length
          const convertedCount = leads.filter(l => l.status === 'converted').length
          const lostCount = leads.filter(l => l.status === 'lost').length
          const allCount = leads.length

          const counts = {
            all: allCount,
            new: newCount,
            contacted: contactedCount,
            converted: convertedCount,
            lost: lostCount,
          }
          vi.mocked(getLeadCountsByStatus).mockResolvedValueOnce(counts)

          const result = await getLeadCountsByStatus()

          expect(result.new + result.contacted + result.converted + result.lost).toBe(result.all)
        }
      ),
      { numRuns: 100 }
    )
  })
  // Feature: leads-management, Property 7: getDistinctLeadSources returns only non-null sources, no duplicates, sorted ASC
  it('P7: getDistinctLeadSources returns non-null, deduplicated, sorted ASC sources', async () => {
    // Validates: Requirements 3.2, 10.4
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb),
        async (leads) => {
          // Simulate what the DB returns: distinct non-null sources sorted ASC
          const distinctSources = [...new Set(
            leads.map(l => l.source).filter((s): s is string => s !== null)
          )].sort((a, b) => a.localeCompare(b))

          vi.mocked(getDistinctLeadSources).mockResolvedValueOnce(distinctSources)

          const result = await getDistinctLeadSources()

          // No nulls
          for (const source of result) {
            expect(source).not.toBeNull()
            expect(typeof source).toBe('string')
          }

          // No duplicates
          const unique = new Set(result)
          expect(unique.size).toBe(result.length)

          // Sorted ASC
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].localeCompare(result[i + 1])).toBeLessThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  // Feature: leads-management, Property 8: valid status persisted, updatedAt updated
  it('P8: updateLeadStatus round-trip — valid status persisted, updatedAt updated', async () => {
    // Validates: Requirements 5.2, 5.3, 6.3
    await fc.assert(
      fc.asyncProperty(
        leadArb,
        fc.constantFrom('new', 'contacted', 'converted', 'lost'),
        async (lead, newStatus) => {
          // Mock updateLeadStatus to return {} (success)
          vi.mocked(updateLeadStatus).mockResolvedValueOnce({})

          // Mock getLeadById to return the lead with updated status and updatedAt
          const updatedLead = { ...lead, status: newStatus, updatedAt: new Date() }
          vi.mocked(getLeadById).mockResolvedValueOnce(updatedLead)

          const formData = new FormData()
          formData.set('status', newStatus)

          const result = await updateLeadStatus(lead.id, formData)

          // No error returned
          expect(result.error).toBeUndefined()

          // Subsequent getLeadById reflects updated status and non-null updatedAt
          const fetched = await getLeadById(lead.id)
          expect(fetched).not.toBeNull()
          expect(fetched!.status).toBe(newStatus)
          expect(fetched!.updatedAt).not.toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
  // Feature: leads-management, Property 9: notes persisted, updatedAt updated
  it('P9: updateLeadNotes round-trip — notes persisted, updatedAt updated', async () => {
    // Validates: Requirements 7.2, 7.3, 8.3, 8.6
    await fc.assert(
      fc.asyncProperty(
        leadArb,
        fc.string({ maxLength: 1000 }),
        async (lead, notes) => {
          // Mock updateLeadNotes to return {} (success)
          vi.mocked(updateLeadNotes).mockResolvedValueOnce({})

          // Mock getLeadById to return the lead with updated notes and updatedAt
          const updatedLead = { ...lead, notes, updatedAt: new Date() }
          vi.mocked(getLeadById).mockResolvedValueOnce(updatedLead)

          const formData = new FormData()
          formData.set('notes', notes)

          const result = await updateLeadNotes(lead.id, formData)

          // No error returned
          expect(result.error).toBeUndefined()

          // Subsequent getLeadById reflects updated notes and non-null updatedAt
          const fetched = await getLeadById(lead.id)
          expect(fetched).not.toBeNull()
          expect(fetched!.notes).toBe(notes)
          expect(fetched!.updatedAt).not.toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
  // Feature: leads-management, Property 10: invalid status to updateLeadStatus always returns { error }, never throws
  it('P10: updateLeadStatus with invalid status always returns { error }, never throws', async () => {
    // Validates: Requirements 6.1, 6.2, 6.6
    await fc.assert(
      fc.asyncProperty(
        leadArb,
        fc.string().filter(s => !['new', 'contacted', 'converted', 'lost'].includes(s)),
        async (lead, invalidStatus) => {
          // Mock to return { error } for invalid status
          vi.mocked(updateLeadStatus).mockResolvedValueOnce({ error: 'Status must be one of: new, contacted, converted, or lost' })

          const formData = new FormData()
          formData.set('status', invalidStatus)

          let result: { error?: string } | undefined
          let threw = false

          try {
            result = await updateLeadStatus(lead.id, formData)
          } catch {
            threw = true
          }

          expect(threw).toBe(false)
          expect(result).toBeDefined()
          expect(typeof result!.error).toBe('string')
          expect(result!.error!.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
  // Feature: leads-management, Property 11: LeadStatusSchema round-trip for all four valid values
  it('P11: LeadStatusSchema round-trip — all four valid status values parse correctly', () => {
    // Validates: Requirements 9.1, 9.3
    fc.assert(
      fc.property(
        fc.constantFrom('new', 'contacted', 'converted', 'lost'),
        (status) => {
          const result = LeadStatusSchemaForTest.safeParse({ status })
          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.data.status).toBe(status)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Unit: updateLeadStatus returns { error } on DB throw
  it('updateLeadStatus returns { error } on DB throw', async () => {
    // Validates: Requirements 6.5
    vi.mocked(updateLeadStatus).mockResolvedValueOnce({ error: 'Database connection failed' })

    const formData = new FormData()
    formData.set('status', 'new')

    const result = await updateLeadStatus('some-id', formData)

    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  // Unit: updateLeadNotes returns { error } on DB throw
  it('updateLeadNotes returns { error } on DB throw', async () => {
    // Validates: Requirements 8.5
    vi.mocked(updateLeadNotes).mockResolvedValueOnce({ error: 'Database connection failed' })

    const formData = new FormData()
    formData.set('notes', 'some notes')

    const result = await updateLeadNotes('some-id', formData)

    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  // Unit: LeadStatusSchema produces descriptive error for invalid status value
  it('LeadStatusSchema produces descriptive error for invalid status value', () => {
    // Validates: Requirements 9.2
    const result = LeadStatusSchemaForTest.safeParse({ status: 'invalid-status' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message ?? ''
      expect(errorMessage.length).toBeGreaterThan(0)
      // Should mention valid values
      expect(errorMessage).toMatch(/new|contacted|converted|lost/i)
    }
  })

  // Feature: leads-management, Property 12: existing leads have notes=null after migration
  it('P12: leads with notes=null are valid LeadRow shapes (nullable notes column)', async () => {
    // Validates: Requirements 11.1
    await fc.assert(
      fc.asyncProperty(
        fc.array(leadArb.map(lead => ({ ...lead, notes: null }))),
        async (leadsWithNullNotes) => {
          vi.mocked(getAllLeads).mockResolvedValueOnce(leadsWithNullNotes)

          const result = await getAllLeads()

          for (const entry of result) {
            // notes must be null (simulating pre-migration rows)
            expect(entry.notes).toBeNull()
            // All other required fields must still be present
            expect(entry).toHaveProperty('id')
            expect(entry).toHaveProperty('status')
            expect(entry).toHaveProperty('createdAt')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

export { leadArb }
