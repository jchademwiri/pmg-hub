/**
 * Property-Based Tests for Server Actions
 *
 * Property 1: Server Actions never throw - they always return `{ error? }`
 * Validates: Requirements 1.1, 1.2, 1.6
 */

import { describe, it, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ─── Hoist mock state so it's available when vi.mock factories run ────────────
const { mockDbExecute } = vi.hoisted(() => {
  return { mockDbExecute: vi.fn() }
})

// ─── Mock next/cache ─────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── Mock @pmg/db ─────────────────────────────────────────────────────────────
// The Drizzle db object uses a chainable builder: db.insert(t).values(v)
// We create a "thenable chain" - an object that:
//   1. Returns itself for any method call (so chaining works)
//   2. Is a thenable (has .then/.catch) so `await chain` calls mockDbExecute
vi.mock('@pmg/db', () => {
  // Build a thenable proxy that delegates to mockDbExecute when awaited
  function makeChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockDbExecute().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbExecute().catch(reject)
      },
    }
    // All builder methods return the same chain
    const methods = ['insert', 'update', 'delete', 'values', 'set', 'where']
    for (const m of methods) {
      chain[m] = () => chain
    }
    return chain
  }

  return {
    db: makeChain(),
    income: {},
    expenses: {},
    leads: {},
    divisions: {},
    eq: vi.fn(),
  }
})

// ─── Import actions AFTER mocks are set up ───────────────────────────────────
import {
  createIncome,
  updateIncome,
  deleteIncome,
} from '@/app/actions/income'

import {
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/app/actions/expenses'

import {
  updateLeadStatus,
  updateLeadNotes,
} from '@/app/actions/leads'

import { createDivision } from '@/app/actions/divisions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Assert a value matches the { error?: string } contract */
function assertActionResult(result: unknown): void {
  expect(typeof result).toBe('object')
  expect(result).not.toBeNull()
  const keys = Object.keys(result as object)
  for (const key of keys) {
    expect(key).toBe('error')
  }
  const r = result as { error?: unknown }
  if ('error' in r) {
    expect(typeof r.error).toBe('string')
  }
}

/** Build a FormData from an arbitrary dictionary of string→string */
function buildFormData(dict: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(dict)) {
    fd.set(k, v)
  }
  return fd
}

/** Arbitrary: dictionary of string keys → string values, built into FormData */
const formDataArb = fc
  .dictionary(fc.string({ minLength: 1, maxLength: 30 }), fc.string({ maxLength: 100 }))
  .map(buildFormData)

/** Arbitrary: whether the db call should throw */
const dbBehaviourArb = fc.boolean()

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Server Actions - Property 1: never throw, always return { error? }', () => {
  /**
   * Validates: Requirements 1.1, 1.2, 1.6
   */

  it('createIncome never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(formDataArb, dbBehaviourArb, async (formData, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await createIncome(formData)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('updateIncome never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), formDataArb, dbBehaviourArb, async (id, formData, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await updateIncome(id, formData)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('deleteIncome never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), dbBehaviourArb, async (id, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await deleteIncome(id)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('createExpense never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(formDataArb, dbBehaviourArb, async (formData, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await createExpense(formData)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('updateExpense never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), formDataArb, dbBehaviourArb, async (id, formData, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await updateExpense(id, formData)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('deleteExpense never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), dbBehaviourArb, async (id, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await deleteExpense(id)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('updateLeadStatus never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), formDataArb, dbBehaviourArb, async (id, formData, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await updateLeadStatus(id, formData)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('updateLeadNotes never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), formDataArb, dbBehaviourArb, async (id, formData, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await updateLeadNotes(id, formData)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })

  it('createDivision never throws and always returns { error? } - Validates: Requirements 1.1, 1.2, 1.6', async () => {
    await fc.assert(
      fc.asyncProperty(formDataArb, dbBehaviourArb, async (formData, shouldThrow) => {
        mockDbExecute.mockImplementation(() =>
          shouldThrow ? Promise.reject(new Error('db error')) : Promise.resolve()
        )
        const result = await createDivision(formData)
        assertActionResult(result)
      }),
      { numRuns: 100 }
    )
  })
})
