// packages/db/src/db-check.ts
// Lightweight connectivity + migration-status health check, used by
// db-health-cron.yml. Exits non-zero only on connection failure - a
// non-empty pending-migration count is reported but does not fail the
// check (that's db-migrate.yml's job, not a health probe's).
import { config } from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';
import { readFileSync } from 'fs';

config({ path: resolve(import.meta.dir, '../.env') });
config({ path: resolve(import.meta.dir, '../../../.env'), override: false });
config({ path: resolve(import.meta.dir, '../../../.env.local'), override: false });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set');

const isLocalHost = /^(postgres:\/\/|postgresql:\/\/)[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocalHost ? false : { rejectUnauthorized: true },
});

const start = Date.now();
await client.connect();

const { rows: pingRows } = await client.query('SELECT 1 AS ok');
if (pingRows[0]?.ok !== 1) throw new Error('Unexpected response to SELECT 1');

const latencyMs = Date.now() - start;
console.log(`✅ Connected (${latencyMs}ms)`);

const { rows: migTableRows } = await client.query<{ exists: boolean }>(`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
  ) AS exists
`);

if (migTableRows[0]?.exists) {
  // Mirrors migrate.ts's own pending-migration check: compare the latest
  // applied timestamp against the latest journal entry, not row counts -
  // a single baseline sentinel row can retroactively cover many migrations,
  // so counting rows understates how much has actually been applied.
  const { rows: latestRows } = await client.query<{ max_ts: string | null }>(
    `SELECT MAX(created_at)::text AS max_ts FROM drizzle.__drizzle_migrations`,
  );
  const latestApplied = parseInt(latestRows[0]?.max_ts ?? '0', 10);

  const journalPath = resolve(import.meta.dir, 'migrations/meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf-8')) as {
    entries: { idx: number; tag: string; when: number }[];
  };
  const latestJournal = Math.max(...journal.entries.map((e) => e.when));

  if (latestApplied >= latestJournal) {
    console.log(`📦 Migrations up to date (latest applied: ${latestApplied}).`);
  } else {
    console.warn(
      `⚠️  Pending migrations detected (latest applied: ${latestApplied}, latest in journal: ${latestJournal}).`,
    );
  }
} else {
  console.warn('⚠️  drizzle.__drizzle_migrations table not found - no baseline yet?');
}

await client.end();
console.log('✅ Database health check passed.');
