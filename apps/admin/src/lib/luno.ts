/**
 * Shared Luno API helpers.
 *
 * Extracted into a shared module so the Balance Route, the History Route, and
 * the Sync Route can import from a single source of truth without duplication.
 *
 * The pure helpers (getCredentials, buildAuthHeader, mapAccountRow,
 * buildLunoUrl, transformTransaction(s), buildTickerUrl, mapTickerPrice) are
 * unit/property tested in isolation. fetchLunoAccounts is the IO-bound
 * enrichment used by the Balance and Sync routes.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LunoAccountRow {
  account_id: string;
  asset: string;
  balance: string;
  reserved: string;
  unconfirmed: string;
  name?: string; // Omitted entirely when absent/empty in upstream
  zar_value: number | null; // balance × ticker last_trade, rounded to 8 dp
}

export interface BalancePoint {
  date: string; // ISO-8601 date, UTC, "YYYY-MM-DD"
  balance: number; // Rounded to 8 decimal places
}

// ─── Error contract (mapped to HTTP statuses by the routes) ───────────────────

/** Missing/empty credentials → HTTP 500. */
export class LunoConfigError extends Error {
  constructor() {
    super('Server configuration error');
    this.name = 'LunoConfigError';
  }
}

/** Upstream exceeded the request timeout → HTTP 504. */
export class LunoTimeoutError extends Error {
  constructor() {
    super('Upstream timeout');
    this.name = 'LunoTimeoutError';
  }
}

/** Upstream returned non-2xx (status set) or failed at the network level (no status) → HTTP 502. */
export class LunoUpstreamError extends Error {
  constructor(public readonly status?: number) {
    super('Upstream error');
    this.name = 'LunoUpstreamError';
  }
}

/** Upstream body was non-JSON or missing the expected array → HTTP 502. */
export class LunoInvalidResponseError extends Error {
  constructor() {
    super('Invalid upstream response');
    this.name = 'LunoInvalidResponseError';
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LUNO_BALANCE_URL = 'https://api.luno.com/api/1/balance';
const TIMEOUT_MS = 10_000;

// ─── Credential helpers ───────────────────────────────────────────────────────

/**
 * Reads LUNO_API_KEY_ID and LUNO_API_KEY_SECRET from process.env.
 * Returns the credential object, or null if either value is absent or empty.
 */
export function getCredentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.LUNO_API_KEY_ID;
  const keySecret = process.env.LUNO_API_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

// ─── Auth header ──────────────────────────────────────────────────────────────

/**
 * Encodes Luno credentials as an HTTP Basic Auth header value.
 * Returns "Basic <base64(keyId:keySecret)>"
 */
export function buildAuthHeader(keyId: string, keySecret: string): string {
  return 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64');
}

// ─── Balance route helpers ────────────────────────────────────────────────────

/**
 * Maps a raw Luno balance entry (unknown shape) to a LunoAccountRow.
 * Omits the `name` field when it is absent or empty in the upstream entry.
 * `zar_value` starts as null and is populated by the ticker enrichment step.
 */
export function mapAccountRow(entry: unknown): LunoAccountRow {
  const e = entry as Record<string, unknown>;

  const row: LunoAccountRow = {
    account_id: String(e.account_id ?? ''),
    asset: String(e.asset ?? ''),
    balance: String(e.balance ?? ''),
    reserved: String(e.reserved ?? ''),
    unconfirmed: String(e.unconfirmed ?? ''),
    zar_value: null,
  };

  if (typeof e.name === 'string' && e.name.length > 0) {
    row.name = e.name;
  }

  return row;
}

/**
 * Constructs the Luno ticker URL for an asset.
 * Returns "https://api.luno.com/api/1/ticker?pair={asset}ZAR"
 */
export function buildTickerUrl(asset: string): string {
  return `https://api.luno.com/api/1/ticker?pair=${asset}ZAR`;
}

/**
 * Extracts `last_trade` from a ticker response body as a finite, non-negative
 * number, or null when the body is invalid or the field is missing/unparseable.
 */
export function mapTickerPrice(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null;

  const lastTrade = (body as Record<string, unknown>).last_trade;
  if (typeof lastTrade !== 'string') return null;

  const price = parseFloat(lastTrade);
  if (!Number.isFinite(price) || price < 0) return null;

  return price;
}

// ─── Enriched balance fetch (Balance Route + Sync Route) ──────────────────────

/**
 * Fetches an upstream response with a 10-second timeout.
 * Throws LunoTimeoutError on abort, LunoUpstreamError on network failure.
 *
 * Exported so the History Route can reuse the same timeout/error contract.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // Duck-type the abort check: Node's DOMException extends Error, but jsdom's
    // does not, so `instanceof Error` is unreliable across environments.
    if (
      typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'AbortError'
    ) {
      throw new LunoTimeoutError();
    }
    throw new LunoUpstreamError();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches all Luno accounts and enriches each with a ZAR value: crypto via
 * Luno's own public ticker endpoint (zar_value = balance × last_trade), the
 * ZAR wallet 1:1 against its own balance, and tokenised stocks (xStocks) via
 * CoinGecko, since Luno has no ticker for those at all.
 *
 * Pricing failures degrade gracefully at every step: the affected accounts
 * keep `zar_value: null` and the request still succeeds. Credentials never
 * leave this module and never appear in returned data.
 *
 * Throws LunoConfigError / LunoTimeoutError / LunoUpstreamError /
 * LunoInvalidResponseError, which callers map to HTTP responses.
 */
export async function fetchLunoAccounts(): Promise<LunoAccountRow[]> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new LunoConfigError();
  }

