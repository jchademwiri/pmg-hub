import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    ledger: { id: 'ledger_id' },
    eq: vi.fn(),
    getLedgerById: vi.fn(),
    getAllLedgerEntries: vi.fn(),
    insertLedgerEntry: vi.fn(),
    updateLedgerEntry: vi.fn(),
    deleteLedgerEntry: vi.fn(),
    getLedgerBalances: vi.fn(),
    getTotalRevenue: vi.fn(),
    getTotalExpenses: vi.fn(),
    getLedgerTotalByAllocation: vi.fn(),
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
  };
});

import {
  db,
  getLedgerById,
  getAllLedgerEntries,
  insertLedgerEntry,
  updateLedgerEntry as dbUpdateLedgerEntry,
  deleteLedgerEntry as dbDeleteLedgerEntry
} from '@pmg/db';

vi.mock('@/lib/financial', () => ({
  getLedgerBalances: vi.fn(),
}));

import { getLedgerBalances } from '@/lib/financial';

vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

import { getSessionOrRedirect } from '@/lib/auth';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from 'next/cache';

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
  SetPageTotal: () => React.createElement('div', { 'data-testid': 'page-total' }),
}));

// Mock child components of LedgerClient
vi.mock('@/components/ledger/ledger-table', () => ({
  LedgerTable: ({ entries }: any) => (
    <div data-testid="ledger-table">
      {entries.map((e: any) => (
        <div key={e.id}>{e.description}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ledger/ledger-add-form', () => ({
  LedgerAddForm: () => <div data-testid="ledger-add-form">Add Form</div>,
}));

// ─── Import Code Under Test ──────────────────────────────────────────────────
import {
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry
} from '@/app/actions/ledger';
import LedgerPage from '@/app/(admin)/finance/ledger/page';

describe('Finance Ledger Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionOrRedirect).mockResolvedValue({ user: { id: 'user-1' } } as any);
    mockIsPeriodClosed.mockResolvedValue(false);
    mockGetMinAllowedDate.mockResolvedValue('2026-01-01');
    mockGetMinDateErrorMessage.mockReturnValue('Period is closed.');
    mockGetClosedPeriodsFromDates.mockResolvedValue([]);

    vi.mocked(getLedgerBalances).mockResolvedValue({
      salary: { expected: 10000, spent: 2000, available: 8000 },
      reinvest: { expected: 5000, spent: 1000, available: 4000 },
      reserve: { expected: 5000, spent: 500, available: 4500 },
      flex: { expected: 2000, spent: 200, available: 1800 },
      pmg_share: { expected: 20000, spent: 5000, available: 15000 },
    });

    vi.mocked(insertLedgerEntry).mockResolvedValue({} as any);
    vi.mocked(dbUpdateLedgerEntry).mockResolvedValue({} as any);
    vi.mocked(dbDeleteLedgerEntry).mockResolvedValue({} as any);
  });

  describe('Server Actions', () => {
    it('createLedgerEntry - creates a ledger entry successfully', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-01');
      formData.set('amount', '1500');
      formData.set('allocationType', 'salary');
      formData.set('entryType', 'spend');
      formData.set('description', 'Office Supplies');

      const res = await createLedgerEntry(formData);

      expect(res).toEqual({});
      expect(insertLedgerEntry).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/finance/ledger');
    });

    it('createLedgerEntry - restricts future dates and closed periods', async () => {
      // Future date
      const formDataFuture = new FormData();
      formDataFuture.set('date', '2099-12-31');
      formDataFuture.set('amount', '1500');

      const resFuture = await createLedgerEntry(formDataFuture);
      expect(resFuture.error).toBe('Ledger date cannot be in the future.');

      // Closed period
      mockIsPeriodClosed.mockResolvedValue(true);
      const formDataClosed = new FormData();
      formDataClosed.set('date', '2026-01-01');
      formDataClosed.set('amount', '1500');

      const resClosed = await createLedgerEntry(formDataClosed);
      expect(resClosed.error).toBe('Period is closed.');
    });

    it('createLedgerEntry - blocks if spend exceeds available balance', async () => {
      const formDataOverdraft = new FormData();
      formDataOverdraft.set('date', '2026-05-01');
      formDataOverdraft.set('amount', '25000'); // exceeds salary available: 8000
      formDataOverdraft.set('allocationType', 'salary');

      const res = await createLedgerEntry(formDataOverdraft);
      expect(res.error).toContain('Cannot spend more than available balance');
    });

    it('updateLedgerEntry - edits record successfully', async () => {
      const formData = new FormData();
      formData.set('date', '2026-05-01');
      formData.set('amount', '1000');
      formData.set('allocationType', 'salary');

      vi.mocked(getLedgerById).mockResolvedValue({
        id: 'led-1',
        date: '2026-05-01',
        amount: '1000',
        allocationType: 'salary',
      } as any);

      const res = await updateLedgerEntry('led-1', formData);
      expect(res).toEqual({});
      expect(dbUpdateLedgerEntry).toHaveBeenCalled();
    });

    it('deleteLedgerEntry - deletes unpaid record', async () => {
      vi.mocked(getLedgerById).mockResolvedValue({
        id: 'led-1',
        date: '2026-05-01',
        amount: '1000',
      } as any);

      const res = await deleteLedgerEntry('led-1');
      expect(res).toEqual({});
      expect(dbDeleteLedgerEntry).toHaveBeenCalled();
    });
  });

  describe('Pages and Client Components', () => {
    it('LedgerPage - renders page with LedgerClient successfully', async () => {
      vi.mocked(getAllLedgerEntries).mockResolvedValue({
        data: [
          { id: 'led-1', date: '2026-05-01', amount: '1200.00', allocationType: 'salary', entryType: 'spend', description: 'Hosting' },
        ],
        total: 1,
        sum: 1200,
      } as any);

      const page = await LedgerPage({ searchParams: Promise.resolve({ page: '1' }) });
      render(page as React.ReactElement);

      expect(screen.getByTestId('ledger-table')).toBeInTheDocument();
      expect(screen.getByText('Hosting')).toBeInTheDocument();
    });
  });
});
