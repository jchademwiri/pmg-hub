// packages/db/src/backfill-accrual-ar.ts
// ──────────────────────────────────────────────────────────────────────────────
// Backfills accrual-basis journal entries from existing invoices, payments,
// and expenses.
//
// ALIGNED WITH: pmg-hub-phase8-ar-journal-posting-plan.md (Phase F, §8)
//
// This script is idempotent: it skips any record that already has a
// journal entry (checked via source_module + source_table + source_id).
//
// PHASE A PRE-FLIGHT:
//   Voids any old cash-basis entries (source_table = 'income') that were
//   created by the prior backfill-accounting.ts script, so revenue is
//   not counted twice under two different models.
//
// ACCRUAL ENTRIES CREATED:
//
//   For each ISSUED / OVERDUE / PARTIALLY_PAID / PAID invoice:
//     Dr Accounts Receivable (1100)  = invoice.total
//     Cr <division revenue>          = invoice.total
//     (division revenue resolved via resolveRevenueAccount)
//
//   For each INCOME record (payment):
//     Entry 1 — Cash receipt:
//       Dr Business Cheque Account (1010)  = payment.amount
//       Cr Accounts Receivable (1100)      = sum(allocations for this payment)
//       Cr Client Credits (2200)           = unallocated remainder (if any)
//     Entry 2 — PMG Share transfer:
//       Dr Savings Account (1020)          = amount × pmg_share rate
//       Cr Business Cheque Account (1010)  = amount × pmg_share rate
//     The pmg_share rate is fetched via getActiveRates(payment.date)
//     to honour effective-dated rates (§6.3 of master plan).
//
//   Expenses are OUT OF SCOPE — handled by existing backfill-accounting.ts.
//
// ──────────────────────────────────────────────────────────────────────────────

import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

config({ path: resolve(import.meta.dir, "../.env") });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

// ── Account Code Constants ───────────────────────────────────────────────────
const BANK_ACCOUNT_CODE = "1010";          // Business Cheque Account
const SAVINGS_ACCOUNT_CODE = "1020";      // Savings Account (PMG Share target)
const ACCOUNTS_RECEIVABLE_CODE = "1100";  // Accounts Receivable
const CLIENT_CREDITS_CODE = "2200";       // Client Credits (overpayment)
const SALES_REVENUE_CODE = "4010";        // Sales Revenue (legacy catch-all)

// Default PMG share rate (fallback when no distribution_settings row exists)
const DEFAULT_PMG_SHARE_RATE = 0.25;

// ── Division → Revenue Account Mapping ───────────────────────────────────────
// Uses substring matching against division.name (same convention as
// billing-payments.ts and email-delivery.ts for Resend API key selection).
//
// When 4011/4012/4013 are seeded (Phase B), update these codes:
//   TES  → 4011
//   AWS  → 4012
//   PMG  → 4013
// For now, all divisions map to 4010 (legacy catch-all).

