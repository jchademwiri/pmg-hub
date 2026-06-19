import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

vi.mock('server-only', () => ({}))

vi.mock('@pmg/db', () => ({
  getTotalRevenue: vi.fn(),
  getTotalExpenses: vi.fn(),
  getRevenueByDivision: vi.fn(),
  getLeadsByStatus: vi.fn(),
  getActiveRates: vi.fn().mockResolvedValue({
    pmg_share: 0.25,
    salary: 0.35,
    reinvest: 0.30,
    reserve: 0.30,
    flex: 0.05,
  }),
  ACCOUNT_RATES: {
    salary: 0.35,
    reinvest: 0.30,
    reserve: 0.30,
    flex: 0.05,
    pmg_share: 0.25,
  },
  PROFIT_POOL_RATES: {
    salary: 0.35,
    reinvest: 0.30,
    reserve: 0.30,
    flex: 0.05,
  },
}))

import { getTotalRevenue, getTotalExpenses, getRevenueByDivision, getLeadsByStatus, getActiveRates } from '@pmg/db'
import { getFinancialSummary, getDivisionRevenue, getLeadCounts, formatZAR } from '@/lib/financial'

describe('getFinancialSummary', () => {
  describe('unit tests', () => {
    beforeEach(() => {
      vi.resetAllMocks()
      vi.mocked(getActiveRates).mockResolvedValue({
        pmg_share: 0.25,
        salary: 0.35,
        reinvest: 0.30,
        reserve: 0.30,
        flex: 0.05,
      })
    })

    it('standard case - revenue=100000, expenses=40000 produces correct eight fields', async () => {
      vi.mocked(getTotalRevenue).mockResolvedValue(100000)
      vi.mocked(getTotalExpenses).mockResolvedValue(40000)

      const result = await getFinancialSummary()

      expect(result.revenue).toBe(100000)
      expect(result.expenses).toBe(40000)
      expect(result.pmgShare).toBe(25000)
      expect(result.profitPool).toBe(35000)
      expect(result.salary).toBe(12250)
      expect(result.reinvest).toBe(10500)
      expect(result.reserve).toBe(10500)
      expect(result.flex).toBe(1750)
    })

    it('zero case - revenue=0, expenses=0 returns all eight fields as 0 without error', async () => {
      vi.mocked(getTotalRevenue).mockResolvedValue(0)
      vi.mocked(getTotalExpenses).mockResolvedValue(0)

      const result = await getFinancialSummary()

      expect(result.revenue).toBe(0)
      expect(result.expenses).toBe(0)
      expect(result.pmgShare).toBe(0)
      expect(result.profitPool).toBe(0)
      expect(result.salary).toBe(0)
      expect(result.reinvest).toBe(0)
      expect(result.reserve).toBe(0)
      expect(result.flex).toBe(0)
    })

    it('loss case - revenue=10000, expenses=15000 produces correct negative values', async () => {
      vi.mocked(getTotalRevenue).mockResolvedValue(10000)
      vi.mocked(getTotalExpenses).mockResolvedValue(15000)

      const result = await getFinancialSummary()

      expect(result.pmgShare).toBe(2500)
      expect(result.profitPool).toBe(-7500)
      expect(result.salary).toBe(-2625)
      expect(result.reinvest).toBe(-2250)
      expect(result.reserve).toBe(-2250)
      expect(result.flex).toBe(-375)
    })

    it('determinism - same mocked inputs called twice produce structurally identical results', async () => {
      vi.mocked(getTotalRevenue).mockResolvedValue(50000)
      vi.mocked(getTotalExpenses).mockResolvedValue(20000)

      const first = await getFinancialSummary()

      vi.mocked(getTotalRevenue).mockResolvedValue(50000)
      vi.mocked(getTotalExpenses).mockResolvedValue(20000)

      const second = await getFinancialSummary()

      expect(first).toEqual(second)
    })
  })

  describe('property tests', () => {
    beforeEach(() => {
      vi.resetAllMocks()
      vi.mocked(getActiveRates).mockResolvedValue({
        pmg_share: 0.25,
        salary: 0.35,
        reinvest: 0.30,
        reserve: 0.30,
        flex: 0.05,
      })
    })

    it('Property 1: financial formulas correctness', async () => {
      // Feature: financial-engine, Property 1: Financial formulas correctness
      await fc.assert(
        fc.asyncProperty(
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          async (revenue, expenses) => {
            vi.mocked(getTotalRevenue).mockResolvedValue(revenue)
            vi.mocked(getTotalExpenses).mockResolvedValue(expenses)

            const result = await getFinancialSummary()

            const pmgShare = revenue * 0.25
            const profitPool = revenue - expenses - pmgShare

            expect(result.pmgShare).toBeCloseTo(pmgShare, 10)
            expect(result.profitPool).toBeCloseTo(profitPool, 10)
            expect(result.salary).toBeCloseTo(profitPool * 0.35, 10)
            expect(result.reinvest).toBeCloseTo(profitPool * 0.30, 10)
            expect(result.reserve).toBeCloseTo(profitPool * 0.30, 10)
            expect(result.flex).toBeCloseTo(profitPool * 0.05, 10)
          }
        )
      )
    })

    it('Property 2: allocation sum invariant', async () => {
      // Feature: financial-engine, Property 2: Allocation sum invariant
      // Validates: Requirements 2.1
      await fc.assert(
        fc.asyncProperty(
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          async (revenue, expenses) => {
            // Skip cases where arithmetic would overflow to Infinity/NaN before running any side effects
            const pmgShare = revenue * 0.25
            const profitPool = revenue - expenses - pmgShare
            fc.pre(isFinite(profitPool))

            vi.mocked(getTotalRevenue).mockResolvedValue(revenue)
            vi.mocked(getTotalExpenses).mockResolvedValue(expenses)

            const result = await getFinancialSummary()

            const sum = result.salary + result.reinvest + result.reserve + result.flex
            const diff = Math.abs(sum - result.profitPool)
            const scale = Math.max(Math.abs(result.profitPool), 1)
            expect(diff / scale).toBeLessThan(1e-10)
          }
        )
      )
    })

    it('Property 3: concurrent fetch and single invocation', async () => {
      // Feature: financial-engine, Property 3: Concurrent fetch and single invocation
      // Validates: Requirements 1.1, 1.9
      await fc.assert(
        fc.asyncProperty(
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          async (revenue, expenses) => {
            vi.resetAllMocks()
            vi.mocked(getActiveRates).mockResolvedValue({
              pmg_share: 0.25,
              salary: 0.35,
              reinvest: 0.30,
              reserve: 0.30,
              flex: 0.05,
            })
            vi.mocked(getTotalRevenue).mockResolvedValue(revenue)
            vi.mocked(getTotalExpenses).mockResolvedValue(expenses)

            await getFinancialSummary()

            expect(vi.mocked(getTotalRevenue).mock.calls.length).toBe(1)
            expect(vi.mocked(getTotalExpenses).mock.calls.length).toBe(1)
          }
        )
      )
    })

    it('Property 5: negative profitPool propagates correctly', async () => {
      // Feature: financial-engine, Property 5: Negative profitPool propagates correctly
      // Validates: Requirements 2.4
      await fc.assert(
        fc.asyncProperty(
          fc.double({ noNaN: true, noDefaultInfinity: true, min: 0, max: 1e12 }),
          fc.double({ noNaN: true, noDefaultInfinity: true, min: 1, max: 1e12 }),
          async (revenue, positiveOffset) => {
            const expenses = revenue * 0.8 + positiveOffset

            vi.mocked(getTotalRevenue).mockResolvedValue(revenue)
            vi.mocked(getTotalExpenses).mockResolvedValue(expenses)

            const result = await getFinancialSummary()

            expect(result.profitPool).toBeLessThan(0)
            expect(result.salary).toBeLessThan(0)
            expect(result.reinvest).toBeLessThan(0)
            expect(result.reserve).toBeLessThan(0)
            expect(result.flex).toBeLessThan(0)

            expect(result.salary).toBeCloseTo(result.profitPool * 0.35, 10)
            expect(result.reinvest).toBeCloseTo(result.profitPool * 0.30, 10)
            expect(result.reserve).toBeCloseTo(result.profitPool * 0.30, 10)
            expect(result.flex).toBeCloseTo(result.profitPool * 0.05, 10)
          }
        )
      )
    })

    it('Property 10: getFinancialSummary determinism', async () => {
      // Feature: financial-engine, Property 10: getFinancialSummary determinism
      // Validates: Requirements 7.1
      await fc.assert(
        fc.asyncProperty(
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          async (revenue, expenses) => {
            vi.mocked(getTotalRevenue).mockResolvedValue(revenue)
            vi.mocked(getTotalExpenses).mockResolvedValue(expenses)
            const first = await getFinancialSummary()

            vi.mocked(getTotalRevenue).mockResolvedValue(revenue)
            vi.mocked(getTotalExpenses).mockResolvedValue(expenses)
            const second = await getFinancialSummary()

            expect(first).toEqual(second)
          }
        )
      )
    })
  })
})

