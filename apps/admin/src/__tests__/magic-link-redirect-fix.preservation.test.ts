/**
 * Preservation Property Tests - magic-link-redirect-fix
 *
 * Property 2: Preservation - Unauthenticated Redirects, Allowlist, and Rate Limiting Unchanged
 *
 * These tests MUST PASS on unfixed code. They capture baseline behavior that
 * must be preserved after the fix is applied.
 *
 * Observations encoded as tests:
 * - proxy(request to /dashboard with better-auth.session_token=abc) → NextResponse.next()
 * - proxy(request to /dashboard with no cookies) → redirect to /login
 * - proxy(request to /login with no cookies) → NextResponse.next() (allowlisted)
 * - proxy(request to /api/auth/signin with no cookies) → NextResponse.next() (allowlisted)
 * - proxy(request to /api/auth/signin exceeding rate limit) → 429
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const mockGetSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: (...args: any[]) => mockGetSession(...args),
    },
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  pathname: string,
  cookies: Record<string, string> = {},
  ip = '127.0.0.1'
): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  const headers: Record<string, string> = { 'x-forwarded-for': ip }
  if (cookieHeader) headers['cookie'] = cookieHeader

  return new NextRequest(`http://localhost${pathname}`, { headers })
}

// ─── Preservation Tests ───────────────────────────────────────────────────────

describe('magic-link-redirect-fix - Property 2: Preservation - Baseline Behaviors', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: '1', name: 'Test', email: 'test@test.com', isActive: true } })
  })

  /**
   * Each test module import gets a fresh in-memory rate limiter, so we
   * re-import proxy dynamically inside the rate-limit test to get a clean state.
   */

  describe('3.1 - Unauthenticated requests to protected paths redirect to /login', () => {
    /**
     * Validates: Requirements 3.1
     *
     * Observation: proxy(request to /dashboard with no cookies) → redirect to /login
     */
    it(
      'proxy redirects to /login when no session cookie is present on a protected path - Validates: Requirements 3.1',
      async () => {
        const { proxy } = await import('@/proxy')
        const req = makeRequest('/dashboard')
        const res = await proxy(req)

        // NextResponse.redirect returns 307 by default
        expect([302, 307]).toContain(res.status)
        expect(res.headers.get('location')).toContain('/login')
      }
    )

    it(
      'proxy redirects to /login for any protected path with no cookies - Validates: Requirements 3.1',
      async () => {
        const { proxy } = await import('@/proxy')
        const protectedPaths = ['/dashboard', '/settings', '/settings/users', '/reports', '/admin']

        for (const pathname of protectedPaths) {
          const req = makeRequest(pathname)
          const res = await proxy(req)
          expect([302, 307]).toContain(res.status)
          expect(res.headers.get('location')).toContain('/login')
        }
      }
    )
  })

  describe('3.2 - Plain session cookie still grants access to protected paths', () => {
    /**
     * Validates: Requirements 2.2 / Preservation
     *
     * Observation: proxy(request to /dashboard with better-auth.session_token=abc) → NextResponse.next()
     */
    beforeEach(() => {
      // Mock fetch for server-side session validation - active user
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user: { id: '1', name: 'Test', email: 'test@test.com', isActive: true } }), { status: 200 })
      ))
    })

    it(
      'proxy returns NextResponse.next() when plain better-auth.session_token cookie is present - Validates: Requirements 3.1',
      async () => {
        const { proxy } = await import('@/proxy')
        const req = makeRequest('/dashboard', { 'better-auth.session_token': 'abc123' })
        const res = await proxy(req)

        expect(res.status).not.toBe(302)
        expect(res.status).not.toBe(307)
        expect(res.headers.get('location')).toBeNull()
      }
    )
  })

  describe('3.3 - Allowlisted paths always pass through unconditionally', () => {
    /**
     * Validates: Requirements 3.2
     *
     * Observation: proxy(request to /login with no cookies) → NextResponse.next()
     * Observation: proxy(request to /api/auth/signin with no cookies) → NextResponse.next()
     */
    it(
      'proxy returns NextResponse.next() for /login with no cookies - Validates: Requirements 3.2',
      async () => {
        const { proxy } = await import('@/proxy')
        const req = makeRequest('/login')
        const res = await proxy(req)

        expect(res.status).not.toBe(302)
        expect(res.headers.get('location')).toBeNull()
      }
    )

    it(
      'proxy returns NextResponse.next() for /api/auth/signin with no cookies - Validates: Requirements 3.2',
      async () => {
        const { proxy } = await import('@/proxy')
        const req = makeRequest('/api/auth/signin')
        const res = await proxy(req)

        expect(res.status).not.toBe(302)
        expect(res.headers.get('location')).toBeNull()
      }
    )

    it(
      'proxy returns NextResponse.next() for all /api/auth/* paths regardless of cookies - Validates: Requirements 3.2',
      async () => {
        const { proxy } = await import('@/proxy')
        const authPaths = [
          '/api/auth/signin',
          '/api/auth/signout',
          '/api/auth/callback',
          '/api/auth/magic-link/verify',
        ]

        for (const pathname of authPaths) {
          const req = makeRequest(pathname)
          const res = await proxy(req)
          // Should not redirect (rate limit not exceeded yet for these IPs)
          expect(res.headers.get('location')).toBeNull()
        }
      }
    )
  })

  describe('3.4 - Rate limiting on /api/auth/ endpoints returns 429', () => {
    /**
     * Validates: Requirements 3.3
     *
     * Observation: proxy(request to /api/auth/signin exceeding rate limit) → 429
     *
     * The in-memory rate limiter allows RATE_LIMIT_MAX (10) requests per window.
     * We use a unique IP per test to avoid cross-test interference, and send
     * RATE_LIMIT_MAX + 1 requests to trigger the limit.
     */
    it(
      'proxy returns 429 after exceeding rate limit on /api/auth/ endpoint - Validates: Requirements 3.3',
      async () => {
        const { proxy } = await import('@/proxy')
        const RATE_LIMIT_MAX = 10
        const uniqueIp = `10.0.0.${Math.floor(Math.random() * 200) + 50}` // avoid collision with other tests

        // Send RATE_LIMIT_MAX requests - all should pass through
        for (let i = 0; i < RATE_LIMIT_MAX; i++) {
          const req = makeRequest('/api/auth/signin', {}, uniqueIp)
          const res = await proxy(req)
          expect(res.status).not.toBe(429)
        }

        // The (RATE_LIMIT_MAX + 1)th request should be rate limited
        const req = makeRequest('/api/auth/signin', {}, uniqueIp)
        const res = await proxy(req)
        expect(res.status).toBe(429)
      }
    )
  })
})
