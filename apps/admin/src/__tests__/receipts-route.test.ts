import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/receipts/route';
import { auth } from '@/lib/auth';
import * as r2 from '@/lib/r2';

vi.mock('@/lib/r2', () => ({
  generateReceiptPresignedUrl: vi.fn(),
}));

const mockAdminSession = {
  user: {
    id: 'admin-1',
    role: 'admin',
    name: 'Admin',
    email: 'admin@pmg.co.za',
    emailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: 'sess-1',
    userId: 'admin-1',
    token: 'test-token',
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('Receipts API Route (GET /api/receipts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 Unauthorized when session is missing', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/receipts?key=receipts/test.pdf');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 Bad Request when key query param is missing', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValueOnce(mockAdminSession);

    const req = new Request('http://localhost:3000/api/receipts');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('returns 403 Forbidden for non-receipts prefix or path traversal keys', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(mockAdminSession);

    // Case 1: non-receipts prefix
    const req1 = new Request('http://localhost:3000/api/receipts?key=secret/passwords.txt');
    const res1 = await GET(req1);
    expect(res1.status).toBe(403);

    // Case 2: path traversal
    const req2 = new Request('http://localhost:3000/api/receipts?key=receipts/../etc/passwd');
    const res2 = await GET(req2);
    expect(res2.status).toBe(403);
  });

  it('redirects with 307 to presigned URL for valid receipt keys when authenticated', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValueOnce(mockAdminSession);

    const mockPresignedUrl = 'https://mock-r2-presigned-url.com/receipts/123-receipt.pdf';
    vi.mocked(r2.generateReceiptPresignedUrl).mockResolvedValueOnce(mockPresignedUrl);

    const req = new Request('http://localhost:3000/api/receipts?key=receipts/123-receipt.pdf');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(mockPresignedUrl);
    expect(r2.generateReceiptPresignedUrl).toHaveBeenCalledWith('receipts/123-receipt.pdf', 300);
  });
});
