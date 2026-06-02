import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

vi.mock('@pmg/db', () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return {
    db: mockDb,
    getDb: () => mockDb,
    income: { id: 'income_id' },
    invoices: { id: 'invoices_id', total: 'total' },
    paymentAllocations: { id: 'paymentAllocations_id', amount: 'amount', invoiceId: 'invoiceId', incomeId: 'incomeId' },
    eq: vi.fn(),
    and: vi.fn(),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
      { raw: (s: string) => s }
    ),
    getAllIncome: vi.fn(),
    getAllDivisions: vi.fn(),
    getAllClients: vi.fn(),
    getDistinctIncomeMonths: vi.fn(),
    getIncomeById: vi.fn(),
  };
});

import {
  db,
  getAllIncome,
  getAllDivisions,
  getAllClients,
  getDistinctIncomeMonths,
  getIncomeById
} from '@pmg/db';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from 'next/cache';
import { formatZAR } from '@/lib/format';

const mockIsPeriodClosed = vi.fn().mockResolvedValue(false);
const mockGetMinAllowedDate = vi.fn().mockResolvedValue('2026-01-01');
const mockGetMinDateErrorMessage = vi.fn().mockReturnValue('Period is closed.');
const mockGetClosedPeriodsFromDates = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/date-rules', () => ({
  isPeriodClosed: (...args: any[]) => mockIsPeriodClosed(...args),
  getMinAllowedDate: (...args: any[]) => mockGetMinAllowedDate(...args),
  getMinDateErrorMessage: (...args: any[]) => mockGetMinDateErrorMessage(...args),
  getClosedPeriodsFromDates: (...args: any[]) => mockGetClosedPeriodsFromDates(...args),
}));

vi.mock('@/components/navigation/page-header-context', () => ({
  SetPageTotal: ({ value, variant }: any) => (
    <div data-testid="page-total" data-value={value} data-variant={variant}>
      Total
    </div>
  ),
}));

vi.mock('@/components/income/filter-bar', () => ({
  FilterBar: ({ currentDivisionId }: any) => (
    <div data-testid="income-filter-bar">
      FilterBar: {currentDivisionId}
    </div>
  ),
}));

