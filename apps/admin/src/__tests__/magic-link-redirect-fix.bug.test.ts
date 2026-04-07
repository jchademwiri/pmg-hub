/**
 * Bug Condition Exploration Test — magic-link-redirect-fix
 *
 * Property 1: Bug Condition — Secure-Prefixed Cookie Grants Access
 *
 * This test MUST FAIL on unfixed code. Failure confirms the bug exists.
 * DO NOT modify proxy.ts or this test to make it pass.
 *
 * Bug: In production (HTTPS), Better Auth prefixes its session cookie with
 * `__Secure-`, making it `__Secure-better-auth.session_token`. The middleware
 * only checks for the plain name `better-auth.session_token`, so it misses the
 * prefixed cookie and redirects authenticated users back to `/login`.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * isBugCondition: request carries __Secure-better-auth.session_token but NOT
 * better-auth.session_token, and targets a protected path.
 */
function makeSecureCookieRequest(pathname: string, secureCookieValue: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: {
      cookie: `__Secure-better-auth.session_token=${secureCookieValue}`,
    },
  })
}

// ─── Bug Condition Exploration Test ──────────────────────────────────────────

describe('magic-link-redirect-fix — Property 1: Bug Condition — Secure-Prefixed Cookie Grants Access', () => {
  /**
   * Validates: Requirements 1.1, 1.2
   *
   * EXPECTED OUTCOME ON UNFIXED CODE: FAIL
   * The proxy redirects to /login even though __Secure-better-auth.session_token is present.
   * This failure is the counterexample that confirms the bug exists.
   *
   * Counterexample:
   *   proxy(request to /dashboard with __Secure-better-auth.session_token=abc)
   *   returns redirect to /login instead of NextResponse.next()
   */
  beforeEach(() => {
    // Mock fetch for server-side session validation — return a valid active session
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: '1', name: 'Test', email: 'test@test.com', isActive: true } }), { status: 200 })
    ))
  })

  it(
    'proxy returns NextResponse.next() (not a redirect) when only __Secure-better-auth.session_token is set on a protected path — Validates: Requirements 1.1, 1.2',
    async () => {
      const req = makeSecureCookieRequest('/dashboard', 'abc123')
      const res = await proxy(req)

      // The response MUST NOT be a redirect
      expect(res.status).not.toBe(302)
      expect(res.status).not.toBe(307)

      // The response MUST be NextResponse.next() — no Location header
      expect(res.headers.get('location')).toBeNull()
    }
  )
})
