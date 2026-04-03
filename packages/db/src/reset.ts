// packages/db/src/reset.ts
// Drops all tables and enums — use with caution
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

config({ path: resolve(import.meta.dir, "../.env") });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

console.log("⚠️  Dropping all tables and types...");

await client.query(`
  drop table if exists
    leads,
    expenses,
    income,
    clients,
    divisions,
    aws_pricing,
    withdrawals
  cascade
`);

await client.query(`drop type if exists aws_package_type, lead_status cascade`);
await client.query(`drop schema if exists drizzle cascade`);

console.log("✅ Database cleared.");
await client.end();
