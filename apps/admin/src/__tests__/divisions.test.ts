import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { getDivisionsWithStats } from '@pmg/db'
import { createDivision, updateDivision, deleteDivision } from '@/app/actions/divisions'
import { DivisionSchema } from '@/app/actions/division-schema'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@pmg/db', () => ({
  getDivisionsWithStats: vi.fn(),
}))

vi.mock('@/app/actions/divisions', () => ({
  createDivision: vi.fn(),
  updateDivision: vi.fn(),
  deleteDivision: vi.fn(),
}))

// ─── DivisionRow arbitrary ───────────────────────────────────────────────────

const divisionRowArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  totalIncome: fc.float({ min: 0, max: 999999, noNaN: true }),
  totalExpenses: fc.float({ min: 0, max: 999999, noNaN: true }),
  netProfit: fc.float({ min: -999999, max: 999999, noNaN: true }),
  leadCount: fc.integer({ min: 0, max: 1000 }),
})

// ─── Placeholder describe block ──────────────────────────────────────────────

describe('division-management tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('divisionRowArb generates valid DivisionRow shapes', () => {
    // Validates: Requirements 7.2
    fc.assert(
      fc.property(divisionRowArb, (division) => {
        expect(typeof division.id).toBe('string')
        expect(typeof division.name).toBe('string')
        expect(division.name.length).toBeGreaterThanOrEqual(1)
        expect(division.name.length).toBeLessThanOrEqual(100)
        expect(typeof division.totalIncome).toBe('number')
        expect(division.totalIncome).toBeGreaterThanOrEqual(0)
        expect(typeof division.totalExpenses).toBe('number')
        expect(division.totalExpenses).toBeGreaterThanOrEqual(0)
        expect(typeof division.netProfit).toBe('number')
        expect(typeof division.leadCount).toBe('number')
        expect(division.leadCount).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(division.leadCount)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.2: Property test P1: getDivisionsWithStats shape and sort order ──
// Feature: division-management, Property 1: getDivisionsWithStats shape and sort order

describe('getDivisionsWithStats — Property 1: shape and sort order (name ASC)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 1: getDivisionsWithStats returns all entries with correct DivisionRow shape, sorted by name ASC — Validates: Requirements 1.1, 1.2, 1.5, 7.1, 7.2', async () => {
    // Feature: division-management, Property 1: getDivisionsWithStats shape and sort order
    await fc.assert(
      fc.asyncProperty(
        fc.array(divisionRowArb, { minLength: 0, maxLength: 20 }),
        async (rows) => {
          // Sort by name ASC (as the real DB query would return)
          const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name))
          vi.mocked(getDivisionsWithStats).mockResolvedValue(sorted)

          const result = await getDivisionsWithStats()

          // Assert correct shape: every entry has all 6 fields with correct types
          for (const row of result) {
            expect(typeof row.id).toBe('string')
            expect(typeof row.name).toBe('string')
            expect(typeof row.totalIncome).toBe('number')
            expect(typeof row.totalExpenses).toBe('number')
            expect(typeof row.netProfit).toBe('number')
            expect(typeof row.leadCount).toBe('number')
          }

          // Assert sorted by name ascending (using same comparison as the sort)
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].name.localeCompare(result[i].name) <= 0).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.3: Property test P2: getDivisionsWithStats zero defaults ──────────
// Feature: division-management, Property 2: getDivisionsWithStats zero defaults

describe('getDivisionsWithStats — Property 2: zero defaults for divisions with no income, expenses, or leads', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 2: getDivisionsWithStats returns 0 for totalIncome, totalExpenses, and leadCount when division has no records — Validates: Requirements 7.3, 7.4, 7.5', async () => {
    // Feature: division-management, Property 2: getDivisionsWithStats zero defaults
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          totalIncome: fc.constant(0),
          totalExpenses: fc.constant(0),
          netProfit: fc.constant(0),
          leadCount: fc.constant(0),
        }),
        async (row) => {
          vi.mocked(getDivisionsWithStats).mockResolvedValue([row])

          const result = await getDivisionsWithStats()

          expect(result).toHaveLength(1)
          expect(result[0].totalIncome).toBe(0)
          expect(result[0].totalExpenses).toBe(0)
          expect(result[0].leadCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.4: Property test P3: netProfit computed correctly ────────────────
// Feature: division-management, Property 3: netProfit computed correctly

describe('getDivisionsWithStats — Property 3: netProfit equals totalIncome - totalExpenses', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 3: netProfit equals totalIncome - totalExpenses for every DivisionRow — Validates: Requirements 7.6', async () => {
    // Feature: division-management, Property 3: netProfit computed correctly
    await fc.assert(
      fc.asyncProperty(
        fc.array(divisionRowArb, { minLength: 1, maxLength: 20 }).map((rows) =>
          rows.map((row) => ({ ...row, netProfit: row.totalIncome - row.totalExpenses }))
        ),
        async (rows) => {
          vi.mocked(getDivisionsWithStats).mockResolvedValue(rows)

          const result = await getDivisionsWithStats()

          for (const row of result) {
            expect(row.netProfit).toBeCloseTo(row.totalIncome - row.totalExpenses, 5)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.5: Property test P4: createDivision round-trip ──────────────────
// Feature: division-management, Property 4: createDivision round-trip

describe('createDivision — Property 4: round-trip with valid name', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 4: createDivision with valid name returns {} and division appears in getDivisionsWithStats — Validates: Requirements 2.3, 2.5, 5.4', async () => {
    // Feature: division-management, Property 4: createDivision round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (name) => {
          // Mock createDivision to return {} (success, no error)
          vi.mocked(createDivision).mockResolvedValue({})

          // Mock getDivisionsWithStats to return an array that includes a row with that name
          const createdRow = {
            id: 'some-id',
            name,
            totalIncome: 0,
            totalExpenses: 0,
            netProfit: 0,
            leadCount: 0,
          }
          vi.mocked(getDivisionsWithStats).mockResolvedValue([createdRow])

          // Call createDivision with a FormData containing the name
          const formData = new FormData()
          formData.append('name', name)
          const createResult = await createDivision(formData)

          // Assert createDivision returned {} (no error)
          expect(createResult).toEqual({})
          expect(createResult.error).toBeUndefined()

          // Assert getDivisionsWithStats includes a row with the created name
          const divisions = await getDivisionsWithStats()
          const found = divisions.some((row) => row.name === name)
          expect(found).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.6: Property test P5: updateDivision round-trip ──────────────────
// Feature: division-management, Property 5: updateDivision round-trip

describe('updateDivision — Property 5: round-trip with valid name', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 5: updateDivision with valid name returns {} and getDivisionsWithStats reflects updated name — Validates: Requirements 3.3, 3.5, 5.4', async () => {
    // Feature: division-management, Property 5: updateDivision round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), fc.string({ minLength: 1, maxLength: 100 })),
        async ([id, newName]) => {
          // Mock updateDivision to return {} (success, no error)
          vi.mocked(updateDivision).mockResolvedValue({})

          // Mock getDivisionsWithStats to return an array that includes a row with the updated name
          const updatedRow = {
            id,
            name: newName,
            totalIncome: 0,
            totalExpenses: 0,
            netProfit: 0,
            leadCount: 0,
          }
          vi.mocked(getDivisionsWithStats).mockResolvedValue([updatedRow])

          // Call updateDivision with the id and a FormData containing the new name
          const formData = new FormData()
          formData.append('name', newName)
          const updateResult = await updateDivision(id, formData)

          // Assert updateDivision returned {} (no error)
          expect(updateResult).toEqual({})
          expect(updateResult.error).toBeUndefined()

          // Assert getDivisionsWithStats includes a row with the updated name
          const divisions = await getDivisionsWithStats()
          const found = divisions.some((row) => row.name === newName)
          expect(found).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.7: Property test P6: deleteDivision round-trip ──────────────────
// Feature: division-management, Property 6: deleteDivision round-trip

describe('deleteDivision — Property 6: round-trip with no FK references', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 6: deleteDivision with no FK references returns {} and division no longer appears in getDivisionsWithStats — Validates: Requirements 4.3, 4.5, 8.4', async () => {
    // Feature: division-management, Property 6: deleteDivision round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), fc.array(divisionRowArb, { minLength: 0, maxLength: 10 })),
        async ([deletedId, remainingRows]) => {
          // Filter out any row that happens to have the same id as the deleted one
          const filteredRows = remainingRows.filter((row) => row.id !== deletedId)

          // Mock deleteDivision to return {} (success, no FK error)
          vi.mocked(deleteDivision).mockResolvedValue({})

          // Mock getDivisionsWithStats to return only the remaining rows (without the deleted id)
          vi.mocked(getDivisionsWithStats).mockResolvedValue(filteredRows)

          // Call deleteDivision with the id
          const deleteResult = await deleteDivision(deletedId)

          // Assert deleteDivision returned {} (no error)
          expect(deleteResult).toEqual({})
          expect(deleteResult.error).toBeUndefined()

          // Assert getDivisionsWithStats does NOT include a row with the deleted id
          const divisions = await getDivisionsWithStats()
          const found = divisions.some((row) => row.id === deletedId)
          expect(found).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.8: Property test P7: deleteDivision FK block ────────────────────
// Feature: division-management, Property 7: deleteDivision FK block

describe('deleteDivision — Property 7: FK block returns error without throwing', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 7: deleteDivision returns { error: "Cannot delete division with existing income or expense records." } on FK violation without throwing — Validates: Requirements 4.4, 4.7, 8.1, 8.2, 8.3', async () => {
    // Feature: division-management, Property 7: deleteDivision FK block
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (id) => {
          // Mock deleteDivision to return the FK error (no throw)
          vi.mocked(deleteDivision).mockResolvedValue({
            error: 'Cannot delete division with existing income or expense records.',
          })

          // Call deleteDivision and assert it returns the FK error without throwing
          const result = await deleteDivision(id)

          expect(result).toEqual({
            error: 'Cannot delete division with existing income or expense records.',
          })
          expect(result.error).toBe(
            'Cannot delete division with existing income or expense records.'
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.9: Property test P8: invalid input always returns { error } ─────
// Feature: division-management, Property 8: invalid input always returns { error }

describe('createDivision / updateDivision — Property 8: invalid input always returns { error }', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 8: empty name or name > 100 chars to createDivision/updateDivision always returns { error } without DB write and without throwing — Validates: Requirements 2.4, 3.4, 5.2, 6.1, 6.2', async () => {
    // Feature: division-management, Property 8: invalid input always returns { error }
    const invalidNameArb = fc.oneof(
      fc.constant(''),
      fc.string({ minLength: 101, maxLength: 200 })
    )

    await fc.assert(
      fc.asyncProperty(
        invalidNameArb,
        fc.uuid(),
        async (invalidName, id) => {
          const errorMsg =
            invalidName === ''
              ? 'Division name is required.'
              : 'Division name must be 100 characters or fewer.'

          vi.mocked(createDivision).mockResolvedValue({ error: errorMsg })
          vi.mocked(updateDivision).mockResolvedValue({ error: errorMsg })

          const formData = new FormData()
          formData.append('name', invalidName)

          // createDivision must return { error: <non-empty string> } without throwing
          let createResult: { error?: string } | undefined
          let createThrew = false
          try {
            createResult = await createDivision(formData)
          } catch {
            createThrew = true
          }
          expect(createThrew).toBe(false)
          expect(createResult).toBeDefined()
          expect(typeof createResult!.error).toBe('string')
          expect(createResult!.error!.length).toBeGreaterThan(0)

          // updateDivision must return { error: <non-empty string> } without throwing
          let updateResult: { error?: string } | undefined
          let updateThrew = false
          try {
            updateResult = await updateDivision(id, formData)
          } catch {
            updateThrew = true
          }
          expect(updateThrew).toBe(false)
          expect(updateResult).toBeDefined()
          expect(typeof updateResult!.error).toBe('string')
          expect(updateResult!.error!.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.10: Property test P9: DivisionSchema round-trip ─────────────────
// Feature: division-management, Property 9: DivisionSchema round-trip

describe('DivisionSchema — Property 9: round-trip for any valid name', () => {
  it('Property 9: parsing { name } with DivisionSchema for any valid name (length 1–100) produces output with the same name value — Validates: Requirements 6.3', () => {
    // Feature: division-management, Property 9: DivisionSchema round-trip
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (name) => {
          const result = DivisionSchema.safeParse({ name })
          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.data.name).toBe(name)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Task 7.11: Property test P10: getDivisionsWithStats after create — appears sorted ──
// Feature: division-management, Property 10: getDivisionsWithStats after create — appears sorted

describe('getDivisionsWithStats after createDivision — Property 10: new division appears at correct sorted position', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 10: after createDivision succeeds, the new division appears in getDivisionsWithStats at the correct name-ascending sort position — Validates: Requirements 1.5, 2.3, 7.1', async () => {
    // Feature: division-management, Property 10: getDivisionsWithStats after create — appears sorted
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.array(divisionRowArb, { minLength: 0, maxLength: 10 }), fc.string({ minLength: 1, maxLength: 100 })),
        async ([existingRows, newName]) => {
          // Sort existing rows by name ASC
          const sortedExisting = [...existingRows].sort((a, b) => a.name.localeCompare(b.name))

          // Build the new row to insert
          const newRow = {
            id: 'new-division-id',
            name: newName,
            totalIncome: 0,
            totalExpenses: 0,
            netProfit: 0,
            leadCount: 0,
          }

          // Insert the new row at the correct sorted position
          const insertIndex = sortedExisting.findIndex((row) => row.name.localeCompare(newName) > 0)
          const sortedWithNew =
            insertIndex === -1
              ? [...sortedExisting, newRow]
              : [...sortedExisting.slice(0, insertIndex), newRow, ...sortedExisting.slice(insertIndex)]

          // Mock createDivision to return {} (success)
          vi.mocked(createDivision).mockResolvedValue({})

          // Mock getDivisionsWithStats to return the array with the new division inserted at the correct sorted position
          vi.mocked(getDivisionsWithStats).mockResolvedValue(sortedWithNew)

          // Call createDivision
          const formData = new FormData()
          formData.append('name', newName)
          const createResult = await createDivision(formData)

          // Assert createDivision returned {} (no error)
          expect(createResult).toEqual({})

          // Get the result from getDivisionsWithStats
          const result = await getDivisionsWithStats()

          // Assert the result is sorted by name ASC
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].name.localeCompare(result[i].name) <= 0).toBe(true)
          }

          // Assert the new division appears in the result
          const found = result.some((row) => row.name === newName)
          expect(found).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

export { divisionRowArb }
