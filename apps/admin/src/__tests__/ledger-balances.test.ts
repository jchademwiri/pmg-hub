import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@pmg/db', () => ({
  getTotalRevenue: vi.fn(),
  getTotalExpenses: vi.fn(),
  getLedgerTotalByAllocation: vi.fn(),
  getActiveRates: vi.fn().mockResolvedValue({
    pmg_share: 0.25,
  }),
  ACCOUNT_RATES: {
    pmg_share: 0.25,
  },
}));

import {
  getTotalRevenue,
  getTotalExpenses,
  getLedgerTotalByAllocation,
  getActiveRates,
} from '@pmg/db';
import { getLedgerBalances } from '@/lib/financial';

describe('getLedgerBalances', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getActiveRates).mockResolvedValue({
      pmg_share: 0.25,
    });
  });

  it('calculates available balances correctly for pmg_share', async () => {
    // Mock revenue and expenses for getFinancialSummary
    vi.mocked(getTotalRevenue).mockResolvedValue(100000);
    vi.mocked(getTotalExpenses).mockResolvedValue(40000); // actual profit = 60000, pmg_share expected = 15000

    // Mock ledger totals (spends)
    vi.mocked(getLedgerTotalByAllocation).mockImplementation(async (type) => {
      if (type === 'pmg_share') return 3000;
      return 0;
    });

    const result = await getLedgerBalances();

    expect(result.pmg_share).toEqual({ expected: 15000, spent: 3000, available: 12000 });
  });
});
