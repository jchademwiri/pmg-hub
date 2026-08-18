import { upsertLunoAccounts } from '@pmg/db';
import {
  fetchLunoAccounts,
  LunoConfigError,
  LunoInvalidResponseError,
  LunoTimeoutError,
  LunoUpstreamError,
} from '@/lib/luno';

export const dynamic = 'force-dynamic';

// ── Method guard ─────────────────────────────────────────────────────────────
// The sync route is POST-only (a state-changing action); all other methods 405.
const METHOD_NOT_ALLOWED = () => Response.json({ error: 'Method Not Allowed' }, { status: 405 });

export const GET = METHOD_NOT_ALLOWED;
export const PUT = METHOD_NOT_ALLOWED;
export const PATCH = METHOD_NOT_ALLOWED;
export const DELETE = METHOD_NOT_ALLOWED;
export const HEAD = METHOD_NOT_ALLOWED;
export const OPTIONS = METHOD_NOT_ALLOWED;

// _request is required by the Route Handler signature; tests call POST(request) directly.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request): Promise<Response> {
  try {
    // Reuses the same enriched balance fetch as the Balance Route
    // (credentials → balance → optional LUNO_ACCOUNT_ID filter → ZAR tickers).
    const accounts = await fetchLunoAccounts();

    const synced = await upsertLunoAccounts(
      accounts.map((a) => ({
        accountId: a.account_id,
        asset: a.asset,
        name: a.name,
        balance: a.balance,
        reserved: a.reserved,
        unconfirmed: a.unconfirmed,
        zarValue: a.zar_value,
      })),
    );

    return Response.json({ synced }, { status: 200 });
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
