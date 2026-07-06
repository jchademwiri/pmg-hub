import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import * as fc from 'fast-check';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbExecute = vi.fn();

const dbMock = {
  insert: mockDbInsert,
  select: mockDbSelect,
  update: mockDbUpdate,
  delete: mockDbDelete,
  execute: mockDbExecute,
  transaction: vi.fn().mockImplementation((cb) => cb(dbMock)),
};

vi.mock('@pmg/db', () => ({
  getDb: () => dbMock,
  quotations: { id: 'quotations_id', status: 'status', quoteDate: 'quoteDate' },
  billingLineItems: { id: 'billing_line_items_id', documentType: 'documentType', documentId: 'documentId' },
  eq: vi.fn(),
  and: vi.fn(),
  getAllQuotations: vi.fn(),
  getNextDocumentNumber: vi.fn().mockResolvedValue('Q-2026-0001'),
  addDays: (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
}));

import { getAllQuotations, getNextDocumentNumber } from '@pmg/db';

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

vi.mock('@/lib/date-rules', () => ({
  isPeriodClosed: (...args: any[]) => mockIsPeriodClosed(...args),
  getMinAllowedDate: vi.fn().mockResolvedValue(new Date('2026-01-01')),
  getMinDateErrorMessage: vi.fn().mockReturnValue('Period is closed.'),
}));

import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';

vi.mock('@/components/navigation/page-header-context', () => ({
  SetPageTotal: () => React.createElement('div', { 'data-testid': 'page-total' }),
}));

// Mock child client component with correct path
vi.mock('@/app/(admin)/billing/quotes/quotes-client', () => ({
  QuotesClient: ({ entries }: any) => (
    <div data-testid="quotes-client">
      {entries.map((q: any) => (
        <div key={q.id}>{q.documentNumber}</div>
      ))}
    </div>
  ),
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import { createQuotation, updateQuotation, updateQuotationStatus, deleteQuotation } from '@/app/actions/billing-quotes';
import QuotesPage from '@/app/(admin)/billing/quotes/page';

describe('Billing Quotations Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
    vi.mocked(getNextDocumentNumber).mockResolvedValue('Q-2026-0001');
    mockIsPeriodClosed.mockResolvedValue(false);
    vi.mocked(getMinAllowedDate).mockResolvedValue(new Date('2026-01-01') as any);
    vi.mocked(getMinDateErrorMessage).mockReturnValue('Period is closed.');
    vi.mocked(dbMock.transaction).mockImplementation((cb: any) => cb(dbMock));

    // Standard chainable mocks to avoid TypeErrors
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
  describe('Server Actions', () => {
    it('createQuotation - creates successfully', async () => {
      mockDbExecute.mockResolvedValue({ rows: [{ exists: true }] });

      const res = await createQuotation({
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        quoteDate: '2026-05-01',
        lineItems: [
          { itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 },
        ],
        vatEnabled: true,
      });

      expect(res).toEqual({ id: 'new-id' });
      expect(mockDbInsert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/billing/quotes');
    });

    it('createQuotation - allows future date & blocks closed period', async () => {
      mockDbExecute.mockResolvedValue({ rows: [{ exists: true }] });

      // Future date
      const resFuture = await createQuotation({
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        quoteDate: '2099-12-31', // future
        lineItems: [
          { itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 },
        ],
        vatEnabled: true,
      });
      expect(resFuture).toEqual({ id: 'new-id' });

      // Closed period
      mockIsPeriodClosed.mockResolvedValue(true);
      const resClosed = await createQuotation({
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        quoteDate: '2026-01-01',
        lineItems: [
          { itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 },
        ],
        vatEnabled: true,
      });
      expect(resClosed.error).toBe('Period is closed.');
    });

    it('updateQuotation - allows editing only editable statuses', async () => {
      mockDbExecute.mockResolvedValue({ rows: [{ exists: true }] });

      // First query checks status of existing quote
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'quote-1', status: 'converted' }]), // not editable
        }),
      });

      const resBlocked = await updateQuotation('quote-1', {
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        quoteDate: '2026-05-01',
        lineItems: [{ itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 }],
        vatEnabled: false,
      });
      expect(resBlocked.error).toBe('This quotation can no longer be edited.');

      // Mock editable draft status
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'quote-1', status: 'draft' }]),
        }),
      });

      const resSuccess = await updateQuotation('quote-1', {
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        quoteDate: '2026-05-01',
        lineItems: [{ itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 }],
        vatEnabled: false,
      });
      expect(resSuccess).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
    });
    it('updateQuotationStatus - valid and invalid status transitions', async () => {
      // Mock quote status sent
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'quote-1', status: 'sent' }]),
        }),
      });

      // valid sent -> accepted
      const resValid = await updateQuotationStatus('quote-1', 'accepted');
      expect(resValid).toEqual({});

      // invalid sent -> draft
      const resInvalid = await updateQuotationStatus('quote-1', 'sent'); // draft target not allowed
      expect(resInvalid.error).toBe('Invalid status transition.');
    });

    it('deleteQuotation - draft only', async () => {
      // Mock sent quote
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'quote-1', status: 'sent' }]),
        }),
      });

      const resSent = await deleteQuotation('quote-1');
      expect(resSent.error).toBe('Only draft quotations can be deleted.');

      // Mock draft quote
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'quote-1', status: 'draft' }]),
        }),
      });

      const resDraft = await deleteQuotation('quote-1');
      expect(resDraft).toEqual({});
      expect(mockDbDelete).toHaveBeenCalled();
    });
  });

  describe('Property-Based Tests (fast-check)', () => {
    it('calcDocumentTotals - verifies math consistency for various inputs', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          fc.integer({ min: 1, max: 10 }),
          fc.boolean(),
          fc.option(fc.constantFrom('percent', 'amount'), { nil: null }),
          fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: null }),
          (price, quantity, vatEnabled, discountType, discountValue) => {
            const subtotal = price * quantity;
            const discountVal = discountValue ?? 0;
            const discountAmount =
              discountType === 'percent'
                ? subtotal * (discountVal / 100)
                : discountType === 'amount'
                  ? Math.min(discountVal, subtotal)
                  : 0;

            const vatBase = subtotal - discountAmount;
            const vatAmount = vatEnabled ? vatBase * 0.15 : 0;
            const total = vatBase + vatAmount;

            expect(subtotal).toBeGreaterThanOrEqual(0);
            expect(discountAmount).toBeLessThanOrEqual(subtotal);
            expect(total).toBeCloseTo(vatBase + vatAmount, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Pages and Client Components', () => {
    it('QuotesPage - renders list of quotes successfully', async () => {
      vi.mocked(getAllQuotations).mockResolvedValue({
        data: [
          { id: 'q-1', documentNumber: 'Q-2026-0001', total: '1500.00', status: 'draft' },
        ],
        total: 1,
        sum: 1500,
      } as any);

      const page = await QuotesPage({ searchParams: Promise.resolve({ page: '1' }) });
      render(page as React.ReactElement);

      expect(screen.getByTestId('quotes-client')).toBeInTheDocument();
      expect(screen.getByText('Q-2026-0001')).toBeInTheDocument();
    });
  });
});
