// packages/db/src/backfill-accounting.ts
// Backfills journal entries from existing income and expense records.
// Idempotent: skips records that already have a journal entry (checked via sourceId).
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

config({ path: resolve(import.meta.dir, "../.env") });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

// ── Expense category → chart account mapping ─────────────────────────────────
// Case-insensitive substring matching against seeded account names.
const EXPENSE_ACCOUNT_MAP: { keywords: string[]; code: string }[] = [
  { keywords: ["hosting", "infrastructure", "server", "cloud", "domain"], code: "5010" },
  { keywords: ["software", "subscription", "saas", "licence", "license"], code: "5020" },
  { keywords: ["office", "supply", "supplies", "stationery", "printing"], code: "5030" },
  { keywords: ["marketing", "advertising", "ad spend", "promotion"], code: "5040" },
  { keywords: ["professional", "accounting", "legal", "consulting", "consultant"], code: "5050" },
  { keywords: ["telecom", "phone", "internet", "data", "mobile"], code: "5060" },
  { keywords: ["travel", "transport", "fuel", "petrol"], code: "5070" },
  { keywords: ["insurance"], code: "5080" },
  { keywords: ["contractor", "freelance", "sub-contractor"], code: "5090" },
  { keywords: ["utility", "electricity", "water", "municipal"], code: "5100" },
  { keywords: ["bank", "charge", "fee", "processing"], code: "5110" },
  { keywords: ["staff", "salary", "wage", "employee"], code: "5120" },
  { keywords: ["reinvest", "growth", "development"], code: "5130" },
];

function findExpenseAccountCode(category: string): string {
  const lower = category.toLowerCase();
  for (const mapping of EXPENSE_ACCOUNT_MAP) {
    if (mapping.keywords.some((kw) => lower.includes(kw))) {
      return mapping.code;
    }
  }
  return "5140"; // Miscellaneous Expense fallback
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAccountByCode(code: string): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT id FROM chart_accounts WHERE code = $1 LIMIT 1`,
    [code]
  );
  return rows[0]?.id ?? null;
}

async function getExistingEntryCount(sourceTable: string): Promise<number> {
  const { rows } = await client.query(
    `SELECT count(*)::int as c FROM journal_entries WHERE source_table = $1`,
    [sourceTable]
  );
  return rows[0]?.c ?? 0;
}

async function entryExistsForSource(sourceTable: string, sourceId: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM journal_entries WHERE source_table = $1 AND source_id = $2 LIMIT 1`,
    [sourceTable, sourceId]
  );
  return rows.length > 0;
}

