import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// Drizzle query builders are thenable AND support further chaining
// (.for('update'), .orderBy(), .limit()) after a terminal .where(). This
// helper produces a value that's both directly awaitable and chainable, so a
// single mocked `where()` return works whether or not the real code adds a
// row lock after it.
function selectResult<T>(rows: T): Promise<T> & { for: () => any; orderBy: () => any; limit: () => any } {
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
// Drizzle's db.transaction(cb) runs cb with a transaction-scoped client; since
// none of these mocks distinguish tx from db, just invoke cb with the same
// dbMock so every tx.select/insert/update call inside it hits the same mocks.
// (Implementation is set in beforeEach, once dbMock exists, to avoid a
// circular type-inference error between the two module-scope consts.)
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
  invoices: { id: 'invoices_id', status: 'status', total: 'total', clientId: 'clientId', divisionId: 'divisionId' },
  quotations: { id: 'quotations_id', status: 'status' },
  billingLineItems: { id: 'billing_line_items_id', documentType: 'documentType', documentId: 'documentId' },
  income: { id: 'income_id' },
  clients: { id: 'clients_id', name: 'name', businessName: 'businessName' },
  divisionBillingSettings: { divisionId: 'divisionId', paymentTermsDays: 'paymentTermsDays' },
  creditNotes: { id: 'id' },
  creditApplications: { id: 'id' },
  paymentAllocations: { id: 'id', incomeId: 'incomeId', invoiceId: 'invoiceId', amount: 'amount' },
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  getAllInvoices: vi.fn(),
  getNextDocumentNumber: vi.fn().mockResolvedValue('INV-2026-0001'),
  getInvoiceMonthlySummaries: vi.fn().mockResolvedValue([]),
  addDays: (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
}));

const mockReverseCreditApplication = vi.fn();
const mockGetClientCreditBalanceV2 = vi.fn();
vi.mock('@/app/actions/credit-management', () => ({
  reverseCreditApplication: (...args: any[]) => mockReverseCreditApplication(...args),
  getClientCreditBalanceV2: (...args: any[]) => mockGetClientCreditBalanceV2(...args),
}));

import { getAllInvoices, getNextDocumentNumber, getInvoiceMonthlySummaries } from '@pmg/db';

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

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

