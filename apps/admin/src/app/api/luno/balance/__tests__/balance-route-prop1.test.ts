/**
 * Property-Based Tests for the Balance Route
 *
 * Property 1: Non-GET methods are rejected with 405
 *
 * Validates: Requirements 1.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { POST, PUT, DELETE, PATCH, HEAD, OPTIONS } from '../route';

// Map each method string to the corresponding exported handler
const handlerMap: Record<string, () => Response | Promise<Response>> = {
  POST: () => POST(),
  PUT: () => PUT(),
  DELETE: () => DELETE(),
  PATCH: () => PATCH(),
  HEAD: () => HEAD(),
  OPTIONS: () => OPTIONS(),
};

describe('Property 1: Non-GET methods are rejected with 405', () => {
  it('returns HTTP 405 with { error: "Method Not Allowed" } for every non-GET method — Validates: Requirements 1.1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'),
        async (method) => {
          const handler = handlerMap[method];
          const response = await handler();

          // ── Assert HTTP 405 ─────────────────────────────────────────────
          expect(response.status).toBe(405);

          // ── Assert body JSON ────────────────────────────────────────────
          const body = await response.json();
          expect(body).toEqual({ error: 'Method Not Allowed' });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Example-based verification — one assertion per method for clarity
  it.each([
    ['POST', () => POST()],
    ['PUT', () => PUT()],
    ['DELETE', () => DELETE()],
    ['PATCH', () => PATCH()],
    ['HEAD', () => HEAD()],
    ['OPTIONS', () => OPTIONS()],
  ] as const)('%s returns 405 with Method Not Allowed body', async (_method, handler) => {
    const response = await handler();
    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body).toEqual({ error: 'Method Not Allowed' });
  });
});
