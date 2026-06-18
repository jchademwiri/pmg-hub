import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(import.meta.dir, '../.env') });
const pg = (await import('pg')).default;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: true } });
await client.connect();

// Chart of accounts
const accounts = await client.query("SELECT code, name, type, is_posting_account, is_active FROM chart_accounts ORDER BY code");
console.log('=== CHART OF ACCOUNTS ===');
for (const r of accounts.rows) {
  console.log(`${r.code} | ${r.name} | ${r.type} | posting=${r.is_posting_account} | active=${r.is_active}`);
}

// Journal entries summary
const entries = await client.query("SELECT count(*) as c, status FROM journal_entries GROUP BY status");
console.log('\n=== JOURNAL ENTRIES ===');
for (const r of entries.rows) { console.log(`Status: ${r.c} ${r.status}`); }

// Journal lines summary by account
const lines = await client.query("SELECT ca.code, ca.name, ca.type, SUM(COALESCE(jl.debit::numeric,0)) as total_debits, SUM(COALESCE(jl.credit::numeric,0)) as total_credits FROM chart_accounts ca LEFT JOIN journal_lines jl ON jl.account_id = ca.id LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status = 'posted' WHERE ca.is_posting_account = true GROUP BY ca.id, ca.code, ca.name, ca.type ORDER BY ca.code");
console.log('\n=== TRIAL BALANCE DATA ===');
let td = 0, tc = 0;
for (const r of lines.rows) {
  const d = parseFloat(r.total_debits), c = parseFloat(r.total_credits);
  if (d > 0 || c > 0) {
    console.log(`${r.code} ${r.name} (${r.type}): Dr R${d.toFixed(2)} Cr R${c.toFixed(2)}`);
    td += d; tc += c;
  }
}
console.log(`Total Dr: R${td.toFixed(2)} | Total Cr: R${tc.toFixed(2)} | Diff: R${(td - tc).toFixed(2)}`);

// Periods
const periods = await client.query("SELECT period, status FROM accounting_periods ORDER BY period DESC");
console.log('\n=== PERIODS ===');
for (const r of periods.rows) { console.log(`${r.period} - ${r.status}`); }

await client.end();
