/**
 * Unit + Property-Based Tests for the Luno history helpers.
 *
 * Property 5: Account ID is placed verbatim in the upstream URL (Validates: Requirements 1.6)
 * Property 6: Transaction transformation preserves order (Validates: Requirements 2.1, 2.2)
 */

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import { buildLunoUrl, transformTransaction, transformTransactions } from '../luno';

describe('buildLunoUrl', () => {
  it('builds the correct URL for a given account id', () => {
    expect(buildLunoUrl('acc_123')).toBe(
      'https://api.luno.com/api/1/accounts/acc_123/transactions?min_row=-100&max_row=0',
    );
  });

  it('Property 5 — URL is HTTPS, targets api.luno.com, contains the exact accountId, and includes the row range — Validates: Requirements 1.6', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (accountId) => {
        const url = buildLunoUrl(accountId);
        expect(url.startsWith('https://')).toBe(true);
        expect(url).toContain('api.luno.com');
        expect(url).toContain(`/accounts/${accountId}/transactions`);
        expect(url).toContain('min_row=-100');
        expect(url).toContain('max_row=0');
      }),
      { numRuns: 100 },
    );
  });
});

// ── transformTransaction ──────────────────────────────────────────────────────

describe('transformTransaction', () => {
  it('converts timestamp (Unix ms) to a UTC YYYY-MM-DD date and rounds balance to 8 dp', () => {
    // 2023-11-14T22:13:20.000Z
    const point = transformTransaction({ timestamp: 1700000000000, balance: '0.00351234567' });
    expect(point.date).toBe('2023-11-14');
    expect(point.balance).toBe(0.00351235);
  });

  it('keeps integer balances at 8 dp precision', () => {
    expect(transformTransaction({ timestamp: 1700000000000, balance: '1' }).balance).toBe(1);
  });

  it('throws with field "timestamp" when timestamp is missing', () => {
    expect(() => transformTransaction({ balance: '1' })).toThrow('timestamp');
  });

  it('throws with field "timestamp" when timestamp is not a finite integer', () => {
    expect(() => transformTransaction({ timestamp: 'abc', balance: '1' })).toThrow('timestamp');
    expect(() => transformTransaction({ timestamp: 1.5, balance: '1' })).toThrow('timestamp');
    expect(() => transformTransaction({ timestamp: Number.NaN, balance: '1' })).toThrow(
      'timestamp',
    );
  });

  it('throws with field "timestamp" when timestamp is zero or negative', () => {
    expect(() => transformTransaction({ timestamp: 0, balance: '1' })).toThrow('timestamp');
    expect(() => transformTransaction({ timestamp: -5, balance: '1' })).toThrow('timestamp');
  });

  it('throws with field "balance" when balance is missing or unparseable', () => {
    expect(() => transformTransaction({ timestamp: 1700000000000 })).toThrow('balance');
    expect(() => transformTransaction({ timestamp: 1700000000000, balance: 'xyz' })).toThrow(
      'balance',
    );
    expect(() => transformTransaction({ timestamp: 1700000000000, balance: null })).toThrow(
      'balance',
    );
  });
});

// ── transformTransactions ─────────────────────────────────────────────────────

describe('transformTransactions', () => {
  it('returns ok:true with an empty data array for an empty input', () => {
    expect(transformTransactions([])).toEqual({ ok: true, data: [] });
  });

  it('preserves order and length for valid transactions', () => {
    const txs = [
      { timestamp: 1700000000000, balance: '0.1' },
      { timestamp: 1700000001000, balance: '0.2' },
      { timestamp: 1700000002000, balance: '0.3' },
    ];
    const result = transformTransactions(txs);
    expect(result).toEqual({
      ok: true,
      data: [
        { date: '2023-11-14', balance: 0.1 },
        { date: '2023-11-14', balance: 0.2 },
        { date: '2023-11-14', balance: 0.3 },
      ],
    });
  });

  it('returns ok:false with the offending field name and no partial data', () => {
    const txs = [
      { timestamp: 1700000000000, balance: '0.1' },
      { timestamp: -1, balance: '0.2' },
    ];
    const result = transformTransactions(txs);
    expect(result).toEqual({ ok: false, field: 'timestamp' });
  });

  it('Property 6 — output length and order correspond 1:1 to the input — Validates: Requirements 2.1, 2.2', () => {
    const validTransactionArb = fc.record({
      timestamp: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
      balance: fc.string({ minLength: 1 }).map((s) => {
        const clean = s.replace(/[^0-9.]/g, '');
        return clean.length > 0 ? clean : '0';
      }),
    });

    fc.assert(
      fc.property(fc.array(validTransactionArb), (txs) => {
        const result = transformTransactions(txs);
        if (!result.ok) return; // generated balance may be unparseable — skip
        expect(result.data).toHaveLength(txs.length);
        result.data.forEach((point, i) => {
          const t = txs[i];
          expect(point.date).toBe(new Date(t.timestamp).toISOString().slice(0, 10));
        });
      }),
      { numRuns: 100 },
    );
  });
});
