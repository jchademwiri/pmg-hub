import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../download';

// Mock @pmg/db
vi.mock('@pmg/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          catch: vi.fn(),
        })),
      })),
    })),
  })),
  publicDocuments: {
    slug: 'slug',
    id: 'id',
    downloadCount: 'downloadCount',
  },
  eq: vi.fn(),
  sql: vi.fn(),
  bridgeDatabaseEnv: vi.fn(),
}));

describe('GET /api/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  });

  it('returns 400 when form slug parameter is missing', async () => {
    const request = new Request('https://www.tenderedgesolutions.co.za/api/download?format=json');
    const response = await GET({ request } as any);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('MISSING_PARAM');
  });

  it('returns static fallback URL when R2 is unconfigured (JSON request)', async () => {
    const request = new Request(
      'https://www.tenderedgesolutions.co.za/api/download?form=sbd-4&format=json',
    );
    const response = await GET({ request } as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.url).toBe('/documents/sbd-4.pdf');
    expect(data.filename).toBe('sbd-4.pdf');
    expect(data.title).toContain('SBD 4');
  });

  it('redirects 302 to static fallback document on direct browser navigation', async () => {
    const request = new Request('https://www.tenderedgesolutions.co.za/api/download?form=sbd-6-1');
    const response = await GET({ request } as any);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/documents/sbd-6-1.pdf');
  });

  it('returns 404 for an unknown form slug', async () => {
    const request = new Request(
      'https://www.tenderedgesolutions.co.za/api/download?form=unknown-doc&format=json',
    );
    const response = await GET({ request } as any);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('FORM_NOT_FOUND');
  });
});
