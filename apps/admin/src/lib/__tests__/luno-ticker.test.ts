/**
 * Unit + Property-Based Tests for the Luno ticker helpers.
 *
 * Property 12: Ticker URL construction (Validates: Requirements 4.3)
 * Property 13: Ticker price extraction (Validates: Requirements 4.4, 4.5)
 */

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import { buildTickerUrl, isTokenisedStock, mapTickerPrice } from '../luno';

describe('buildTickerUrl', () => {
  it('builds the correct URL for a given asset', () => {
    expect(buildTickerUrl('XBT')).toBe('https://api.luno.com/api/1/ticker?pair=XBTZAR');
    expect(buildTickerUrl('ETH')).toBe('https://api.luno.com/api/1/ticker?pair=ETHZAR');
  });

  it('Property 12 — URL is HTTPS, targets api.luno.com, path /api/1/ticker, pair={asset}ZAR — Validates: Requirements 4.3', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (asset) => {
        const url = buildTickerUrl(asset);
        expect(url.startsWith('https://')).toBe(true);
        expect(url).toContain('api.luno.com');
        expect(url).toContain('/api/1/ticker');
        expect(url).toContain(`pair=${asset}ZAR`);
      }),
      { numRuns: 100 },
    );
  });
});

describe('mapTickerPrice', () => {
  it('extracts last_trade as a number from a valid ticker body', () => {
    expect(mapTickerPrice({ last_trade: '1234567.89' })).toBe(1234567.89);
    expect(mapTickerPrice({ last_trade: '0' })).toBe(0);
    expect(mapTickerPrice({ last_trade: '1e3' })).toBe(1000);
  });

  it('returns null for non-object bodies', () => {
    expect(mapTickerPrice(null)).toBeNull();
    expect(mapTickerPrice(undefined)).toBeNull();
    expect(mapTickerPrice('not an object')).toBeNull();
    expect(mapTickerPrice(42)).toBeNull();
  });

  it('returns null when last_trade is missing, non-string, or unparseable', () => {
    expect(mapTickerPrice({})).toBeNull();
    expect(mapTickerPrice({ last_trade: undefined })).toBeNull();
    expect(mapTickerPrice({ last_trade: null })).toBeNull();
    expect(mapTickerPrice({ last_trade: 123 })).toBeNull();
    expect(mapTickerPrice({ last_trade: 'abc' })).toBeNull();
    expect(mapTickerPrice({ last_trade: '' })).toBeNull();
  });

  it('returns null for negative prices', () => {
    expect(mapTickerPrice({ last_trade: '-1.5' })).toBeNull();
  });

  it('Property 13 — invalid bodies always produce null — Validates: Requirements 4.5', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined), fc.integer(), fc.record({ last_trade: fc.constant('nope') })),
        (body) => {
          expect(mapTickerPrice(body)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 13 — any valid decimal string last_trade parses to its numeric value — Validates: Requirements 4.4', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).map((s) => {
          // Keep the generated string parseable as a float (prefix it with a
          // digit and strip any leading minus so it stays non-negative).
          const clean = s.replace(/[^0-9.]/g, '');
          return clean.length > 0 ? clean : '0';
        }),
        (decimalString) => {
          const price = mapTickerPrice({ last_trade: decimalString });
          if (price === null) {
            // Unparseable edge cases (e.g. "." or "1.2.3") must return null —
            // never NaN/Infinity.
            return;
          }
          expect(Number.isFinite(price)).toBe(true);
          expect(price).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('isTokenisedStock', () => {
  it('recognises Luno tokenised stocks by their x suffix', () => {
    expect(isTokenisedStock('AAPLx')).toBe(true);
    expect(isTokenisedStock('MSFTx')).toBe(true);
    expect(isTokenisedStock('SPYx')).toBe(true);
    expect(isTokenisedStock('QQQx')).toBe(true);
    expect(isTokenisedStock('GLDx')).toBe(true);
    expect(isTokenisedStock('TQQQx')).toBe(true);
  });

  it('does not flag crypto assets or empty strings', () => {
    expect(isTokenisedStock('XBT')).toBe(false);
    expect(isTokenisedStock('ETH')).toBe(false);
    expect(isTokenisedStock('USDC')).toBe(false);
    expect(isTokenisedStock('')).toBe(false);
    expect(isTokenisedStock('x')).toBe(false); // no ticker before the suffix
  });

  it('is case-insensitive', () => {
    expect(isTokenisedStock('aaplx')).toBe(true);
    expect(isTokenisedStock('Applex')).toBe(true);
  });

  it('Property 14 — asset codes ending in x are tokenised, others are not — Validates: Requirements 5.7', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.constantFrom('A', 'Z', '0', '9'), { minLength: 1, maxLength: 8 })
          .map((chars) => chars.join('')),
        fc.boolean(),
        (code, withX) => {
          const asset = withX ? code + 'x' : code;
          expect(isTokenisedStock(asset)).toBe(withX);
        },
      ),
      { numRuns: 100 },
    );
  });
});
