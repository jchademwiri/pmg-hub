import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomUUID } from 'node:crypto';
import { getDb, session as sessionTable, user, clients, eq, and } from '@pmg/db';

const TOKEN_TTL_MS = 5 * 60_000; // 5 minutes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const clientId = searchParams.get('cid');
  const adminUserId = searchParams.get('uid');
  const timestamp = searchParams.get('ts');

  // Validate all params present
  if (!token || !clientId || !adminUserId || !timestamp) {
    return redirectToLogin(request);
  }

  const ts = Number(timestamp);
  if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) {
    return redirectToLogin(request);
  }

  const secret = process.env.IMPERSONATION_SHARED_SECRET;
  if (!secret) {
    console.error('[Impersonate] IMPERSONATION_SHARED_SECRET not configured');
    return redirectToLogin(request);
  }

  // Verify HMAC
  const expectedHmac = createHmac('sha256', secret)
    .update(`${clientId}:${adminUserId}:${ts}`)
    .digest('hex');

  if (token !== expectedHmac) {
    return redirectToLogin(request);
  }

  const db = getDb();

  // Verify the admin user exists and has admin/super_admin role
  const [adminUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, adminUserId))
    .limit(1);

  if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role || '')) {
    return redirectToLogin(request);
  }

  // Verify the client exists and is active
  const [targetClient] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.isActive, true)))
    .limit(1);

  if (!targetClient) {
    return redirectToLogin(request);
  }

  // Create a portal session for the admin
  const sessionId = randomUUID();
  const sessionToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(sessionTable).values({
    id: sessionId,
    token: sessionToken,
    userId: adminUserId,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  // Build response redirecting to dashboard
  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  // Set the portal session cookie (matches better-auth cookie name)
  // IMPORTANT: The value must be HMAC-signed — better-auth's getSignedCookie() reads session
  // tokens via getSignedCookie, which splits on the last '.' and verifies the HMAC-SHA256
  // signature using BETTER_AUTH_SECRET. Without this, getSession() will reject the cookie.
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret) {
    console.error('[Impersonate] BETTER_AUTH_SECRET not configured');
    return redirectToLogin(request);
  }
  const sessionSignature = createHmac('sha256', authSecret).update(sessionToken).digest('base64');
  const signedSessionValue = `${sessionToken}.${sessionSignature}`;

  const isProd = process.env.NODE_ENV === 'production';
  const sessionCookieName = isProd ? '__Secure-better-auth.session_token' : 'better-auth.session_token';

  response.cookies.set(sessionCookieName, signedSessionValue, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  // Set the impersonation cookie for getPortalSession() to pick up
  response.cookies.set('impersonate_client_id', clientId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400, // 24 hours
  });

  return response;
}

function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/login', request.url));
}
