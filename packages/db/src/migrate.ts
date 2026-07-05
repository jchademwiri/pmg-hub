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
// Check if the drizzle migrations table exists and has any rows.
const { rows: tableRows } = await client.query<{ exists: boolean }>(`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'drizzle'
      AND table_name = '__drizzle_migrations'
  ) AS exists
`);

const migrationsTableExists = tableRows[0]?.exists === true;

let appliedCount = 0;
if (migrationsTableExists) {
  const { rows: countRows } = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations`
  );
  appliedCount = parseInt(countRows[0]?.count ?? "0", 10);
}

// If no migration history exists but the DB already has the schema (indicated by
// the presence of the account_type enum which is created in migration 0000),
// we seed the migrations table with all known migrations so Drizzle treats them
// as already applied.
if (appliedCount === 0) {
  const { rows: schemaRows } = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM pg_type
      WHERE typname = 'account_type' AND typtype = 'e'
    ) AS exists
  `);

  const schemaAlreadyExists = schemaRows[0]?.exists === true;

  if (schemaAlreadyExists) {
    console.log("⚡ Schema already exists but no migration history found.");
    console.log("   Baselining all existing migrations as applied...");

    // Ensure the drizzle schema and migrations table exist.
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `);

    // Read the journal to get all migration tags and timestamps.
    const journalPath = resolve(import.meta.dir, "migrations/meta/_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as {
      entries: { idx: number; tag: string; when: number }[];
    };

    for (const entry of journal.entries) {
      // Compute the hash the same way Drizzle does: SHA-256 of the migration SQL file.
      const sqlPath = resolve(import.meta.dir, `migrations/${entry.tag}.sql`);
      let sqlContent: string;
      try {
        sqlContent = readFileSync(sqlPath, "utf-8");
      } catch {
        console.warn(`   Warning: could not read ${entry.tag}.sql — skipping.`);
        continue;
      }

      // Drizzle uses a simple string hash of the file content for deduplication.
      // We insert using the file content hash (same algo as drizzle-orm migrator).
      const crypto = await import("crypto");
      const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [hash, entry.when]
      );
    }

    console.log(`   ✅ Baselined ${journal.entries.length} migrations.`);
  }
}
// ── End baseline detection ────────────────────────────────────────────────────

const db = drizzle(client);

console.log("🚀 Running migrations...");

await migrate(db, { migrationsFolder: resolve(import.meta.dir, "migrations") });

console.log("✅ Migrations applied.");
await client.end();
