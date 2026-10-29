/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockDb, mockEmailClient, state } = vi.hoisted(() => {
  const state = {
    mockSelectResult: [] as any[],
    queue: [] as any[][],
  };
  const getResult = () => {
    if (state.queue.length > 0) {
      return state.queue.shift()!;
    }
    return state.mockSelectResult;
  };
  const queryChain: any = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve(getResult())),
    then: vi.fn().mockImplementation((resolve) => resolve(getResult())),
  };
  const mockDb = {
    select: vi.fn(() => queryChain),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => Promise.resolve()),
      })),
    })),
  };
  const mockEmailClient = vi.fn().mockResolvedValue({
    data: { id: 'msg_digest_mock_123' },
    error: null,
  });
  return { mockDb, mockEmailClient, state };
});

vi.mock('@pmg/emails', () => ({
  createEmailClient: vi.fn(() => mockEmailClient),
  resolveResendApiKey: vi.fn(() => 're_test_key'),
  resolveDefaultFromEmail: vi.fn(() => 'billing@test.com'),
  PRIMARY_DIGEST_EMAIL: 'info@playhousemedia.co.za',
  SECONDARY_DIGEST_CC: 'hello@jacobc.co.za',
  BillingDigestEmail: vi.fn(() => null),
}));

vi.mock('@pmg/db', () => {
  return {
    getDb: vi.fn().mockReturnValue(mockDb),
    db: mockDb,
    eq: vi.fn(),
    and: vi.fn(),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...exprs: any[]) => ({
        strings,
        exprs,
      }),
      {
        raw: vi.fn((s: string) => s),
      },
    ),
    desc: vi.fn(),
    asc: vi.fn(),
    emailAuditLog: {
      id: 'id',
      resendEmailId: 'resendEmailId',
      emailType: 'emailType',
      recipientEmail: 'recipientEmail',
      subject: 'subject',
      status: 'status',
      errorMessage: 'errorMessage',
      customizationDetails: 'customizationDetails',
      createdAt: 'createdAt',
      clientId: 'clientId',
      divisionId: 'divisionId',
      idempotencyKey: 'idempotencyKey',
    },
    clients: {
      id: 'id',
      name: 'name',
      businessName: 'businessName',
      email: 'email',
      isActive: 'isActive',
      isRetainer: 'isRetainer',
      excludeFromAutoStatements: 'excludeFromAutoStatements',
      divisionId: 'divisionId',
    },
    divisions: { id: 'id', name: 'name' },
    invoices: {
      id: 'id',
      documentNumber: 'documentNumber',
      invoiceDate: 'invoiceDate',
      dueDate: 'dueDate',
      total: 'total',
      writeOffAmount: 'writeOffAmount',
      status: 'status',
      clientId: 'clientId',
      divisionId: 'divisionId',
      createdAt: 'createdAt',
    },
    recurringInvoices: {
      id: 'id',
      nextRunDate: 'nextRunDate',
      total: 'total',
      status: 'status',
      clientId: 'clientId',
    },
    user: { id: 'id' },
  };
});

import { generateAndSendBillingDigest } from '@/actions/billing/digest';

describe('generateAndSendBillingDigest - Skip & Clutter Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.mockSelectResult = [];
    state.queue = [];
  });

  it('skips sending digest when no emails were sent and no errors logged, avoiding clutter', async () => {
    // When DB returns empty rows for audit logs and invoices
    state.mockSelectResult = [];

    const result = await generateAndSendBillingDigest('2026-10-18', { isInternal: true });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Digest notification skipped to avoid inbox clutter');
    expect(result.dispatchesCount).toBe(0);
    expect(result.resendEmailId).toBeNull();
    // Email client should NOT have been invoked
    expect(mockEmailClient).not.toHaveBeenCalled();
  });

  it('sends digest when force: true is provided even if 0 emails were dispatched', async () => {
    state.mockSelectResult = [];

    const result = await generateAndSendBillingDigest('2026-10-18', {
      force: true,
      isInternal: true,
    });

    expect(result.success).toBe(true);
    expect(result.resendEmailId).toBe('msg_digest_mock_123');
    expect(mockEmailClient).toHaveBeenCalledTimes(1);
  });

  it('sends digest when dispatches were recorded today', async () => {
    const fakeLog = {
      id: 'log-1',
      resendEmailId: 're_123',
      emailType: 'invoice',
      recipientEmail: 'client@example.com',
      subject: 'Invoice INV-001',
      status: 'delivered',
      errorMessage: null,
      customizationDetails: { total: 1500, documentNumber: 'INV-001' },
      createdAt: new Date(),
      clientId: 'c-1',
      divisionId: 'd-1',
      clientName: 'Acme Corp',
      clientBusinessName: 'Acme Corp',
      divisionName: 'Playhouse Media Group',
    };

    state.queue = [
      [], // 1. idempotency check: no existing digest
      [fakeLog], // 2. todayAuditRows: 1 dispatched invoice
      [], // 3. todayInvoices
      [], // 4. recurringInvoices
      [{ id: 'user-admin-1' }], // 5. fallback admin user
    ];

    const result = await generateAndSendBillingDigest('2026-10-18', { isInternal: true });

    expect(result.success).toBe(true);
    expect(result.dispatchesCount).toBe(1);
    expect(result.resendEmailId).toBe('msg_digest_mock_123');
    expect(mockEmailClient).toHaveBeenCalledTimes(1);
  });
});
