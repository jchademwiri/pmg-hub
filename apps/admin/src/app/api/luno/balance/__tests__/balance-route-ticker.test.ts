/**
 * Integration tests for the Balance Route's ZAR ticker enrichment.
 *
 * Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7 (ticker conversion,
 * graceful degradation, account filtering, empty accounts, timeout)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BALANCE_BODY = {
  balance: [
    {
      account_id: 'acc-xbt',
      asset: 'XBT',
      balance: '0.50000000',
      reserved: '0.00000000',
      unconfirmed: '0.00000000',
      name: 'Bitcoin Wallet',
    },
    {
      account_id: 'acc-eth',
      asset: 'ETH',
      balance: '2.00000000',
      reserved: '0.00000000',
      unconfirmed: '0.00000000',
    },
  ],
};

/** Mocks fetch, dispatching on URL: ticker calls get tickerBody, others get balanceBody. */
function mockUpstream(balanceBody: unknown, tickerBody: unknown, tickerStatus = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/1/ticker')) {
      return Promise.resolve(
        new Response(JSON.stringify(tickerBody), {
          status: tickerStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(balanceBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
}

function tickerCalls(fetchSpy: { mock: { calls: Array<Array<unknown>> } }): string[] {
  return fetchSpy.mock.calls
    .map((args) => String(args[0]))
    .filter((url) => url.includes('/api/1/ticker'));
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Balance Route — ZAR ticker enrichment', () => {
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;
  let originalAccountId: string | undefined;

  beforeEach(() => {
    originalKeyId = process.env.LUNO_API_KEY_ID;
    originalKeySecret = process.env.LUNO_API_KEY_SECRET;
    originalAccountId = process.env.LUNO_ACCOUNT_ID;
    process.env.LUNO_API_KEY_ID = 'test-key-id';
    process.env.LUNO_API_KEY_SECRET = 'test-key-secret';
    delete process.env.LUNO_ACCOUNT_ID;
  });

  afterEach(() => {
    if (originalKeyId === undefined) delete process.env.LUNO_API_KEY_ID;
    else process.env.LUNO_API_KEY_ID = originalKeyId;
    if (originalKeySecret === undefined) delete process.env.LUNO_API_KEY_SECRET;
    else process.env.LUNO_API_KEY_SECRET = originalKeySecret;
    if (originalAccountId === undefined) delete process.env.LUNO_ACCOUNT_ID;
    else process.env.LUNO_ACCOUNT_ID = originalAccountId;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('computes zar_value = balance × last_trade for each account — Validates: Requirements 4.4', async () => {
    const fetchSpy = mockUpstream(BALANCE_BODY, { last_trade: '1000000.00' });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { accounts: Array<{ account_id: string; asset: string; zar_value: number | null }> };
    expect(body.accounts).toHaveLength(2);

    // 0.5 XBT × 1,000,000 ZAR = 500,000
    const xbt = body.accounts.find((a) => a.account_id === 'acc-xbt');
    expect(xbt?.zar_value).toBe(500000);

    // 2 ETH × 1,000,000 ZAR = 2,000,000
    const eth = body.accounts.find((a) => a.account_id === 'acc-eth');
    expect(eth?.zar_value).toBe(2000000);

    // One ticker call per unique asset
    expect(tickerCalls(fetchSpy)).toEqual([
      'https://api.luno.com/api/1/ticker?pair=XBTZAR',
      'https://api.luno.com/api/1/ticker?pair=ETHZAR',
    ]);
  });

  it('rounds zar_value to 8 decimal places — Validates: Requirements 4.4', async () => {
    mockUpstream(
      { balance: [{ account_id: 'a1', asset: 'XBT', balance: '0.00350000', reserved: '0', unconfirmed: '0' }] },
      { last_trade: '1234567.89' },
    );

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    const body = (await response.json()) as { accounts: Array<{ zar_value: number }> };

    // 0.0035 × 1234567.89 = 4320.987615 → rounded to 8 dp
    expect(body.accounts[0].zar_value).toBe(Math.round(0.0035 * 1234567.89 * 1e8) / 1e8);
  });

  it('degrades to zar_value: null on a non-2xx ticker response and still returns 200 — Validates: Requirements 4.5', async () => {
    mockUpstream(BALANCE_BODY, { error: 'rate limited' }, 429);

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { accounts: Array<{ zar_value: number | null }> };
    expect(body.accounts).toHaveLength(2);
    for (const account of body.accounts) {
      expect(account.zar_value).toBeNull();
    }
  });

  it('degrades to zar_value: null on an invalid ticker body (missing last_trade) — Validates: Requirements 4.5', async () => {
    mockUpstream(BALANCE_BODY, { foo: 'bar' });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { accounts: Array<{ zar_value: number | null }> };
    expect(body.accounts[0].zar_value).toBeNull();
  });

  it('degrades to zar_value: null when the ticker call times out — Validates: Requirements 4.5', async () => {
    // Ticker fetch never resolves and aborts on signal; the balance call succeeds.
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/1/ticker')) {
        return new Promise<Response>((_resolve, reject) => {
          (init?.signal as AbortSignal | undefined)?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify(BALANCE_BODY), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    vi.useFakeTimers();
    const responsePromise = GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await responsePromise;

    expect(response.status).toBe(200);
    const body = (await response.json()) as { accounts: Array<{ zar_value: number | null }> };
    expect(body.accounts[0].zar_value).toBeNull();
  });

  it('filters to the LUNO_ACCOUNT_ID account and only fetches that asset ticker — Validates: Requirements 4.6', async () => {
    process.env.LUNO_ACCOUNT_ID = 'acc-xbt';
    const fetchSpy = mockUpstream(BALANCE_BODY, { last_trade: '1000000.00' });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { accounts: Array<{ account_id: string; zar_value: number }> };
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].account_id).toBe('acc-xbt');
    expect(body.accounts[0].zar_value).toBe(500000);

    // Only XBT ticker fetched — no ETH call
    expect(tickerCalls(fetchSpy)).toEqual(['https://api.luno.com/api/1/ticker?pair=XBTZAR']);
  });

  it('returns an empty accounts array with no ticker calls when LUNO_ACCOUNT_ID matches nothing — Validates: Requirements 4.7', async () => {
    process.env.LUNO_ACCOUNT_ID = 'does-not-exist';
    const fetchSpy = mockUpstream(BALANCE_BODY, { last_trade: '1000000.00' });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accounts: [] });
    expect(tickerCalls(fetchSpy)).toHaveLength(0);
  });

  it('returns an empty accounts array for an empty upstream balance array — Validates: Requirements 4.9', async () => {
    const fetchSpy = mockUpstream({ balance: [] }, { last_trade: '1000000.00' });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accounts: [] });
    expect(tickerCalls(fetchSpy)).toHaveLength(0);
  });

  it('returns 504 when the balance request times out — Validates: Requirements 1.5', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          (init?.signal as AbortSignal | undefined)?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );

    vi.useFakeTimers();
    const responsePromise = GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await responsePromise;

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: 'Upstream timeout' });
  });
});
