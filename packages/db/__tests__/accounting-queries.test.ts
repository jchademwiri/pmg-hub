import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mockSelect is available when vi.mock factory runs (hoisted to top)
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock("../src/client", () => ({
  db: {
    select: mockSelect,
  },
}));

import {
  getTrialBalance,
  getProfitAndLoss,
} from "../src/queries/accounting";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers: build chainable Drizzle mocks
// ---------------------------------------------------------------------------

/**
 * Creates a mock chain for the subquery:
 *   db.select({...}).from(t).innerJoin(...).groupBy(...).as("alias")
 * Returns a subquery-like object with the selected columns.
 */
function mockSubqueryChain(subqueryColumns: Record<string, unknown>) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    as: vi.fn().mockReturnValue(subqueryColumns),
  };
  return chain;
}

/**
 * Creates a mock chain for the main query:
 *   db.select({...}).from(t).leftJoin(...).where(...).orderBy(...)
 * Resolves to the given returnValue.
 */
function mockMainQueryChain(returnValue: unknown[]) {
  const thenable = {
    then: <T>(resolve: (v: unknown) => T) =>
      Promise.resolve(returnValue).then(resolve),
    catch: <T>(reject: (e: unknown) => T) =>
      Promise.resolve(returnValue).catch(reject),
  };

  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(returnValue),
    as: vi.fn().mockReturnThis(),
    ...thenable,
  };
}

// ---------------------------------------------------------------------------
// Reusable mock data
// ---------------------------------------------------------------------------

const MOCK_ACCOUNTS = [
  // Assets
  { id: "a1", code: "1010", name: "Business Cheque Account", type: "asset" },
  // Revenue
  { id: "r1", code: "4010", name: "Sales Revenue", type: "revenue" },
  // Expense
  { id: "e1", code: "5010", name: "Hosting & Infrastructure", type: "expense" },
];

const MOCK_TRIAL_BALANCE_ROWS = [
  {
    accountId: "a1",
    accountCode: "1010",
    accountName: "Business Cheque Account",
    accountType: "asset",
    totalDebits: "20500",
    totalCredits: "0",
  },
  {
    accountId: "r1",
    accountCode: "4010",
    accountName: "Sales Revenue",
    accountType: "revenue",
    totalDebits: "0",
    totalCredits: "35080",
  },
  {
    accountId: "e1",
    accountCode: "5010",
    accountName: "Hosting & Infrastructure",
    accountType: "expense",
    totalDebits: "2360",
    totalCredits: "0",
  },
];

// ---------------------------------------------------------------------------
// getTrialBalance
// ---------------------------------------------------------------------------

describe("getTrialBalance", () => {
  it("includes posted journal entries", async () => {
    // First call: subquery (not awaited)
    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    // Second call: main query (awaited)
    mockSelect.mockReturnValue(mockMainQueryChain(MOCK_TRIAL_BALANCE_ROWS));

    const result = await getTrialBalance();

    expect(result).toHaveLength(3);
    expect(result[0].accountCode).toBe("1010");
    expect(result[0].totalDebits).toBe(20500);
    expect(result[0].totalCredits).toBe(0);
    expect(result[0].balance).toBe(20500);

    expect(result[1].accountCode).toBe("4010");
    expect(result[1].totalDebits).toBe(0);
    expect(result[1].totalCredits).toBe(35080);
    expect(result[1].balance).toBe(-35080);

    expect(result[2].accountCode).toBe("5010");
    expect(result[2].totalDebits).toBe(2360);
    expect(result[2].totalCredits).toBe(0);
    expect(result[2].balance).toBe(2360);
  });

  it("excludes void journal entries from totals", async () => {
    const rowsWithVoid = [
      // Only posted revenue (no void revenue)
      {
        accountId: "r1",
        accountCode: "4010",
        accountName: "Sales Revenue",
        accountType: "revenue",
        totalDebits: "0",
        totalCredits: "35080",
      },
      {
        accountId: "a1",
        accountCode: "1010",
        accountName: "Business Cheque Account",
        accountType: "asset",
        totalDebits: "0", // void lines excluded — zero
        totalCredits: "0",
      },
    ];

    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(rowsWithVoid));

    const result = await getTrialBalance();

    const revenue = result.find((r) => r.accountCode === "4010");
    expect(revenue).toBeDefined();
    expect(revenue!.totalCredits).toBe(35080);

    // Void lines are excluded, so account 1010 has zero debits
    const bank = result.find((r) => r.accountCode === "1010");
    expect(bank).toBeDefined();
    expect(bank!.totalDebits).toBe(0);
  });

  it("excludes draft journal entries from totals", async () => {
    // Only zero rows because only draft entries exist
    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(
      MOCK_ACCOUNTS.map((a) => ({
        accountId: a.id,
        accountCode: a.code,
        accountName: a.name,
        accountType: a.type,
        totalDebits: "0",
        totalCredits: "0",
      }))
    ));

    const result = await getTrialBalance();

    // Accounts appear with zero balances
    expect(result).toHaveLength(3);
    result.forEach((r) => {
      expect(r.totalDebits).toBe(0);
      expect(r.totalCredits).toBe(0);
      expect(r.balance).toBe(0);
    });
  });

  it("applies period filter correctly", async () => {
    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(
      MOCK_TRIAL_BALANCE_ROWS.filter((r) => r.accountCode === "4010")
    ));

    const result = await getTrialBalance("2026-05");

    expect(result).toHaveLength(1);
    expect(result[0].accountCode).toBe("4010");
    expect(result[0].totalCredits).toBe(35080);
  });

  it("shows active posting accounts with zero movement", async () => {
    const zeroRows = MOCK_ACCOUNTS.map((a) => ({
      accountId: a.id,
      accountCode: a.code,
      accountName: a.name,
      accountType: a.type,
      totalDebits: "0",
      totalCredits: "0",
    }));

    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(zeroRows));

    const result = await getTrialBalance();

    expect(result).toHaveLength(MOCK_ACCOUNTS.length);
    result.forEach((r) => {
      expect(typeof r.totalDebits).toBe("number");
      expect(typeof r.totalCredits).toBe("number");
      expect(typeof r.balance).toBe("number");
      expect(r.totalDebits).toBe(0);
      expect(r.totalCredits).toBe(0);
    });
  });

  it("returns correct number types (not strings)", async () => {
    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(MOCK_TRIAL_BALANCE_ROWS));

    const result = await getTrialBalance();

    result.forEach((r) => {
      expect(typeof r.totalDebits).toBe("number");
      expect(typeof r.totalCredits).toBe("number");
      expect(typeof r.balance).toBe("number");
    });
  });
});

