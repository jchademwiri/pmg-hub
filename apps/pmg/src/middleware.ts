import { defineMiddleware } from 'astro:middleware';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

const RATE_LIMITED_ACTIONS = new Set([
  '/actions/submitContactForm',
]);

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

export const onRequest = defineMiddleware(async (context, next) => {
  const clientId = getClientId(context);
  const pathname = context.url.pathname;

  if (RATE_LIMITED_ACTIONS.has(pathname) && context.request.method === 'POST') {
    if (isRateLimited(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return next();
});
