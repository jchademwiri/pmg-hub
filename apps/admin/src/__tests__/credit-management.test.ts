import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbTransaction = vi.fn().mockImplementation(async (callback) => await callback(dbMock));

const dbMock = {
  insert: mockDbInsert,
  select: mockDbSelect,
  update: mockDbUpdate,
  delete: mockDbDelete,
  transaction: mockDbTransaction,
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
  creditRefunds: {
    id: 'id',
    creditNoteId: 'creditNoteId',
    clientId: 'clientId',
    amount: 'amount',
    refundDate: 'refundDate',
    refundMethod: 'refundMethod',
    reference: 'reference',
    description: 'description',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
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
  getSnapshotByPeriod: vi.fn().mockResolvedValue(null),
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
  refundCredit,
  expireCreditNotes,
} from '@/app/actions/credit-management';

describe('Credit Management Server Actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDbTransaction.mockImplementation(async (callback) => await callback(dbMock));
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
      mockDbSelect.mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ name: 'Playhouse Media Group' }]),
          }),
        }),
      })).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ documentNumber: 'CN-2026-0001' }]),
            }),
          }),
        }),
      }));

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

  describe('refundCredit', () => {
    it('returns error if amount is zero or negative', async () => {
      const res = await refundCredit({
        creditNoteId: 'cn-1',
        amount: 0,
        refundDate: '2026-06-15',
        refundMethod: 'bank_transfer',
      });
      expect(res.error).toBe('Refund amount must be greater than zero.');
    });

    it('returns error if period is closed', async () => {
      mockIsPeriodClosed.mockResolvedValue(true);
      const res = await refundCredit({
        creditNoteId: 'cn-1',
        amount: 100,
        refundDate: '2026-06-15',
        refundMethod: 'bank_transfer',
      });
      expect(res.error).toBe('Period is closed.');
    });

    it('returns error if credit note not found', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const res = await refundCredit({
        creditNoteId: 'cn-1',
        amount: 100,
        refundDate: '2026-06-15',
        refundMethod: 'bank_transfer',
      });
      expect(res.error).toBe('Credit note not found.');
    });

    it('returns error if credit note is voided', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'cn-1', status: 'void', amountRemaining: '500.00' }]),
        }),
      });

      const res = await refundCredit({
        creditNoteId: 'cn-1',
        amount: 100,
        refundDate: '2026-06-15',
        refundMethod: 'bank_transfer',
      });
      expect(res.error).toBe('Cannot refund a voided credit note.');
    });

    it('returns error if credit note is expired', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'cn-1', status: 'expired', amountRemaining: '500.00' }]),
        }),
      });

      const res = await refundCredit({
        creditNoteId: 'cn-1',
        amount: 100,
        refundDate: '2026-06-15',
        refundMethod: 'bank_transfer',
      });
      expect(res.error).toBe('Cannot refund an expired credit note.');
    });

    it('returns error if amount exceeds available credit', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'cn-1', status: 'active', amountRemaining: '50.00' }]),
        }),
      });

      const res = await refundCredit({
        creditNoteId: 'cn-1',
        amount: 100,
        refundDate: '2026-06-15',
        refundMethod: 'bank_transfer',
      });
      expect(res.error).toBe('Insufficient credit. Available remaining: R50.00');
    });

    it('creates refund record and updates credit note successfully', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'cn-1', clientId: 'client-1', status: 'active', amountRemaining: '500.00' }]),
        }),
      });

      const res = await refundCredit({
        creditNoteId: 'cn-1',
        amount: 200,
        refundDate: '2026-06-15',
        refundMethod: 'bank_transfer',
      });

      expect(res).toEqual({ refundId: 'new-id' });
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalled();
    });
  });

  describe('expireCreditNotes', () => {
    it('expires expired credit notes successfully', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 'cn-expired', status: 'active', amountRemaining: '100.00' },
          ]),
        }),
      });

      const res = await expireCreditNotes();
      expect(res).toEqual({ expired: 1 });
      expect(mockDbUpdate).toHaveBeenCalled();
    });
  });
});