function resolveRevenueAccountCode(divisionName: string | null): string {
  if (!divisionName) return SALES_REVENUE_CODE;
  const n = divisionName.toLowerCase();
  // Uncomment when 4011/4012/4013 are seeded:
  // if (n.includes("tender")) return "4011";
  // if (n.includes("apex"))   return "4012";
  // return "4013";
  return SALES_REVENUE_CODE;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAccountByCode(code: string): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT id FROM chart_accounts WHERE code = $1 LIMIT 1`,
    [code]
  );
  return rows[0]?.id ?? null;
}

async function entryExistsForSource(
  sourceModule: string,
  sourceTable: string,
  sourceId: string
): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM journal_entries WHERE source_module = $1 AND source_table = $2 AND source_id = $3 LIMIT 1`,
    [sourceModule, sourceTable, sourceId]
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

function toDateStr(dateVal: any): string {
  if (typeof dateVal === "string") return dateVal.slice(0, 10);
  return new Date(dateVal).toISOString().slice(0, 10);
}

/**
 * Fetches the active pmg_share rate as of a given date from
 * distribution_settings. Falls back to DEFAULT_PMG_SHARE_RATE if the
 * table doesn't exist or has no matching row.
 */
async function getPmgShareRate(asOfDate: string): Promise<number> {
  try {
    const { rows } = await client.query(
      `SELECT rate_value::numeric AS rate
       FROM distribution_settings
       WHERE rate_key = 'pmg_share'
         AND is_active = true
         AND effective_from <= $1::date
         AND (effective_to IS NULL OR effective_to >= $1::date)
       ORDER BY effective_from DESC
       LIMIT 1`,
      [asOfDate]
    );
    if (rows[0]?.rate) return parseFloat(rows[0].rate);
  } catch {
    // Table may not exist yet — fall back to default
  }
  return DEFAULT_PMG_SHARE_RATE;
}

// ── Phase A: Pre-flight — Void Old Cash-Basis Entries ────────────────────────

async function voidOldCashBasisEntries(): Promise<number> {
  // Check if the old backfill-accounting.ts was ever run
  const { rows: oldEntries } = await client.query(
    `SELECT id, status FROM journal_entries
     WHERE source_table = 'income' AND source_module = 'income'`
  );

  if (oldEntries.length === 0) {
    console.log("  No old cash-basis income entries found — nothing to void.");
    return 0;
  }

  let voided = 0;
  for (const entry of oldEntries) {
    if (entry.status === "void") continue;
    await client.query(
      `UPDATE journal_entries
       SET status = 'void',
           voided_at = NOW(),
           voided_by = 'system-backfill-accrual',
           void_reason = 'Superseded by accrual-basis Phase 8 revision',
           updated_at = NOW()
       WHERE id = $1`,
      [entry.id]
    );
    voided++;
  }

  console.log(`  ✅ Voided ${voided} old cash-basis income entries`);
  return voided;
}

// ── Backfill Invoices: Dr AR / Cr Division Revenue ──────────────────────────

async function backfillInvoices(): Promise<number> {
  const arAccountId = await getAccountByCode(ACCOUNTS_RECEIVABLE_CODE);
  if (!arAccountId) {
    console.error(`❌ Missing chart account: AR (${ACCOUNTS_RECEIVABLE_CODE}). Seed the chart of accounts first.`);
    return 0;
  }

  const { rows: invoices } = await client.query(
    `SELECT i.id, i.invoice_date, i.document_number, i.total, i.status, i.division_id,
            d.name AS division_name
     FROM invoices i
     LEFT JOIN divisions d ON i.division_id = d.id
     WHERE i.status IN ('issued', 'overdue', 'partially_paid', 'paid')
     ORDER BY i.invoice_date ASC`
  );

  console.log(`  Found ${invoices.length} issued/paid invoices to backfill`);

  let created = 0;
  let skipped = 0;

  for (const inv of invoices) {
    if (await entryExistsForSource("billing", "invoices", inv.id)) {
      skipped++;
      continue;
    }

    const dateStr = toDateStr(inv.invoice_date);
    const period = dateStr.slice(0, 7);
    const revenueCode = resolveRevenueAccountCode(inv.division_name);
    const revenueAccountId = await getAccountByCode(revenueCode);

    if (!revenueAccountId) {
      console.error(`  ⚠️  No chart account for code ${revenueCode} (division: ${inv.division_name}). Skipping invoice ${inv.document_number}.`);
      continue;
    }

    const entryNumber = await getNextEntryNumber();
    await ensurePeriod(period);

    const entryResult = await client.query(
      `INSERT INTO journal_entries
         (entry_number, entry_date, period, description, status,
          source_module, source_table, source_id,
          posted_at, posted_by, created_by)
       VALUES ($1, $2, $3, $4, 'posted', 'billing', 'invoices', $5,
               NOW(), 'system-backfill', 'system-backfill')
       RETURNING id`,
      [entryNumber, dateStr, period, `Invoice ${inv.document_number} (backfill)`, inv.id]
    );

    const entryId = entryResult.rows[0].id;

    // Dr Accounts Receivable
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
       VALUES ($1, $2, $3, NULL, $4)`,
      [entryId, arAccountId, inv.total, `AR – Invoice ${inv.document_number}`]
    );

    // Cr Division Revenue
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
       VALUES ($1, $2, NULL, $3, $4)`,
      [entryId, revenueAccountId, inv.total, `Revenue – Invoice ${inv.document_number}`]
    );

    created++;
  }

  console.log(`  ✅ Invoices: created ${created} journal entries, skipped ${skipped}`);
  return created;
}

