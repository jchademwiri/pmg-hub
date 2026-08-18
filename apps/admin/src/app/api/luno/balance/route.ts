import {
  fetchLunoAccounts,
  LunoConfigError,
  LunoInvalidResponseError,
  LunoTimeoutError,
  LunoUpstreamError,
} from '@/lib/luno';

export const dynamic = 'force-dynamic';

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

// _request is required by the Route Handler signature; tests call GET(request) directly.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request): Promise<Response> {
  try {
    // fetchLunoAccounts handles: credential validation, the balance fetch
    // (10s timeout, Basic auth), the optional LUNO_ACCOUNT_ID filter, and the
    // parallel ticker ZAR enrichment (ticker failures degrade to zar_value: null).
    const accounts = await fetchLunoAccounts();
    return Response.json({ accounts }, { status: 200 });
  } catch (err) {
    if (err instanceof LunoConfigError) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (err instanceof LunoTimeoutError) {
      return Response.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    if (err instanceof LunoUpstreamError) {
      const body: Record<string, unknown> = { error: 'Upstream error' };
      if (err.status !== undefined) body.status = err.status;
      return Response.json(body, { status: 502 });
    }
    if (err instanceof LunoInvalidResponseError) {
      return Response.json({ error: 'Invalid upstream response' }, { status: 502 });
    }
    // Unexpected error — never leak internals
    return Response.json({ error: 'Upstream error' }, { status: 502 });
  }
}
