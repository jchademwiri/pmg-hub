/**
 * Property-Based Tests for proxy.ts
 *
 * Property 4: Proxy blocks unauthenticated requests to protected paths
 * Validates: Requirements 3.1
 *
 * Property 5: Proxy passes authenticated requests through
 * Validates: Requirements 3.2
 *
 * Property 6: Auth allowlist always passes through
 * Validates: Requirements 3.3
 *
 * Property 11: Rate limiter isolates by IP
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import { describe, it, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'

// Re-import proxy fresh for each test group so the rate limiter Map resets
// We use a dynamic import trick via a factory to get a fresh module per describe block.
// Since vitest caches modules, we test the rate limiter in isolation by calling
// the exported function directly and resetting state via the module's internals.

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  pathname: string,
  options: {
    sessionCookie?: string
    ip?: string
  } = {}
): NextRequest {
  const url = `http://localhost${pathname}`
  const req = new NextRequest(url)

  if (options.sessionCookie) {
    req.cookies.set('better-auth.session_token', options.sessionCookie)
  }

  if (options.ip) {
    // NextRequest headers are read-only after construction; build via init
    return new NextRequest(url, {
      headers: {
        'x-forwarded-for': options.ip,
        ...(options.sessionCookie
          ? { cookie: `better-auth.session_token=${options.sessionCookie}` }
          : {}),
      },
    })
  }

  return req
}

/** Paths that are NOT in the allowlist */
const protectedPathArb = fc
  .webPath()
  .filter(
    (p) =>
      p !== '/login' &&
      !p.startsWith('/api/auth/') &&
      p.length > 0
  )

/** Paths in the allowlist */
const allowlistPathArb = fc.oneof(
  fc.constant('/login'),
  fc
    .webSegment()
    .map((seg) => `/api/auth/${seg}`)
)

/** A non-empty cookie value */
const cookieValueArb = fc.string({ minLength: 1, maxLength: 64 }).filter((s) => !s.includes(';') && !s.includes('='))

/** IPv4 address arbitrary */
const ipv4Arb = fc.ipV4()

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('proxy — Property 4: blocks unauthenticated requests to protected paths', () => {
  /**
   * Feature: auth-roles, Property 4: Proxy blocks unauthenticated requests to protected paths
   * Validates: Requirements 3.1
   */
  it('redirects to /login when no session cookie is present — Validates: Requirements 3.1', async () => {
    const { proxy } = await import('@/proxy')

    await fc.assert(
      fc.property(protectedPathArb, (pathname) => {
        const req = makeRequest(pathname)
        const res = proxy(req)

        expect(res.status).toBe(307)
        const location = res.headers.get('location')
        expect(location).toContain('/login')
      }),
      { numRuns: 100 }
    )
  })
})

describe('proxy — Property 5: passes authenticated requests through', () => {
  /**
   * Feature: auth-roles, Property 5: Proxy passes authenticated requests through
   * Validates: Requirements 3.2
   */
  it('returns next() for any path when session cookie is present — Validates: Requirements 3.2', async () => {
    const { proxy } = await import('@/proxy')

    await fc.assert(
      fc.property(protectedPathArb, cookieValueArb, (pathname, cookieValue) => {
        const req = makeRequest(pathname, { sessionCookie: cookieValue })
        const res = proxy(req)

        // Should NOT redirect
        expect(res.status).not.toBe(307)
        expect(res.status).not.toBe(302)
      }),
      { numRuns: 100 }
    )
  })
})

describe('proxy — Property 6: auth allowlist always passes through', () => {
  /**
   * Feature: auth-roles, Property 6: Auth allowlist always passes through
   * Validates: Requirements 3.3
   */
  it('allows /login and /api/auth/* through regardless of session cookie — Validates: Requirements 3.3', async () => {
    const { proxy } = await import('@/proxy')

    await fc.assert(
      fc.property(
        allowlistPathArb,
        fc.option(cookieValueArb, { nil: undefined }),
        (pathname, cookieValue) => {
          const req = makeRequest(pathname, cookieValue ? { sessionCookie: cookieValue } : {})
          const res = proxy(req)

          // Should NOT redirect to /login
          expect(res.status).not.toBe(307)
          expect(res.status).not.toBe(302)
          // Should not be a 429 (rate limit only applies to /api/auth/*, tested separately)
          // For /login specifically, no rate limiting
          if (pathname === '/login') {
            expect(res.status).toBe(200)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('proxy — Property 11: rate limiter isolates by IP', () => {
  /**
   * Feature: auth-roles, Property 11: Rate limiter isolates by IP
   * Validates: Requirements 8.1, 8.2, 8.3
   */

  // We need a fresh module for rate limiter tests since the Map is module-level
  // Use vi.resetModules() to get a clean state
  beforeEach(async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
  })

  it('counts for one IP do not affect another IP — Validates: Requirements 8.1, 8.2, 8.3', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(ipv4Arb, ipv4Arb).filter(([a, b]) => a !== b),
        async ([ip1, ip2]) => {
          const { vi } = await import('vitest')
          vi.resetModules()
          const { proxy } = await import('@/proxy')

          // Exhaust ip1's rate limit (10 requests)
          for (let i = 0; i < 10; i++) {
            const req = new NextRequest('http://localhost/api/auth/sign-in', {
              headers: { 'x-forwarded-for': ip1 },
            })
            proxy(req)
          }

          // ip1's 11th request should be rate limited
          const ip1Req = new NextRequest('http://localhost/api/auth/sign-in', {
            headers: { 'x-forwarded-for': ip1 },
          })
          const ip1Res = proxy(ip1Req)
          expect(ip1Res.status).toBe(429)

          // ip2 should still be allowed through (independent counter)
          const ip2Req = new NextRequest('http://localhost/api/auth/sign-in', {
            headers: { 'x-forwarded-for': ip2 },
          })
          const ip2Res = proxy(ip2Req)
          expect(ip2Res.status).not.toBe(429)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('returns 429 after 10 requests from the same IP within 60s — Validates: Requirements 8.1', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { proxy } = await import('@/proxy')

    const ip = '1.2.3.4'

    // First 10 requests should pass
    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost/api/auth/sign-in', {
        headers: { 'x-forwarded-for': ip },
      })
      const res = proxy(req)
      expect(res.status).not.toBe(429)
    }

    // 11th request should be rate limited
    const req = new NextRequest('http://localhost/api/auth/sign-in', {
      headers: { 'x-forwarded-for': ip },
    })
    const res = proxy(req)
    expect(res.status).toBe(429)
  })

  it('rate limit only applies to /api/auth/* paths — Validates: Requirements 8.3', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { proxy } = await import('@/proxy')

    const ip = '5.6.7.8'

    // Make 20 requests to a non-auth path with a session cookie — should never 429
    for (let i = 0; i < 20; i++) {
      const req = new NextRequest('http://localhost/dashboard', {
        headers: {
          'x-forwarded-for': ip,
          cookie: 'better-auth.session_token=abc123',
        },
      })
      const res = proxy(req)
      expect(res.status).not.toBe(429)
    }
  })
})