describe('getDivisionRevenue', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 6: passthrough - returns getRevenueByDivision result unchanged', async () => {
    // Feature: financial-engine, Property 6: getDivisionRevenue passthrough
    // Validates: Requirements 3.1
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            divisionName: fc.string(),
            total: fc.double({ noNaN: true, noDefaultInfinity: true }),
          })
        ),
        async (divisions) => {
          vi.mocked(getRevenueByDivision).mockResolvedValue(divisions)
          const result = await getDivisionRevenue()
          expect(result).toEqual(divisions)
        }
      )
    )
  })
})

describe('getLeadCounts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Property 7: passthrough - returns getLeadsByStatus result unchanged', async () => {
    // Feature: financial-engine, Property 7: getLeadCounts passthrough
    // Validates: Requirements 4.1
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            status: fc.string(),
            count: fc.integer({ min: 0 }),
          })
        ),
        async (leads) => {
          vi.mocked(getLeadsByStatus).mockResolvedValue(leads)
          const result = await getLeadCounts()
          expect(result).toEqual(leads)
        }
      )
    )
  })
})

describe('formatZAR', () => {
  describe('unit tests', () => {
    it('positive amount (1234.5) contains R and two decimal places', () => {
      const result = formatZAR(1234.5)
      expect(result).toMatch(/R/)
      expect(result).toMatch(/\.\d{2}$|,\d{2}$/)
    })

    it('zero (0) contains R and two decimal places', () => {
      const result = formatZAR(0)
      expect(result).toMatch(/R/)
      expect(result).toMatch(/\.\d{2}$|,\d{2}$/)
    })

    it('negative (-500) contains R and two decimal places', () => {
      const result = formatZAR(-500)
      expect(result).toMatch(/R/)
      expect(result).toMatch(/\.\d{2}$|,\d{2}$/)
    })
  })

  describe('property tests', () => {
    it('Property 8: output correctness for all finite numbers', () => {
      // Feature: financial-engine, Property 8: formatZAR output correctness
      // Validates: Requirements 5.1, 5.2, 5.3
      fc.assert(
        fc.property(
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          (amount) => {
            const result = formatZAR(amount)
            expect(result.length).toBeGreaterThan(0)
            expect(result).toMatch(/R/)
            expect(result).toMatch(/\.\d{2}$|,\d{2}$/)
          }
        )
      )
    })

    it('Property 9: formatZAR determinism', () => {
      // Feature: financial-engine, Property 9: formatZAR determinism
      // Validates: Requirements 5.4
      fc.assert(
        fc.property(
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          (amount) => {
            const first = formatZAR(amount)
            const second = formatZAR(amount)
            expect(first === second).toBe(true)
          }
        )
      )
    })
  })
})
