// packages/db/src/cleanup-synthetic-credit-income.ts
//
// One-off remediation for the credit-note double-counting bug: applying a
// credit note used to create a synthetic `income` row + `payment_allocations`
// row (marked with description "Credit applied to...") in addition to the
// real `creditApplications` row. Any query summing payment_allocations and
// creditApplications together for the same invoice/client (e.g.
// getAllInvoices' allocatedAmount, getClientStatement's totalOutstanding)
// double-counted every credit application as a result.
//
// The code that created these synthetic rows has been removed. This script
// deletes the historical rows it already created, so downstream totals are
// correct going forward. Deleting them is safe: an invoice's `status` field
// was always set from payment_allocations + creditApplications totals BEFORE
// the synthetic row existed (it was inserted last), so no invoice's status
// depends on it. The invoices table's own `incomeId` FK is never pointed at
// these rows either (only markInvoicePaid sets that, for direct cash
// payments) — so deleting them can't orphan any invoice reference.
//
// Usage:
//   bun src/cleanup-synthetic-credit-income.ts --dry-run   (default)
//   bun src/cleanup-synthetic-credit-income.ts --apply
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

type SyntheticRow = {
  income_id: string;
  invoice_id: string;
  amount: string;
  client_id: string | null;
};

const { rows } = await client.query<SyntheticRow>(`
  select i.id as income_id, pa.invoice_id, pa.amount, i.client_id
  from income i
  join payment_allocations pa on pa.income_id = i.id
  where i.description like 'Credit applied to%'
  order by i.date asc
`);

if (rows.length === 0) {
  console.log("No synthetic credit-application income rows found — nothing to clean up.");
  await client.end();
  process.exit(0);
}

console.log(`Found ${rows.length} synthetic income/payment_allocations pair(s) to remove:\n`);

const byClient = new Map<string, { count: number; total: number }>();
for (const row of rows) {
  const key = row.client_id ?? "(no client)";
  const entry = byClient.get(key) ?? { count: 0, total: 0 };
  entry.count += 1;
  entry.total += Number(row.amount);
  byClient.set(key, entry);
}

for (const [clientId, { count, total }] of byClient) {
  console.log(
    `  client ${clientId}: ${count} row(s), R${total.toFixed(2)} of double-counted credit will be corrected`,
  );
}

if (!apply) {
  console.log("\nDry run only — no changes made. Re-run with --apply to delete these rows.");
  await client.end();
  process.exit(0);
}

console.log("\nApplying cleanup...");

let deleted = 0;
for (const row of rows) {
  await client.query("begin");
  try {
    await client.query(`delete from payment_allocations where income_id = $1`, [row.income_id]);
    await client.query(`delete from income where id = $1`, [row.income_id]);
    await client.query("commit");
    deleted += 1;
  } catch (err) {
    await client.query("rollback");
    console.error(`Failed to clean up income row ${row.income_id}:`, err);
  }
}

console.log(`\nDone. Removed ${deleted} synthetic income/payment_allocations pair(s).`);
await client.end();
