/**
 * Property-Based Test — Property 3
 *
 * Missing or empty env vars produce HTTP 500 without outbound request (Balance Route)
 *
 * **Validates: Requirements 1.7, 7.2**
 */

import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Property 3 — Missing or empty env vars → HTTP 500 (Balance Route)', () => {
  let originalKeyId: string | undefined;
  let originalKeySecret: string | undefined;

  beforeEach(() => {
    originalKeyId = process.env.LUNO_API_KEY_ID;
    originalKeySecret = process.env.LUNO_API_KEY_SECRET;
  });

  afterEach(() => {
    // Restore original env var values
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

  it('returns HTTP 500 with { error: "Server configuration error" } and never calls fetch — Validates: Requirements 1.7, 7.2', async () => {
    await fc.assert(
      fc.asyncProperty(
        // At least one of the two credential vars must be absent or empty
        fc.subarray(['keyId', 'keySecret'] as const, { minLength: 1 }),
        async (varsToOmit) => {
          // Mock globalThis.fetch so we can assert it is never called
          const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
            throw new Error('fetch should not have been called');
          });

          // Apply mutations: omit or empty the selected vars
          for (const varName of varsToOmit) {
            const envKey = varName === 'keyId' ? 'LUNO_API_KEY_ID' : 'LUNO_API_KEY_SECRET';
            // Alternate between deletion and empty string to cover both forms
            if (varName === 'keyId') {
              delete process.env[envKey];
            } else {
              process.env[envKey] = '';
            }
          }

          // Ensure the non-omitted var (if any) has a valid value
          if (!varsToOmit.includes('keyId')) {
            process.env.LUNO_API_KEY_ID = 'test-key-id';
          }
          if (!varsToOmit.includes('keySecret')) {
            process.env.LUNO_API_KEY_SECRET = 'test-key-secret';
          }

          // Reset module cache so the re-imported GET picks up the mutated env
          vi.resetModules();
          const { GET } = await import('../route');

          const request = new Request('http://localhost/api/luno/balance', {
            method: 'GET',
          });
          const response = await GET(request);

          // ── Assertions ────────────────────────────────────────────────
          expect(response.status).toBe(500);

          const body = (await response.json()) as unknown;
          expect(body).toEqual({ error: 'Server configuration error' });

          expect(fetchSpy).not.toHaveBeenCalled();

          // Clean up spy between fast-check iterations
          vi.restoreAllMocks();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns HTTP 500 when LUNO_API_KEY_ID is deleted and LUNO_API_KEY_SECRET is set — Validates: Requirements 1.7, 7.2', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch should not have been called');
    });

    delete process.env.LUNO_API_KEY_ID;
    process.env.LUNO_API_KEY_SECRET = 'test-key-secret';

    vi.resetModules();
    const { GET } = await import('../route');

    const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 when LUNO_API_KEY_ID is set and LUNO_API_KEY_SECRET is empty string — Validates: Requirements 1.7, 7.2', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch should not have been called');
    });

    process.env.LUNO_API_KEY_ID = 'test-key-id';
    process.env.LUNO_API_KEY_SECRET = '';

    vi.resetModules();
    const { GET } = await import('../route');

    const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 when both vars are absent — Validates: Requirements 1.7, 7.2', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch should not have been called');
    });

    delete process.env.LUNO_API_KEY_ID;
    delete process.env.LUNO_API_KEY_SECRET;

    vi.resetModules();
    const { GET } = await import('../route');

    const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 when both vars are empty strings — Validates: Requirements 1.7, 7.2', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch should not have been called');
    });

    process.env.LUNO_API_KEY_ID = '';
    process.env.LUNO_API_KEY_SECRET = '';

    vi.resetModules();
    const { GET } = await import('../route');

    const request = new Request('http://localhost/api/luno/balance', { method: 'GET' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server configuration error' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
