/**
 * Property 6: Pricing table row completeness
 * Validates: Requirements 10.5
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { pricingRows } from '../../data/pricing'

describe('PricingSection — Property 6: Pricing table row completeness', () => {
  it('should have exactly eleven pricing rows', () => {
    expect(pricingRows).toHaveLength(11)
  })

  it('every row at an arbitrary index 0–10 has a service name, price string, and turnaround string', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (index) => {
        const row = pricingRows[index]
        expect(typeof row.service).toBe('string')
        expect(row.service.length).toBeGreaterThan(0)
        expect(typeof row.price).toBe('string')
        expect(row.price.length).toBeGreaterThan(0)
        expect(typeof row.turnaround).toBe('string')
        expect(row.turnaround.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 },
    )
  })
})
