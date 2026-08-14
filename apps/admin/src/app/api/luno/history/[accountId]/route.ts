import {
  buildAuthHeader,
  buildLunoUrl,
  fetchWithTimeout,
  getCredentials,
  transformTransactions,
  LunoConfigError,
  LunoTimeoutError,
  LunoUpstreamError,
} from '@/lib/luno';

export const dynamic = 'force-dynamic';

// Luno account IDs are alphanumeric with underscores/dashes, max 64 chars.
const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// ── Method guard ─────────────────────────────────────────────────────────────
// Next.js App Router returns a plain 405 for unregistered methods.
// Export explicit handlers so callers receive a JSON body matching the spec.
const METHOD_NOT_ALLOWED = () => Response.json({ error: 'Method Not Allowed' }, { status: 405 });

export const POST = METHOD_NOT_ALLOWED;
export const PUT = METHOD_NOT_ALLOWED;
export const PATCH = METHOD_NOT_ALLOWED;
export const DELETE = METHOD_NOT_ALLOWED;
export const HEAD = METHOD_NOT_ALLOWED;
export const OPTIONS = METHOD_NOT_ALLOWED;

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
): Promise<Response> {
  const { accountId } = await context.params;

  // ── Validate credentials (before any outbound call) ────────────────────────
  const credentials = getCredentials();
  if (!credentials) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // ── Validate accountId format (before any outbound call) ───────────────────
  if (!ACCOUNT_ID_PATTERN.test(accountId)) {
    return Response.json({ error: 'Invalid account ID' }, { status: 400 });
  }

  // ── Fetch upstream with 10-second timeout ──────────────────────────────────
  let upstream: globalThis.Response;
  try {
    upstream = await fetchWithTimeout(buildLunoUrl(accountId), {
      headers: {
        Authorization: buildAuthHeader(credentials.keyId, credentials.keySecret),
      },
    });
  } catch (err) {
    if (err instanceof LunoTimeoutError) {
      return Response.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    if (err instanceof LunoUpstreamError) {
      const body: Record<string, unknown> = { error: 'Upstream error' };
      if (err.status !== undefined) body.status = err.status;
      return Response.json(body, { status: 502 });
    }
    if (err instanceof LunoConfigError) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }
    return Response.json({ error: 'Upstream error' }, { status: 502 });
  }

  // ── Non-2xx upstream response ─────────────────────────────────────────────
  if (!upstream.ok) {
    return Response.json({ error: 'Upstream error', status: upstream.status }, { status: 502 });
  }

  // ── Parse response body ───────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    return Response.json({ error: 'Invalid upstream response' }, { status: 502 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).transactions)
  ) {
    return Response.json({ error: 'Invalid upstream response' }, { status: 502 });
  }

  // ── Transform to Balance_Point[] ──────────────────────────────────────────
  const result = transformTransactions((body as { transactions: unknown[] }).transactions);
  if (!result.ok) {
    return Response.json({ error: 'Invalid transaction data', field: result.field }, { status: 422 });
  }

  return Response.json({ data: result.data }, { status: 200 });
}
