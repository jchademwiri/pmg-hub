import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { anyKeyword } from '../src/queries/spend-trackers';

describe('anyKeyword', () => {
  it('never returns undefined, even for an empty keyword list', () => {
    // Regression: drizzle-orm's or() returns `undefined` for zero arguments
    // (not a thrown error), and neither and() nor not() guard against an
    // undefined operand - they silently build a broken SQL fragment instead
    // of failing loudly. Every SPEND_TRACKERS config today has non-empty
    // keyword arrays, but a future tracker with an empty list would
    // misclassify rows rather than error, so this must hold unconditionally.
    const result = anyKeyword(sql`col`, []);
    expect(result).toBeDefined();
    expect(result).not.toBeUndefined();
  });

  it('does not throw when composed with and()/not() on an empty list', async () => {
    const { and, not } = await import('drizzle-orm');
    expect(() => not(anyKeyword(sql`col`, []))).not.toThrow();
    expect(() => and(not(anyKeyword(sql`col`, [])), sql`1=1`)).not.toThrow();
  });

  it('still builds a normal OR chain for a non-empty list', () => {
    const result = anyKeyword(sql`col`, ['a', 'b']);
    expect(result).toBeDefined();
  });
});
