// packages/db/src/migrate.ts
// Applies all pending migrations using drizzle-orm directly.
// Includes baseline detection: if the DB already has the schema but no migration
// history (e.g. a Neon branch or db:push setup), we seed the migrations table so
// Drizzle only runs genuinely new migrations going forward.
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync } from "fs";

// Try packages/db/.env first, then fall back to the monorepo root .env / .env.local.
// In CI, DATABASE_URL_UNPOOLED is injected via GitHub Secrets so dotenv is a no-op.
config({ path: resolve(import.meta.dir, "../.env") });
config({ path: resolve(import.meta.dir, "../../../.env"), override: false });
config({ path: resolve(import.meta.dir, "../../../.env.local"), override: false });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

// ── Baseline detection ────────────────────────────────────────────────────────
// Drizzle's migrate() compares the `created_at` (timestamp) of the LAST record
// in drizzle.__drizzle_migrations against each migration's `folderMillis`. Any
// migration with folderMillis > lastDbMigration.created_at is treated as pending.
//
// Strategy: if the DB already has the schema (detected via the `account_type` enum
// from migration 0000) but no valid baseline exists yet, we ensure a sentinel row
// exists with the timestamp of the LATEST known migration. This causes Drizzle to
// skip all migrations up to and including that point, and only apply genuinely new
// ones added in future.

// Read the journal to get the latest known migration timestamp.
const journalPath = resolve(import.meta.dir, "migrations/meta/_journal.json");
const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as {
  entries: { idx: number; tag: string; when: number }[];
};
const latestWhen = Math.max(...journal.entries.map((e) => e.when));

// Check if schema already exists (migration 0000 creates the account_type enum).
const { rows: schemaRows } = await client.query<{ exists: boolean }>(`
  SELECT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'account_type' AND typtype = 'e'
  ) AS exists
`);
const schemaAlreadyExists = schemaRows[0]?.exists === true;

if (schemaAlreadyExists) {
  // Ensure the drizzle schema and migrations table exist.
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);

  // Check if the table already has a record covering the latest migration.
  const { rows: latestRows } = await client.query<{ max_ts: string | null }>(
    `SELECT MAX(created_at)::text AS max_ts FROM drizzle.__drizzle_migrations`
  );
  const currentLatest = parseInt(latestRows[0]?.max_ts ?? "0", 10);

  if (currentLatest === 0) {
    console.log("⚡ Schema exists but no migration history found. Inserting baseline sentinel...");
    // Insert a sentinel row with the latest migration timestamp.
    // Drizzle will see this as the "last applied" migration and skip everything up to it.
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      ["baseline-sentinel", latestWhen]
    );
    console.log(`   ✅ Baseline sentinel inserted (up to timestamp ${latestWhen}).`);
  } else if (currentLatest < latestWhen) {
    console.log(`⚡ Pending migrations detected (history: ${currentLatest}, latest: ${latestWhen}).`);
  } else {
    console.log(`✓ Migration history is up to date (latest: ${currentLatest}).`);
  }
}
// ── End baseline detection ────────────────────────────────────────────────────

const db = drizzle(client);

console.log("🚀 Running migrations...");

await migrate(db, { migrationsFolder: resolve(import.meta.dir, "migrations") });

console.log("✅ Migrations applied.");
await client.end();