  const { keyId, keySecret } = credentials;

  // 1. Fetch balance (authenticated)
  const balanceRes = await fetchWithTimeout(LUNO_BALANCE_URL, {
    headers: {
      Authorization: buildAuthHeader(keyId, keySecret),
    },
  });

  if (!balanceRes.ok) {
    throw new LunoUpstreamError(balanceRes.status);
  }

  let body: unknown;
  try {
    body = await balanceRes.json();
  } catch {
    throw new LunoInvalidResponseError();
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).balance)
  ) {
    throw new LunoInvalidResponseError();
  }

  let accounts: LunoAccountRow[] = (body as { balance: unknown[] }).balance.map(mapAccountRow);

  // 2. Optional LUNO_ACCOUNT_ID filter (before tickers, so we only price what we return)
  const filterAccountId = process.env.LUNO_ACCOUNT_ID;
  if (filterAccountId && filterAccountId.length > 0) {
    accounts = accounts.filter((a) => a.account_id === filterAccountId);
  }

  // 3. Enrich with ZAR values via parallel ticker calls (public, unauthenticated).
  // ZAR itself is excluded - a "ZARZAR" ticker pair doesn't exist, so it's
  // priced 1:1 against its own balance below instead of going through a
  // lookup that would always fail and leave the fiat wallet unpriced.
  const assets = [
    ...new Set(accounts.map((a) => a.asset).filter((asset) => asset.length > 0 && asset !== 'ZAR')),
  ];

  const priceEntries = await Promise.all(
    assets.map(async (asset) => {
      let price: number | null = null;
      try {
        const tickerRes = await fetchWithTimeout(buildTickerUrl(asset));
        if (tickerRes.ok) {
          let tickerBody: unknown;
          try {
            tickerBody = await tickerRes.json();
          } catch {
            tickerBody = null;
          }
          price = mapTickerPrice(tickerBody);
        }
      } catch {
        price = null;
      }
      return [asset, price] as const;
    }),
  );

  const priceMap = new Map(priceEntries);

  // 4. Enrich tokenised stocks (AAPLx, SPYx, …) via CoinGecko - Luno has no
  // ticker for these in any currency, but they're a real product (xStocks)
  // with a real market price elsewhere. One batched call for every held
  // xStock; unmapped/failed symbols fall back to zar_value: null (units only),
  // same degrade-gracefully contract as the Luno ticker path above.
  const xstockAssets = [
    ...new Set(accounts.filter((a) => isTokenisedStock(a.asset)).map((a) => a.asset)),
  ];
  const xstockPriceMap =
    xstockAssets.length > 0
      ? await fetchXStockZarPrices(xstockAssets)
      : new Map<string, number | null>();

  return accounts.map((account) => {
    const balance = parseFloat(account.balance);

    if (account.asset === 'ZAR') {
      return { ...account, zar_value: Number.isFinite(balance) ? balance : null };
    }

    const price =
      account.asset.length > 0
        ? (priceMap.get(account.asset) ?? xstockPriceMap.get(account.asset) ?? null)
        : null;
    const zar_value =
      price !== null && Number.isFinite(balance) ? Math.round(balance * price * 1e8) / 1e8 : null;

    return { ...account, zar_value };
  });
}

