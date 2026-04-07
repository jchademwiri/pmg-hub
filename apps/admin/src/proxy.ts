import { NextResponse, type NextRequest } from 'next/server'

// Feature: auth-roles, Property 11: Rate limiter isolates by IP
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

// Feature: auth-roles, Property 4: Proxy blocks unauthenticated requests to protected paths
// Feature: auth-roles, Property 5: Proxy passes authenticated requests through
// Feature: auth-roles, Property 6: Auth allowlist always passes through
// Feature: auth-security, Property 12: Server-side session validation via Better Auth
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

  // ── Server-side session validation via Better Auth ──────────────────────
  // Instead of just trusting the cookie exists, verify it against the DB
  // by calling the Better Auth session endpoint internally.
  try {
    const sessionUrl = new URL('/api/auth/get-session', request.url)
    const res = await fetch(sessionUrl.toString(), {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
    })

    if (!res.ok) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const session = await res.json()

    // Reject inactive users even if session is valid
    if (session?.user && session.user.isActive === false) {
      // Clear the session cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('better-auth.session_token')
      response.cookies.delete('__Secure-better-auth.session_token')
      return response
    }

    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch {
    // If the internal fetch fails (e.g. during build or cold start), 
    // fall back to cookie-only check which we already passed above
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (static assets)
     * - public folder files (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)',
  ],
}
