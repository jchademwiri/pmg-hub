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
  income: { id: 'income_id', amount: 'amount', clientId: 'clientId' },
  clients: { id: 'clients_id', name: 'name', businessName: 'businessName' },
  paymentAllocations: { id: 'payment_allocations_id', amount: 'amount', invoiceId: 'invoiceId' },
  divisions: { id: 'divisions_id' },
  eq: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { raw: (s: string) => s }
  ),
  desc: vi.fn(),
  asc: vi.fn(),
  getClientsWithBillingActivity: vi.fn(),
  getStatementPeriodDates: vi.fn(() => ({ startDate: '2026-05-01', endDate: '2026-05-31' })),
}));

import { getClientsWithBillingActivity, getStatementPeriodDates } from '@pmg/db';

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

// ─── Import Code Under Test ──────────────────────────────────────────────────
import {
  getClientOutstandingInvoices,
  getClientCreditBalance,
  recordClientPayment
} from '@/app/actions/billing-payments';
import StatementsPage from '@/app/(admin)/billing/statements/page';

describe('Billing Payments and Statements Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');
    vi.mocked(getStatementPeriodDates).mockReturnValue({ startDate: '2026-05-01', endDate: '2026-05-31' });

    // Standard chainable mocks
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
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        return {
          from: () => ({
            where: () => {
              if (selectCount === 1) { // Client label
                return Promise.resolve([{ name: 'Client A', businessName: 'Client Business' }]);
              } else { // invoice allocation checks
                return Promise.resolve([{ total: '1000.00' }]);
              }
            },
            limit: () => Promise.resolve([{ id: 'div-1' }]), // fallback divisionId
          }),
        };
      });

      // Mock inner sum check
      mockDbSelect.mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve([{ name: 'Client A', businessName: 'Client Business' }]),
        }),
      })).mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve([{ sum: '1000.00' }]), // sum allocations equal total
        }),
      }));

      const res = await recordClientPayment({
        clientId: 'c3b07384-d113-4956-a5db-8f3e58b8d4e7',
        divisionId: 'd3b07384-d113-4956-a5db-8f3e58b8d4e6',
        date: '2026-05-01',
        description: 'Monthly Payment',
        amount: 1000,
        allocations: [
          { invoiceId: 'inv-1', amount: 1000 },
        ],
      });

      expect(res).toEqual({ success: true });
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalled();
    });
  });

  describe('Pages and Client Components', () => {
    it('StatementsPage - caps list calculations at the current statement Period To', async () => {
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

      const testNow = new Date();
      const expectedFY = testNow.getMonth() < 2 ? testNow.getFullYear() - 1 : testNow.getFullYear();

      expect(getStatementPeriodDates).toHaveBeenCalledWith({ monthPeriod: 'current' });
      expect(getClientsWithBillingActivity).toHaveBeenCalledWith({ year: expectedFY, asOfDate: '2026-05-31' });
      expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
      expect(screen.getByText('R 2 000,00')).toBeInTheDocument(); // outstanding format
    });

    it('StatementsPage - renders empty state', async () => {
      vi.mocked(getClientsWithBillingActivity).mockResolvedValue([]);

      const page = await StatementsPage();
      render(page as React.ReactElement);

      expect(screen.getByText('No client statements available yet. Statements are generated from invoices.')).toBeInTheDocument();
    });
  });
});
