import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// In-memory rate limiter: 10 requests / 60 seconds per IP
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count++
  return false
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Rate limit auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown'
    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  // Allow auth routes through unconditionally
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Allow the public invite acceptance route through
  if (pathname === '/invite') {
    return NextResponse.next()
  }

  // Require session cookie for all other routes
  const sessionToken =
    request.cookies.get('__Secure-better-auth.session_token') ??
    request.cookies.get('better-auth.session_token')
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Validate session directly via the DB adapter — no internal HTTP fetch
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Reject inactive users even if session cookie is present
    if ((session.user as { isActive?: boolean }).isActive === false) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('better-auth.session_token')
      response.cookies.delete('__Secure-better-auth.session_token')
      return response
    }
  } catch {
    // Session validation failed — redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)',
  ],
}
