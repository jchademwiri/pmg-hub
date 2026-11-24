import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  insertCalls,
  mockChartAccounts,
  mockExpenseCategories,
  mockJournalEntries,
  mockJournalLines,
  mockExpenses,
  mockDivisions,
  state,
  makeDbMock,
  mockGetUnpostedExpenses,
  mockGetCurrentOpenPeriod,
} = vi.hoisted(() => {
  const insertCalls: Array<{ table: unknown; values: unknown }> = [];
  const mockChartAccounts = { id: 'chart_accounts.id', code: 'chart_accounts.code' };
  const mockExpenseCategories = {
    id: 'expense_categories.id',
    name: 'expense_categories.name',
    chartAccountId: 'expense_categories.chart_account_id',
  };
  const mockJournalEntries = { id: 'journal_entries' };
  const mockJournalLines = { id: 'journal_lines' };
  const mockExpenses = { id: 'expenses' };
  const mockDivisions = { id: 'divisions', name: 'name' };
  const state: { selectQueue: unknown[][] } = { selectQueue: [] };
  const mockGetUnpostedExpenses = vi.fn();
  const mockGetCurrentOpenPeriod = vi.fn();

  function makeDbMock() {
    const selectChain = () => {
      const rows = state.selectQueue.shift() ?? [];
      const chain: Record<string, unknown> = {
        from: () => chain,
        innerJoin: () => chain,
        where: () => chain,
        limit: () => Promise.resolve(rows),
        then: (resolve: (v: unknown) => void) => resolve(rows),
      };
      return chain;
    };

    const tx = {
      select: () => selectChain(),
      insert: (table: unknown) => ({
        values: (values: unknown) => {
          insertCalls.push({ table, values });
          return Promise.resolve();
        },
      }),
    };

    return {
      select: () => selectChain(),
      transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    };
  }

  return {
    insertCalls,
    mockChartAccounts,
    mockExpenseCategories,
    mockJournalEntries,
    mockJournalLines,
    mockExpenses,
    mockDivisions,
    state,
    makeDbMock,
    mockGetUnpostedExpenses,
    mockGetCurrentOpenPeriod,
  };
});

let entrySeq = 0;

vi.mock('@pmg/db', () => ({
  getDb: () => makeDbMock(),
  chartAccounts: mockChartAccounts,
  expenseCategories: mockExpenseCategories,
  journalEntries: mockJournalEntries,
  journalLines: mockJournalLines,
  expenses: mockExpenses,
  dividendPayouts: {},
  paymentAllocations: {},
  distributionSettings: {},
  divisions: mockDivisions,
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((...args: unknown[]) => args),
  inArray: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
  deriveDivisionPrefix: vi.fn(() => 'PMG'),
  ACCOUNT_RATES: {},
  getNextJournalEntryNumber: vi.fn(async () => `JE-2026-0${++entrySeq}`),
  ensureOpenPeriod: vi.fn(async (period: string) => ({ period, status: 'open' })),
  getCurrentOpenPeriod: (...args: unknown[]) => mockGetCurrentOpenPeriod(...args),
  getUnpostedExpensesReconciliation: (...args: unknown[]) => mockGetUnpostedExpenses(...args),
  reopenPeriod: vi.fn(),
  getTrialBalance: vi.fn(),
  upsertBankReconciliation: vi.fn(),
}));

import {
  findExpenseAccountCode,
  postExpenseJournalEntry,
  postUnpostedExpensesCatchUp,
} from '@/lib/accounting/posting';

