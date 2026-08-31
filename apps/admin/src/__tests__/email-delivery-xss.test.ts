import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReceiptEmailPreviewAction } from '@/app/actions/email-delivery';
import { db } from '@pmg/db';

vi.mock('@pmg/db', () => {
  return {
    getDb: vi.fn(),
    db: {
      select: vi.fn(),
    },
    income: {
      id: 'id',
      date: 'date',
      amount: 'amount',
      description: 'description',
      clientId: 'clientId',
      divisionId: 'divisionId',
    },
    divisions: { id: 'id', name: 'name' },
    clients: { id: 'id', name: 'name', businessName: 'businessName' },
    eq: vi.fn(),
    sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
  };
});

describe('Email Delivery HTML Sanitization (XSS Prevention)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('escapes malicious script and event handlers in preview action', async () => {
    const incomeId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
    const clientId = 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e';
    const divisionId = 'c3d4e5f6-a1b2-4c3d-ad4e-5f6a7b8c9d0e';

    const fakeIncomeRow = {
      id: incomeId,
      date: '2026-08-31',
      amount: '1500.00',
      description: '<script>alert("xss")</script>',
      clientId,
      divisionId,
      divisionName: '<img src=x onerror=alert(1)> Apex',
    };

    const fakeClientRow = {
      id: clientId,
      name: 'John <script>evil()</script>',
      businessName: 'Acme & Co "Corp"',
    };

    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          innerJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockResolvedValue([fakeIncomeRow]),
          })),
          where: vi.fn().mockResolvedValue([fakeClientRow]),
        })),
      })),
    };

    const { getDb } = await import('@pmg/db');
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getReceiptEmailPreviewAction({
      incomeId,
      personalMessage: '<svg onload=alert(1)>Thank you!</svg>',
    });

    expect(result.success).toBe(true);
    expect(result.html).toBeDefined();

    // Verify unescaped tags do not exist in the output HTML
    expect(result.html).not.toContain('<script>');
    expect(result.html).not.toContain('<svg onload');
    expect(result.html).not.toContain('<img src=x');

    // Verify escaped equivalents exist
    expect(result.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(result.html).toContain('&lt;svg onload=alert(1)&gt;Thank you!&lt;/svg&gt;');
    expect(result.html).toContain('Acme &amp; Co &quot;Corp&quot;');
    expect(result.html).toContain('&lt;img src=x onerror=alert(1)&gt; Apex');
  });
});
