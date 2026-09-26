import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

// Mock portalAuth to avoid real network/DB calls
vi.mock('@/lib/auth', () => ({
  portalAuth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

describe('Portal Proxy Middleware (Dev & Prod Auth)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function createRequest(path: string, cookies: Record<string, string> = {}) {
    const url = new URL(`http://localhost:3001${path}`);
    const req = new NextRequest(url);
    for (const [key, value] of Object.entries(cookies)) {
      req.cookies.set(key, value);
    }
    return req;
  }

  const setNodeEnv = (val: string) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = val;
  };

  it('allows public routes (/login, /impersonate) through', async () => {
    const loginReq = createRequest('/login');
    const res = await proxy(loginReq);
    expect(res.status).toBe(200);
  });

  it('redirects to /login for protected routes when unauthenticated in production', async () => {
    setNodeEnv('production');
    delete process.env.DISABLE_PORTAL_AUTH;

    const req = createRequest('/dashboard');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3001/login');
  });

  it('allows dev user switcher with dev_impersonate_client_id in dev mode without better-auth session', async () => {
    setNodeEnv('development');
    process.env.DISABLE_PORTAL_AUTH = 'true';

    const req = createRequest('/dashboard', {
      dev_impersonate_client_id: 'client-123',
    });

    const res = await proxy(req);
    // Should NOT redirect to /login, should pass through (status 200)
    expect(res.status).toBe(200);
  });

  it('still redirects to /login in dev mode if neither sessionToken nor dev_impersonate_client_id is present', async () => {
    setNodeEnv('development');
    process.env.DISABLE_PORTAL_AUTH = 'true';

    const req = createRequest('/dashboard');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3001/login');
  });

  it('passes through with valid sessionToken in production when session is valid', async () => {
    setNodeEnv('production');
    delete process.env.DISABLE_PORTAL_AUTH;

    const { portalAuth } = await import('@/lib/auth');
    vi.mocked(portalAuth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com' },
      session: { id: 's1' },
    } as any);

    const req = createRequest('/dashboard', {
      'better-auth.session_token': 'valid-token',
    });

    const res = await proxy(req);
    expect(res.status).toBe(200);
  });
});
