// Feature: mvp-stage2-high-priority, Property 3: updateWithdrawal validation gate

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ─── Hoist mock state so it's available when vi.mock factories run ────────────
const { mockUpdate } = vi.hoisted(() => {
  return { mockUpdate: vi.fn() }
})

// ─── Mock next/cache ─────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── Mock @pmg/db ─────────────────────────────────────────────────────────────
// db.update(table).set(values).where(condition) — chainable thenable
vi.mock('@pmg/db', () => {
  function makeChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockUpdate().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockUpdate().catch(reject)
      },
    }
    const methods = ['update', 'set', 'where']
    for (const m of methods) {
      chain[m] = () => chain
    }
    return chain
  }

  return {
    db: makeChain(),
    withdrawals: {},
    eq: vi.fn(),
  }
})

// ─── Import action AFTER mocks are set up ────────────────────────────────────
import { updateWithdrawal } from '@/app/actions/withdrawals'

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
  // By default, db.update resolves successfully
  mockUpdate.mockResolvedValue(undefined)
})

// ─── Property 3: updateWithdrawal validation gate ────────────────────────────

describe('Property 3: updateWithdrawal validation gate', () => {
  /**
   * Validates: Requirements 1.4
   *
   * For any invalid payload (empty date OR non-positive amount):
   * - result must have an `error` property
   * - db.update must NOT be called
   */

  it(
    'returns { error } and does not call db.update when date is empty — Validates: Requirements 1.4',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Empty date
          fc.constant(''),
          // Valid positive amount (so only date is invalid) — use integer to avoid 32-bit float constraints
          fc.integer({ min: 1, max: 1_000_000 }).map(n => String(n)),
          // Optional description
          fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          // Arbitrary id
          fc.uuid(),
          async (date, amount, description, id) => {
            vi.clearAllMocks()
            mockUpdate.mockResolvedValue(undefined)

            const fields: Record<string, string> = { date, amount }
            if (description !== undefined) {
              fields.description = description
            }

            const result = await updateWithdrawal(id, buildFormData(fields))

            // Must return an error
            expect(result).toHaveProperty('error')
            expect(typeof (result as { error: unknown }).error).toBe('string')

            // db.update must NOT have been called
            expect(mockUpdate).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'returns { error } and does not call db.update when amount is non-positive — Validates: Requirements 1.4',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Valid non-empty date
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          // Non-positive amount: 0, negative floats, or -1
          fc.oneof(
            fc.constant('0'),
            fc.constant('-1'),
            fc.float({ max: 0, noNaN: true }).map(n => String(n)),
          ),
          // Optional description
          fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          // Arbitrary id
          fc.uuid(),
          async (date, amount, description, id) => {
            vi.clearAllMocks()
            mockUpdate.mockResolvedValue(undefined)

            const fields: Record<string, string> = { date, amount }
            if (description !== undefined) {
              fields.description = description
            }

            const result = await updateWithdrawal(id, buildFormData(fields))

            // Must return an error
            expect(result).toHaveProperty('error')
            expect(typeof (result as { error: unknown }).error).toBe('string')

            // db.update must NOT have been called
            expect(mockUpdate).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    'returns { error } and does not call db.update for combined invalid payloads — Validates: Requirements 1.4',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Empty date AND non-positive amount — both invalid
          fc.constant(''),
          fc.oneof(
            fc.constant('0'),
            fc.constant('-1'),
            fc.float({ max: 0, noNaN: true }).map(n => String(n)),
          ),
          fc.uuid(),
          async (date, amount, id) => {
            vi.clearAllMocks()
            mockUpdate.mockResolvedValue(undefined)

            const result = await updateWithdrawal(
              id,
              buildFormData({ date, amount }),
            )

            expect(result).toHaveProperty('error')
            expect(typeof (result as { error: unknown }).error).toBe('string')
            expect(mockUpdate).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
