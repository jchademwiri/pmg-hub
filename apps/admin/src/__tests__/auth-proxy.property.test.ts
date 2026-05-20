/**
 * Property-Based Tests for proxy.ts
 *
 * Property 4: Proxy blocks unauthenticated requests to protected paths
 * Validates: Requirements 3.1
 *
 * Property 5: Proxy passes authenticated requests through (with server-side validation)
 * Validates: Requirements 3.2
 *
 * Property 6: Auth allowlist always passes through
 * Validates: Requirements 3.3
 *
 * Property 11: Rate limiter isolates by IP
 * Validates: Requirements 8.1, 8.2, 8.3
 *
 * Property 12: Server-side session validation rejects invalid/inactive users
 * Validates: Requirements 1.1
 */

import { describe, it, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'

// ─── Global fetch mock ─────────────────────────────────────────────────────
// The upgraded proxy now calls fetch() internally to validate sessions.
// We mock globalThis.fetch for test control.

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
      p !== '/invite' &&
      !p.startsWith('/api/auth/') &&
      p.length > 0
  )

/** Paths in the allowlist */
const allowlistPathArb = fc.oneof(
  fc.constant('/login'),
  fc.constant('/invite'),
  fc
    .webSegment()
    .map((seg) => `/api/auth/${seg}`)
)

/** A non-empty cookie value */
const cookieValueArb = fc.string({ minLength: 1, maxLength: 64 }).filter((s) => !s.includes(';') && !s.includes('='))

/** IPv4 address arbitrary */
const ipv4Arb = fc.ipV4()

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('proxy - Property 4: blocks unauthenticated requests to protected paths', () => {
  /**
   * Feature: auth-roles, Property 4: Proxy blocks unauthenticated requests to protected paths
   * Validates: Requirements 3.1
   */
  it('redirects to /login when no session cookie is present - Validates: Requirements 3.1', async () => {
    const { proxy } = await import('@/proxy')

    await fc.assert(
      fc.asyncProperty(protectedPathArb, async (pathname) => {
        const req = makeRequest(pathname)
        const res = await proxy(req)

        expect(res.status).toBe(307)
        const location = res.headers.get('location')
        expect(location).toContain('/login')
      }),
      { numRuns: 100 }
    )
  })
})

describe('proxy - Property 5: passes authenticated requests through', () => {
  /**
   * Feature: auth-roles, Property 5: Proxy passes authenticated requests through
   * Validates: Requirements 3.2
   */
  beforeEach(() => {
    // Mock fetch to return a valid session for all internal session validation calls
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: '1', name: 'Test', email: 'test@test.com', isActive: true } }), { status: 200 })
    ))
  })

  it('returns next() for any path when session cookie is present and valid - Validates: Requirements 3.2', async () => {
    const { proxy } = await import('@/proxy')

    await fc.assert(
      fc.asyncProperty(protectedPathArb, cookieValueArb, async (pathname, cookieValue) => {
        const req = makeRequest(pathname, { sessionCookie: cookieValue })
        const res = await proxy(req)

        // Should NOT redirect
        expect(res.status).not.toBe(307)
        expect(res.status).not.toBe(302)
      }),
      { numRuns: 100 }
    )
  })
})

describe('proxy - Property 6: auth allowlist always passes through', () => {
  /**
   * Feature: auth-roles, Property 6: Auth allowlist always passes through
   * Validates: Requirements 3.3
   */
  it('allows /login, /invite, and /api/auth/* through regardless of session cookie - Validates: Requirements 3.3', async () => {
    const { proxy } = await import('@/proxy')

    await fc.assert(
      fc.asyncProperty(
        allowlistPathArb,
        fc.option(cookieValueArb, { nil: undefined }),
        async (pathname, cookieValue) => {
          const req = makeRequest(pathname, cookieValue ? { sessionCookie: cookieValue } : {})
          const res = await proxy(req)

          // Should NOT redirect to /login
          expect(res.status).not.toBe(307)
          expect(res.status).not.toBe(302)
          // For /login and /invite specifically, no rate limiting
          if (pathname === '/login' || pathname === '/invite') {
            expect(res.status).toBe(200)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('proxy - Property 11: rate limiter isolates by IP', () => {
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

  it('counts for one IP do not affect another IP - Validates: Requirements 8.1, 8.2, 8.3', async () => {
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
            await proxy(req)
          }

          // ip1's 11th request should be rate limited
          const ip1Req = new NextRequest('http://localhost/api/auth/sign-in', {
            headers: { 'x-forwarded-for': ip1 },
          })
          const ip1Res = await proxy(ip1Req)
          expect(ip1Res.status).toBe(429)

          // ip2 should still be allowed through (independent counter)
          const ip2Req = new NextRequest('http://localhost/api/auth/sign-in', {
            headers: { 'x-forwarded-for': ip2 },
          })
          const ip2Res = await proxy(ip2Req)
          expect(ip2Res.status).not.toBe(429)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('returns 429 after 10 requests from the same IP within 60s - Validates: Requirements 8.1', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { proxy } = await import('@/proxy')

    const ip = '1.2.3.4'

    // First 10 requests should pass
    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost/api/auth/sign-in', {
        headers: { 'x-forwarded-for': ip },
      })
      const res = await proxy(req)
      expect(res.status).not.toBe(429)
    }

    // 11th request should be rate limited
    const req = new NextRequest('http://localhost/api/auth/sign-in', {
      headers: { 'x-forwarded-for': ip },
    })
    const res = await proxy(req)
    expect(res.status).toBe(429)
  })

  it('rate limit only applies to /api/auth/* paths - Validates: Requirements 8.3', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { proxy } = await import('@/proxy')

    // Mock fetch for valid session
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: '1', name: 'Test', email: 'test@test.com', isActive: true } }), { status: 200 })
    ))

    const ip = '5.6.7.8'

    // Make 20 requests to a non-auth path with a session cookie - should never 429
    for (let i = 0; i < 20; i++) {
      const req = new NextRequest('http://localhost/dashboard', {
        headers: {
          'x-forwarded-for': ip,
          cookie: 'better-auth.session_token=abc123',
        },
      })
      const res = await proxy(req)
      expect(res.status).not.toBe(429)
    }
  })
})

describe('proxy - Property 12: server-side session validation', () => {
  /**
   * Feature: auth-security, Property 12: Server-side session validation
   * Validates: Requirements 1.1
   */

  beforeEach(async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
  })

  it('redirects to /login when session validation returns no user - Validates: Requirements 1.1', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { proxy } = await import('@/proxy')

    // Mock fetch to return an invalid session
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(null), { status: 200 })
    ))

    const req = makeRequest('/dashboard', { sessionCookie: 'expired-token' })
    const res = await proxy(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/login')
  })

  it('redirects to /login when user is inactive - Validates: Requirements 1.1', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { proxy } = await import('@/proxy')

    // Mock fetch to return a session with inactive user
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: '1', name: 'Revoked', email: 'revoked@test.com', isActive: false } }), { status: 200 })
    ))

    const req = makeRequest('/dashboard', { sessionCookie: 'valid-token' })
    const res = await proxy(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/login')
  })

  it('passes through when session is valid and user is active - Validates: Requirements 1.1', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { proxy } = await import('@/proxy')

    // Mock fetch to return a valid active session
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: '1', name: 'Active', email: 'active@test.com', isActive: true } }), { status: 200 })
    ))

    const req = makeRequest('/dashboard', { sessionCookie: 'valid-token' })
    const res = await proxy(req)

    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(302)
  })
})
