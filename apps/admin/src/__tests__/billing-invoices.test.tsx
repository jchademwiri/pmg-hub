import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

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
};

vi.mock('@pmg/db', () => ({
  getDb: () => dbMock,
  invoices: { id: 'invoices_id', status: 'status', total: 'total', clientId: 'clientId', divisionId: 'divisionId' },
  quotations: { id: 'quotations_id', status: 'status' },
  billingLineItems: { id: 'billing_line_items_id', documentType: 'documentType', documentId: 'documentId' },
  income: { id: 'income_id' },
  clients: { id: 'clients_id', name: 'name', businessName: 'businessName' },
  divisionBillingSettings: { divisionId: 'divisionId', paymentTermsDays: 'paymentTermsDays' },
  eq: vi.fn(),
  and: vi.fn(),
  getAllInvoices: vi.fn(),
  getNextDocumentNumber: vi.fn().mockResolvedValue('INV-2026-0001'),
  addDays: (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
}));

import { getAllInvoices, getNextDocumentNumber } from '@pmg/db';

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
  markInvoicePaid,
  voidInvoice
} from '@/app/actions/billing-invoices';
import InvoicesPage from '@/app/(admin)/billing/invoices/page';

describe('Billing Invoices Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
    vi.mocked(getNextDocumentNumber).mockResolvedValue('INV-2026-0001');
    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');

    // Standard chainable mocks
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
          where: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'paid' }]),
        }),
      });

      const resBlocked = await updateInvoice('inv-1', {
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        invoiceDate: '2026-05-01',
        lineItems: [{ itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 }],
      });
      expect(resBlocked.error).toBe('Paid invoices cannot be edited.');

      // Mock existing invoice as draft
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'draft' }]),
        }),
      });

      const resSuccess = await updateInvoice('inv-1', {
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        invoiceDate: '2026-05-01',
        lineItems: [{ itemId: 'e3b07384-d113-4956-a5db-8f3e58b8d4e8', description: 'Item 1', quantity: 2, unitPrice: 250, vatRate: 0 }],
      });
      expect(resSuccess).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('convertQuoteToInvoice - converts accepted quotation successfully', async () => {
      // select quotations, then divisionBillingSettings, then billingLineItems
      let selectCount = 0;
      mockDbSelect.mockImplementation((fields?: any) => {
        selectCount++;
        return {
          from: (table: any) => ({
            where: (cond: any) => {
              if (selectCount === 1) { // Quotation select
                return Promise.resolve([{
                  id: 'quote-1',
                  status: 'accepted',
                  divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
                  clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
                  subtotal: '500.00',
                  total: '575.00',
                }]);
              } else if (selectCount === 2) { // billingLineItems select
                return Promise.resolve([{
                  sortOrder: 0,
                  description: 'Item 1',
                  quantity: '2',
                  unitPrice: '250.00',
                  vatRate: '0',
                  lineTotal: '500.00',
                }]);
              } else { // divisionBillingSettings select
                return Promise.resolve([{ paymentTermsDays: 15 }]);
              }
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
          where: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'draft' }]),
        }),
      });

      const res = await issueInvoice('inv-1');
      expect(res).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('markInvoicePaid - marks issued invoice as paid and adds income row', async () => {
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        return {
          from: () => ({
            where: () => {
              if (selectCount === 1) { // invoice
                return Promise.resolve([{
                  id: 'inv-1',
                  status: 'issued',
                  clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
                  divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
                  total: '1000.00',
                  documentNumber: 'INV-001',
                }]);
              } else { // client
                return Promise.resolve([{ name: 'Client A', businessName: 'Client Business' }]);
              }
            },
          }),
        };
      });

      const res = await markInvoicePaid('inv-1');
      expect(res).toEqual({});
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('voidInvoice - voids unpaid invoice', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'issued' }]),
        }),
      });

      const res = await voidInvoice('inv-1');
      expect(res).toEqual({});
      expect(mockDbUpdate).toHaveBeenCalled();
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

      const page = await InvoicesPage({ searchParams: Promise.resolve({ page: '1' }) });
      render(page as React.ReactElement);

      expect(screen.getByTestId('invoices-client')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });
  });
});
