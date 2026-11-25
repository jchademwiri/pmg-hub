import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../download';

const mockLimit = vi.fn(async (): Promise<any[]> => []);

vi.mock('@pmg/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockLimit,
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
    isPublished: 'isPublished',
    downloadCount: 'downloadCount',
  },
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
  bridgeDatabaseEnv: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://r2.example.com/signed-template-url'),
}));

describe('GET /api/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
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

  it('redirects direct browser error to /templates when form parameter is missing', async () => {
    const request = new Request('https://www.tenderedgesolutions.co.za/api/download');
    const response = await GET({ request } as any);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/templates?error=MISSING_PARAM');
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

  it('returns 404 for an unknown or unpublished template slug', async () => {
    const request = new Request(
      'https://www.tenderedgesolutions.co.za/api/download?form=unknown-doc&format=json',
    );
    const response = await GET({ request } as any);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('FORM_NOT_FOUND');
  });

  it('returns presigned R2 URL with .docx filename for published Word affidavit templates', async () => {
    process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'acct-test';
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'key-test';
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'secret-test';

    mockLimit.mockResolvedValueOnce([
      {
        id: 'uuid-1',
        slug: 'b-bbee-eme-sworn-affidavit',
        title: 'B-BBEE EME Sworn Affidavit',
        s3Key: 'tender-templates/bbbee-affidavits/b-bbee-eme-sworn-affidavit-1732530000000.docx',
        fileName: 'b-bbee-eme-sworn-affidavit.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        isPublished: true,
      },
    ]);

    const request = new Request(
      'https://www.tenderedgesolutions.co.za/api/download?form=b-bbee-eme-sworn-affidavit&format=json',
    );
    const response = await GET({ request } as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.url).toBe('https://r2.example.com/signed-template-url');
    expect(data.filename).toBe('b-bbee-eme-sworn-affidavit.docx');
    expect(data.title).toBe('B-BBEE EME Sworn Affidavit');
  });
});
