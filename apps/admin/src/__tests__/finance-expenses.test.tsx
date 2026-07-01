import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── Setup Mocks ─────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

vi.mock('@pmg/db', () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{}]),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    }),
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockDb)),
  };
  return {
    db: mockDb,
    getDb: () => mockDb,
    expenses: { id: 'expenses_id' },
    chartAccounts: { id: 'chart_id', code: 'code', name: 'name' },
    journalEntries: { id: 'je_id', status: 'status', sourceModule: 'source_module', sourceTable: 'source_table', sourceId: 'source_id' },
    journalLines: { id: 'jl_id', journalEntryId: 'je_id', accountId: 'account_id', debit: 'debit', credit: 'credit' },
    paymentAllocations: { id: 'pa_id', invoiceId: 'invoice_id', incomeId: 'income_id' },
    eq: vi.fn().mockReturnValue({}),
    and: vi.fn().mockReturnValue({}),
    sql: vi.fn().mockReturnValue({}),
    ACCOUNT_RATES: { pmg_share: 0.25 },
    getNextJournalEntryNumber: vi.fn().mockResolvedValue('JE-001'),
    ensureOpenPeriod: vi.fn().mockResolvedValue(undefined),
    getAllExpenses: vi.fn(),
    getAllDivisions: vi.fn(),
    getAllExpenseCategories: vi.fn(),
    getDistinctExpenseMonths: vi.fn(),
    getAllClients: vi.fn(),
    getExpenseById: vi.fn(),
  };
});

import {
  db,
  getAllExpenses,
  getAllDivisions,
  getAllExpenseCategories,
  getDistinctExpenseMonths,
  getAllClients,
  getExpenseById
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

vi.mock('@/components/expenses/expense-filter-bar', () => ({
  ExpenseFilterBar: ({ currentDivisionId }: any) => (
    <div data-testid="expense-filter-bar">
      FilterBar: {currentDivisionId}
    </div>
  ),
}));

vi.mock('@/components/expenses/expense-add-form', () => ({
  ExpenseAddForm: ({ createAction }: any) => (
    <form
      data-testid="expense-add-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await createAction(fd);
      }}
    >
      <input name="date" defaultValue="2026-05-10" />
      <input name="divisionId" defaultValue="d3b07384-d113-4956-a5db-8f3e58b8d4e6" />
      <input name="category" defaultValue="Office Supplies" />
      <input name="amount" defaultValue="150" />
      <button type="submit">Submit Form</button>
    </form>
  ),
}));

