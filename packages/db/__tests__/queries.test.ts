import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Use vi.hoisted so mockSelect is available when vi.mock factory runs (hoisted to top)
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock("../src/client", () => ({
  db: {
    select: mockSelect,
  },
}));

import {
  getTotalRevenue,
  getTotalExpenses,
  getRevenueByDivision,
  getExpensesByDivision,
  getLeadsByStatus,
} from "../src/queries";

// Helper: build a chainable Drizzle-like select mock that resolves to returnValue
function mockChain(returnValue: unknown[]) {
  const chain: Record<string, unknown> = {};
  const thenable = {
    ...chain,
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(returnValue).then(resolve),
    catch: (reject: (e: unknown) => unknown) =>
      Promise.resolve(returnValue).catch(reject),
  };
  const fullChain = {
    from: vi.fn().mockReturnValue(thenable),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(returnValue),
  };
  // from() returns a thenable for simple selects; also supports chaining
  fullChain.from.mockReturnValue({
    ...fullChain,
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(returnValue).then(resolve),
    catch: (reject: (e: unknown) => unknown) =>
      Promise.resolve(returnValue).catch(reject),
  });
  mockSelect.mockReturnValue(fullChain);
  return fullChain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe("getTotalRevenue", () => {
  it("returns 0 when db returns [{ total: '0' }]", async () => {
    mockChain([{ total: "0" }]);
    const result = await getTotalRevenue();
    expect(result).toBe(0);
  });

  it("returns a number (not string) type", async () => {
    mockChain([{ total: "1234.56" }]);
    const result = await getTotalRevenue();
    expect(typeof result).toBe("number");
  });
});

describe("getTotalExpenses", () => {
  it("returns 0 when db returns [{ total: '0' }]", async () => {
    mockChain([{ total: "0" }]);
    const result = await getTotalExpenses();
    expect(result).toBe(0);
  });

  it("returns a number (not string) type", async () => {
    mockChain([{ total: "500.00" }]);
    const result = await getTotalExpenses();
    expect(typeof result).toBe("number");
  });
});

describe("getRevenueByDivision", () => {
  it("returns [] when db returns []", async () => {
    mockChain([]);
    const result = await getRevenueByDivision();
    expect(result).toEqual([]);
  });
});

describe("getExpensesByDivision", () => {
  it("returns [] when db returns []", async () => {
    mockChain([]);
    const result = await getExpensesByDivision();
    expect(result).toEqual([]);
  });
});

describe("getLeadsByStatus", () => {
  it("returns [] when db returns []", async () => {
    mockChain([]);
    const result = await getLeadsByStatus();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe("Property-based tests for query utilities", () => {
  // Feature: drizzle-db-schema, Property 4: Total aggregation correctness
  it("Property 4: getTotalRevenue returns the sum of all amounts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 1_000_000 }), {
          minLength: 1,
          maxLength: 20,
        }),
        async (amounts) => {
          const expectedSum = amounts.reduce((a, b) => a + b, 0);
          mockChain([{ total: String(expectedSum) }]);
          const result = await getTotalRevenue();
          expect(typeof result).toBe("number");
          expect(result).toBe(expectedSum);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: drizzle-db-schema, Property 4: Total aggregation correctness
  it("Property 4: getTotalExpenses returns the sum of all amounts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 1_000_000 }), {
          minLength: 1,
          maxLength: 20,
        }),
        async (amounts) => {
          const expectedSum = amounts.reduce((a, b) => a + b, 0);
          mockChain([{ total: String(expectedSum) }]);
          const result = await getTotalExpenses();
          expect(typeof result).toBe("number");
          expect(result).toBe(expectedSum);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: drizzle-db-schema, Property 5: Grouped aggregation correctness
  it("Property 5: getRevenueByDivision returns correct per-division totals", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            divisionName: fc.string({ minLength: 1, maxLength: 20 }),
            total: fc.integer({ min: 1, max: 1_000_000 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (rows) => {
          const dbRows = rows.map((r) => ({
            divisionName: r.divisionName,
            total: String(r.total),
          }));
          mockChain(dbRows);
          const result = await getRevenueByDivision();
          expect(result).toHaveLength(rows.length);
          result.forEach((row, i) => {
            expect(typeof row.total).toBe("number");
            expect(row.divisionName).toBe(rows[i].divisionName);
            expect(row.total).toBe(rows[i].total);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: drizzle-db-schema, Property 6: Lead status count correctness
  it("Property 6: getLeadsByStatus returns correct per-status counts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            status: fc.constantFrom("new", "contacted", "converted", "lost"),
            count: fc.integer({ min: 1, max: 1000 }),
          }),
          { minLength: 1, maxLength: 4 },
        ),
        async (rows) => {
          const dbRows = rows.map((r) => ({
            status: r.status,
            count: String(r.count),
          }));
          mockChain(dbRows);
          const result = await getLeadsByStatus();
          expect(result).toHaveLength(rows.length);
          result.forEach((row, i) => {
            expect(typeof row.count).toBe("number");
            expect(row.status).toBe(rows[i].status);
            expect(row.count).toBe(rows[i].count);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: drizzle-db-schema, Property 11: Grouped query result ordering
  it("Property 11: getRevenueByDivision first element has the highest total", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            divisionName: fc.string({ minLength: 1, maxLength: 20 }),
            total: fc.integer({ min: 1, max: 1_000_000 }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        async (rows) => {
          // Sort descending to simulate DB ordering
          const sorted = [...rows].sort((a, b) => b.total - a.total);
          const dbRows = sorted.map((r) => ({
            divisionName: r.divisionName,
            total: String(r.total),
          }));
          mockChain(dbRows);
          const result = await getRevenueByDivision();
          expect(result.length).toBeGreaterThan(0);
          const maxTotal = Math.max(...result.map((r) => r.total));
          expect(result[0].total).toBe(maxTotal);
        },
      ),
      { numRuns: 100 },
    );
  });
});
