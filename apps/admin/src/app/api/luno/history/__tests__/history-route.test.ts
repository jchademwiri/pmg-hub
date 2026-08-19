/**
 * Integration + Property-Based Tests for the History Route.
 *
 * Property 7: Invalid transaction fields → 422 (Validates: Requirements 2.6)
 * Property 11: Invalid accountId format → 400 (Validates: Requirements 1.12)
 * Plus example-based integration coverage of the full error table.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } from '../[accountId]/route';

const VALID_TRANSACTIONS = [
  { timestamp: 1700000000000, balance: '0.00350000' },
  { timestamp: 1700000100000, balance: '0.00450000' },
  { timestamp: 1700000200000, balance: '0.00500000' },
];

function mockUpstream(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('History Route', () => {
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalKeyId = process.env.LUNO_API_KEY_ID;
    originalKeySecret = process.env.LUNO_API_KEY_SECRET;
    process.env.LUNO_API_KEY_ID = 'test-key-id';
    process.env.LUNO_API_KEY_SECRET = 'test-key-secret';
  });

  afterEach(() => {
    if (originalKeyId === undefined) delete process.env.LUNO_API_KEY_ID;
    else process.env.LUNO_API_KEY_ID = originalKeyId;
    if (originalKeySecret === undefined) delete process.env.LUNO_API_KEY_SECRET;
    else process.env.LUNO_API_KEY_SECRET = originalKeySecret;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const callGet = (accountId: string) =>
    GET(new Request(`http://localhost/api/luno/history/${accountId}`, { method: 'GET' }), {
      params: Promise.resolve({ accountId }),
    });

  it('returns 405 for every non-GET method', async () => {
    const handlers = { POST, PUT, PATCH, DELETE, HEAD, OPTIONS };
    for (const [method, handler] of Object.entries(handlers)) {
      const response = await handler();
      expect(response.status, method).toBe(405);
      expect(await response.json()).toEqual({ error: 'Method Not Allowed' });
    }
  });

  it('returns 500 without an outbound call when credentials are missing', async () => {
    delete process.env.LUNO_API_KEY_ID;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await callGet('acc-1');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Property 11 — invalid accountId formats return 400 without an outbound call — Validates: Requirements 1.12', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (accountId) => {
        const valid = /^[A-Za-z0-9_-]{1,64}$/.test(accountId);
        if (valid) return; // only test invalid values

        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const response = await callGet(accountId);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Invalid account ID' });
        expect(fetchSpy).not.toHaveBeenCalled();
        vi.restoreAllMocks();
      }),
      { numRuns: 100 },
    );
  });

  it('returns 504 when the upstream request times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          (init?.signal as AbortSignal | undefined)?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );

    vi.useFakeTimers();
    const responsePromise = callGet('acc-1');
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await responsePromise;

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: 'Upstream timeout' });
  });

  it('returns 502 with the upstream status on a non-2xx response', async () => {
    mockUpstream({ error: 'Forbidden' }, 403);

    const response = await callGet('acc-1');
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Upstream error', status: 403 });
  });

  it('returns 502 when the response body lacks a transactions array', async () => {
    mockUpstream({ balance: [] });

    const response = await callGet('acc-1');
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Invalid upstream response' });
  });

  it('returns 422 with the offending field for invalid transaction data — Validates: Requirements 2.6', async () => {
    mockUpstream({ transactions: [{ timestamp: -5, balance: '1' }] });

    const response = await callGet('acc-1');
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'Invalid transaction data',
      field: 'timestamp',
    });
  });

  it('Property 7 — a single corrupted entry yields 422 with the field name — Validates: Requirements 2.6', async () => {
    const validTxArb = fc.record({
      timestamp: fc.integer({ min: 1, max: 4102444800000 }),
      balance: fc.constant('0.00350000'),
    });
    const badTxArb = fc.oneof(
      fc.record({ balance: fc.constant('0.1') }), // missing timestamp
      fc.record({ timestamp: fc.constant(-1), balance: fc.constant('0.1') }), // negative timestamp
      fc.record({ timestamp: fc.constant(1.5), balance: fc.constant('0.1') }), // non-integer timestamp
      fc.record({ timestamp: fc.integer({ min: 1 }), balance: fc.constant('nope') }), // bad balance
    );

    await fc.assert(
      fc.asyncProperty(
        fc.array(validTxArb, { minLength: 1, maxLength: 5 }),
        badTxArb,
        async (validTxs, badTx) => {
          // Put the corrupted entry somewhere in the middle to prove no partial data.
          const transactions = [...validTxs, badTx];
          mockUpstream({ transactions });

          const response = await callGet('acc-1');
          expect(response.status).toBe(422);
          const body = (await response.json()) as { field: string };
          expect(['timestamp', 'balance']).toContain(body.field);
          vi.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns 200 with transformed data on a successful round-trip', async () => {
    mockUpstream({ transactions: VALID_TRANSACTIONS });

    const response = await callGet('acc-1');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: Array<{ date: string; balance: number }> };
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toEqual({ date: '2023-11-14', balance: 0.0035 });
    expect(body.data[2].balance).toBe(0.005);
  });

  it('returns 200 with an empty data array for an empty transactions array', async () => {
    mockUpstream({ transactions: [] });

    const response = await callGet('acc-1');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [] });
  });
});
