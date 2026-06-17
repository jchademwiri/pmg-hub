// packages/db/src/backfill-credits.ts
// Backfills existing overpayments as credit_notes

import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

config({ path: resolve(import.meta.dir, "../.env") });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

console.log("🚀 Listing public tables in database...");
try {
  const tablesRes = await client.query("select table_name from information_schema.tables where table_schema = 'public' order by table_name;");
  console.log("Tables found:", tablesRes.rows.map(r => r.table_name).join(", "));
} catch (err) {
  console.error("Failed to list tables:", err);
}

console.log("🚀 Running credit notes backfill for existing overpayments...");

const query = `
  INSERT INTO credit_notes (
    client_id, 
    division_id, 
    document_number, 
    status, 
    type, 
    reason, 
    original_payment_id, 
    amount, 
    amount_remaining, 
    created_by,
    created_at
  )
  SELECT 
    i.client_id,
    i.division_id,
    'CN-BF-' || substring(i.id::text from 1 for 8),
    'active',
    'overpayment',
    'System backfill for overpayment: ' || i.description,
    i.id,
    (i.amount - COALESCE(pa.allocated, 0)),
    (i.amount - COALESCE(pa.allocated, 0)),
    'system-backfill',
    i.created_at
  FROM income i
  LEFT JOIN (
    SELECT income_id, SUM(amount) as allocated 
    FROM payment_allocations 
    GROUP BY income_id
  ) pa ON pa.income_id = i.id
  WHERE (i.amount - COALESCE(pa.allocated, 0)) > 0
    AND NOT EXISTS (
      SELECT 1 FROM credit_notes cn WHERE cn.original_payment_id = i.id
    );
`;

try {
  const res = await client.query(query);
  console.log(`✅ Backfill complete. Inserted ${res.rowCount} new credit note(s).`);
} catch (err) {
  console.error("❌ Backfill failed:", err);
} finally {
  await client.end();
}
