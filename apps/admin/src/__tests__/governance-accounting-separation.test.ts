import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  insertCalls,
  updateCalls,
  deleteCalls,
  mockChartAccounts,
  mockJournalEntries,
  mockJournalLines,
  mockExpenses,
  mockDividendPayouts,
  mockDivisions,
  state,
  makeDbMock,
} = vi.hoisted(() => {
  const insertCalls: Array<{ table: unknown; values: unknown }> = [];
  const updateCalls: Array<{ table: unknown; set: unknown }> = [];
  const deleteCalls: Array<{ table: unknown }> = [];

  const mockChartAccounts = { id: 'chart_accounts', code: 'code' };
  const mockJournalEntries = {
    id: 'journal_entries',
    period: 'period',
    status: 'status',
    sourceTable: 'sourceTable',
    sourceId: 'sourceId',
  };
  const mockJournalLines = { id: 'journal_lines' };
  const mockExpenses = { id: 'expenses' };
  const mockDividendPayouts = { id: 'dividend_payouts' };
  const mockDivisions = { id: 'divisions', name: 'name' };
  const state: { selectQueue: unknown[][] } = { selectQueue: [] };

  function makeDbMock() {
    const selectChain = () => {
      const rows = state.selectQueue.shift() ?? [];
      const chain: Record<string, unknown> = {
        from: () => chain,
        where: () => chain,
        limit: () => Promise.resolve(rows),
        then: (resolve: (v: unknown) => void) => resolve(rows),
      };
      return chain;
    };

    const tx = {
      insert: (table: unknown) => ({
        values: (values: unknown) => {
          insertCalls.push({ table, values });
          return Promise.resolve();
        },
      }),
      update: (table: unknown) => ({
        set: (set: unknown) => ({
          where: () => {
            updateCalls.push({ table, set });
            return Promise.resolve();
          },
        }),
      }),
      delete: (table: unknown) => ({
        where: () => {
          deleteCalls.push({ table });
          return Promise.resolve();
        },
      }),
      select: selectChain,
    };

    return {
      select: selectChain,
      transaction: async (cb: (t: typeof tx) => Promise<void>) => {
        await cb(tx);
      },
    };
  }

  return {
    insertCalls,
    updateCalls,
    deleteCalls,
    mockChartAccounts,
    mockJournalEntries,
    mockJournalLines,
    mockExpenses,
    mockDividendPayouts,
    mockDivisions,
    state,
    makeDbMock,
  };
});

vi.mock('@pmg/db', () => ({
  getDb: () => makeDbMock(),
  chartAccounts: mockChartAccounts,
  journalEntries: mockJournalEntries,
  journalLines: mockJournalLines,
  expenses: mockExpenses,
  dividendPayouts: mockDividendPayouts,
  divisions: mockDivisions,
  paymentAllocations: {},
  distributionSettings: {},
  and: vi.fn((...args) => args),
  eq: vi.fn((a, b) => [a, b]),
  inArray: vi.fn((a, b) => [a, b]),
  sql: vi.fn(),
  deriveDivisionPrefix: vi.fn(() => 'PMG'),
  ACCOUNT_RATES: { pmg_share: 0.25 },
  getNextJournalEntryNumber: vi.fn().mockResolvedValue('JE-2026-0099'),
  ensureOpenPeriod: vi.fn().mockResolvedValue({ status: 'open' }),
  reopenPeriod: vi.fn(),
  getTrialBalance: vi.fn(),
  upsertBankReconciliation: vi.fn(),
}));

import {
  postQuarterlyDistributionEntry,
  voidQuarterlyDistributionEntry,
} from '@/lib/accounting/posting';
import { getFiscalQuarterFromDate } from '@/app/(admin)/finance/projections/governance-tabs';

