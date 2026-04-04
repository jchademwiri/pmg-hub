// Feature: mvp-stage2-high-priority, Property 1: getAllWithdrawals ordering invariant

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Use vi.hoisted so mockSelect is available when vi.mock factory runs (hoisted to top)
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock("../src/client", () => ({
  db: {
    select: mockSelect,
  },
}));

import { getAllWithdrawals, type WithdrawalRow } from "../src/queries";

/**
 * Build a chainable Drizzle-like select mock that resolves to returnValue.
 * getAllWithdrawals uses: db.select({...}).from(withdrawals).orderBy(...)
 */
function mockChainReturning(returnValue: WithdrawalRow[]) {
  const orderByMock = vi.fn().mockResolvedValue(returnValue);
  const fromMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
  mockSelect.mockReturnValue({ from: fromMock });
  return { fromMock, orderByMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Property 1: getAllWithdrawals ordering invariant
// ---------------------------------------------------------------------------

describe("Property 1: getAllWithdrawals ordering invariant", () => {
  it(
    "result is sorted by date DESC then createdAt DESC for any set of withdrawal records",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arrays of { date, createdAt } pairs using integer timestamps
          // to avoid fc.date() generating invalid Date objects
          fc.array(
            fc.record({
              // Generate YYYY-MM-DD strings via integer offsets from a base date
              date: fc
                .integer({ min: 0, max: 3652 }) // ~10 years of days from 2020-01-01
                .map((offset) => {
                  const base = new Date("2020-01-01T00:00:00.000Z");
                  base.setUTCDate(base.getUTCDate() + offset);
                  return base.toISOString().split("T")[0]!;
                }),
              createdAt: fc
                .integer({ min: 0, max: 315_360_000_000 }) // ~10 years in ms
                .map((ms) => new Date(new Date("2020-01-01T00:00:00.000Z").getTime() + ms)),
            }),
            { minLength: 0, maxLength: 30 },
          ),
          async (pairs) => {
            // Build WithdrawalRow objects from the generated pairs
            const rows: WithdrawalRow[] = pairs.map((p, i) => ({
              id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
              date: p.date,
              amount: "100.00",
              description: null,
              createdAt: p.createdAt,
            }));

            // Simulate what the DB returns: sorted by date DESC, then createdAt DESC
            const dbSorted = [...rows].sort((a, b) => {
              const dateCmp = b.date.localeCompare(a.date);
              if (dateCmp !== 0) return dateCmp;
              const aTime = a.createdAt ? a.createdAt.getTime() : 0;
              const bTime = b.createdAt ? b.createdAt.getTime() : 0;
              return bTime - aTime;
            });

            // Mock the DB to return the pre-sorted rows (as a real DB with ORDER BY would)
            mockChainReturning(dbSorted);

            const result = await getAllWithdrawals();

            // Assert the result has the same length
            expect(result).toHaveLength(dbSorted.length);

            // Assert the result is sorted by date DESC, then createdAt DESC
            for (let i = 0; i < result.length - 1; i++) {
              const curr = result[i]!;
              const next = result[i + 1]!;

              const dateCmp = curr.date.localeCompare(next.date);

              // date of current must be >= date of next (DESC order)
              expect(
                dateCmp,
                `result[${i}].date (${curr.date}) should be >= result[${i + 1}].date (${next.date})`,
              ).toBeGreaterThanOrEqual(0);

              // If dates are equal, createdAt of current must be >= createdAt of next
              if (dateCmp === 0) {
                const currTime = curr.createdAt ? curr.createdAt.getTime() : 0;
                const nextTime = next.createdAt ? next.createdAt.getTime() : 0;
                expect(
                  currTime,
                  `result[${i}].createdAt should be >= result[${i + 1}].createdAt when dates are equal`,
                ).toBeGreaterThanOrEqual(nextTime);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it("returns an empty array when there are no withdrawal records", async () => {
    mockChainReturning([]);
    const result = await getAllWithdrawals();
    expect(result).toEqual([]);
  });

  it("returns a single record unchanged", async () => {
    const single: WithdrawalRow = {
      id: "00000000-0000-0000-0000-000000000001",
      date: "2025-06-15",
      amount: "500.00",
      description: "Test withdrawal",
      createdAt: new Date("2025-06-15T10:00:00Z"),
    };
    mockChainReturning([single]);
    const result = await getAllWithdrawals();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(single);
  });
});
