/**
 * Property-Based Tests for the Balance Route
 *
 * Property 1: Non-GET methods are rejected with 405
 * Property 2: Credentials are never leaked in responses
 * Property 3: Missing or empty env vars produce HTTP 500 without outbound request
 *
 * Validates: Requirements 1.1, 1.3, 1.7, 7.2
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { POST, PUT, PATCH, DELETE, HEAD, OPTIONS } from './route';

// ─── Property 1: Non-GET methods rejected with 405 (Balance Route) ────────────

/**
 * **Validates: Requirements 1.1**
 *
 * For any HTTP method that is not GET, the Balance Route SHALL respond with
 * HTTP 405 and the body { "error": "Method Not Allowed" }.
 */
describe('Property 1: Non-GET methods are rejected with 405', () => {
  it('returns 405 with { error: "Method Not Allowed" } for all non-GET methods — Validates: Requirements 1.1', async () => {
    // Map method name → the exported handler so we can call each one directly.
    // The route exports explicit handlers for each non-GET method so callers
    // always receive a JSON body (not Next.js's plain-text 405).
    const handlerMap: Record<string, (req?: Request) => Response | Promise<Response>> = {
      POST,
      PUT,
      PATCH,
      DELETE,
      HEAD,
      OPTIONS,
    };

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS' as const),
        async (method) => {
          const handler = handlerMap[method];
          const request = new Request('http://localhost/api/luno/balance', { method });
          const response = await handler(request);

          expect(response.status).toBe(405);

          const body = await response.json();
          expect(body).toEqual({ error: 'Method Not Allowed' });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Missing/empty env vars → HTTP 500 (Balance Route) ────────────

describe('Property 3: Missing or empty env vars produce HTTP 500 without outbound request', () => {
  // Capture original env var values so we can restore them after each run
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalKeyId = process.env.LUNO_API_KEY_ID;
    originalKeySecret = process.env.LUNO_API_KEY_SECRET;
  });

  afterEach(() => {
    // Restore the original env var values
    if (originalKeyId === undefined) {
      delete process.env.LUNO_API_KEY_ID;
    } else {
      process.env.LUNO_API_KEY_ID = originalKeyId;
    }

    if (originalKeySecret === undefined) {
      delete process.env.LUNO_API_KEY_SECRET;
    } else {
      process.env.LUNO_API_KEY_SECRET = originalKeySecret;
    }

    vi.restoreAllMocks();
  });

  it('returns HTTP 500 with { error: "Server configuration error" } and makes no outbound fetch — Validates: Requirements 1.7, 7.2', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a non-empty subset of the two credential keys — at least one must be omitted/emptied
        fc.subarray(['keyId', 'keySecret'] as const, { minLength: 1 }),
        async (varsToOmit) => {
          // Spy on globalThis.fetch BEFORE importing the module so we can
          // assert it was never called during this request
          const fetchSpy = vi.spyOn(globalThis, 'fetch');

          // Stub the selected env vars — either delete them or set to ""
          // We alternate between deletion and empty string to cover both cases
          for (const varName of varsToOmit) {
            const envKey = varName === 'keyId' ? 'LUNO_API_KEY_ID' : 'LUNO_API_KEY_SECRET';
            // Use a simple deterministic alternation: delete when varName is 'keyId', empty when 'keySecret'
            // In practice fast-check will generate both single-element and two-element arrays,
            // so both modes will be exercised across the 100 runs.
            if (varName === 'keyId') {
              delete process.env[envKey];
            } else {
              process.env[envKey] = '';
            }
          }

          // Ensure the vars that are NOT in varsToOmit have a valid value
          // so the only reason for a 500 is the explicitly omitted/emptied ones
          if (!varsToOmit.includes('keyId')) {
            process.env.LUNO_API_KEY_ID = 'test-key-id';
          }
          if (!varsToOmit.includes('keySecret')) {
            process.env.LUNO_API_KEY_SECRET = 'test-key-secret';
          }

          // Re-import GET fresh so it picks up the mutated process.env.
          // vitest caches modules, so we need to reset the module registry.
          vi.resetModules();
          const { GET } = await import('./route');

          const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
          const response = await GET(request);

          // ── Assert HTTP 500 ───────────────────────────────────────────────
          expect(response.status).toBe(500);

          // ── Assert body JSON ──────────────────────────────────────────────
          const body = await response.json();
          expect(body).toEqual({ error: 'Server configuration error' });

          // ── Assert no outbound fetch was made ─────────────────────────────
          expect(fetchSpy).not.toHaveBeenCalled();

          // Clean up the spy for the next iteration
          vi.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns HTTP 500 when both vars are emptied (empty string) — Validates: Requirements 1.7, 7.2', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    process.env.LUNO_API_KEY_ID = '';
    process.env.LUNO_API_KEY_SECRET = '';

    vi.resetModules();
    const { GET } = await import('./route');

    const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 when both vars are deleted — Validates: Requirements 1.7, 7.2', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    delete process.env.LUNO_API_KEY_ID;
    delete process.env.LUNO_API_KEY_SECRET;

    vi.resetModules();
    const { GET } = await import('./route');

    const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── Property 2: Credentials never appear in responses (Balance Route) ────────

/**
 * Collect all header values from a Response into a flat string array.
 */
function collectHeaderValues(response: Response): string[] {
  const values: string[] = [];
  response.headers.forEach((value) => {
    values.push(value);
  });
  return values;
}

describe('Property 2: Credentials are never leaked in responses', () => {
  // Import GET once at describe scope — getCredentials() reads process.env at
  // call time (not at module load), so vi.stubEnv works without re-importing.
  // This avoids the per-iteration vi.resetModules() overhead seen in Property 3.
  let balanceGET: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('./route');
    balanceGET = mod.GET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('neither keyId nor keySecret appear in body or headers — success scenario — Validates: Requirements 1.3', async () => {
    await fc.assert(
      fc.asyncProperty(
        // minLength: 8 — short/whitespace-only strings are trivially substrings
        // of typical response text (e.g. " " matches header formatting), which
        // would make every response look like it "contains" the credential.
        fc.tuple(fc.string({ minLength: 8, maxLength: 64 }), fc.string({ minLength: 8, maxLength: 64 })),
        async ([keyId, keySecret]) => {
          vi.stubEnv('LUNO_API_KEY_ID', keyId);
          vi.stubEnv('LUNO_API_KEY_SECRET', keySecret);

          // Successful upstream: body only contains neutral account data,
          // never the raw keyId/keySecret strings themselves. The route also
          // issues a ticker call per unique asset, so dispatch on URL.
          const mockUpstreamBody = JSON.stringify({
            balance: [
              {
                account_id: 'acc-1',
                asset: 'XBT',
                balance: '0.5',
                reserved: '0.0',
                unconfirmed: '0.0',
              },
            ],
          });

          vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/api/1/ticker')) {
              return Promise.resolve(
                new Response(JSON.stringify({ last_trade: '1000000' }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }),
              );
            }
            return Promise.resolve(
              new Response(mockUpstreamBody, {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          });

          const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
          const response = await balanceGET(request);

          const bodyText = await response.text();
          const headerValues = collectHeaderValues(response);

          // ── Body must not contain either credential ────────────────────
          expect(bodyText).not.toContain(keyId);
          expect(bodyText).not.toContain(keySecret);

          // ── No header value may contain either credential ──────────────
          for (const headerValue of headerValues) {
            expect(headerValue).not.toContain(keyId);
            expect(headerValue).not.toContain(keySecret);
          }

          vi.restoreAllMocks();
          vi.unstubAllEnvs();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('neither keyId nor keySecret appear in body or headers — 500 (missing secret) scenario — Validates: Requirements 1.3', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.string({ minLength: 8, maxLength: 64 }), fc.string({ minLength: 8, maxLength: 64 })),
        async ([keyId, _keySecret]) => {
          // Set only keyId; empty keySecret so the route returns 500
          vi.stubEnv('LUNO_API_KEY_ID', keyId);
          vi.stubEnv('LUNO_API_KEY_SECRET', '');

          const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
          const response = await balanceGET(request);

          const bodyText = await response.text();
          const headerValues = collectHeaderValues(response);

          expect(response.status).toBe(500);
          expect(bodyText).not.toContain(keyId);

          for (const headerValue of headerValues) {
            expect(headerValue).not.toContain(keyId);
          }

          vi.unstubAllEnvs();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('neither keyId nor keySecret appear in body or headers — 502 (upstream error) scenario — Validates: Requirements 1.3', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.string({ minLength: 8, maxLength: 64 }), fc.string({ minLength: 8, maxLength: 64 })),
        async ([keyId, keySecret]) => {
          vi.stubEnv('LUNO_API_KEY_ID', keyId);
          vi.stubEnv('LUNO_API_KEY_SECRET', keySecret);

          // Upstream returns non-2xx — route should return 502 with a
          // generic error message that does not include the credentials.
          vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'Forbidden' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }),
          );

          const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
          const response = await balanceGET(request);

          const bodyText = await response.text();
          const headerValues = collectHeaderValues(response);

          expect(bodyText).not.toContain(keyId);
          expect(bodyText).not.toContain(keySecret);

          for (const headerValue of headerValues) {
            expect(headerValue).not.toContain(keyId);
            expect(headerValue).not.toContain(keySecret);
          }

          vi.restoreAllMocks();
          vi.unstubAllEnvs();
        },
      ),
      { numRuns: 100 },
    );
  });
});