vi.mock('@/components/expenses/expense-table', () => ({
  ExpenseTable: ({ entries, deleteAction, updateAction }: any) => (
    <div data-testid="expense-table">
      {entries.map((e: any) => (
        <div key={e.id} data-testid={`expense-row-${e.id}`}>
          <span>{e.description || 'No Description'}</span>
          <span>{e.amount}</span>
          <button onClick={() => deleteAction(e.id)}>Delete</button>
          <button
            onClick={() => {
              const fd = new FormData();
              fd.set('date', e.date);
              fd.set('divisionId', e.divisionId);
              fd.set('category', e.category);
              fd.set('amount', '200');
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
  EmptyState: ({ message }: any) => <div data-testid="empty-state">{message}</div>,
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses';
import ExpensePage from '@/app/(admin)/finance/expenses/page';
import ExpensesPageClient from '@/app/(admin)/finance/expenses/expenses-client';

describe('Finance Expenses Module', () => {
  const validDivisionId = 'd3b07384-d113-4956-a5db-8f3e58b8d4e6';
  const validClientId = 'c3b07384-d113-4956-a5db-8f3e58b8d4e7';

  beforeEach(() => {
    vi.clearAllMocks();

    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');
    mockGetClosedPeriodsFromDates.mockResolvedValue([]);

    // Re-establish mock chains after clearAllMocks
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mock-expense-id' }]),
      }),
    } as any);

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    } as any);

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    } as any);

    vi.mocked(db.transaction).mockImplementation(async (cb: any) => cb(db as any));
  });

  describe('Server Actions', () => {
    it('createExpense - successfully creates an expense', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-15');
      formData.set('divisionId', validDivisionId);
      formData.set('category', 'Hardware');
      formData.set('amount', '450.50');
      formData.set('description', 'Test desk purchase');

      const res = await createExpense(formData);
      expect(res).toEqual({});
      expect(db.insert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/finance/expenses');
    });

    it('createExpense - fails validation on invalid division uuid', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-15');
      formData.set('divisionId', 'invalid-uuid');
      formData.set('category', 'Hardware');
      formData.set('amount', '450.50');

      const res = await createExpense(formData);
      expect(res.error).toBeDefined();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('createExpense - blocks future date entries', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

      const formData = new FormData();
      formData.set('date', tomorrowStr);
      formData.set('divisionId', validDivisionId);
      formData.set('category', 'Hardware');
      formData.set('amount', '450.50');

      const res = await createExpense(formData);
      expect(res.error).toBe('Expense date cannot be in the future.');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('createExpense - blocks closed financial period dates', async () => {
      mockIsPeriodClosed.mockResolvedValue(true);

      const formData = new FormData();
      formData.set('date', '2025-12-15');
      formData.set('divisionId', validDivisionId);
      formData.set('category', 'Hardware');
      formData.set('amount', '450.50');

      const res = await createExpense(formData);
      expect(res.error).toBe('Period is closed.');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('updateExpense - successfully modifies an active expense', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-15');
      formData.set('divisionId', validDivisionId);
      formData.set('category', 'Software');
      formData.set('amount', '120.00');

      const res = await updateExpense('exp-1', formData);
      expect(res).toEqual({});
      expect(db.update).toHaveBeenCalled();
    });

    it('updateExpense - blocks updates on closed financial period dates', async () => {
      mockIsPeriodClosed.mockResolvedValue(true);

      const formData = new FormData();
      formData.set('date', '2025-12-15');
      formData.set('divisionId', validDivisionId);
      formData.set('category', 'Software');
      formData.set('amount', '120.00');

      const res = await updateExpense('exp-1', formData);
      expect(res.error).toBe('Period is closed.');
      expect(db.update).not.toHaveBeenCalled();
    });

    it('deleteExpense - successfully removes an active expense', async () => {
      vi.mocked(getExpenseById).mockResolvedValue({
        id: 'exp-1',
        date: '2026-05-15',
        divisionId: validDivisionId,
        divisionName: 'Engineering',
        category: 'Software',
        amount: '120.00',
        clientId: null,
        clientName: null,
        description: null,
        createdAt: new Date(),
        updatedAt: null,
      } as any);

      const res = await deleteExpense('exp-1');
      expect(res).toEqual({});
      expect(db.delete).toHaveBeenCalled();
    });

    it('deleteExpense - blocks deletions of closed financial periods', async () => {
      vi.mocked(getExpenseById).mockResolvedValue({
        id: 'exp-1',
        date: '2025-12-15',
        divisionId: validDivisionId,
        divisionName: 'Engineering',
        category: 'Software',
        amount: '120.00',
        clientId: null,
        clientName: null,
        description: null,
        createdAt: new Date(),
        updatedAt: null,
      } as any);
      mockIsPeriodClosed.mockResolvedValue(true);

      const res = await deleteExpense('exp-1');
      expect(res.error).toBe('Cannot delete records from a closed financial period.');
      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('Pages and Layouts', () => {
    it('ExpensePage - renders server component with filter bar and child client layout', async () => {
      vi.mocked(getAllExpenses).mockResolvedValue({
        data: [
          {
            id: 'exp-1',
            date: '2026-05-15',
            divisionId: validDivisionId,
            divisionName: 'Engineering',
            category: 'Software',
            amount: '120.00',
            clientId: null,
            clientName: null,
            description: 'Dev tools subscription',
            createdAt: new Date(),
            updatedAt: null,
          },
        ],
        total: 1,
        sum: 120,
      });

      vi.mocked(getAllDivisions).mockResolvedValue([{ id: validDivisionId, name: 'Engineering' }]);
      vi.mocked(getAllExpenseCategories).mockResolvedValue([{ id: 'cat-1', name: 'Software' }]);
      vi.mocked(getDistinctExpenseMonths).mockResolvedValue(['2026-05']);
      vi.mocked(getAllClients).mockResolvedValue([{ id: validClientId, name: 'Google', businessName: null, email: null }]);

      const searchParams = Promise.resolve({ divisionId: validDivisionId });
      const jsx = await ExpensePage({ searchParams });
      render(jsx);

      expect(screen.getByTestId('page-total')).toHaveAttribute('data-value', formatZAR(120));
      expect(screen.getByTestId('expense-filter-bar')).toHaveTextContent(`FilterBar: ${validDivisionId}`);
      expect(screen.getByTestId('expense-table')).toBeInTheDocument();
      expect(screen.getByText('Dev tools subscription')).toBeInTheDocument();
    });

    it('ExpensesPageClient - opens add form on clicking Add Expense button', async () => {
      const mockCreateAction = vi.fn().mockResolvedValue({});
      const mockDeleteAction = vi.fn().mockResolvedValue({});
      const mockUpdateAction = vi.fn().mockResolvedValue({});

      render(
        <ExpensesPageClient
          entries={[]}
          total={0}
          sum={0}
          currentPage={1}
          pageSize={20}
          divisions={[{ id: validDivisionId, name: 'Engineering' }]}
          categories={['Software']}
          clients={[{ id: validClientId, name: 'Google' }]}
          createAction={mockCreateAction}
          deleteAction={mockDeleteAction}
          updateAction={mockUpdateAction}
          minDate="2026-01-01"
          closedPeriods={[]}
        />
      );

      // Initially renders empty state since entries are empty
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('expense-add-form')).not.toBeInTheDocument();

      // Click Add Expense button
      const addBtn = screen.getByRole('button', { name: /add expense/i });
      fireEvent.click(addBtn);

      expect(screen.getByTestId('expense-add-form')).toBeInTheDocument();

      // Submit the form
      const submitBtn = screen.getByRole('button', { name: /submit form/i });
      fireEvent.click(submitBtn);

      expect(mockCreateAction).toHaveBeenCalled();
    });

    it('ExpensesPageClient - renders entries and handles update/delete actions', async () => {
      const mockCreateAction = vi.fn().mockResolvedValue({});
      const mockDeleteAction = vi.fn().mockResolvedValue({});
      const mockUpdateAction = vi.fn().mockResolvedValue({});

      const entries = [
        {
          id: 'exp-1',
          date: '2026-05-15',
          divisionId: validDivisionId,
          divisionName: 'Engineering',
          category: 'Software',
          amount: '120.00',
          clientId: null,
          clientName: null,
          description: 'Dev tools',
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      render(
        <ExpensesPageClient
          entries={entries}
          total={1}
          sum={120}
          currentPage={1}
          pageSize={20}
          divisions={[{ id: validDivisionId, name: 'Engineering' }]}
          categories={['Software']}
          clients={[{ id: validClientId, name: 'Google' }]}
          createAction={mockCreateAction}
          deleteAction={mockDeleteAction}
          updateAction={mockUpdateAction}
          minDate="2026-01-01"
          closedPeriods={[]}
        />
      );

      expect(screen.getByTestId('expense-table')).toBeInTheDocument();
      expect(screen.getByText('Dev tools')).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteBtn);
      expect(mockDeleteAction).toHaveBeenCalledWith('exp-1');

      const updateBtn = screen.getByRole('button', { name: 'Update' });
      fireEvent.click(updateBtn);
      expect(mockUpdateAction).toHaveBeenCalledWith('exp-1', expect.any(FormData));
    });
  });
});
