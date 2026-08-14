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
export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // Duck-type the abort check: Node's DOMException extends Error, but jsdom's
    // does not, so `instanceof Error` is unreliable across environments.
    if (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError') {
      throw new LunoTimeoutError();
    }
    throw new LunoUpstreamError();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches all Luno accounts and enriches each with a ZAR value computed from
 * the public ticker endpoint (zar_value = balance × last_trade).
 *
 * Ticker failures degrade gracefully: the affected accounts keep
 * `zar_value: null` and the request still succeeds. Credentials never leave
 * this module and never appear in returned data.
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

  let accounts: LunoAccountRow[] = ((body as { balance: unknown[] }).balance).map(mapAccountRow);

  // 2. Optional LUNO_ACCOUNT_ID filter (before tickers, so we only price what we return)
  const filterAccountId = process.env.LUNO_ACCOUNT_ID;
  if (filterAccountId && filterAccountId.length > 0) {
    accounts = accounts.filter((a) => a.account_id === filterAccountId);
  }

  // 3. Enrich with ZAR values via parallel ticker calls (public, unauthenticated)
  const assets = [...new Set(accounts.map((a) => a.asset).filter((asset) => asset.length > 0))];

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

  return accounts.map((account) => {
    const price = account.asset.length > 0 ? priceMap.get(account.asset) ?? null : null;
    const balance = parseFloat(account.balance);
    const zar_value =
      price !== null && Number.isFinite(balance)
        ? Math.round(balance * price * 1e8) / 1e8
        : null;

    return { ...account, zar_value };
  });
}

// ─── Tokenised stocks ─────────────────────────────────────────────────────────

/**
 * Luno's tokenised stocks (AAPLx, SPYx, GLDx, …) are BUNDLE accounts with no
 * public ticker pairs, so they can't be priced via the ZAR ticker endpoint.
 * They are identified by the "x" suffix on the asset code.
 */
export function isTokenisedStock(asset: string): boolean {
  return /^[A-Z0-9]+x$/i.test(asset);
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
