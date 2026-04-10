// Feature: mvp-stage2-high-priority, Property 2: getWithdrawalById round-trip

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Use vi.hoisted so mockSelect is available when vi.mock factory runs (hoisted to top)
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock("../src/client", () => ({
  db: {
    select: mockSelect,
  },
}));

import { getWithdrawalById, type WithdrawalRow } from "../src/queries";

/**
 * Build a chainable Drizzle-like select mock for:
 * db.select({...}).from(withdrawals).where(eq(...))
 * Returns the given array as the resolved value.
 */
function mockChainReturning(returnValue: WithdrawalRow[]) {
  const whereMock = vi.fn().mockResolvedValue(returnValue);
  const fromMock = vi.fn().mockReturnValue({ where: whereMock });
  mockSelect.mockReturnValue({ from: fromMock });
  return { fromMock, whereMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Property 2: getWithdrawalById round-trip
// ---------------------------------------------------------------------------

describe("Property 2: getWithdrawalById round-trip", () => {
  it(
    "retrieves the exact row that was inserted when queried by its id",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            date: fc.string({ minLength: 1 }),
            amount: fc.string({ minLength: 1 }),
            description: fc.option(fc.string(), { nil: null }),
          }),
          // Generate a deterministic UUID-like id for the row
          fc.uuid(),
          async ({ date, amount, description }, id) => {
            const row: WithdrawalRow = {
              id,
              date,
              amount,
              description,
              createdAt: null,
            };

            // Mock DB to return the row when queried by its id
            mockChainReturning([row]);

            const result = await getWithdrawalById(id);

            // Assert field equality
            expect(result).not.toBeNull();
            expect(result!.id).toBe(row.id);
            expect(result!.date).toBe(row.date);
            expect(result!.amount).toBe(row.amount);
            expect(result!.description).toBe(row.description);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "returns null for unknown UUIDs that do not match any row",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (unknownId) => {
            // Mock DB to return empty array (no matching row)
            mockChainReturning([]);

            const result = await getWithdrawalById(unknownId);

            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it("returns null when the DB returns an empty result", async () => {
    mockChainReturning([]);
    const result = await getWithdrawalById("00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("returns the row when the DB returns exactly one matching row", async () => {
    const row: WithdrawalRow = {
      id: "00000000-0000-0000-0000-000000000001",
      date: "2025-06-15",
      amount: "500.00",
      description: "Test withdrawal",
      createdAt: new Date("2025-06-15T10:00:00Z"),
    };
    mockChainReturning([row]);
    const result = await getWithdrawalById(row.id);
    expect(result).toEqual(row);
  });
});
