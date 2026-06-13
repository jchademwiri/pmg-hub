import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('server-only', () => ({}))

const mockGetSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: (...args: any[]) => mockGetSession(...args),
    },
  },
}))

// Mocks
vi.mock('next/server', () => {
  return {
    NextRequest: class {
      nextUrl: { pathname: string }
      headers: Map<string, string>
      cookies: { get: (name: string) => any }
      url: string

      constructor(pathname: string, cookies: Record<string, string> = {}) {
        this.nextUrl = { pathname }
        this.url = `http://localhost${pathname}`
        this.headers = new Map([['x-forwarded-for', '127.0.0.1']])
        this.cookies = {
          get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
        }
      }
    },
    NextResponse: {
      next: vi.fn(),
      redirect: vi.fn(),
    },
  }
})

describe('proxy() function in proxy.ts', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: '1', name: 'Test', email: 'test@test.com', isActive: true } })
  })

  it('1. Request has __Secure-better-auth.session_token cookie → NextResponse.next()', async () => {
    const { proxy } = await import('../proxy')
    const req = new NextRequest('/dashboard', { '__Secure-better-auth.session_token': 'abc123' } as any)
    await proxy(req as any)
    expect(NextResponse.next).toHaveBeenCalled()
  })

  it('2. Request has better-auth.session_token cookie → NextResponse.next()', async () => {
    const { proxy } = await import('../proxy')
    const req = new NextRequest('/dashboard', { 'better-auth.session_token': 'abc123' } as any)
    await proxy(req as any)
    expect(NextResponse.next).toHaveBeenCalled()
  })

  it('3. Request has neither cookie → redirect to /login', async () => {
    const { proxy } = await import('../proxy')
    const req = new NextRequest('/dashboard', {})
    await proxy(req as any)
    expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/login', req.url))
  })

  it('4. Request is to /api/auth/magic-link/verify with no cookie → NextResponse.next()', async () => {
    const { proxy } = await import('../proxy')
    const req = new NextRequest('/api/auth/magic-link/verify', {})
    await proxy(req as any)
    expect(NextResponse.next).toHaveBeenCalled()
  })
})
