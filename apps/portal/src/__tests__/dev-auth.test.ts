import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDevClientsAction returns empty array in non-development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    const result = await getDevClientsAction();
    expect(result).toEqual([]);

    (process.env as any).NODE_ENV = originalEnv;
  });

  it('getDevClientsAction fetches active clients in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';

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

    (process.env as any).NODE_ENV = originalEnv;
  });

  it('loginAsDevClientAction sets dev_impersonate_client_id cookie in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';

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

    (process.env as any).NODE_ENV = originalEnv;
  });
});