describe('Governance accounting separation', () => {
  beforeEach(() => {
    insertCalls.length = 0;
    updateCalls.length = 0;
    deleteCalls.length = 0;
    state.selectQueue = [];
  });

  it('postQuarterlyDistributionEntry (director_bonus) posts to GL 5120 without mirroring into expenses', async () => {
    // 1. getAccountsByCode -> 5120, 1010, 1250
    state.selectQueue.push([
      { id: 'acc-5120', code: '5120', name: 'Staff Costs & Director Remuneration' },
      { id: 'acc-1010', code: '1010', name: 'Business Cheque Account' },
      { id: 'acc-1250', code: '1250', name: "Director's Loan Account" },
    ]);
    // 2. resolveCorporateDivisionId -> PMG division
    state.selectQueue.push([{ id: 'div-pmg', name: 'Playhouse Media Group' }]);

    const res = await postQuarterlyDistributionEntry({
      date: '2026-11-24',
      quarter: 'Q3',
      payoutType: 'director_bonus',
      accountCode: '1010',
      grossAmount: 54506,
      dwtWithheld: 0,
      loanOffsetAmount: 51235.5,
      netCashPaid: 3270.5,
      createdBy: 'user-1',
    });

    expect(res.error).toBeUndefined();
    expect(res.entryId).toBeTruthy();

    // Must NEVER insert into the operational `expenses` table
    const expenseInserts = insertCalls.filter((c) => c.table === mockExpenses);
    expect(expenseInserts).toHaveLength(0);

    // Must insert 1 journal entry tagged to dividend_payouts + 3 balanced lines
    const jeInserts = insertCalls.filter((c) => c.table === mockJournalEntries);
    expect(jeInserts).toHaveLength(1);
    expect((jeInserts[0]!.values as Record<string, unknown>).sourceTable).toBe('dividend_payouts');

    const lineInserts = insertCalls.filter((c) => c.table === mockJournalLines);
    expect(lineInserts).toHaveLength(1);
    const lines = lineInserts[0]!.values as Array<{
      accountId: string;
      debit: string | null;
      credit: string | null;
    }>;
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ accountId: 'acc-5120', debit: '54506.00', credit: null });
    expect(lines[1]).toMatchObject({ accountId: 'acc-1250', debit: null, credit: '51235.50' });
    expect(lines[2]).toMatchObject({ accountId: 'acc-1010', debit: null, credit: '3270.50' });
  });

  it('voidQuarterlyDistributionEntry voids GL entry, cleans up legacy mirrored expense, and deletes payout', async () => {
    // 1. payout lookup
    state.selectQueue.push([{ id: 'payout-1', journalEntryId: 'je-1' }]);
    // 2. journal entry lookup (legacy mirrored expense)
    state.selectQueue.push([
      {
        id: 'je-1',
        period: '2026-11',
        status: 'posted',
        sourceTable: 'expenses',
        sourceId: 'exp-legacy-1',
      },
    ]);

    const res = await voidQuarterlyDistributionEntry({
      payoutId: 'payout-1',
      voidedBy: 'user-1',
      reason: 'Correction',
    });

    expect(res.error).toBeUndefined();
    expect(res.voidedJournalId).toBe('je-1');
    expect(updateCalls.some((u) => u.table === mockJournalEntries)).toBe(true);
    expect(deleteCalls.some((d) => d.table === mockExpenses)).toBe(true);
    expect(deleteCalls.some((d) => d.table === mockDividendPayouts)).toBe(true);
  });

  it('getFiscalQuarterFromDate maps South African fiscal months (Mar–Feb) to Q1–Q4', () => {
    expect(getFiscalQuarterFromDate('2026-03-01')).toBe('Q1');
    expect(getFiscalQuarterFromDate('2026-05-31')).toBe('Q1');
    expect(getFiscalQuarterFromDate('2026-06-15')).toBe('Q2');
    expect(getFiscalQuarterFromDate('2026-08-31')).toBe('Q2');
    expect(getFiscalQuarterFromDate('2026-09-01')).toBe('Q3');
    expect(getFiscalQuarterFromDate('2026-11-24')).toBe('Q3');
    expect(getFiscalQuarterFromDate('2026-12-01')).toBe('Q4');
    expect(getFiscalQuarterFromDate('2027-02-28')).toBe('Q4');
  });
});
