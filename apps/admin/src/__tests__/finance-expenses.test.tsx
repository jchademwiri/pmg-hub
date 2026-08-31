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
    journalEntries: {
      id: 'je_id',
      status: 'status',
      sourceModule: 'source_module',
      sourceTable: 'source_table',
      sourceId: 'source_id',
    },
    journalLines: {
      id: 'jl_id',
      journalEntryId: 'je_id',
      accountId: 'account_id',
      debit: 'debit',
      credit: 'credit',
    },
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
  getExpenseById,
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
    <div data-testid="expense-filter-bar">FilterBar: {currentDivisionId}</div>
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
});
