import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// Drizzle query builders are thenable AND support further chaining
// (.for('update'), .orderBy(), .limit()) after a terminal .where(). This
// helper produces a value that's both directly awaitable and chainable.
function selectResult<T>(
  rows: T,
): Promise<T> & { for: () => any; orderBy: () => any; limit: () => any } {
  const p = Promise.resolve(rows) as any;
  p.for = () => selectResult(rows);
  p.orderBy = () => selectResult(rows);
  p.limit = () => selectResult(rows);
  return p;
}

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbExecute = vi.fn();
// Implementation is set in beforeEach, once dbMock exists, to avoid a
// circular type-inference error between the two module-scope consts.
const mockDbTransaction = vi.fn();

const dbMock = {
  insert: mockDbInsert,
  select: mockDbSelect,
  update: mockDbUpdate,
  delete: mockDbDelete,
  execute: mockDbExecute,
  transaction: mockDbTransaction,
};

vi.mock('@pmg/db', () => ({
  getDb: () => dbMock,
  invoices: {
    id: 'invoices_id',
    status: 'status',
    total: 'total',
    clientId: 'clientId',
    divisionId: 'divisionId',
  },
  income: { id: 'income_id', amount: 'amount', clientId: 'clientId' },
  clients: { id: 'clients_id', name: 'name', businessName: 'businessName' },
  paymentAllocations: { id: 'payment_allocations_id', amount: 'amount', invoiceId: 'invoiceId' },
  divisions: { id: 'divisions_id' },
  eq: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s },
  ),
  desc: vi.fn(),
  asc: vi.fn(),
  getClientsWithBillingActivity: vi.fn(),
  getAgingReport: vi.fn().mockResolvedValue([]),
  getSnapshotByPeriod: vi.fn().mockResolvedValue(null),
}));

import { getClientsWithBillingActivity, getAgingReport } from '@pmg/db';

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

import { getSessionOrRedirect } from '@/lib/auth';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from 'next/cache';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockIsPeriodClosed = vi.fn().mockResolvedValue(false);
const mockGetMinAllowedDate = vi.fn().mockResolvedValue('2026-01-01');
const mockGetMinDateErrorMessage = vi.fn().mockReturnValue('Period is closed.');

vi.mock('@/lib/date-rules', () => ({
  isPeriodClosed: (...args: any[]) => mockIsPeriodClosed(...args),
  getMinAllowedDate: (...args: any[]) => mockGetMinAllowedDate(...args),
  getMinDateErrorMessage: (...args: any[]) => mockGetMinDateErrorMessage(...args),
}));

vi.mock('@/components/navigation/page-header-context', () => ({
  SetPageTotal: () => React.createElement('div', { 'data-testid': 'page-total' }),
}));

