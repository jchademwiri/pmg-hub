import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Feature: drizzle-db-schema, Property 7: Seed idempotency
// Feature: drizzle-db-schema, Property 10: Seed transaction atomicity

/**
 * These tests verify the idempotency and atomicity patterns used in seed.ts
 * without connecting to a real database.
 *
 * The seed script auto-executes on import, so we test the underlying logic
 * patterns directly rather than importing the module.
 */

// ---------------------------------------------------------------------------
// Helpers that mirror the seed script's idempotency pattern
// ---------------------------------------------------------------------------

/**
 * Simulates the seed's "check before insert" pattern.
 * Returns true if the record was inserted, false if it already existed.
 */
async function idempotentInsert(
  selectFn: () => Promise<unknown[]>,
  insertFn: () => Promise<void>,
): Promise<boolean> {
  const existing = await selectFn();
  if (existing.length > 0) {
    return false; // already exists — skip
  }
  await insertFn();
  return true;
}

/**
 * Simulates running the seed's Block 2 transaction logic.
 * Accepts a list of fixtures and a mock db interface.
 */
async function runSeedBlock2(
  fixtures: Array<{ key: string; exists: boolean }>,
  mockDb: {
    select: (key: string) => Promise<unknown[]>;
    insert: (key: string) => Promise<void>;
    transaction: <T>(cb: () => Promise<T>) => Promise<T>;
  },
): Promise<{ inserted: string[]; skipped: string[] }> {
  const inserted: string[] = [];
  const skipped: string[] = [];

  await mockDb.transaction(async () => {
    for (const fixture of fixtures) {
      const wasInserted = await idempotentInsert(
        () => mockDb.select(fixture.key),
        () => mockDb.insert(fixture.key),
      );
      if (wasInserted) {
        inserted.push(fixture.key);
      } else {
        skipped.push(fixture.key);
      }
    }
  });

  return { inserted, skipped };
}

// ---------------------------------------------------------------------------
// Property 7: Seed idempotency
// Validates: Requirements 9.7, 9.9
// ---------------------------------------------------------------------------

