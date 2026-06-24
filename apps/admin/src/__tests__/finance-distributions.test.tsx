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
    getLedgerByAllocation: vi.fn(),
    getLedgerByAllocationYTD: vi.fn(),
    getAllIncome: vi.fn(),
    getYTDSummary: vi.fn(),
    getTotalRevenue: vi.fn(),
    getTotalExpenses: vi.fn(),
    getAllLedgerEntries: vi.fn(),
    getActiveRates: vi.fn().mockResolvedValue({
      pmg_share: 0.25,
      salary: 0.35,
      reinvest: 0.30,
      reserve: 0.30,
      flex: 0.05,
    }),
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
    getCurrentRates: vi.fn().mockResolvedValue([
      { rateKey: 'pmg_share', rateValue: '0.25' },
      { rateKey: 'salary', rateValue: '0.35' },
      { rateKey: 'reinvest', rateValue: '0.30' },
      { rateKey: 'reserve', rateValue: '0.30' },
      { rateKey: 'flex', rateValue: '0.05' },
    ]),
    eq: vi.fn(),
    and: vi.fn(),
  };
});

vi.mock('@/lib/financial', () => ({
  getLedgerBalances: vi.fn(),
}));

import { getLedgerBalances } from '@/lib/financial';

import {
  db,
  getLedgerByAllocation,
  getLedgerByAllocationYTD,
  getAllIncome,
  getYTDSummary,
  getActiveRates,
  getAllLedgerEntries,
  getCurrentRates,
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
  usePathname: () => '/finance/distributions',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/actions/ledger', () => ({
  createLedgerEntry: vi.fn().mockResolvedValue({}),
  updateLedgerEntry: vi.fn().mockResolvedValue({}),
  deleteLedgerEntry: vi.fn().mockResolvedValue({}),
}));

import { createLedgerEntry, updateLedgerEntry, deleteLedgerEntry } from '@/app/actions/ledger';

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
import DistributionsPage from '@/app/(admin)/finance/distributions/page';

describe('Finance Accounts Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getActiveRates).mockResolvedValue({
      pmg_share: 0.25,
      salary: 0.35,
      reinvest: 0.30,
      reserve: 0.30,
      flex: 0.05,
    });
    vi.mocked(getAllLedgerEntries).mockResolvedValue({ data: [], total: 0, sum: 0 });
    (getCurrentRates as any).mockResolvedValue([
      { rateKey: 'pmg_share', rateValue: 0.25 },
      { rateKey: 'salary', rateValue: 0.35 },
      { rateKey: 'reinvest', rateValue: 0.30 },
      { rateKey: 'reserve', rateValue: 0.30 },
      { rateKey: 'flex', rateValue: 0.05 },
    ]);
    (getLedgerBalances as any).mockResolvedValue({
      salary: { expected: 10000, spent: 2000, available: 8000 },
      reinvest: { expected: 5000, spent: 1000, available: 4000 },
      reserve: { expected: 5000, spent: 500, available: 4500 },
      flex: { expected: 2000, spent: 200, available: 1800 },
      pmg_share: { expected: 20000, spent: 5000, available: 15000 },
    });
    (getLedgerByAllocation as any).mockResolvedValue([]);
    (getLedgerByAllocationYTD as any).mockResolvedValue({
      salary: 2000,
      reinvest: 1000,
      reserve: 500,
      flex: 200,
      pmg_share: 5000,
    });
    (getAllIncome as any).mockResolvedValue({ data: [], total: 0, sum: 0 });
    (getYTDSummary as any).mockResolvedValue({
      revenue: 100000,
      salary: 35000,
      reinvest: 30000,
      reserve: 30000,
      flex: 5000,
      pmgShare: 20000,
    });

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
    it('DistributionsPage - renders page with distribution buckets', async () => {
      const page = await DistributionsPage({
        searchParams: Promise.resolve({ tab: 'overview' }),
      });
      render(page as React.ReactElement);

      const cards = screen.getAllByTestId('account-card');
      expect(cards.length).toBe(5); // 5 buckets
    });
  });
});
