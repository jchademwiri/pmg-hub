/**
 * Integration tests for the Balance Route's xStock (tokenised stock) pricing
 * via CoinGecko.
 *
 * Luno has no ticker for these assets at all (confirmed against the live API:
 * /api/1/ticker?pair=AAPLxZAR returns "Market not available" in both ZAR and
 * USD). They price only through the CoinGecko path in fetchXStockZarPrices,
 * so this is tested as its own integration path rather than folded into
 * balance-route-ticker.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

const BALANCE_BODY = {
  balance: [
    {
      account_id: 'acc-aaplx',
      asset: 'AAPLx',
      balance: '0.02667211',
      reserved: '0.00000000',
      unconfirmed: '0.00000000',
    },
    {
      account_id: 'acc-xbt',
      asset: 'XBT',
      balance: '0.00104667',
      reserved: '0.00000000',
      unconfirmed: '0.00000000',
    },
  ],
};

function mockUpstream({
  balanceBody = BALANCE_BODY,
  coingeckoBody,
  coingeckoStatus = 200,
  tickerBody = { last_trade: '1000000.00' },
}: {
  balanceBody?: unknown;
  coingeckoBody: unknown;
  coingeckoStatus?: number;
  tickerBody?: unknown;
}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('api.coingecko.com')) {
      return Promise.resolve(
        new Response(JSON.stringify(coingeckoBody), {
          status: coingeckoStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (url.includes('/api/1/ticker')) {
      // Real Luno behaviour, confirmed against the live API: xStock pairs
      // (anything ending "xZAR") return "Market not available" - the mock
      // must reproduce that, or a real bug here (the ticker loop pricing an
      // xStock instead of leaving it for CoinGecko) would go undetected.
      if (/xZAR/i.test(url)) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Market not available', error_code: 'ErrMarketUnavailable' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify(tickerBody), {
          status: 200,
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

describe('Balance Route — xStock pricing via CoinGecko', () => {
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalKeyId = process.env.LUNO_API_KEY_ID;
    originalKeySecret = process.env.LUNO_API_KEY_SECRET;
    process.env.LUNO_API_KEY_ID = 'test-key-id';
    process.env.LUNO_API_KEY_SECRET = 'test-key-secret';
    delete process.env.LUNO_ACCOUNT_ID;
  });

  afterEach(() => {
    if (originalKeyId === undefined) delete process.env.LUNO_API_KEY_ID;
    else process.env.LUNO_API_KEY_ID = originalKeyId;
    if (originalKeySecret === undefined) delete process.env.LUNO_API_KEY_SECRET;
    else process.env.LUNO_API_KEY_SECRET = originalKeySecret;
    vi.restoreAllMocks();
  });

  it('prices a tokenised stock via CoinGecko alongside a normally-ticked crypto asset', async () => {
    mockUpstream({ coingeckoBody: { 'apple-xstock': { zar: 4955.72 } } });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      accounts: Array<{ asset: string; zar_value: number | null }>;
    };

    const aaplx = body.accounts.find((a) => a.asset === 'AAPLx');
    // 0.02667211 × 4955.72, rounded to 8dp
    expect(aaplx?.zar_value).toBeCloseTo(0.02667211 * 4955.72, 6);

    const xbt = body.accounts.find((a) => a.asset === 'XBT');
    expect(xbt?.zar_value).toBe(1046.67);
  });

  it('still returns 200 with zar_value: null for the xStock when CoinGecko is unreachable', async () => {
    mockUpstream({ coingeckoBody: { error: 'rate limited' }, coingeckoStatus: 429 });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      accounts: Array<{ asset: string; zar_value: number | null }>;
    };
    const aaplx = body.accounts.find((a) => a.asset === 'AAPLx');
    expect(aaplx?.zar_value).toBeNull();

    // The crypto account is unaffected by the CoinGecko outage.
    const xbt = body.accounts.find((a) => a.asset === 'XBT');
    expect(xbt?.zar_value).toBe(1046.67);
  });

  it('prices the ZAR fiat wallet 1:1 without an unmapped-xStock lookup interfering', async () => {
    mockUpstream({
      balanceBody: {
        balance: [
          { account_id: 'acc-zar', asset: 'ZAR', balance: '0.01', reserved: '0', unconfirmed: '0' },
        ],
      },
      coingeckoBody: {},
    });

    const response = await GET(new Request('http://localhost/api/luno/balance', { method: 'GET' }));
    const body = (await response.json()) as { accounts: Array<{ zar_value: number | null }> };
    expect(body.accounts[0].zar_value).toBe(0.01);
  });
});