describe('Expense GL mapping & catch-up posting', () => {
  beforeEach(() => {
    insertCalls.length = 0;
    state.selectQueue = [];
    entrySeq = 0;
    mockGetUnpostedExpenses.mockReset();
    mockGetCurrentOpenPeriod.mockReset();
  });

  it('maps known expense keywords to 5xxx accounts and falls back to 5140', () => {
    expect(findExpenseAccountCode('Hosting & Domains')).toBe('5010');
    expect(findExpenseAccountCode('Software & SaaS')).toBe('5020');
    expect(findExpenseAccountCode('Printing Services')).toBe('5030');
    expect(findExpenseAccountCode('Director Salary')).toBe('5120');
    expect(findExpenseAccountCode('Bank Charges')).toBe('5110');
    expect(findExpenseAccountCode('Random Custom Category')).toBe('5140');
  });

  it('uses explicit expense_categories.chart_account_id before keyword fallback', async () => {
    // 1. getAccountsByCode(['1010'])
    // 2. resolveExpenseChartAccount -> innerJoin expense_categories + chart_accounts
    state.selectQueue = [
      [{ id: 'acc-1010', code: '1010', name: 'Cheque', isActive: true }],
      [
        {
          account: {
            id: 'acc-5090',
            code: '5090',
            name: 'Contractors',
            isActive: true,
          },
        },
      ],
    ];

    const res = await postExpenseJournalEntry({
      expenseId: 'exp-1',
      amount: 500,
      date: '2026-11-15',
      category: 'Hosting', // Keyword would be 5010, but explicit FK points to 5090
      description: 'DevOps contractor',
      divisionId: 'div-1',
    });

    expect(res.error).toBeUndefined();
    expect(res.entryId).toBeDefined();

    const lineInserts = insertCalls.filter((c) => c.table === mockJournalLines);
    expect(lineInserts).toHaveLength(2);
    expect((lineInserts[0]!.values as { accountId: string; debit: string }).accountId).toBe(
      'acc-5090',
    );
    expect((lineInserts[1]!.values as { accountId: string; credit: string }).accountId).toBe(
      'acc-1010',
    );
  });

  it('falls back to keyword matching when category has no explicit chart_account_id', async () => {
    // 1. getAccountsByCode(['1010'])
    // 2. resolveExpenseChartAccount -> empty innerJoin result
    // 3. fallback getAccountsByCode(['5020'])
    state.selectQueue = [
      [{ id: 'acc-1010', code: '1010', name: 'Cheque', isActive: true }],
      [],
      [{ id: 'acc-5020', code: '5020', name: 'Software', isActive: true }],
    ];

    const res = await postExpenseJournalEntry({
      expenseId: 'exp-2',
      amount: 350,
      date: '2026-11-15',
      category: 'Software & SaaS',
      divisionId: 'div-1',
    });

    expect(res.error).toBeUndefined();
    const lineInserts = insertCalls.filter((c) => c.table === mockJournalLines);
    expect((lineInserts[0]!.values as { accountId: string }).accountId).toBe('acc-5020');
  });

  it('posts balanced catch-up JEs in the open period for historical unposted expenses', async () => {
    mockGetUnpostedExpenses.mockResolvedValue([
      {
        id: 'exp-jul-1',
        date: '2026-07-10',
        category: 'Stationery',
        description: 'Paper & folders',
        amount: 257,
        divisionId: 'div-tes',
      },
      {
        id: 'exp-jul-2',
        date: '2026-07-18',
        category: 'Transport',
        description: 'Uber to tender briefing',
        amount: 500,
        divisionId: 'div-tes',
      },
    ]);
    mockGetCurrentOpenPeriod.mockResolvedValue({ period: '2026-11', status: 'open' });

    // Queue: bank account, exp 1 explicit FK, exp 2 unmapped -> fallback 5070
    state.selectQueue = [
      [{ id: 'acc-1010', code: '1010', name: 'Cheque', isActive: true }],
      [{ account: { id: 'acc-5030', code: '5030', name: 'Office', isActive: true } }],
      [],
      [{ id: 'acc-5070', code: '5070', name: 'Travel', isActive: true }],
    ];

    const res = await postUnpostedExpensesCatchUp('admin-1');
    expect(res).toEqual({ postedCount: 2, totalAmount: 757, period: '2026-11' });

    const jeInserts = insertCalls.filter((c) => c.table === mockJournalEntries);
    expect(jeInserts).toHaveLength(2);
    expect(jeInserts[0]!.values).toMatchObject({
      period: '2026-11',
      entryDate: '2026-11-01',
      sourceModule: 'expense',
      sourceTable: 'expenses',
      sourceId: 'exp-jul-1',
      description: '[Catch-Up from 2026-07-10] Paper & folders',
    });

    const lineBatches = insertCalls.filter((c) => c.table === mockJournalLines);
    expect(lineBatches).toHaveLength(2);
    const firstLines = lineBatches[0]!.values as Array<{
      accountId: string;
      debit: string | null;
      credit: string | null;
    }>;
    expect(firstLines[0]).toMatchObject({ accountId: 'acc-5030', debit: '257.00', credit: null });
    expect(firstLines[1]).toMatchObject({ accountId: 'acc-1010', debit: null, credit: '257.00' });
  });

  it('is a no-op when there are no unposted expenses', async () => {
    mockGetUnpostedExpenses.mockResolvedValue([]);
    const res = await postUnpostedExpensesCatchUp('admin-1');
    expect(res).toEqual({ postedCount: 0, totalAmount: 0 });
    expect(insertCalls).toHaveLength(0);
  });
});
