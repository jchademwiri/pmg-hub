import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  buildAuthHeader,
  mapAccountRow,
  isVisibleLunoAccount,
  fetchXStockZarPrices,
  XSTOCK_COINGECKO_IDS,
} from './luno';

describe('buildAuthHeader', () => {
  it('encodes keyId and keySecret as Basic base64(keyId:keySecret)', () => {
    // "id:secret" in base64 is "aWQ6c2VjcmV0"
    expect(buildAuthHeader('id', 'secret')).toBe('Basic aWQ6c2VjcmV0');
  });

  it('encodes empty string components correctly', () => {
    // ":" in base64 is "Og=="
    expect(buildAuthHeader('', '')).toBe('Basic Og==');
  });

  it('encodes strings containing colons correctly', () => {
    // "a:b:c" in base64 is "YTpiOmM="
    const expected = 'Basic ' + Buffer.from('a:b' + ':' + 'c').toString('base64');
    expect(buildAuthHeader('a:b', 'c')).toBe(expected);
  });

  it('always produces a string starting with "Basic "', () => {
    expect(buildAuthHeader('anyId', 'anySecret')).toMatch(/^Basic /);
  });

  it('round-trips: decoding the base64 portion yields keyId:keySecret', () => {
    const keyId = 'myKey';
    const keySecret = 'mySecret';
    const header = buildAuthHeader(keyId, keySecret);
    const encoded = header.slice('Basic '.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decoded).toBe(`${keyId}:${keySecret}`);
  });
});

describe('mapAccountRow', () => {
  const baseEntry = {
    account_id: 'abc123',
    asset: 'XBT',
    balance: '0.12345678',
    reserved: '0.00000000',
    unconfirmed: '0.00000000',
  };

  it('includes name when the upstream entry has a non-empty name', () => {
    const row = mapAccountRow({ ...baseEntry, name: 'My Bitcoin Wallet' });
    expect(row.name).toBe('My Bitcoin Wallet');
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(true);
  });

  it('omits name entirely (not null or undefined) when the upstream entry has no name field', () => {
    const row = mapAccountRow({ ...baseEntry });
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(false);
  });

  it('omits name entirely (not null or undefined) when the upstream entry has an empty string name', () => {
    const row = mapAccountRow({ ...baseEntry, name: '' });
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(false);
  });

  it('maps the core fields correctly', () => {
    const row = mapAccountRow(baseEntry);
    expect(row.account_id).toBe('abc123');
    expect(row.asset).toBe('XBT');
    expect(row.balance).toBe('0.12345678');
    expect(row.reserved).toBe('0.00000000');
    expect(row.unconfirmed).toBe('0.00000000');
  });
});

describe('isVisibleLunoAccount', () => {
  it('hides an account with a zero balance', () => {
    expect(isVisibleLunoAccount({ balance: '0.00', zarValue: null })).toBe(false);
    expect(isVisibleLunoAccount({ balance: '0.00', zarValue: '500.00' })).toBe(false);
  });

  it('hides a priced account worth R1 or less (dust)', () => {
    expect(isVisibleLunoAccount({ balance: '0.001', zarValue: '1.00' })).toBe(false);
    expect(isVisibleLunoAccount({ balance: '0.001', zarValue: '0.50' })).toBe(false);
  });

  it('shows a priced account worth more than R1', () => {
    expect(isVisibleLunoAccount({ balance: '0.01', zarValue: '1.01' })).toBe(true);
  });

  it('hides an unpriced account even with a real balance — the BNB case', () => {
    // Luno has no BNBZAR ticker pair, so zarValue is null for a real, nonzero
    // BNB holding. An earlier version showed this as units-only rather than
    // hiding it, since silently dropping a real balance looked like a bug.
    // Reversed by explicit owner decision: a clean list of priced holdings is
    // preferred over surfacing unpriced dust, even though it means an
    // unmapped asset (BNB, or any future one Luno lists with no ZAR market)
    // disappears again with no on-screen indication. If that confuses future
    // debugging, this is why - see isVisibleLunoAccount's docstring.
    expect(isVisibleLunoAccount({ balance: '0.00695467', zarValue: null })).toBe(false);
  });

  it('hides a tokenised stock with no ZAR price (CoinGecko down or unmapped)', () => {
    expect(isVisibleLunoAccount({ balance: '0.02667211', zarValue: null })).toBe(false);
  });
});

describe('fetchXStockZarPrices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('every symbol Luno actually lists resolves to a CoinGecko id', () => {
    // Guards the mapping table itself, independent of any network call:
    // catches a typo the moment it's introduced rather than at runtime.
    for (const symbol of ['AAPLX', 'SPYX', 'GLDX', 'TQQQX', 'AMZNX', 'AVGOX', 'GOOGLX', 'METAX', 'MSFTX', 'MSTRX', 'NVDAX', 'QQQX', 'TSLAX']) {
      expect(XSTOCK_COINGECKO_IDS[symbol]).toBeTruthy();
    }
  });

  it('prices mapped symbols from a single batched request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          'apple-xstock': { zar: 4955.72 },
          'sp500-xstock': { zar: 12620.53 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const prices = await fetchXStockZarPrices(['AAPLx', 'SPYx']);

    expect(prices.get('AAPLx')).toBe(4955.72);
    expect(prices.get('SPYx')).toBe(12620.53);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = String(fetchSpy.mock.calls[0]![0]);
    expect(url).toContain('ids=apple-xstock,sp500-xstock');
    expect(url).toContain('vs_currencies=zar');
  });

  it('maps an unmapped symbol to null without calling CoinGecko for it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ 'apple-xstock': { zar: 4955.72 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const prices = await fetchXStockZarPrices(['AAPLx', 'UNKNOWNX']);

    expect(prices.get('AAPLx')).toBe(4955.72);
    expect(prices.get('UNKNOWNX')).toBeNull();
    // Only the mapped symbol's id should appear in the request.
    const url = String(fetchSpy.mock.calls[0]![0]);
    expect(url).not.toContain('unknownx');
  });

  it('skips the network call entirely when nothing is mapped', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const prices = await fetchXStockZarPrices(['UNKNOWNX']);

    expect(prices.get('UNKNOWNX')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('degrades every symbol to null on a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 }),
    );

    const prices = await fetchXStockZarPrices(['AAPLx', 'SPYx']);

    expect(prices.get('AAPLx')).toBeNull();
    expect(prices.get('SPYx')).toBeNull();
  });

  it('degrades every symbol to null when the network call throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const prices = await fetchXStockZarPrices(['AAPLx']);

    expect(prices.get('AAPLx')).toBeNull();
  });

  it('degrades to null for a symbol missing from an otherwise-successful response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ 'apple-xstock': { zar: 4955.72 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // SPYx requested but CoinGecko's body omits sp500-xstock entirely.
    const prices = await fetchXStockZarPrices(['AAPLx', 'SPYx']);

    expect(prices.get('AAPLx')).toBe(4955.72);
    expect(prices.get('SPYx')).toBeNull();
  });
});