vi.mock('@/components/income/income-table', () => ({
  IncomeTable: ({ entries, deleteAction, updateAction }: any) => (
    <div data-testid="income-table">
      {entries.map((e: any) => (
        <div key={e.id} data-testid={`income-row-${e.id}`}>
          <span>{e.description || 'No Description'}</span>
          <span>{e.amount}</span>
          <button onClick={() => deleteAction(e.id)}>Delete</button>
          <button
            onClick={() => {
              const fd = new FormData();
              fd.set('date', e.date);
              fd.set('divisionId', e.divisionId);
              fd.set('clientId', e.clientId);
              fd.set('amount', '3000');
              updateAction(e.id, fd);
            }}
          >
            Update
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ message, ctaLabel }: any) => (
    <div data-testid="empty-state">
      <span>{message}</span>
      {ctaLabel && <button>{ctaLabel}</button>}
    </div>
  ),
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import { createIncome, updateIncome, deleteIncome } from '@/app/actions/income';
import IncomePage from '@/app/(admin)/finance/income/page';
import IncomePageClient from '@/app/(admin)/finance/income/income-client';

describe('Finance Income Module', () => {
  const validDivisionId = 'd3b07384-d113-4956-a5db-8f3e58b8d4e6';
  const validClientId = 'c3b07384-d113-4956-a5db-8f3e58b8d4e7';
  const validInvoiceId = 'i3b07384-d113-4956-a5db-8f3e58b8d4e8';

  beforeEach(() => {
    vi.resetAllMocks();

    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');
    mockGetClosedPeriodsFromDates.mockResolvedValue([]);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    } as any);

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    } as any);

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);
  });

  describe('Server Actions', () => {
    it('createIncome - successfully creates an income record', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-15');
      formData.set('divisionId', validDivisionId);
      formData.set('clientId', validClientId);
      formData.set('amount', '2500');
      formData.set('description', 'Test income');

      const res = await createIncome(formData);
      expect(res).toEqual({});
      expect(db.insert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/finance/income');
    });

    it('createIncome - fails validation on invalid division uuid', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-15');
      formData.set('divisionId', 'invalid-uuid');
      formData.set('clientId', validClientId);
      formData.set('amount', '2500');

      const res = await createIncome(formData);
      expect(res.error).toBeDefined();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('createIncome - blocks future date entries', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

      const formData = new FormData();
      formData.set('date', tomorrowStr);
      formData.set('divisionId', validDivisionId);
      formData.set('clientId', validClientId);
      formData.set('amount', '2500');

      const res = await createIncome(formData);
      expect(res.error).toBe('Income date cannot be in the future.');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('createIncome - blocks closed financial period dates', async () => {
      mockIsPeriodClosed.mockResolvedValue(true);

      const formData = new FormData();
      formData.set('date', '2025-12-15');
      formData.set('divisionId', validDivisionId);
      formData.set('clientId', validClientId);
      formData.set('amount', '2500');

      const res = await createIncome(formData);
      expect(res.error).toBe('Period is closed.');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('updateIncome - successfully modifies an active income record', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-15');
      formData.set('divisionId', validDivisionId);
      formData.set('clientId', validClientId);
      formData.set('amount', '3500');

      const res = await updateIncome('inc-1', formData);
      expect(res).toEqual({});
      expect(db.update).toHaveBeenCalled();
    });

    it('updateIncome - blocks updates on closed financial period dates', async () => {
      mockIsPeriodClosed.mockResolvedValue(true);

      const formData = new FormData();
      formData.set('date', '2025-12-15');
      formData.set('divisionId', validDivisionId);
      formData.set('clientId', validClientId);
      formData.set('amount', '3500');

      const res = await updateIncome('inc-1', formData);
      expect(res.error).toBe('Period is closed.');
      expect(db.update).not.toHaveBeenCalled();
    });

    it('deleteIncome - successfully removes an active income record and updates invoice statuses', async () => {
      vi.mocked(getIncomeById).mockResolvedValue({
        id: 'inc-1',
        date: '2026-05-15',
        divisionId: validDivisionId,
        clientId: validClientId,
        amount: '2500.00',
        description: 'Mock client payment',
        createdAt: new Date(),
        updatedAt: null,
      });

      // Stub allocations and invoice reads
      const selectMock = vi.fn().mockImplementation((q: any) => {
        // Return allocations
        if (q.invoiceId) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ invoiceId: validInvoiceId, amount: '2500.00' }]),
            }),
          };
        }
        // Return sum aggregates or invoice row
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((whereCond: any) => {
              // Return sumAgg: total allocated is now 0 after deletion
              if (String(whereCond).includes('invoiceId')) {
                return [{ sum: '0' }];
              }
              // Return invoiceRow: total of invoice is 2500
              return [{ total: '2500.00' }];
            }),
          }),
        };
      });
      vi.mocked(db.select).mockImplementation(selectMock as any);

      const res = await deleteIncome('inc-1');
      expect(res).toEqual({});
      expect(db.delete).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/finance/income');
    });

    it('deleteIncome - blocks deletions of closed financial periods', async () => {
      vi.mocked(getIncomeById).mockResolvedValue({
        id: 'inc-1',
        date: '2025-12-15',
        divisionId: validDivisionId,
        clientId: validClientId,
        amount: '2500.00',
        description: 'Mock client payment',
        createdAt: new Date(),
        updatedAt: null,
      });
      mockIsPeriodClosed.mockResolvedValue(true);

      const res = await deleteIncome('inc-1');
      expect(res.error).toBe('Cannot delete records from a closed financial period.');
      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('Pages and Layouts', () => {
    it('IncomePage - renders server component with filter bar and child client layout', async () => {
      vi.mocked(getAllIncome).mockResolvedValue({
        data: [
          {
            id: 'inc-1',
            date: '2026-05-15',
            divisionId: validDivisionId,
            divisionName: 'Engineering',
            clientId: validClientId,
            clientName: 'Google Inc.',
            amount: '2500.00',
            description: 'Dev consulting invoice payment',
            createdAt: new Date(),
            updatedAt: null,
          },
        ],
        total: 1,
        sum: 2500,
      });

      vi.mocked(getAllDivisions).mockResolvedValue([{ id: validDivisionId, name: 'Engineering' }]);
      vi.mocked(getDistinctIncomeMonths).mockResolvedValue(['2026-05']);
      vi.mocked(getAllClients).mockResolvedValue([{ id: validClientId, name: 'Google', businessName: 'Google Inc.' }]);

      const searchParams = Promise.resolve({ divisionId: validDivisionId });
      const jsx = await IncomePage({ searchParams });
      render(jsx);

      expect(screen.getByTestId('page-total')).toHaveAttribute('data-value', formatZAR(2500));
      expect(screen.getByTestId('income-filter-bar')).toHaveTextContent(`FilterBar: ${validDivisionId}`);
      expect(screen.getByTestId('income-table')).toBeInTheDocument();
      expect(screen.getByText('Dev consulting invoice payment')).toBeInTheDocument();
    });

    it('IncomePageClient - renders empty state when no records are present', async () => {
      render(
        <IncomePageClient
          entries={[]}
          total={0}
          sum={0}
          currentPage={1}
          pageSize={20}
          divisions={[{ id: validDivisionId, name: 'Engineering' }]}
          clients={[{ id: validClientId, name: 'Google', businessName: 'Google Inc.' }]}
          deleteAction={vi.fn()}
          updateAction={vi.fn()}
          closedPeriods={[]}
        />
      );

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/no income recorded yet/i)).toBeInTheDocument();
    });

    it('IncomePageClient - renders list entries and delegates to actions', async () => {
      const mockDeleteAction = vi.fn().mockResolvedValue({});
      const mockUpdateAction = vi.fn().mockResolvedValue({});

      const entries = [
        {
          id: 'inc-1',
          date: '2026-05-15',
          divisionId: validDivisionId,
          divisionName: 'Engineering',
          clientId: validClientId,
          clientName: 'Google Inc.',
          amount: '2500.00',
          description: 'Payment description',
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      render(
        <IncomePageClient
          entries={entries}
          total={1}
          sum={2500}
          currentPage={1}
          pageSize={20}
          divisions={[{ id: validDivisionId, name: 'Engineering' }]}
          clients={[{ id: validClientId, name: 'Google', businessName: 'Google Inc.' }]}
          deleteAction={mockDeleteAction}
          updateAction={mockUpdateAction}
          closedPeriods={[]}
        />
      );

      expect(screen.getByTestId('income-table')).toBeInTheDocument();
      expect(screen.getByText('Payment description')).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteBtn);
      expect(mockDeleteAction).toHaveBeenCalledWith('inc-1');

      const updateBtn = screen.getByRole('button', { name: 'Update' });
      fireEvent.click(updateBtn);
      expect(mockUpdateAction).toHaveBeenCalledWith('inc-1', expect.any(FormData));
    });
  });
});
