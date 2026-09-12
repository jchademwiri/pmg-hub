import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/accounting/export/[type]/route';
import * as authLib from '@/lib/auth';
import * as accountingPdf from '@pmg/accounting/server-accounting-pdf';

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock('@pmg/accounting/server-accounting-pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@pmg/accounting/server-accounting-pdf')>();
  return {
    ...actual,
    generateAccountingPdf: vi.fn(),
  };
});

const mockAdminSession = {
  user: { id: 'user-1', role: 'admin' },
  session: { id: 'sess-1' },
};

describe('Accounting Export API Route (GET /api/accounting/export/[type])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 Forbidden when user is not admin', async () => {
    vi.mocked(authLib.getSessionOrRedirect).mockResolvedValueOnce(mockAdminSession as any);
    vi.mocked(authLib.requireRole).mockReturnValueOnce(false);

    const req = new Request('http://localhost:3000/api/accounting/export/profit-and-loss');
    const params = Promise.resolve({ type: 'profit-and-loss' });
    const res = await GET(req, { params });

    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown report type', async () => {
    vi.mocked(authLib.getSessionOrRedirect).mockResolvedValueOnce(mockAdminSession as any);
    vi.mocked(authLib.requireRole).mockReturnValueOnce(true);

    const req = new Request('http://localhost:3000/api/accounting/export/invalid-type');
    const params = Promise.resolve({ type: 'invalid-type' });
    const res = await GET(req, { params });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Unknown export type.');
  });

  it('returns 400 when generateAccountingPdf returns validation error', async () => {
    vi.mocked(authLib.getSessionOrRedirect).mockResolvedValueOnce(mockAdminSession as any);
    vi.mocked(authLib.requireRole).mockReturnValueOnce(true);
    vi.mocked(accountingPdf.generateAccountingPdf).mockResolvedValueOnce({
      error: 'Select a period or an account before exporting the General Ledger',
    });

    const req = new Request('http://localhost:3000/api/accounting/export/general-ledger');
    const params = Promise.resolve({ type: 'general-ledger' });
    const res = await GET(req, { params });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Select a period');
  });

  it('returns 200 with PDF content when report generation succeeds', async () => {
    vi.mocked(authLib.getSessionOrRedirect).mockResolvedValueOnce(mockAdminSession as any);
    vi.mocked(authLib.requireRole).mockReturnValueOnce(true);
    const dummyPdfBuffer = Buffer.from('%PDF-1.4 test stream');
    vi.mocked(accountingPdf.generateAccountingPdf).mockResolvedValueOnce({
      fileName: 'profit-and-loss-2026-03.pdf',
      buffer: dummyPdfBuffer,
    });

    const req = new Request('http://localhost:3000/api/accounting/export/profit-and-loss?period=2026-03');
    const params = Promise.resolve({ type: 'profit-and-loss' });
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="profit-and-loss-2026-03.pdf"',
    );
    expect(accountingPdf.generateAccountingPdf).toHaveBeenCalledWith('profit-and-loss', {
      period: '2026-03',
      accountId: undefined,
      divisionId: undefined,
    });
  });
});
