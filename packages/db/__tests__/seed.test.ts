import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

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

// ---------------------------------------------------------------------------
// Integration Tests: Seed idempotency against a real database
// Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from packages/db/.env
config({ path: resolve(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const hasDb = Boolean(DB_URL);

/**
 * Run the seed script as a subprocess using bun.
 * Returns { exitCode, stderr, stdout }.
 */
function runSeed(): { exitCode: number | null; stdout: string; stderr: string } {
  const seedPath = resolve(__dirname, "../src/seed.ts");
  const result = spawnSync("bun", ["run", seedPath], {
    cwd: resolve(__dirname, ".."),
    encoding: "utf-8",
    timeout: 120_000, // 2 minutes — seed does a lot of DB work
    env: { ...process.env },
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Create a direct pg + drizzle connection for querying after seed.
 */
async function createTestDb() {
  const client = new pg.Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const db = drizzle(client);
  return { client, db };
}

describe.skipIf(!hasDb)("Integration: seed idempotency (real database)", () => {
  // Run seed once before all integration assertions
  // We run it here so the describe block can share the connection
  it("seed runs without error on first execution", () => {
    const { exitCode, stderr } = runSeed();
    // Print stderr for debugging if it fails
    if (exitCode !== 0) {
      console.error("Seed stderr:", stderr);
    }
    expect(exitCode).toBe(0);
  }, 120_000); // 2 minute timeout

  it("expenses table covers ≥ 3 distinct divisionId values after seed", async () => {
    const { client, db } = await createTestDb();
    try {
      const result = await db.execute(
        sql`SELECT COUNT(DISTINCT division_id) AS cnt FROM expenses`
      );
      const cnt = Number((result.rows[0] as { cnt: string }).cnt);
      expect(cnt).toBeGreaterThanOrEqual(3);
    } finally {
      await client.end();
    }
  }, 30_000);

  it("expenses table covers ≥ 3 distinct category values after seed", async () => {
    const { client, db } = await createTestDb();
    try {
      const result = await db.execute(
        sql`SELECT COUNT(DISTINCT category) AS cnt FROM expenses`
      );
      const cnt = Number((result.rows[0] as { cnt: string }).cnt);
      expect(cnt).toBeGreaterThanOrEqual(3);
    } finally {
      await client.end();
    }
  }, 30_000);

  it("leads table contains all four statuses after seed", async () => {
    const { client, db } = await createTestDb();
    try {
      const result = await db.execute(
        sql`SELECT DISTINCT status FROM leads ORDER BY status`
      );
      const statuses = (result.rows as { status: string }[]).map((r) => r.status);
      expect(statuses).toContain("new");
      expect(statuses).toContain("contacted");
      expect(statuses).toContain("converted");
      expect(statuses).toContain("lost");
    } finally {
      await client.end();
    }
  }, 30_000);

  it("snapshots table has ≥ 1 row with valid numeric fields after seed", async () => {
    const { client, db } = await createTestDb();
    try {
      const result = await db.execute(
        sql`SELECT revenue, expenses, pmg_share, profit_pool, salary, reinvest, reserve, flex FROM snapshots LIMIT 1`
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      const row = result.rows[0] as {
        revenue: string;
        expenses: string;
        pmg_share: string;
        profit_pool: string;
        salary: string;
        reinvest: string;
        reserve: string;
        flex: string;
      };
      // All numeric fields must be finite numbers
      for (const field of [
        row.revenue, row.expenses, row.pmg_share, row.profit_pool,
        row.salary, row.reinvest, row.reserve, row.flex,
      ]) {
        expect(isFinite(Number(field))).toBe(true);
      }
    } finally {
      await client.end();
    }
  }, 30_000);

  it("seed is idempotent: row counts unchanged after running a second time", async () => {
    // Capture row counts after first seed (already run above)
    const { client: c1, db: db1 } = await createTestDb();
    let expensesBefore: number;
    let leadsBefore: number;
    let snapshotsBefore: number;
    try {
      const [expR, leadR, snapR] = await Promise.all([
        db1.execute(sql`SELECT COUNT(*) AS cnt FROM expenses`),
        db1.execute(sql`SELECT COUNT(*) AS cnt FROM leads`),
        db1.execute(sql`SELECT COUNT(*) AS cnt FROM snapshots`),
      ]);
      expensesBefore = Number((expR.rows[0] as { cnt: string }).cnt);
      leadsBefore = Number((leadR.rows[0] as { cnt: string }).cnt);
      snapshotsBefore = Number((snapR.rows[0] as { cnt: string }).cnt);
    } finally {
      await c1.end();
    }

    // Run seed a second time
    const { exitCode, stderr } = runSeed();
    if (exitCode !== 0) {
      console.error("Second seed run stderr:", stderr);
    }
    expect(exitCode).toBe(0);

    // Assert row counts are unchanged
    const { client: c2, db: db2 } = await createTestDb();
    try {
      const [expR2, leadR2, snapR2] = await Promise.all([
        db2.execute(sql`SELECT COUNT(*) AS cnt FROM expenses`),
        db2.execute(sql`SELECT COUNT(*) AS cnt FROM leads`),
        db2.execute(sql`SELECT COUNT(*) AS cnt FROM snapshots`),
      ]);
      const expensesAfter = Number((expR2.rows[0] as { cnt: string }).cnt);
      const leadsAfter = Number((leadR2.rows[0] as { cnt: string }).cnt);
      const snapshotsAfter = Number((snapR2.rows[0] as { cnt: string }).cnt);

      expect(expensesAfter).toBe(expensesBefore);
      expect(leadsAfter).toBe(leadsBefore);
      expect(snapshotsAfter).toBe(snapshotsBefore);
    } finally {
      await c2.end();
    }
  }, 120_000); // 2 minute timeout — seed runs take ~8s each
});
