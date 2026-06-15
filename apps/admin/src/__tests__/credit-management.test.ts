import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();

const dbMock = {
  insert: mockDbInsert,
  select: mockDbSelect,
  update: mockDbUpdate,
  delete: mockDbDelete,
};

vi.mock('@pmg/db', () => ({
  getDb: () => dbMock,
  creditNotes: {
    id: 'id',
    clientId: 'clientId',
    divisionId: 'divisionId',
    documentNumber: 'documentNumber',
    status: 'status',
    type: 'type',
    reason: 'reason',
    amount: 'amount',
    amountRemaining: 'amountRemaining',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
    originalInvoiceId: 'originalInvoiceId',
    originalPaymentId: 'originalPaymentId',
  },
  creditApplications: {
    id: 'id',
    creditNoteId: 'creditNoteId',
    invoiceId: 'invoiceId',
    amount: 'amount',
    appliedAt: 'appliedAt',
    appliedBy: 'appliedBy',
  },
  invoices: {
    id: 'id',
    status: 'status',
    total: 'total',
    clientId: 'clientId',
  },
  income: {
    id: 'id',
    clientId: 'clientId',
    amount: 'amount',
    date: 'date',
  },
  paymentAllocations: {
    id: 'id',
    amount: 'amount',
    invoiceId: 'invoiceId',
  },
  clients: {
    id: 'id',
    name: 'name',
    businessName: 'businessName',
  },
  divisions: {
    id: 'id',
    name: 'name',
  },
  eq: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s }
  ),
  desc: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

import { getSessionOrRedirect } from '@/lib/auth';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockIsPeriodClosed = vi.fn().mockResolvedValue(false);
const mockGetMinAllowedDate = vi.fn().mockResolvedValue('2026-01-01');
const mockGetMinDateErrorMessage = vi.fn().mockReturnValue('Period is closed.');

vi.mock('@/lib/date-rules', () => ({
  isPeriodClosed: (...args: any[]) => mockIsPeriodClosed(...args),
  getMinAllowedDate: (...args: any[]) => mockGetMinAllowedDate(...args),
  getMinDateErrorMessage: (...args: any[]) => mockGetMinDateErrorMessage(...args),
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import {
  getClientCreditSummary,
  getClientCreditBalanceV2,
  applyCreditToInvoice,
  createCreditNote,
} from '@/app/actions/credit-management';

describe('Credit Management Server Actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');

    // Chainable db mocks
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
      }),
    });
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(true),
      }),
    });
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(true),
    });
  });

  describe('getClientCreditSummary', () => {
    it('fetches and returns client credit summary successfully', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'cn-1',
                documentNumber: 'CN-2026-0001',
                type: 'credit_note',
                status: 'active',
                reason: 'Billing correction',
                amount: '1000.00',
                amountRemaining: '1000.00',
                createdAt: new Date('2026-06-15T00:00:00Z'),
                expiresAt: null,
              },
            ]),
          }),
        }),
      });

      const res = await getClientCreditSummary('client-1');

      expect(res).toEqual({
        totalCredit: 1000,
        activeCredit: 1000,
        expiredCredit: 0,
        creditNotes: [
          {
            id: 'cn-1',
            documentNumber: 'CN-2026-0001',
            type: 'credit_note',
            status: 'active',
            reason: 'Billing correction',
            amount: 1000,
            amountRemaining: 1000,
            createdAt: '2026-06-15T00:00:00.000Z',
            expiresAt: null,
          },
        ],
      });
    });
  });

  describe('createCreditNote', () => {
    it('creates credit note successfully when parameters are valid', async () => {
      // Setup sequence mock
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ documentNumber: 'CN-2026-0001' }]),
            }),
          }),
        }),
      });

      const res = await createCreditNote({
        clientId: 'client-1',
        divisionId: 'div-1',
        type: 'credit_note',
        amount: 250,
        reason: 'Refund overcharge',
      });

      expect(res).toEqual({ creditNoteId: 'new-id' });
    });

    it('returns error if amount is zero or negative', async () => {
      const res = await createCreditNote({
        clientId: 'client-1',
        divisionId: 'div-1',
        type: 'credit_note',
        amount: 0,
        reason: 'Refund overcharge',
      });

      expect(res.error).toBe('Credit amount must be greater than zero.');
    });
  });
});