// ── Backfill Payments: Dr Bank / Cr AR + Cr Client Credits + PMG Transfer ───

async function backfillPayments(): Promise<number> {
  const bankAccountId = await getAccountByCode(BANK_ACCOUNT_CODE);
  const savingsAccountId = await getAccountByCode(SAVINGS_ACCOUNT_CODE);
  const arAccountId = await getAccountByCode(ACCOUNTS_RECEIVABLE_CODE);
  const clientCreditsAccountId = await getAccountByCode(CLIENT_CREDITS_CODE);

  if (!bankAccountId || !savingsAccountId || !arAccountId) {
    console.error(`❌ Missing chart accounts: Bank (${BANK_ACCOUNT_CODE}), Savings (${SAVINGS_ACCOUNT_CODE}), or AR (${ACCOUNTS_RECEIVABLE_CODE}).`);
    return 0;
  }

  if (!clientCreditsAccountId) {
    console.warn(`⚠️  Client Credits account (${CLIENT_CREDITS_CODE}) not found. Unallocated amounts will be ignored.`);
  }

  const { rows: incomeRows } = await client.query(
    `SELECT id, date, description, amount, client_id, division_id
     FROM income
     ORDER BY date ASC`
  );

  console.log(`  Found ${incomeRows.length} income records to backfill`);

  let created = 0;
  let skipped = 0;

  for (const row of incomeRows) {
    if (await entryExistsForSource("billing", "income", row.id)) {
      skipped++;
      continue;
    }

    const dateStr = toDateStr(row.date);
    const period = dateStr.slice(0, 7);
    const amount = parseFloat(row.amount);

    await ensurePeriod(period);

    // ── Fetch allocations for this income record ────────────────────────────
    const { rows: allocations } = await client.query(
      `SELECT pa.amount AS alloc_amount,
             pa.invoice_id,
             i.document_number,
             i.division_id,
             d.name AS division_name
       FROM payment_allocations pa
       JOIN invoices i ON pa.invoice_id = i.id
       LEFT JOIN divisions d ON i.division_id = d.id
       WHERE pa.income_id = $1
       ORDER BY i.invoice_date ASC`,
      [row.id]
    );

    const totalAllocated = allocations.reduce(
      (sum: number, a: any) => sum + parseFloat(a.alloc_amount),
      0
    );
    const unallocatedAmount = Math.round((amount - totalAllocated) * 100) / 100;

    // ── Entry 1: Dr Bank / Cr AR (per allocation) / Cr Client Credits ──────
    const entryNumber1 = await getNextEntryNumber();
    const entry1Result = await client.query(
      `INSERT INTO journal_entries
         (entry_number, entry_date, period, description, status,
          source_module, source_table, source_id,
          posted_at, posted_by, created_by)
       VALUES ($1, $2, $3, $4, 'posted', 'billing', 'income', $5,
               NOW(), 'system-backfill', 'system-backfill')
       RETURNING id`,
      [entryNumber1, dateStr, period, row.description || "Payment received (backfill)", row.id]
    );

    const entry1Id = entry1Result.rows[0].id;

    // Dr Business Cheque Account (total payment)
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
       VALUES ($1, $2, $3, NULL, $4)`,
      [entry1Id, bankAccountId, String(amount), "Payment received"]
    );

    // Cr Accounts Receivable (per allocated invoice)
    for (const alloc of allocations) {
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, NULL, $3, $4)`,
        [
          entry1Id,
          arAccountId,
          alloc.alloc_amount,
          `AR cleared – ${alloc.document_number || "invoice"}`,
        ]
      );
    }

    // Cr Client Credits (unallocated remainder, if any)
    if (unallocatedAmount > 0.005 && clientCreditsAccountId) {
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, NULL, $3, $4)`,
        [
          entry1Id,
          clientCreditsAccountId,
          String(unallocatedAmount),
          `Unallocated credit / overpayment`,
        ]
      );
    }

    // ── Entry 2: Dr Savings / Cr Bank (PMG Share transfer) ──────────────────
    const pmgRate = await getPmgShareRate(dateStr);
    const pmgShareAmount = Math.round(amount * pmgRate * 100) / 100;

    if (pmgShareAmount > 0) {
      const entryNumber2 = await getNextEntryNumber();
      const entry2Result = await client.query(
        `INSERT INTO journal_entries
           (entry_number, entry_date, period, description, status,
            source_module, source_table, source_id,
            posted_at, posted_by, created_by)
         VALUES ($1, $2, $3, $4, 'posted', 'billing', 'income', $5,
                 NOW(), 'system-backfill', 'system-backfill')
         RETURNING id`,
        [entryNumber2, dateStr, period, `PMG Share ${(pmgRate * 100).toFixed(0)}% (backfill)`, row.id]
      );

      const entry2Id = entry2Result.rows[0].id;

      // Dr Savings Account
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, $3, NULL, $4)`,
        [entry2Id, savingsAccountId, String(pmgShareAmount), "PMG Share → Savings"]
      );

      // Cr Business Cheque Account
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, NULL, $3, $4)`,
        [
          entry2Id,
          bankAccountId,
          String(pmgShareAmount),
          `PMG Share transfer (${(pmgRate * 100).toFixed(0)}% of R${amount.toFixed(2)})`,
        ]
      );
    }

    created++;
  }

  console.log(`  ✅ Payments: created ${created} journal entries, skipped ${skipped}`);
  return created;
}

// ── Verify Trial Balance ────────────────────────────────────────────────────

async function verifyTrialBalance() {
  const { rows } = await client.query(`
    SELECT
      SUM(COALESCE(debit::numeric, 0)) AS total_debits,
      SUM(COALESCE(credit::numeric, 0)) AS total_credits
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE je.status = 'posted'
  `);

  const totalDebits = parseFloat(rows[0]?.total_debits ?? "0");
  const totalCredits = parseFloat(rows[0]?.total_credits ?? "0");
  const diff = Math.abs(totalDebits - totalCredits);

  console.log(`\n📊 Trial Balance Verification:`);
  console.log(`   Total Debits:  R ${totalDebits.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`);
  console.log(`   Total Credits: R ${totalCredits.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`);
  console.log(`   Difference:    R ${diff.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`);

  if (diff < 0.01) {
    console.log(`   ✅ Trial balance is balanced!`);
  } else {
    console.log(`   ❌ Trial balance is OFF by R${diff.toFixed(2)} — investigate!`);
  }

  // Show key account balances
  const { rows: balances } = await client.query(`
    SELECT
      ca.code,
      ca.name,
      COALESCE(SUM(COALESCE(jl.debit::numeric, 0)) - SUM(COALESCE(jl.credit::numeric, 0)), 0) AS balance
    FROM chart_accounts ca
    LEFT JOIN journal_lines jl ON jl.account_id = ca.id
    LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status = 'posted'
    WHERE ca.code IN ('1010', '1020', '1100', '2200', '4010')
    GROUP BY ca.code, ca.name
    ORDER BY ca.code
  `);

  console.log(`\n   Key Account Balances:`);
  for (const b of balances) {
    const bal = parseFloat(b.balance);
    const sign = bal >= 0 ? "" : "-";
    console.log(`     ${b.code} ${b.name.padEnd(25)} ${sign}R ${Math.abs(bal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("📦 Phase 8 Accrual AR Backfill");
console.log("   Supersedes cash-basis entries from backfill-accounting.ts\n");

console.log("Step 1: Pre-flight — voiding old cash-basis income entries...");
const voided = await voidOldCashBasisEntries();

console.log("\nStep 2: Backfilling invoice AR entries (Dr AR / Cr Revenue)...");
const invoiceEntries = await backfillInvoices();

console.log("\nStep 3: Backfilling payment entries (Dr Bank / Cr AR + PMG transfer)...");
const paymentEntries = await backfillPayments();

await verifyTrialBalance();

console.log(`\n✅ Backfill complete.`);
console.log(`   Voided: ${voided} old cash-basis entries`);
console.log(`   Created: ${invoiceEntries + paymentEntries} new accrual-basis entries`);
console.log("   Trial Balance, General Ledger, and P&L should now show data.");

await client.end();