// ─── Dashboard visibility ───────────────────────────────────────────────────────

/** Minimum priced ZAR value to display; hides dust (e.g. a R0.03 residue). */
export const MIN_VISIBLE_ZAR_VALUE = 1;

/**
 * Should this synced Luno account appear on the /assets dashboard?
 *
 * Shows an account only when it has a nonzero balance AND a priced ZAR value
 * above MIN_VISIBLE_ZAR_VALUE. An unpriced holding (`zarValue: null` -
 * tokenised stocks CoinGecko has no mapping for, or an ordinary coin with no
 * ZAR market, e.g. BNB) is hidden.
 *
 * This is a deliberate product choice, not an oversight: an earlier version
 * showed unpriced accounts as units-only instead of hiding them, specifically
 * because hiding a real BNB balance with no indication anything was missing
 * read as a bug. The owner reviewed that tradeoff and chose a clean list over
 * surfacing unpriced dust anyway - so the original failure mode (a real
 * balance in an unmapped asset disappearing with no explanation) is back by
 * request. If that confusion resurfaces, this comment is why.
 */
export function isVisibleLunoAccount(account: {
  balance: string;
  zarValue: string | null;
}): boolean {
  const hasBalance = Number.parseFloat(account.balance) > 0;
  if (!hasBalance) return false;
  if (account.zarValue == null) return false;
  return Number(account.zarValue) > MIN_VISIBLE_ZAR_VALUE;
}

// ─── Tokenised stocks ─────────────────────────────────────────────────────────

/**
 * Luno's tokenised stocks (AAPLx, SPYx, GLDx, …) have no Luno ticker pair
 * (confirmed: /api/1/ticker?pair=AAPLxZAR returns "Market not available", in
 * any quote currency). They are identified by the "x" suffix on the asset
 * code.
 *
 * These ARE real assets with a real market price, though - they're "xStocks",
 * a tokenised-equity product (by Backed Finance) that also trades on Kraken
 * and is priced on CoinGecko. `XSTOCK_COINGECKO_IDS` below is what actually
 * prices them; this function is only the "does this need that path" check.
 */
export function isTokenisedStock(asset: string): boolean {
  return /^[A-Z0-9]+x$/i.test(asset);
}

/**
 * Luno asset code -> CoinGecko coin id, for every xStock this account has
 * held. CoinGecko's `symbol` field matches these 1:1 and case-insensitively
 * (verified: aaplx -> "apple-xstock", spyx -> "sp500-xstock", etc.), but
 * symbols are not globally unique on CoinGecko in general, so an explicit map
 * is safer than a live symbol search and is also one HTTP call cheaper.
 *
 * Extend this when Luno lists a new tokenised stock: look up the ticker at
 * https://www.coingecko.com/en/coins/all (search the company name + "xstock")
 * and add a row here. An asset missing from this map simply prices as
 * `zar_value: null` (units-only) rather than failing anything.
 */
