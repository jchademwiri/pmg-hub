/**
 * Integration tests for the Sync Route (/api/luno/sync).
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The mock factory is hoisted by vitest above the imports below, so the
// imported upsertLunoAccounts IS the mock instance.
vi.mock('@pmg/db', () => ({
  upsertLunoAccounts: vi.fn(),
}));

import { upsertLunoAccounts as upsertLunoAccountsImpl } from '@pmg/db';
import { POST, GET, PUT, PATCH, DELETE, HEAD, OPTIONS } from './route';

// The runtime value is the vi.fn() created in the mock factory above, but its
// static type is the real function signature — cast so mock helpers typecheck.
const upsertLunoAccounts = upsertLunoAccountsImpl as unknown as ReturnType<typeof vi.fn>;

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
  ],
};

function mockUpstream(balanceBody: unknown, tickerBody: unknown, balanceStatus = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/1/ticker')) {
      return Promise.resolve(
        new Response(JSON.stringify(tickerBody), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(balanceBody), {
        status: balanceStatus,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Sync Route', () => {
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalKeyId = process.env.LUNO_API_KEY_ID;
    originalKeySecret = process.env.LUNO_API_KEY_SECRET;
    process.env.LUNO_API_KEY_ID = 'test-key-id';
    process.env.LUNO_API_KEY_SECRET = 'test-key-secret';
    delete process.env.LUNO_ACCOUNT_ID;
    upsertLunoAccounts.mockReset();
    upsertLunoAccounts.mockResolvedValue(1);
  });

  afterEach(() => {
    if (originalKeyId === undefined) delete process.env.LUNO_API_KEY_ID;
    else process.env.LUNO_API_KEY_ID = originalKeyId;
    if (originalKeySecret === undefined) delete process.env.LUNO_API_KEY_SECRET;
    else process.env.LUNO_API_KEY_SECRET = originalKeySecret;
    vi.restoreAllMocks();
  });

  it('returns 405 for every non-POST method — Validates: Requirements 5.1', async () => {
    const handlers = { GET, PUT, PATCH, DELETE, HEAD, OPTIONS };
    for (const [method, handler] of Object.entries(handlers)) {
      const response = await handler();
      expect(response.status, method).toBe(405);
      expect(await response.json()).toEqual({ error: 'Method Not Allowed' });
    }
  });

  it('upserts the enriched accounts and returns { synced: n } — Validates: Requirements 5.2, 5.6', async () => {
    mockUpstream(BALANCE_BODY, { last_trade: '1000000.00' });
    upsertLunoAccounts.mockResolvedValue(1);

    const response = await POST(new Request('http://localhost/api/luno/sync', { method: 'POST' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ synced: 1 });

    expect(upsertLunoAccounts).toHaveBeenCalledTimes(1);
    const accounts = upsertLunoAccounts.mock.calls[0][0] as Array<{
      accountId: string;
      asset: string;
      balance: string;
      zarValue: number | null;
    }>;
    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountId).toBe('acc-xbt');
    expect(accounts[0].asset).toBe('XBT');
    expect(accounts[0].balance).toBe('0.50000000');
    expect(accounts[0].zarValue).toBe(500000);
  });

  it('does not call upsert and returns 500 when credentials are missing — Validates: Requirements 5.3', async () => {
    delete process.env.LUNO_API_KEY_ID;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await POST(new Request('http://localhost/api/luno/sync', { method: 'POST' }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(upsertLunoAccounts).not.toHaveBeenCalled();
  });

  it('returns 502 and does not modify the snapshot when the balance upstream fails — Validates: Requirements 5.4', async () => {
    mockUpstream(BALANCE_BODY, { last_trade: '1000000.00' }, 401);

    const response = await POST(new Request('http://localhost/api/luno/sync', { method: 'POST' }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Upstream error', status: 401 });
    expect(upsertLunoAccounts).not.toHaveBeenCalled();
  });
});
