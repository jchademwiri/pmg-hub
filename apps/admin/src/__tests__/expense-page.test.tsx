/**
 * Server component tests for the Finance > Expenses page.
 *
 * Validates:
 * - Metrics cards (Total/Categorized/Uncategorized) reflect the financial-year
 *   monthly summaries
 * - The current-month accordion section renders the expense table when there
 *   are entries, or an empty-state message when there aren't
 * - Filter bar and header are rendered with the resolved divisions/categories
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { formatZAR } from '@/lib/format';
import { getCurrentMonthString } from '@/lib/billing-groups';

vi.mock('server-only', () => ({}));

const mockGetAllExpenses = vi.fn();
const mockGetAllDivisions = vi.fn();
const mockGetAllExpenseCategories = vi.fn();
const mockGetDistinctExpenseMonths = vi.fn();
const mockGetAllClients = vi.fn();
const mockGetExpenseMonthlySummaries = vi.fn();

vi.mock('@pmg/db', () => ({
  getAllExpenses: (...args: unknown[]) => mockGetAllExpenses(...args),
  getAllDivisions: (...args: unknown[]) => mockGetAllDivisions(...args),
  getAllExpenseCategories: (...args: unknown[]) => mockGetAllExpenseCategories(...args),
  getDistinctExpenseMonths: (...args: unknown[]) => mockGetDistinctExpenseMonths(...args),
  getAllClients: (...args: unknown[]) => mockGetAllClients(...args),
  getExpenseMonthlySummaries: (...args: unknown[]) => mockGetExpenseMonthlySummaries(...args),
}));

const mockGetMinAllowedDate = vi.fn().mockResolvedValue('2026-01-01');
const mockGetClosedPeriodsFromDates = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/date-rules', () => ({
  getMinAllowedDate: (...args: unknown[]) => mockGetMinAllowedDate(...args),
  getClosedPeriodsFromDates: (...args: unknown[]) => mockGetClosedPeriodsFromDates(...args),
}));

vi.mock('@/app/actions/expenses', () => ({
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

vi.mock('@/components/expenses/expense-filter-bar', () => ({
  ExpenseFilterBar: () => <div data-testid="expense-filter-bar" />,
}));

vi.mock('@/app/(admin)/finance/expenses/expenses-header', () => ({
  ExpensesHeader: () => <div data-testid="expenses-header" />,
}));

vi.mock('@/app/(admin)/finance/expenses/lazy-expenses-table', () => ({
  LazyExpensesTable: () => <div data-testid="lazy-expenses-table" />,
}));

vi.mock('@/components/expenses/expense-table', () => ({
  ExpenseTable: ({ entries }: any) => (
    <div data-testid="expense-table">
      {entries.map((e: any) => (
        <div key={e.id}>{e.description}</div>
      ))}
    </div>
  ),
}));

import ExpensePage from '@/app/(admin)/finance/expenses/page';

// formatZAR (en-ZA locale) uses a non-breaking space as the grouping
// separator; testing-library's default text normalizer collapses that to a
// regular space when matching, so we normalize our expected strings too.
function zar(amount: number) {
  return formatZAR(amount).replace(/\s/g, ' ');
}

describe('ExpensePage', () => {
  const currentMonthStr = getCurrentMonthString();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllDivisions.mockResolvedValue([{ id: 'div-1', name: 'Engineering' }]);
    mockGetAllExpenseCategories.mockResolvedValue([{ id: 'cat-1', name: 'Software' }]);
    mockGetDistinctExpenseMonths.mockResolvedValue([currentMonthStr]);
    mockGetAllClients.mockResolvedValue([{ id: 'client-1', name: 'Google' }]);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetClosedPeriodsFromDates.mockResolvedValue([]);
  });

  it('renders metrics cards computed from the financial-year monthly summaries', async () => {
    mockGetAllExpenses.mockResolvedValue({ data: [], total: 0, sum: 0 });
    mockGetExpenseMonthlySummaries.mockResolvedValue([
      { month: currentMonthStr, count: 2, totalExpenses: 1000, totalCategorized: 700, totalUncategorized: 300 },
      { month: '2026-01', count: 1, totalExpenses: 500, totalCategorized: 500, totalUncategorized: 0 },
    ]);

    const page = await ExpensePage({ searchParams: Promise.resolve({}) });
    render(page as React.ReactElement);

    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText(zar(1500))).toBeInTheDocument(); // 1000 + 500
    expect(screen.getByText('Categorized')).toBeInTheDocument();
    expect(screen.getByText(zar(1200))).toBeInTheDocument(); // 700 + 500
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText(zar(300))).toBeInTheDocument();
  });

  it('renders the current month expense table when there are entries', async () => {
    mockGetAllExpenses.mockResolvedValue({
      data: [
        {
          id: 'exp-1',
          date: `${currentMonthStr}-15`,
          divisionId: 'div-1',
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
    mockGetExpenseMonthlySummaries.mockResolvedValue([]);

    const page = await ExpensePage({ searchParams: Promise.resolve({}) });
    render(page as React.ReactElement);

    expect(screen.getByTestId('expense-table')).toBeInTheDocument();
    expect(screen.getByText('Dev tools subscription')).toBeInTheDocument();
    expect(screen.queryByText('No expense entries yet.')).not.toBeInTheDocument();
  });

  it('renders an empty state for the current month when there are no entries', async () => {
    mockGetAllExpenses.mockResolvedValue({ data: [], total: 0, sum: 0 });
    mockGetExpenseMonthlySummaries.mockResolvedValue([]);

    const page = await ExpensePage({ searchParams: Promise.resolve({}) });
    render(page as React.ReactElement);

    expect(screen.getByText('No expense entries yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('expense-table')).not.toBeInTheDocument();
  });

  it('renders the filter bar and header', async () => {
    mockGetAllExpenses.mockResolvedValue({ data: [], total: 0, sum: 0 });
    mockGetExpenseMonthlySummaries.mockResolvedValue([]);

    const page = await ExpensePage({ searchParams: Promise.resolve({}) });
    render(page as React.ReactElement);

    expect(screen.getByTestId('expense-filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('expenses-header')).toBeInTheDocument();
  });

  it('passes divisionId/category filters through to getAllExpenses', async () => {
    mockGetAllExpenses.mockResolvedValue({ data: [], total: 0, sum: 0 });
    mockGetExpenseMonthlySummaries.mockResolvedValue([]);

    const page = await ExpensePage({
      searchParams: Promise.resolve({ divisionId: 'div-1', category: 'Software' }),
    });
    render(page as React.ReactElement);

    expect(mockGetAllExpenses).toHaveBeenCalledWith(
      expect.objectContaining({ divisionId: 'div-1', category: 'Software' }),
      expect.any(Object)
    );
    expect(mockGetExpenseMonthlySummaries).toHaveBeenCalledWith(
      expect.any(Number),
      'div-1',
      'Software'
    );
  });
});