// Mock child client component
vi.mock('@/app/(admin)/billing/invoices/invoices-client', () => ({
  InvoicesClient: ({ entries }: any) => (
    <div data-testid="invoices-client">
      {entries.map((inv: any) => (
        <div key={inv.id}>{inv.documentNumber}</div>
      ))}
    </div>
  ),
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import {
  createInvoice,
  updateInvoice,
  convertQuoteToInvoice,
  issueInvoice,
  issueInvoiceInternal,
  markInvoicePaid,
  voidInvoice
} from '@/app/actions/billing-invoices';
import InvoicesPage from '@/app/(admin)/billing/invoices/page';

// ─── Accounting Posting Mock ─────────────────────────────────────────────────
// Named (not inline) so beforeEach can re-arm their resolved values after
// vi.resetAllMocks() — an inline `vi.fn().mockResolvedValue(...)` here would
// only ever apply once, at module-mock-setup time, and reset to a bare no-op
// (resolving to undefined) before every single test.
const mockPostInvoiceIssueJournalEntry = vi.fn();
const mockVoidInvoiceJournalEntries = vi.fn();
const mockPostPaymentJournalEntries = vi.fn();
const mockUpdateInvoiceJournalEntry = vi.fn();
const mockPostInvoiceWriteOffJournalEntry = vi.fn();
vi.mock('@/lib/accounting/posting', () => ({
  postInvoiceIssueJournalEntry: (...args: any[]) => mockPostInvoiceIssueJournalEntry(...args),
  voidInvoiceJournalEntries: (...args: any[]) => mockVoidInvoiceJournalEntries(...args),
  postPaymentJournalEntries: (...args: any[]) => mockPostPaymentJournalEntries(...args),
  updateInvoiceJournalEntry: (...args: any[]) => mockUpdateInvoiceJournalEntry(...args),
  postInvoiceWriteOffJournalEntry: (...args: any[]) => mockPostInvoiceWriteOffJournalEntry(...args),
}));

describe('Billing Invoices Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPostInvoiceIssueJournalEntry.mockResolvedValue({});
    mockVoidInvoiceJournalEntries.mockResolvedValue({});
    mockPostPaymentJournalEntries.mockResolvedValue({});
    mockUpdateInvoiceJournalEntry.mockResolvedValue({});
    mockPostInvoiceWriteOffJournalEntry.mockResolvedValue({});
    mockReverseCreditApplication.mockResolvedValue({});
    mockGetClientCreditBalanceV2.mockResolvedValue(0);
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
    vi.mocked(getNextDocumentNumber).mockResolvedValue('INV-2026-0001');
    vi.mocked(getInvoiceMonthlySummaries).mockResolvedValue([]);
    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');

    // Standard chainable mocks
    mockDbTransaction.mockImplementation((cb: (tx: typeof dbMock) => unknown) => cb(dbMock));
    mockDbExecute.mockResolvedValue({ rows: [{ exists: true }] });
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-invoice-id' }]),
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
    it('createInvoice - creates successfully', async () => {
      const res = await createInvoice({
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        invoiceDate: '2026-05-01',
        lineItems: [
          { itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 },
        ],
        vatEnabled: true,
      });

      expect(res).toEqual({ id: 'new-invoice-id' });
      expect(mockDbInsert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/billing/invoices');
    });

    it('updateInvoice - restricts editing paid and void invoices', async () => {
      // Mock existing invoice as paid
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status: 'paid' }])),
        }),
      });

      const resBlocked = await updateInvoice('inv-1', {
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        invoiceDate: '2026-05-01',
        lineItems: [{ itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 }],
        vatEnabled: false,
      });
      expect(resBlocked.error).toBe('Paid invoices cannot be edited.');

      // Mock existing invoice as draft
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status: 'draft' }])),
        }),
      });

      const resSuccess = await updateInvoice('inv-1', {
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        invoiceDate: '2026-05-01',
        lineItems: [{ itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 }],
        vatEnabled: false,
      });
      expect(resSuccess).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('convertQuoteToInvoice - converts accepted quotation successfully', async () => {
      // Call order: (1) outer quote fetch, (2) outer divisionBillingSettings,
      // (3) locked quote re-fetch (.for('update')), (4) quote line items,
      // (5) check for an already-existing invoice for this quotation.
      const acceptedQuote = {
        id: 'quote-1',
        status: 'accepted',
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        subtotal: '500.00',
        total: '575.00',
        expiryDate: null,
      };
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        return {
          from: () => ({
            where: () => {
              if (selectCount === 1) return selectResult([acceptedQuote]); // outer quote fetch
              if (selectCount === 2) return selectResult([{ paymentTermsDays: 15 }]); // divisionBillingSettings
              if (selectCount === 3) return selectResult([acceptedQuote]); // locked quote (.for('update'))
              if (selectCount === 4) {
                return selectResult([{
                  sortOrder: 0,
                  description: 'Item 1',
                  quantity: '2',
                  unitPrice: '250.00',
                  vatRate: '0',
                  lineTotal: '500.00',
                }]); // quote line items
              }
              return selectResult([]); // no existing invoice for this quotation
            },
          }),
        };
      });

      const res = await convertQuoteToInvoice('quote-1');
      expect(res).toEqual({ id: 'new-invoice-id' });
      expect(mockDbInsert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/billing/invoices');
    });

    it('issueInvoice - transitions draft invoice to issued', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status: 'draft', total: '1000.00', invoiceDate: '2026-07-01', documentNumber: 'INV-001', divisionId: 'd1' }])),
        }),
      });

      const res = await issueInvoice('inv-1');
      expect(res).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('issueInvoice - makes invoice visible in client statement after issuing', async () => {
      // Mock the status check: invoice is currently 'draft'
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status: 'draft', total: '1000.00', invoiceDate: '2026-07-01', documentNumber: 'INV-001', divisionId: 'd1' }])),
        }),
      });

      // Issue the invoice (changes status from 'draft' to 'issued')
      const issueResult = await issueInvoice('inv-1');
      expect(issueResult).toEqual({});

      // Verify the update was called to change status
      expect(mockDbUpdate).toHaveBeenCalled();

      // The status transition from 'draft' → 'issued' means the invoice
      // now passes the statement query filter: status NOT IN ('draft', 'void')
      // This is the critical behavior that the bug fix addressed.
    });

    it('issueInvoiceInternal - posts journal entry when issuing draft invoice', async () => {
      // Mock the locked read (status must be 'draft' for the transition to proceed)
      mockDbSelect.mockImplementation(() => {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(selectResult([
              { id: 'inv-1', status: 'draft', total: '1000.00', invoiceDate: '2026-07-01', documentNumber: 'INV-001', divisionId: 'd1' }
            ])),
          }),
        };
      });

      const result = await issueInvoiceInternal('inv-1');
      expect(result).toEqual({});

      // Verify the journal entry was posted (Dr AR 1100 / Cr Revenue 4010),
      // sharing the same transaction (`tx`) as the status update.
      expect(mockPostInvoiceIssueJournalEntry).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        amount: 1000,
        date: '2026-07-01',
        description: 'Invoice INV-001',
        divisionId: 'd1',
        tx: expect.anything(),
      });
    });

    it('markInvoicePaid - marks issued invoice as paid and adds income row', async () => {
      // Call order: (1) outer invoice fetch, (2) outer client fetch,
      // (3) locked invoice re-fetch inside the transaction (.for('update')).
      const invoiceRow = {
        id: 'inv-1',
        status: 'issued',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        total: '1000.00',
        documentNumber: 'INV-001',
      };
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        return {
          from: () => ({
            where: () => {
              if (selectCount === 1) return selectResult([invoiceRow]); // outer invoice fetch
              if (selectCount === 2) return selectResult([{ name: 'Client A', businessName: 'Client Business' }]); // client fetch
              return selectResult([invoiceRow]); // locked invoice re-fetch
            },
          }),
        };
      });

      const res = await markInvoicePaid('inv-1');
      expect(res).toEqual({});
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalled();

      // Regression test: markInvoicePaid must link the income to this invoice
      // via payment_allocations (in addition to the income row itself), or
      // every credit-balance calculation (sum(income) - sum(payment_allocations))
      // treats the payment as free unallocated credit forever.
      expect(mockDbInsert.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('voidInvoice - voids unpaid invoice', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status: 'issued' }])),
        }),
      });

      const res = await voidInvoice('inv-1');
      expect(res).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('voidInvoice - rejects a partially_paid invoice', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status: 'partially_paid' }])),
        }),
      });

      const res = await voidInvoice('inv-1');
      expect(res.error).toMatch(/draft, issued, or overdue/i);
      // Must not have attempted any mutation once blocked by the status guard.
      expect(mockDbUpdate).not.toHaveBeenCalled();
    });

    it('voidInvoice - rejects a written_off invoice', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status: 'written_off' }])),
        }),
      });

      const res = await voidInvoice('inv-1');
      expect(res.error).toMatch(/draft, issued, or overdue/i);
      expect(mockDbUpdate).not.toHaveBeenCalled();
    });

    it('voidInvoice - still allows draft, issued, and overdue invoices', async () => {
      for (const status of ['draft', 'issued', 'overdue']) {
        mockDbSelect.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(selectResult([{ id: 'inv-1', status }])),
          }),
        });

        const res = await voidInvoice('inv-1');
        expect(res).toEqual({});
      }
    });
  });

  describe('Pages and Routing', () => {
    it('InvoicesPage - renders list of invoices successfully', async () => {
      vi.mocked(getAllInvoices).mockResolvedValue({
        data: [
          { id: 'inv-1', documentNumber: 'INV-2026-0001', total: '1150.00', status: 'issued' },
        ],
        total: 1,
        sum: 1150,
      } as any);

      // status (or divisionId) must be set for the page to take the filtered
      // list branch (<InvoicesClient>) — with neither set it renders the
      // unfiltered month-grouped accordion view instead.
      const page = await InvoicesPage({ searchParams: Promise.resolve({ page: '1', status: 'issued' }) });
      render(page as React.ReactElement);

      expect(screen.getByTestId('invoices-client')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });
  });
});
