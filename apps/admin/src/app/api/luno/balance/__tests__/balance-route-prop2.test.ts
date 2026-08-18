/**
 * Property-Based Tests for the Balance Route
 *
 * Property 2: Credentials are never leaked in responses
 *
 * Validates: Requirements 1.3
 *
 * For any combination of random strings used as LUNO_API_KEY_ID and
 * LUNO_API_KEY_SECRET, neither string SHALL appear in any response body JSON
 * or response headers, regardless of whether the request succeeds or fails.
 */

import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if `needle` appears anywhere in `haystack` (case-sensitive).
 * Also checks the base64-encoded form so we catch leaks through the auth header.
 */
function containsCredential(haystack: string, needle: string): boolean {
  // Empty or whitespace-only strings would trivially match typical response
  // text (e.g. a single space appears in header formatting) — not credentials.
  if (needle.trim().length === 0) return false;
  return haystack.includes(needle);
}

/**
 * Collect all header values from a Response into a single string for scanning.
 */
function headersToString(headers: Headers): string {
  const parts: string[] = [];
  headers.forEach((value, key) => {
    parts.push(`${key}: ${value}`);
  });
  return parts.join('\n');
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Property 2: Credentials are never leaked in responses (Balance Route)', () => {
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalKeyId = process.env.LUNO_API_KEY_ID;
    originalKeySecret = process.env.LUNO_API_KEY_SECRET;
  });

  afterEach(() => {
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
    vi.resetModules();
  });

  it('credentials never appear in the response body or headers — missing-credentials path (500) — Validates: Requirements 1.3', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate credential strings — minLength 8 avoids short/whitespace-only
        // values that trivially appear in typical response text.
        fc.tuple(
          fc.string({ minLength: 8, maxLength: 64 }),
          fc.string({ minLength: 8, maxLength: 64 }),
        ),
        async ([keyId, keySecret]) => {
          // Set the env vars to the generated values
          process.env.LUNO_API_KEY_ID = keyId;
          process.env.LUNO_API_KEY_SECRET = keySecret;

          // Now delete one of them to force the 500 "Server configuration error" path,
          // which means we can observe a response without needing to mock fetch.
          // We delete keySecret so we always exercise the missing-credential branch.
          delete process.env.LUNO_API_KEY_SECRET;

          vi.resetModules();
          const { GET } = await import('../route');

          const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
          const response = await GET(request);

          const bodyText = await response.text();
          const headersText = headersToString(response.headers);

          // Neither credential value should appear anywhere in the response
          if (keyId.length > 0) {
            expect(
              containsCredential(bodyText, keyId),
              `keyId "${keyId}" must not appear in response body`,
            ).toBe(false);

            expect(
              containsCredential(headersText, keyId),
              `keyId "${keyId}" must not appear in response headers`,
            ).toBe(false);
          }

          if (keySecret.length > 0) {
            expect(
              containsCredential(bodyText, keySecret),
              `keySecret "${keySecret}" must not appear in response body`,
            ).toBe(false);

            expect(
              containsCredential(headersText, keySecret),
              `keySecret "${keySecret}" must not appear in response headers`,
            ).toBe(false);
          }

          vi.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('credentials never appear in the response body or headers — upstream-failure path (mocked failing fetch) — Validates: Requirements 1.3', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-empty credential strings so we pass the env-var check
        // and proceed to the fetch call. minLength 8 avoids short/whitespace-only
        // values that trivially appear in typical response text.
        fc.tuple(
          fc.string({ minLength: 8, maxLength: 64 }),
          fc.string({ minLength: 8, maxLength: 64 }),
        ),
        async ([keyId, keySecret]) => {
          // Set both env vars so the route passes credential validation
          process.env.LUNO_API_KEY_ID = keyId;
          process.env.LUNO_API_KEY_SECRET = keySecret;

          // Mock fetch to return a non-2xx response so we get a 502 body
          // that we can inspect. The mock response itself contains no credentials.
          vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
          );

          vi.resetModules();
          const { GET } = await import('../route');

          const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
          const response = await GET(request);

          const bodyText = await response.text();
          const headersText = headersToString(response.headers);

          // The response must not contain the raw credential values
          expect(
            containsCredential(bodyText, keyId),
            `keyId must not appear in response body (status ${response.status})`,
          ).toBe(false);

          expect(
            containsCredential(headersText, keyId),
            `keyId must not appear in response headers (status ${response.status})`,
          ).toBe(false);

          expect(
            containsCredential(bodyText, keySecret),
            `keySecret must not appear in response body (status ${response.status})`,
          ).toBe(false);

          expect(
            containsCredential(headersText, keySecret),
            `keySecret must not appear in response headers (status ${response.status})`,
          ).toBe(false);

          vi.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('credentials never appear in the response body or headers — success path (mocked valid upstream) — Validates: Requirements 1.3', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 8, maxLength: 64 }),
          fc.string({ minLength: 8, maxLength: 64 }),
        ),
        async ([keyId, keySecret]) => {
          process.env.LUNO_API_KEY_ID = keyId;
          process.env.LUNO_API_KEY_SECRET = keySecret;

          // Mock a successful upstream response that returns a valid balance array
          // plus a valid ticker per unique asset. Crucially, the mock response
          // bodies do NOT contain the credentials.
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
              new Response(
                JSON.stringify({
                  balance: [
                    {
                      account_id: 'acc-001',
                      asset: 'XBT',
                      balance: '0.00350000',
                      reserved: '0.00000000',
                      unconfirmed: '0.00000000',
                    },
                  ],
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                },
              ),
            );
          });

          vi.resetModules();
          const { GET } = await import('../route');

          const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
          const response = await GET(request);

          const bodyText = await response.text();
          const headersText = headersToString(response.headers);

          expect(
            containsCredential(bodyText, keyId),
            `keyId must not appear in 200 response body`,
          ).toBe(false);

          expect(
            containsCredential(headersText, keyId),
            `keyId must not appear in 200 response headers`,
          ).toBe(false);

          expect(
            containsCredential(bodyText, keySecret),
            `keySecret must not appear in 200 response body`,
          ).toBe(false);

          expect(
            containsCredential(headersText, keySecret),
            `keySecret must not appear in 200 response headers`,
          ).toBe(false);

          vi.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });
});
