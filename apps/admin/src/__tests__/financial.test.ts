import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@pmg/db', () => ({
  getTotalRevenue: vi.fn(),
  getTotalExpenses: vi.fn(),
  getRevenueByDivision: vi.fn(),
  getLeadsByStatus: vi.fn(),
}))

import { getTotalRevenue, getTotalExpenses } from '@pmg/db'
import { getFinancialSummary, formatZAR } from '@/lib/financial'

describe('getFinancialSummary', () => {
  describe('unit tests', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('standard case — revenue=100000, expenses=40000 produces correct eight fields', async () => {
      vi.mocked(getTotalRevenue).mockResolvedValue(100000)
      vi.mocked(getTotalExpenses).mockResolvedValue(40000)

      const result = await getFinancialSummary()

      expect(result.revenue).toBe(100000)
      expect(result.expenses).toBe(40000)
      expect(result.pmgShare).toBe(20000)
      expect(result.profitPool).toBe(40000)
      expect(result.salary).toBe(14000)
      expect(result.reinvest).toBe(12000)
      expect(result.reserve).toBe(12000)
      expect(result.flex).toBe(2000)
    })

    it('zero case — revenue=0, expenses=0 returns all eight fields as 0 without error', async () => {
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

    it('loss case — revenue=10000, expenses=15000 produces correct negative values', async () => {
      vi.mocked(getTotalRevenue).mockResolvedValue(10000)
      vi.mocked(getTotalExpenses).mockResolvedValue(15000)

      const result = await getFinancialSummary()

      expect(result.pmgShare).toBe(2000)
      expect(result.profitPool).toBe(-7000)
      expect(result.salary).toBe(-2450)
      expect(result.reinvest).toBe(-2100)
      expect(result.reserve).toBe(-2100)
      expect(result.flex).toBe(-350)
    })

    it('determinism — same mocked inputs called twice produce structurally identical results', async () => {
      vi.mocked(getTotalRevenue).mockResolvedValue(50000)
      vi.mocked(getTotalExpenses).mockResolvedValue(20000)

      const first = await getFinancialSummary()

      vi.mocked(getTotalRevenue).mockResolvedValue(50000)
      vi.mocked(getTotalExpenses).mockResolvedValue(20000)

      const second = await getFinancialSummary()

      expect(first).toEqual(second)
    })
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
})
