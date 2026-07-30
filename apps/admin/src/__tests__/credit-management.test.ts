import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// Universal chainable query-builder mock: a plain thenable object exposing
// every Drizzle chain method we use (.from, .where, .innerJoin, .orderBy,
// .limit, .for) as a no-op that returns another instance of the same chain,
// so arbitrary chain shapes all resolve to `value` without hand-nesting each
// one. Deliberately NOT a Proxy over a real Promise — vi.fn()'s call-tracking
// unwraps/breaks that combination, silently stripping the extra methods.
function chain(value: any): any {
  return {
    then: (resolve: any, reject?: any) => Promise.resolve(value).then(resolve, reject),
    catch: (reject: any) => Promise.resolve(value).catch(reject),
    from: () => chain(value),
    where: () => chain(value),
    innerJoin: () => chain(value),
    orderBy: () => chain(value),
    limit: () => chain(value),
    for: () => chain(value),
  };
}

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
  applyCreditToInvoices,
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

  describe('applyCreditToInvoice', () => {
    it('applies credit from a credit note without creating a synthetic income row (regression)', async () => {
      // Previously this also inserted a synthetic `income` + `payment_allocations`
      // row "for dashboard visibility", which double-counted the credit note
      // application everywhere payment_allocations and creditApplications were
      // summed together for the same invoice/client. Assert only the
      // creditApplications insert happens now — no income insert.
      const invoiceRow = { id: 'inv-1', status: 'issued', clientId: 'client-1', total: '500.00' };
      const creditNoteRow = { id: 'cn-1', amountRemaining: '500.00', amount: '500.00', status: 'active' };

      // Call order: (1) outer invoice fetch, (2) outer allocAgg, (3) outer
      // creditAllocAgg, (4-6) getClientCreditBalanceV2's 3 selects, (7) outer
      // active credit notes, (8) locked invoice, (9) locked credit notes,
      // (10) tx allocAgg, (11) tx creditAllocAgg, (12) tx newAllocAgg,
      // (13+) tx newCreditAllocAgg — reflects the amount just applied.
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        switch (selectCount) {
          case 1: return chain([invoiceRow]);
          case 2: return chain([{ total: '0' }]);
          case 3: return chain([{ total: '0' }]);
          case 4: return chain([{ total: '500.00' }]); // creditNotes.amountRemaining sum
          case 5: return chain([{ totalPaid: '0' }]);
          case 6: return chain([{ totalAllocated: '0' }]);
          case 7: return chain([creditNoteRow]);
          case 8: return chain([invoiceRow]);
          case 9: return chain([creditNoteRow]);
          case 10: return chain([{ total: '0' }]);
          case 11: return chain([{ total: '0' }]);
          case 12: return chain([{ total: '0' }]);
          default: return chain([{ total: '200.00' }]);
        }
      });

      const res = await applyCreditToInvoice('inv-1', 200);

      expect(res).toEqual({ success: true, applied: 200 });
      // Exactly one insert: the creditApplications row. No income insert.
      expect(mockDbInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('applyCreditToInvoices (bulk)', () => {
    it('skips an invoice that belongs to a different client than the credit being spent', async () => {
      mockDbSelect.mockImplementation(() =>
        chain([{ id: 'inv-other-client', status: 'issued', clientId: 'a-different-client', total: '500.00' }]),
      );
      mockGetMinAllowedDate.mockResolvedValue('2026-01-01');

      const res = await applyCreditToInvoices('client-1', [{ invoiceId: 'inv-other-client', amount: 100 }]);

      // No allocation should have been recorded for the mismatched invoice.
      expect(res.totalApplied ?? 0).toBe(0);
      expect(mockDbInsert).not.toHaveBeenCalled();
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
