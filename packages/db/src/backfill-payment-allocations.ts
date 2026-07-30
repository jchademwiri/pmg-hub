// packages/db/src/backfill-payment-allocations.ts
//
// One-off remediation for invoices marked paid via markInvoicePaid() before it
// was fixed to also insert a payment_allocations row. Without that row, the
// income created for the payment reads as fully "unallocated" in every
// credit-balance calculation (sum(income) - sum(payment_allocations)),
// permanently inflating the client's displayed credit balance by the invoice
// total.
//
// Usage:
//   bun src/backfill-payment-allocations.ts --dry-run   (default: prints affected rows only)
//   bun src/backfill-payment-allocations.ts --apply     (inserts the missing rows)
//
// Idempotent: re-running after a fix finds nothing (the NOT EXISTS guard means
// already-linked invoices are never touched), and can be safely run multiple
// times.
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

config({ path: resolve(import.meta.dir, "../.env") });
config({ path: resolve(import.meta.dir, "../../../.env"), override: false });
config({ path: resolve(import.meta.dir, "../../../.env.local"), override: false });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const apply = process.argv.includes("--apply");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

type AffectedRow = {
  id: string;
  income_id: string;
  total: string;
  client_id: string | null;
  paid_at: string | null;
};

const { rows } = await client.query<AffectedRow>(`
  select i.id, i.income_id, i.total, i.client_id, i.paid_at
  from invoices i
  where i.status = 'paid'
    and i.income_id is not null
    and not exists (
      select 1 from payment_allocations pa
      where pa.income_id = i.income_id and pa.invoice_id = i.id
    )
  order by i.paid_at asc nulls last
`);

if (rows.length === 0) {
  console.log("No affected invoices found — nothing to backfill.");
  await client.end();
  process.exit(0);
}

console.log(`Found ${rows.length} paid invoice(s) missing a payment_allocations row:\n`);

// Group by client to show the credit-balance delta this backfill will correct.
const byClient = new Map<string, { count: number; total: number }>();
for (const row of rows) {
  const key = row.client_id ?? "(no client)";
  const entry = byClient.get(key) ?? { count: 0, total: 0 };
  entry.count += 1;
  entry.total += Number(row.total);
  byClient.set(key, entry);
}

for (const [clientId, { count, total }] of byClient) {
  console.log(
    `  client ${clientId}: ${count} invoice(s), phantom credit reduced by R${total.toFixed(2)}`,
  );
}

if (!apply) {
  console.log("\nDry run only — no changes made. Re-run with --apply to insert the missing rows.");
  await client.end();
  process.exit(0);
}

console.log("\nApplying fix...");

let inserted = 0;
for (const row of rows) {
  await client.query("begin");
  try {
    // Re-check under the transaction in case of concurrent normal traffic
    // creating this allocation between the select above and now.
    const { rows: exists } = await client.query(
      `select 1 from payment_allocations where income_id = $1 and invoice_id = $2`,
      [row.income_id, row.id],
    );
    if (exists.length === 0) {
      await client.query(
        `insert into payment_allocations (income_id, invoice_id, amount) values ($1, $2, $3)`,
        [row.income_id, row.id, row.total],
      );
      inserted += 1;
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    console.error(`Failed to backfill invoice ${row.id}:`, err);
  }
}

console.log(`\nDone. Inserted ${inserted} payment_allocations row(s).`);
await client.end();
