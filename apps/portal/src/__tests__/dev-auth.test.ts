import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDevClientsAction, loginAsDevClientAction } from '@/app/actions/dev-auth';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@pmg/db', () => ({
  getDb: vi.fn(),
  clients: {
    id: 'id',
    name: 'name',
    businessName: 'businessName',
    email: 'email',
    isActive: 'isActive',
  },
  eq: vi.fn(),
}));

describe('Portal Dev Mode Auth Actions', () => {
  const originalEnv = { ...process.env };
  const setNodeEnv = (value: string) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.DISABLE_PORTAL_AUTH === undefined) {
      delete process.env.DISABLE_PORTAL_AUTH;
    } else {
      process.env.DISABLE_PORTAL_AUTH = originalEnv.DISABLE_PORTAL_AUTH;
    }
  });

  it('getDevClientsAction returns empty array when flag is not set', async () => {
    setNodeEnv('development');
    delete process.env.DISABLE_PORTAL_AUTH;

    const result = await getDevClientsAction();
    expect(result).toEqual([]);
  });

  it('getDevClientsAction returns empty array when flag is set in production', async () => {
    setNodeEnv('production');
    process.env.DISABLE_PORTAL_AUTH = 'true';

    const result = await getDevClientsAction();
    expect(result).toEqual([]);
  });

  it('getDevClientsAction fetches active clients when flag is set in development', async () => {
    setNodeEnv('development');
    process.env.DISABLE_PORTAL_AUTH = 'true';

    const mockClients = [
      { id: 'c1', name: 'Client One', businessName: 'Business 1', email: 'c1@test.com' },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockClients),
        }),
      }),
    };

    const { getDb } = await import('@pmg/db');
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getDevClientsAction();
    expect(result).toEqual(mockClients);
  });

  it('loginAsDevClientAction sets dev_impersonate_client_id cookie when flag is set in development', async () => {
    setNodeEnv('development');
    process.env.DISABLE_PORTAL_AUTH = 'true';

    const mockCookieStore = {
      set: vi.fn(),
    };
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Client One', isActive: true }]),
          }),
        }),
      }),
    };

    const { getDb } = await import('@pmg/db');
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const res = await loginAsDevClientAction('c1');
    expect(res.success).toBe(true);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'dev_impersonate_client_id',
      'c1',
      expect.objectContaining({ path: '/', sameSite: 'lax' }),
    );
  });

  it('loginAsDevClientAction refuses when flag is not set', async () => {
    setNodeEnv('development');
    delete process.env.DISABLE_PORTAL_AUTH;

    const res = await loginAsDevClientAction('c1');
    expect(res.success).toBe(false);
  });
});
