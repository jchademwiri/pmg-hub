import { NextResponse, type NextRequest } from 'next/server';
import { portalAuth } from '@/lib/auth';

// In-memory rate limiter for auth endpoints
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Rate limit auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const ip =
      request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    if (isRateLimited(ip)) return new NextResponse('Too Many Requests', { status: 429 });
  }

  // Allow public routes and assets through
  // /impersonate must be accessible without a session since it creates one
  if (pathname === '/login' || pathname === '/impersonate' || pathname.startsWith('/api/auth/')) {
    if (pathname === '/login') {
      const response = NextResponse.next();
      response.cookies.set('impersonate_client_id', '', { path: '/', maxAge: 0 });
      response.cookies.set('dev_impersonate_client_id', '', { path: '/', maxAge: 0 });
      return response;
    }
    return NextResponse.next();
  }

  // Dev-only escape hatch: allow dev user switcher (dev_impersonate_client_id cookie)
  // to access portal routes without a better-auth session cookie.
  // Never active outside local development.
  const isDevAuthBypass =
    (process.env.DISABLE_PORTAL_AUTH === 'true' ||
      process.env.NEXT_PUBLIC_DISABLE_PORTAL_AUTH === 'true') &&
    process.env.NODE_ENV !== 'production';

  const devClientId = isDevAuthBypass
    ? (request.cookies.get('dev_impersonate_client_id')?.value ??
      request.cookies.get('impersonate_client_id')?.value)
    : undefined;

  if (isDevAuthBypass && devClientId) {
    return NextResponse.next();
  }

  // Require session cookie for all authenticated portal routes
  const sessionToken =
    request.cookies.get('__Secure-better-auth.session_token') ??
    request.cookies.get('better-auth.session_token');
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // In dev mode with auth bypass enabled, skip DB session lookup if session token is present
  if (isDevAuthBypass) {
    return NextResponse.next();
  }

  // Validate session against the database
  try {
    const session = await portalAuth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.redirect(new URL('/login', request.url));
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)',
  ],
};