const mockPostPaymentJournalEntries = vi.fn();
const mockUpdatePaymentJournalEntries = vi.fn();
const mockVoidPaymentJournalEntries = vi.fn();
const mockPostBadDebtRecoveryJournalEntry = vi.fn();
vi.mock('@/lib/accounting/posting', () => ({
  postPaymentJournalEntries: (...args: any[]) => mockPostPaymentJournalEntries(...args),
  updatePaymentJournalEntries: (...args: any[]) => mockUpdatePaymentJournalEntries(...args),
  voidPaymentJournalEntries: (...args: any[]) => mockVoidPaymentJournalEntries(...args),
  postBadDebtRecoveryJournalEntry: (...args: any[]) => mockPostBadDebtRecoveryJournalEntry(...args),
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import {
  getClientOutstandingInvoices,
  getClientCreditBalance,
  recordClientPayment,
} from '@/app/actions/billing-payments';
import StatementsPage from '@/app/(admin)/billing/statements/page';

describe('Billing Payments and Statements Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
    vi.mocked(getAgingReport).mockResolvedValue([]);
    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');

    // Standard chainable mocks
    mockDbTransaction.mockImplementation((cb: (tx: typeof dbMock) => unknown) => cb(dbMock));
    mockPostPaymentJournalEntries.mockResolvedValue({});
    mockUpdatePaymentJournalEntries.mockResolvedValue({});
    mockVoidPaymentJournalEntries.mockResolvedValue({});
    mockPostBadDebtRecoveryJournalEntry.mockResolvedValue({});
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-payment-id' }]),
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

  describe('Server Actions', () => {
    it('getClientOutstandingInvoices - fetches invoices and outstanding balances correctly', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  {
                    id: 'inv-1',
                    documentNumber: 'INV-001',
                    invoiceDate: '2026-05-01',
                    dueDate: '2026-05-15',
                    total: '1000.00',
                    allocatedAmount: '400.00',
                  },
                ]),
              }),
            }),
          }),
        }),
      });

      const res = await getClientOutstandingInvoices('client-1');

      expect(res).toEqual([
        {
          id: 'inv-1',
          documentNumber: 'INV-001',
          invoiceDate: '2026-05-01',
          dueDate: '2026-05-15',
          total: 1000,
          allocated: 400,
          outstanding: 600,
        },
      ]);
    });

    it('getClientCreditBalance - calculates client credit balance successfully', async () => {
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        return {
          from: (table: any) => {
            if (selectCount === 1) {
              return {
                where: () => Promise.resolve([{ totalPaid: '1500.00' }]),
              };
            } else {
              return {
                innerJoin: () => ({
                  where: () => Promise.resolve([{ totalAllocated: '1000.00' }]),
                }),
              };
            }
          },
        };
      });

      const balance = await getClientCreditBalance('client-1');
      expect(balance).toBe(500);
    });

    it('recordClientPayment - checks period lock, inserts payment row and creates allocations', async () => {
      // Call order: (1) client fetch, (2) invoice document-number lookup,
      // (3) locked invoice row for the allocation (.for('update')),
      // (4) sum of allocations before inserting this one, (5) sum after.
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        return {
          from: () => ({
            where: () => {
              if (selectCount === 1)
                return selectResult([{ name: 'Client A', businessName: 'Client Business' }]);
              if (selectCount === 2)
                return selectResult([{ id: 'inv-1', documentNumber: 'INV-001' }]);
              if (selectCount === 3) {
                return selectResult([
                  {
                    total: '1000.00',
                    writeOffAmount: '0',
                    documentNumber: 'INV-001',
                    clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
                    divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
                  },
                ]);
              }
              if (selectCount === 4) return selectResult([{ sum: '0.00' }]); // before this allocation
              return selectResult([{ sum: '1000.00' }]); // after this allocation — fully paid
            },
            limit: () => selectResult([{ id: 'div-1' }]), // fallback divisionId (unused — divisionId provided)
          }),
        };
      });

      const res = await recordClientPayment({
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        date: '2026-05-01',
        description: 'Monthly Payment',
        amount: 1000,
        allocations: [{ invoiceId: 'inv-1', amount: 1000 }],
      });

      expect(res).toEqual({ success: true });
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('recordClientPayment - rejects allocations that exceed the payment amount received', async () => {
      // Regression test: this is a Server Action callable directly regardless
      // of the UI, so it must reject a request whose allocations sum to more
      // than the cash actually received, even though each individual
      // allocation might be within that invoice's own outstanding balance.
      // Only the client fetch and invoice-document-number lookup run before
      // this validation — no locked/allocation selects should ever be reached.
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => selectResult([{ name: 'Client A', businessName: 'Client Business' }]),
        }),
      });

      const res = await recordClientPayment({
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        date: '2026-05-01',
        description: 'Monthly Payment',
        amount: 100,
        allocations: [
          { invoiceId: 'inv-1', amount: 50 },
          { invoiceId: 'inv-2', amount: 100 },
        ],
      });

      expect(res.error).toMatch(/exceed the payment amount/i);
      expect(mockDbInsert).not.toHaveBeenCalled();
    });
  });

  describe('Pages and Client Components', () => {
    it('StatementsPage - renders list of client statements successfully', async () => {
      vi.mocked(getClientsWithBillingActivity).mockResolvedValue([
        {
          id: 'client-1',
          name: 'Client Alpha',
          businessName: 'Alpha Corp',
          totalInvoiced: 5000,
          totalPaid: 3000,
          totalOutstanding: 2000,
          lastActivityDate: '2026-05-01',
        },
      ] as any);

      const page = await StatementsPage();
      render(page as React.ReactElement);

      expect(screen.getAllByText('Alpha Corp')[0]).toBeInTheDocument();
      expect(screen.getAllByText('R 2 000,00')[0]).toBeInTheDocument(); // outstanding format
    });

    it('StatementsPage - renders empty state', async () => {
      vi.mocked(getClientsWithBillingActivity).mockResolvedValue([]);

      const page = await StatementsPage();
      render(page as React.ReactElement);

      expect(screen.getAllByText('No client statements available yet.')[0]).toBeInTheDocument();
    });
  });
});