export const XSTOCK_COINGECKO_IDS: Record<string, string> = {
  AAPLX: 'apple-xstock',
  AMZNX: 'amazon-xstock',
  AVGOX: 'broadcom-xstock',
  GLDX: 'gold-xstock',
  GOOGLX: 'alphabet-xstock',
  METAX: 'meta-xstock',
  MSFTX: 'microsoft-xstock',
  MSTRX: 'microstrategy-xstock',
  NVDAX: 'nvidia-xstock',
  QQQX: 'nasdaq-xstock',
  SPYX: 'sp500-xstock',
  TQQQX: 'tqqq-xstock',
  TSLAX: 'tesla-xstock',
};

const COINGECKO_SIMPLE_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';

/**
 * Batch-prices tokenised-stock asset codes in ZAR via CoinGecko's free,
 * keyless public API. One request covers every symbol passed in.
 *
 * Degrades gracefully like the Luno ticker enrichment above: on any failure
 * (network, timeout, non-2xx, malformed body) every requested symbol maps to
 * `null` rather than throwing - an unpriced xStock should never take down the
 * whole Luno sync.
 */
export async function fetchXStockZarPrices(symbols: string[]): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>(symbols.map((s) => [s, null]));

  const idToSymbol = new Map<string, string>();
  for (const symbol of symbols) {
    const id = XSTOCK_COINGECKO_IDS[symbol.toUpperCase()];
    if (id) idToSymbol.set(id, symbol);
  }
  if (idToSymbol.size === 0) return result;

  try {
    const url = `${COINGECKO_SIMPLE_PRICE_URL}?ids=${[...idToSymbol.keys()].join(',')}&vs_currencies=zar`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return result;

    const body = (await res.json()) as unknown;
    if (typeof body !== 'object' || body === null) return result;

    for (const [id, symbol] of idToSymbol) {
      const entry = (body as Record<string, unknown>)[id];
      const price =
        typeof entry === 'object' && entry !== null
          ? (entry as Record<string, unknown>).zar
          : undefined;
      result.set(symbol, typeof price === 'number' && Number.isFinite(price) ? price : null);
    }
  } catch {
    // Leave every symbol as null - see docstring.
  }

  return result;
}

// ─── History route helpers ────────────────────────────────────────────────────

/**
 * Constructs the Luno transactions URL for a given account ID.
 * Returns "https://api.luno.com/api/1/accounts/{accountId}/transactions?min_row=-100&max_row=0"
 */
export function buildLunoUrl(accountId: string): string {
  return `https://api.luno.com/api/1/accounts/${accountId}/transactions?min_row=-100&max_row=0`;
}

export type TransformResult = { ok: true; data: BalancePoint[] } | { ok: false; field: string };

/**
 * Transforms a single Luno transaction into a BalancePoint.
 * Throws with the offending field name if required fields are missing or invalid.
 */
export function transformTransaction(tx: unknown): BalancePoint {
  const t = tx as Record<string, unknown>;

  // Validate timestamp: must be present, finite integer, and positive (> 0)
  if (
    t.timestamp === undefined ||
    t.timestamp === null ||
    typeof t.timestamp !== 'number' ||
    !Number.isFinite(t.timestamp) ||
    !Number.isInteger(t.timestamp) ||
    t.timestamp <= 0
  ) {
    throw new Error('timestamp');
  }

  // Validate balance: must be present and parseable as a float
  if (t.balance === undefined || t.balance === null) {
    throw new Error('balance');
  }
  const parsedBalance = parseFloat(String(t.balance));
  if (isNaN(parsedBalance)) {
    throw new Error('balance');
  }

  const date = new Date(t.timestamp as number).toISOString().slice(0, 10);
  const balance = Math.round(parsedBalance * 1e8) / 1e8;

  return { date, balance };
}

/**
 * Maps an array of raw Luno transactions to BalancePoint[].
 * Returns { ok: true, data } on success, or { ok: false, field } on first error.
 */
export function transformTransactions(transactions: unknown[]): TransformResult {
  const data: BalancePoint[] = [];

  for (const tx of transactions) {
    try {
      data.push(transformTransaction(tx));
    } catch (err) {
      return { ok: false, field: (err as Error).message };
    }
  }

  return { ok: true, data };
}