async function getNextEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;
  const { rows } = await client.query(
    `SELECT entry_number FROM journal_entries WHERE entry_number LIKE $1 ORDER BY entry_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  if (!rows[0]) return `${prefix}0001`;
  const seq = parseInt(rows[0].entry_number.split("-").pop(), 10) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function ensurePeriod(period: string) {
  const { rows } = await client.query(
    `SELECT 1 FROM accounting_periods WHERE period = $1 LIMIT 1`,
    [period]
  );
  if (rows.length === 0) {
    await client.query(
      `INSERT INTO accounting_periods (period, status) VALUES ($1, 'open')`,
      [period]
    );
  }
}

// ── Backfill Income ──────────────────────────────────────────────────────────

async function backfillIncome() {
  const bankAccountId = await getAccountByCode("1010");
  const revenueAccountId = await getAccountByCode("4010");
  if (!bankAccountId || !revenueAccountId) {
    console.error("❌ Missing chart accounts: Bank (1010) or Sales Revenue (4010). Seed the chart of accounts first.");
    return 0;
  }

  const existingCount = await getExistingEntryCount("income");
  const { rows: incomeRows } = await client.query(
    `SELECT id, date, description, amount FROM income ORDER BY date ASC`
  );

  console.log(`  Found ${incomeRows.length} income records (${existingCount} already have journal entries)`);

  let created = 0;
  let skipped = 0;

  for (const row of incomeRows) {
    if (await entryExistsForSource("income", row.id)) {
      skipped++;
      continue;
    }

    const dateStr = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().slice(0, 10);
    const period = dateStr.slice(0, 7); // YYYY-MM
    const entryNumber = await getNextEntryNumber();
    await ensurePeriod(period);

    const entryResult = await client.query(
      `INSERT INTO journal_entries (entry_number, entry_date, period, description, status, source_module, source_table, source_id, posted_at, posted_by, created_by)
       VALUES ($1, $2, $3, $4, 'posted', 'income', 'income', $5, NOW(), 'system-backfill', 'system-backfill')
       RETURNING id`,
      [entryNumber, dateStr, period, row.description || "Income receipt", row.id]
    );

    const entryId = entryResult.rows[0].id;

    // Dr Bank
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
       VALUES ($1, $2, $3, NULL, $4)`,
      [entryId, bankAccountId, row.amount, row.description || "Cash received"]
    );

    // Cr Sales Revenue
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
       VALUES ($1, $2, NULL, $3, $4)`,
      [entryId, revenueAccountId, row.amount, row.description || "Revenue earned"]
    );

    created++;
  }

  console.log(`  ✅ Income: created ${created} journal entries, skipped ${skipped}`);
  return created;
}

// ── Backfill Expenses ────────────────────────────────────────────────────────

async function backfillExpenses() {
  const bankAccountId = await getAccountByCode("1010");
  if (!bankAccountId) {
    console.error("❌ Missing chart account: Bank (1010). Seed the chart of accounts first.");
    return 0;
  }

  const existingCount = await getExistingEntryCount("expenses");
  const { rows: expenseRows } = await client.query(
    `SELECT id, date, category, description, amount FROM expenses ORDER BY date ASC`
  );

  console.log(`  Found ${expenseRows.length} expense records (${existingCount} already have journal entries)`);

  let created = 0;
  let skipped = 0;

  for (const row of expenseRows) {
    if (await entryExistsForSource("expenses", row.id)) {
      skipped++;
      continue;
    }

    const accountCode = findExpenseAccountCode(row.category);
    const expenseAccountId = await getAccountByCode(accountCode);
    if (!expenseAccountId) {
      console.error(`  ⚠️  No chart account found for code ${accountCode} (category: ${row.category}). Using Miscellaneous.`);
      const fallbackId = await getAccountByCode("5140");
      if (!fallbackId) continue;
      await createExpenseEntry(row, fallbackId, bankAccountId);
    } else {
      await createExpenseEntry(row, expenseAccountId, bankAccountId);
    }
    created++;
  }

  console.log(`  ✅ Expenses: created ${created} journal entries, skipped ${skipped}`);
  return created;
}

async function createExpenseEntry(
  row: { id: string; date: string; category: string; description: string | null; amount: string },
  expenseAccountId: string,
  bankAccountId: string
) {    const dateStr = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().slice(0, 10);
    const period = dateStr.slice(0, 7);
    const entryNumber = await getNextEntryNumber();
    await ensurePeriod(period);

    const desc = row.description || row.category;
    const entryResult = await client.query(
      `INSERT INTO journal_entries (entry_number, entry_date, period, description, status, source_module, source_table, source_id, posted_at, posted_by, created_by)
       VALUES ($1, $2, $3, $4, 'posted', 'expense', 'expenses', $5, NOW(), 'system-backfill', 'system-backfill')
       RETURNING id`,
      [entryNumber, dateStr, period, desc, row.id]
    );

  const entryId = entryResult.rows[0].id;

  // Dr Expense Account
  await client.query(
    `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
     VALUES ($1, $2, $3, NULL, $4)`,
    [entryId, expenseAccountId, row.amount, desc]
  );

  // Cr Bank
  await client.query(
    `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
     VALUES ($1, $2, NULL, $3, $4)`,
    [entryId, bankAccountId, row.amount, desc]
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("📦 Backfilling accounting journal entries from income and expenses...\n");

const incomeEntries = await backfillIncome();
const expenseEntries = await backfillExpenses();

console.log(`\n✅ Backfill complete. Created ${incomeEntries + expenseEntries} journal entries.`);
console.log("   Profit & Loss, Trial Balance, and General Ledger should now show data.");

await client.end();