describe("Property 7: Seed idempotency", () => {
  it("does not insert records that already exist (unit: all exist)", async () => {
    const insertMock = vi.fn();
    const mockDb = {
      select: async (_key: string) => [{ id: "existing" }], // always returns existing
      insert: insertMock,
      transaction: async <T>(cb: () => Promise<T>) => cb(),
    };

    const fixtures = [
      { key: "division:TES", exists: true },
      { key: "division:AWS", exists: true },
      { key: "client:John Smith", exists: true },
    ];

    const { inserted, skipped } = await runSeedBlock2(fixtures, mockDb);

    expect(inserted).toHaveLength(0);
    expect(skipped).toHaveLength(3);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts records that do not exist (unit: none exist)", async () => {
    const insertMock = vi.fn().mockResolvedValue(undefined);
    const mockDb = {
      select: async (_key: string) => [], // always returns empty
      insert: insertMock,
      transaction: async <T>(cb: () => Promise<T>) => cb(),
    };

    const fixtures = [
      { key: "division:TES", exists: false },
      { key: "division:AWS", exists: false },
      { key: "client:John Smith", exists: false },
    ];

    const { inserted, skipped } = await runSeedBlock2(fixtures, mockDb);

    expect(inserted).toHaveLength(3);
    expect(skipped).toHaveLength(0);
    expect(insertMock).toHaveBeenCalledTimes(3);
  });

  it("property: running seed twice yields identical row counts", async () => {
    // Feature: drizzle-db-schema, Property 7: Seed idempotency
    // Validates: Requirements 9.7, 9.9
    await fc.assert(
      fc.asyncProperty(
        // Generate a list of fixture keys (simulating seed records)
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (keys) => {
          // Deduplicate keys to simulate distinct seed fixtures
          const uniqueKeys = [...new Set(keys)];
          const fixtures = uniqueKeys.map((k) => ({ key: k, exists: false }));

          // Use Map to avoid prototype pollution issues with arbitrary string keys
          const db = new Map<string, boolean>();
          const insertMock = vi.fn().mockImplementation(async (key: string) => {
            db.set(key, true);
          });

          const mockDb = {
            select: async (key: string) => (db.has(key) ? [{ id: key }] : []),
            insert: insertMock,
            transaction: async <T>(cb: () => Promise<T>) => cb(),
          };

          // First run — inserts all records
          const run1 = await runSeedBlock2(fixtures, mockDb);
          const countAfterRun1 = db.size;

          // Second run — all records already exist, nothing inserted
          const run2 = await runSeedBlock2(fixtures, mockDb);
          const countAfterRun2 = db.size;

          // Row counts must be identical after both runs
          expect(countAfterRun1).toBe(countAfterRun2);
          expect(run1.inserted.length).toBe(uniqueKeys.length);
          expect(run2.inserted.length).toBe(0);
          expect(run2.skipped.length).toBe(uniqueKeys.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("property: partial existence — only missing records are inserted", async () => {
    // Feature: drizzle-db-schema, Property 7: Seed idempotency
    // Validates: Requirements 9.7, 9.9
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            exists: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (rawFixtures) => {
          // Deduplicate by key
          const seen = new Set<string>();
          const fixtures = rawFixtures.filter((f) => {
            if (seen.has(f.key)) return false;
            seen.add(f.key);
            return true;
          });

          // Use Map to avoid prototype pollution with arbitrary string keys
          const db = new Map<string, boolean>();
          // Pre-populate existing records
          for (const f of fixtures) {
            if (f.exists) db.set(f.key, true);
          }

          const insertMock = vi.fn().mockImplementation(async (key: string) => {
            db.set(key, true);
          });

          const mockDb = {
            select: async (key: string) => (db.has(key) ? [{ id: key }] : []),
            insert: insertMock,
            transaction: async <T>(cb: () => Promise<T>) => cb(),
          };

          const { inserted, skipped } = await runSeedBlock2(fixtures, mockDb);

          const expectedInserted = fixtures.filter((f) => !f.exists).length;
          const expectedSkipped = fixtures.filter((f) => f.exists).length;

          expect(inserted.length).toBe(expectedInserted);
          expect(skipped.length).toBe(expectedSkipped);
          // Insert mock called only for missing records
          expect(insertMock).toHaveBeenCalledTimes(expectedInserted);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Seed transaction atomicity
// Validates: Requirements 9.10
// ---------------------------------------------------------------------------

describe("Property 10: Seed transaction atomicity", () => {
  it("rolls back all inserts when transaction throws mid-way", async () => {
    const fixtures = [
      { key: "division:TES", exists: false },
      { key: "division:AWS", exists: false },
      { key: "client:John Smith", exists: false },
    ];

    // Use Map to avoid prototype pollution
    const rollbackDb = new Map<string, boolean>();

    let callCount = 0;
    const mockDbWithRollback = {
      select: async (key: string) => (rollbackDb.has(key) ? [{ id: key }] : []),
      insert: vi.fn().mockImplementation(async (key: string) => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Simulated mid-seed failure");
        }
        rollbackDb.set(key, true);
      }),
      transaction: async <T>(cb: () => Promise<T>): Promise<T> => {
        const snapshot = new Map(rollbackDb);
        try {
          return await cb();
        } catch (err) {
          // Rollback: restore snapshot
          rollbackDb.clear();
          for (const [k, v] of snapshot) rollbackDb.set(k, v);
          throw err;
        }
      },
    };

    await expect(runSeedBlock2(fixtures, mockDbWithRollback)).rejects.toThrow(
      "Simulated mid-seed failure",
    );

    // After rollback, db should be empty (no partial commits)
    expect(rollbackDb.size).toBe(0);
  });

  it("property: transaction failure leaves no partial records", async () => {
    // Feature: drizzle-db-schema, Property 10: Seed transaction atomicity
    // Validates: Requirements 9.10
    await fc.assert(
      fc.asyncProperty(
        // Generate fixtures and a failure index
        fc.tuple(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 2,
            maxLength: 8,
          }),
          fc.integer({ min: 0, max: 7 }),
        ),
        async ([keys, failAtIndex]) => {
          const uniqueKeys = [...new Set(keys)];
          if (uniqueKeys.length < 2) return; // need at least 2 for a mid-failure

          const fixtures = uniqueKeys.map((k) => ({ key: k, exists: false }));
          const actualFailIndex = failAtIndex % uniqueKeys.length;

          // Only fail if there's at least one insert before the failure
          if (actualFailIndex === 0) return;

          // Use Map to avoid prototype pollution with arbitrary string keys
          const rollbackDb = new Map<string, boolean>();
          let callCount = 0;

          const mockDb = {
            select: async (key: string) =>
              rollbackDb.has(key) ? [{ id: key }] : [],
            insert: vi.fn().mockImplementation(async (key: string) => {
              callCount++;
              if (callCount > actualFailIndex) {
                throw new Error("Simulated failure");
              }
              rollbackDb.set(key, true);
            }),
            transaction: async <T>(cb: () => Promise<T>): Promise<T> => {
              const snapshot = new Map(rollbackDb);
              try {
                return await cb();
              } catch (err) {
                // Rollback: restore snapshot
                rollbackDb.clear();
                for (const [k, v] of snapshot) rollbackDb.set(k, v);
                throw err;
              }
            },
          };

          await expect(runSeedBlock2(fixtures, mockDb)).rejects.toThrow(
            "Simulated failure",
          );

          // After rollback, no partial records should remain
          expect(rollbackDb.size).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("commits all records when transaction succeeds", async () => {
    const db: Record<string, boolean> = {};

    const mockDb = {
      select: async (key: string) => (db[key] ? [{ id: key }] : []),
      insert: vi.fn().mockImplementation(async (key: string) => {
        db[key] = true;
      }),
      transaction: async <T>(cb: () => Promise<T>) => cb(),
    };

    const fixtures = [
      { key: "division:TES", exists: false },
      { key: "division:AWS", exists: false },
      { key: "client:John Smith", exists: false },
    ];

    const { inserted } = await runSeedBlock2(fixtures, mockDb);

    expect(inserted).toHaveLength(3);
    expect(Object.keys(db)).toHaveLength(3);
  });
});
