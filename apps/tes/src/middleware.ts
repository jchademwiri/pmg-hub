import { defineMiddleware } from 'astro:middleware';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

function getClientId(context: { request: { ip: string; headers: Headers } }): string {
  return context.request.ip || 'unknown';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(clientId);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

const RATE_LIMITED_ACTIONS = new Set(['enquireLead']);

export const onRequest = defineMiddleware(async (context, next) => {
  const clientId = getClientId(context);
  const pathname = context.url.pathname;
  const actionName = pathname.replace(/^\/?_?actions\//, '');

  if (RATE_LIMITED_ACTIONS.has(actionName) && context.request.method === 'POST') {
    if (isRateLimited(clientId)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const response = await next();

  const cacheControlValue =
    pathname.startsWith('/_astro') || pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate';

  response.headers.set('Cache-Control', cacheControlValue);

  if (pathname === '/') {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }

  return response;
});
