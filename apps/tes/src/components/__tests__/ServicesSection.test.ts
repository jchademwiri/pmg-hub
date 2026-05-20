/**
 * Property 5: Service card completeness
 * Validates: Requirements 8.3, 8.4
 *
 * For each of the six service cards, assert the data contains a service name,
 * description, and a price string beginning with "R".
 * Uses fast-check to generate arbitrary indices 0–5 and verify each card.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { services } from '../../data/services'

describe('ServicesSection - Property 5: Service card completeness', () => {
  it('should have exactly six service cards', () => {
    expect(services).toHaveLength(6)
  })

  it('every card at an arbitrary index 0–5 has a non-empty name, description, and price starting with R', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5 }), (index) => {
        const card = services[index]

        // name must be a non-empty string
        expect(typeof card.name).toBe('string')
        expect(card.name.length).toBeGreaterThan(0)

        // description must be a non-empty string
        expect(typeof card.description).toBe('string')
        expect(card.description.length).toBeGreaterThan(0)

        // price must contain "R" (South African Rand currency marker)
        expect(typeof card.price).toBe('string')
        expect(card.price.includes('R')).toBe(true)
      }),
      { numRuns: 100 },
    )
  })
})
