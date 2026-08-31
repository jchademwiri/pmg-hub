/**
 * Property 5: Service card completeness
 * Validates: Requirements 8.3, 8.4
 *
 * For each of the three main service cards, assert the data contains a
 * service name, description, and a price label.
 * Uses fast-check to generate arbitrary indices 0–2 and verify each card.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { services } from '../../data/services';

describe('ServicesSection - Property 5: Service card completeness', () => {
  it('should have exactly three main service cards', () => {
    expect(services).toHaveLength(3);
  });

  it('every card at an arbitrary index 0–2 has a non-empty name, description, and price label', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (index) => {
        const card = services[index];

        expect(typeof card.name).toBe('string');
        expect(card.name.length).toBeGreaterThan(0);

        expect(typeof card.description).toBe('string');
        expect(card.description.length).toBeGreaterThan(0);

        expect(typeof card.price).toBe('string');
        expect(card.price.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
