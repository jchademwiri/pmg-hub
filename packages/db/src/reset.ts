// packages/db/src/reset.ts
// Truncates all table data - preserves schema, tables, and types
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

config({ path: resolve(import.meta.dir, "../.env") });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

console.log("⚠️  Truncating all table data...");

await client.query(`
  truncate table
    snapshots,
    withdrawals,
    leads,
    expenses,
    income,
    clients,
    divisions,
    aws_pricing,
    expense_categories
  restart identity cascade
`);

console.log("✅ All data cleared. Schema intact.");
await client.end();
