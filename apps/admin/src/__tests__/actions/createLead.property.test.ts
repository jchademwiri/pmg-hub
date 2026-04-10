// Feature: mvp-stage2-high-priority, Property 4: createLead contact requirement

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ─── Hoist mock state so it's available when vi.mock factories run ────────────
const { mockInsert } = vi.hoisted(() => {
  return { mockInsert: vi.fn() }
})

// ─── Mock next/cache ─────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── Mock @pmg/db ─────────────────────────────────────────────────────────────
// db.insert(table).values(data) — chainable thenable
vi.mock('@pmg/db', () => {
  function makeChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockInsert().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockInsert().catch(reject)
      },
    }
    const methods = ['insert', 'values', 'where', 'update', 'set', 'delete']
    for (const m of methods) {
      chain[m] = () => chain
    }
    return chain
  }

  return {
    db: makeChain(),
    leads: {},
    eq: vi.fn(),
  }
})

// ─── Import action AFTER mocks are set up ────────────────────────────────────
import { createLead } from '@/app/actions/leads'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v)
  }
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockResolvedValue(undefined)
})

// ─── Property 4: createLead contact requirement ───────────────────────────────

describe('Property 4: createLead contact requirement', () => {
  /**
   * Validates: Requirements 3.2
   *
   * For any payload where both email and phone are absent (or empty string):
   * - result must equal { error: 'At least one of email or phone is required' }
   * - db.insert must NOT be called
   */

  it(
    'returns contact-required error and does not call db.insert when both email and phone are absent — Validates: Requirements 3.2',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Non-empty name
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          // Optional extra fields
          fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
          fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
          async (name, source, message) => {
            vi.clearAllMocks()
            mockInsert.mockResolvedValue(undefined)

            // Build FormData with name but NO email and NO phone keys
            const fields: Record<string, string> = { name }
            if (source !== undefined) fields.source = source
            if (message !== undefined) fields.message = message

            const result = await createLead(buildFormData(fields))

            // Must return the specific contact-required error
            expect(result).toEqual({ error: 'At least one of email or phone is required' })

            // db.insert must NOT have been called
            expect(mockInsert).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'returns contact-required error and does not call db.insert when phone is empty string and email is absent — Validates: Requirements 3.2',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Non-empty name
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          // Optional extra fields
          fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
          async (name, source) => {
            vi.clearAllMocks()
            mockInsert.mockResolvedValue(undefined)

            // Build FormData with name and empty phone only (no email key).
            // An empty phone string passes Zod's optional string check, so the
            // .refine fires and returns the contact-required error.
            const fields: Record<string, string> = { name, phone: '' }
            if (source !== undefined) fields.source = source

            const result = await createLead(buildFormData(fields))

            // Must return the specific contact-required error
            expect(result).toEqual({ error: 'At least one of email or phone is required' })

            // db.insert must NOT have been called
            expect(mockInsert).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