// ---------------------------------------------------------------------------
// getProfitAndLoss
// ---------------------------------------------------------------------------

describe("getProfitAndLoss", () => {
  it("returns correct revenue from posted entries only", async () => {
    const rows = [
      {
        accountId: "r1",
        accountCode: "4010",
        accountName: "Sales Revenue",
        accountType: "revenue",
        totalDebits: "0",
        totalCredits: "35080",
      },
      {
        accountId: "e1",
        accountCode: "5010",
        accountName: "Hosting & Infrastructure",
        accountType: "expense",
        totalDebits: "2360",
        totalCredits: "0",
      },
    ];

    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(rows));

    const result = await getProfitAndLoss();

    expect(result.revenue).toHaveLength(1);
    expect(result.revenue[0].accountCode).toBe("4010");
    expect(result.revenue[0].amount).toBe(35080);
    expect(result.totalRevenue).toBe(35080);

    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].accountCode).toBe("5010");
    expect(result.expenses[0].amount).toBe(2360);
    expect(result.totalExpenses).toBe(2360);

    expect(result.netProfit).toBe(35080 - 2360);
  });

  it("excludes void journal entries from P&L amounts", async () => {
    // Simulate: void entry had Cr 4010 R20,500 but it's filtered out
    const rows = [
      {
        accountId: "r1",
        accountCode: "4010",
        accountName: "Sales Revenue",
        accountType: "revenue",
        totalDebits: "0",
        totalCredits: "35080", // only posted revenue, not the void 20,500
      },
    ];

    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(rows));

    const result = await getProfitAndLoss();

    expect(result.revenue).toHaveLength(1);
    expect(result.revenue[0].amount).toBe(35080);
    expect(result.totalRevenue).toBe(35080);
    // Must NOT include void R20,500 → would be R55,580
    expect(result.totalRevenue).not.toBe(55580);
  });

  it("excludes draft entries from P&L", async () => {
    // If only draft entries exist, revenue should be empty
    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain([]));

    const result = await getProfitAndLoss();

    expect(result.revenue).toHaveLength(0);
    expect(result.expenses).toHaveLength(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.netProfit).toBe(0);
  });

  it("applies period filter correctly", async () => {
    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain([]));

    const result = await getProfitAndLoss("2026-04");

    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(0);
  });

  it("only includes revenue and expense account types", async () => {
    const mixedRows = [
      // Asset should be ignored by P&L
      {
        accountId: "a1",
        accountCode: "1010",
        accountName: "Business Cheque Account",
        accountType: "asset",
        totalDebits: "20500",
        totalCredits: "0",
      },
      // Revenue should be included
      {
        accountId: "r1",
        accountCode: "4010",
        accountName: "Sales Revenue",
        accountType: "revenue",
        totalDebits: "0",
        totalCredits: "35080",
      },
      // Expense should be included
      {
        accountId: "e1",
        accountCode: "5010",
        accountName: "Hosting & Infrastructure",
        accountType: "expense",
        totalDebits: "2360",
        totalCredits: "0",
      },
    ];

    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(mixedRows));

    const result = await getProfitAndLoss();

    // Assets excluded
    expect(result.revenue).toHaveLength(1);
    expect(result.expenses).toHaveLength(1);
    expect(result.totalRevenue).toBe(35080);
    expect(result.totalExpenses).toBe(2360);
  });

  // Regression test: void + posted revenue
  it("regression: void revenue does not inflate P&L", async () => {
    // Scenario:
    //   Posted invoice: Cr 4010 Sales Revenue R35,080
    //   Void income:    Dr 1010 Business Cheque Account R20,500
    //                   Cr 4010 Sales Revenue R20,500
    // Expected: Sales Revenue = R35,080 (NOT R55,580)

    const rows = [
      // Asset 1010 - void line excluded, so zero
      {
        accountId: "a1",
        accountCode: "1010",
        accountName: "Business Cheque Account",
        accountType: "asset",
        totalDebits: "0",
        totalCredits: "0",
      },
      // Revenue 4010 - only posted R35,080, void R20,500 excluded
      {
        accountId: "r1",
        accountCode: "4010",
        accountName: "Sales Revenue",
        accountType: "revenue",
        totalDebits: "0",
        totalCredits: "35080",
      },
    ];

    mockSelect.mockReturnValueOnce(mockSubqueryChain({
      accountId: "mock_account_id",
      totalDebits: "mock_total_debits",
      totalCredits: "mock_total_credits",
    }));
    mockSelect.mockReturnValue(mockMainQueryChain(rows));

    const result = await getProfitAndLoss();

    expect(result.revenue).toHaveLength(1);
    expect(result.revenue[0].amount).toBe(35080);
    // Must not be R55,580 (posted + void)
    expect(result.revenue[0].amount).not.toBe(55580);
    expect(result.totalRevenue).toBe(35080);
  });
});
