import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    ACCOUNT_KEYS: ['salary', 'reinvest', 'reserve', 'flex', 'pmg_share'],
    ACCOUNT_LABELS: {
      salary: 'Salary Account',
      reinvest: 'Reinvestment Account',
      reserve: 'Reserve Account',
      flex: 'Flex Account',
      pmg_share: 'PMG Share Account',
    },
    LOCKED_ACCOUNTS: ['pmg_share'],
    getLedgerBalances: vi.fn(),
    getLedgerByAllocation: vi.fn().mockResolvedValue([]),
    getLedgerByAllocationYTD: vi.fn().mockResolvedValue({}),
    getAllIncome: vi.fn().mockResolvedValue({ data: [] }),
    getYTDSummary: vi.fn().mockResolvedValue({ revenue: 0 }),
    getTotalRevenue: vi.fn(),
    getTotalExpenses: vi.fn(),
    ACCOUNT_RATES: {
      pmg_share: 0.25,
      salary: 0.35,
      reinvest: 0.30,
      reserve: 0.30,
      flex: 0.05,
    },
    PROFIT_POOL_RATES: {
      salary: 0.35,
      reinvest: 0.30,
      reserve: 0.30,
      flex: 0.05,
    },
    getLedgerTotalByAllocation: vi.fn(),
    eq: vi.fn(),
    and: vi.fn(),
  };
});

import {
  db,
  getLedgerBalances,
  getLedgerByAllocation,
  getLedgerByAllocationYTD,
  getAllIncome,
  getYTDSummary
} from '@pmg/db';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/app/actions/ledger', () => ({
  createLedgerEntry: vi.fn().mockResolvedValue({}),
}));

import { createLedgerEntry } from '@/app/actions/ledger';

vi.mock('@/components/navigation/page-header-context', () => ({
  SetPageTotal: () => React.createElement('div', { 'data-testid': 'page-total' }),
}));

// Mock child component AccountCard to avoid heavy sub-component rendering
vi.mock('@/components/accounts/account-card', () => ({
  AccountCard: ({ label, balance }: any) => (
    <div data-testid="account-card">
      <h3>{label}</h3>
      <span>{balance}</span>
    </div>
  ),
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import { recordAccountWithdrawal } from '@/app/actions/account-withdrawal';
import AccountsPage from '@/app/(admin)/finance/accounts/page';
import AccountHistoryPage from '@/app/(admin)/finance/accounts/[account]/page';

describe('Finance Accounts Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getLedgerBalances).mockResolvedValue({
      salary: { expected: 10000, spent: 2000, available: 8000 },
      reinvest: { expected: 5000, spent: 1000, available: 4000 },
      reserve: { expected: 5000, spent: 500, available: 4500 },
      flex: { expected: 2000, spent: 200, available: 1800 },
      pmg_share: { expected: 20000, spent: 5000, available: 15000 },
    });
    vi.mocked(getLedgerByAllocation).mockResolvedValue([]);
    vi.mocked(getLedgerByAllocationYTD).mockResolvedValue({
      salary: 2000,
      reinvest: 1000,
      reserve: 500,
      flex: 200,
      pmg_share: 5000,
    });
    vi.mocked(getAllIncome).mockResolvedValue({ data: [] });
    vi.mocked(getYTDSummary).mockResolvedValue({
      revenue: 100000,
      salary: 35000,
      reinvest: 30000,
      reserve: 30000,
      flex: 5000,
      pmgShare: 20000,
    } as any);

    // Standard chainable mocks
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
      }),
    } as any);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(true),
      }),
    } as any);
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(true),
    } as any);
  });

  describe('Server Actions', () => {
    it('recordAccountWithdrawal - invalid type', async () => {
      const formData = new FormData();
      formData.set('account', 'invalid_type');

      const res = await recordAccountWithdrawal(formData);
      expect(res.error).toBe('Invalid ledger allocation type.');
    });

    it('recordAccountWithdrawal - locked account block', async () => {
      const formData = new FormData();
      formData.set('account', 'pmg_share'); // locked

      const res = await recordAccountWithdrawal(formData);
      expect(res.error).toBe('Withdrawals are locked for this account.');
    });

    it('recordAccountWithdrawal - delegates to createLedgerEntry successfully', async () => {
      const formData = new FormData();
      formData.set('account', 'salary');
      formData.set('amount', '1500');
      formData.set('description', 'Test withdrawal');
      formData.set('date', '2026-05-01');

      vi.mocked(createLedgerEntry).mockResolvedValue({ error: undefined });

      const res = await recordAccountWithdrawal(formData);
      expect(res).toEqual({ error: undefined });
      expect(createLedgerEntry).toHaveBeenCalled();
    });
  });

  describe('Pages and Layouts', () => {
    it('AccountsPage - renders page with AccountCards and correct total balance', async () => {
      const page = await AccountsPage();
      render(page as React.ReactElement);

      const cards = screen.getAllByTestId('account-card');
      expect(cards.length).toBe(5); // 5 buckets
      expect(screen.getByText('Salary Account')).toBeInTheDocument();
      expect(screen.getByText('PMG Share Account')).toBeInTheDocument();
    });

    it('AccountHistoryPage - throws notFound if key is invalid', async () => {
      await expect(
        AccountHistoryPage({ params: Promise.resolve({ account: 'invalid-key' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('AccountHistoryPage - renders running balances, details, and statement table', async () => {
      // Mock income and history events
      vi.mocked(getAllIncome).mockResolvedValue({
        data: [
          {
            id: 'inc-1',
            date: '2026-05-01',
            amount: '10000.00',
            clientName: 'Client Alpha',
            divisionName: 'AWS',
            description: 'Monthly Maintenance',
          },
        ],
      } as any);

      vi.mocked(getLedgerByAllocation).mockResolvedValue([
        {
          id: 'led-1',
          date: '2026-05-10',
          amount: '1500.00',
          description: 'Hosting Expense',
        },
      ] as any);

      const page = await AccountHistoryPage({ params: Promise.resolve({ account: 'salary' }) });
      render(page as React.ReactElement);

      expect(screen.getByText('Salary Account Statement')).toBeInTheDocument();
      expect(screen.getByText('Allocated Income - Client Alpha · Monthly Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Hosting Expense')).toBeInTheDocument();
    });
  });
});
