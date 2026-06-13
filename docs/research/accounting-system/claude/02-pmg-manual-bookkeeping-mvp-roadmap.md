# PMG Manual Bookkeeping MVP — Implementation Roadmap

**Phase 2 · Implementation Plan**  
**Scope:** PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds  
**Date:** June 2026  
**Repo:** https://github.com/jchademwiri/pmg-hub.git  
**Developer:** Solo full-stack  
**Stack:** Next.js App Router · TypeScript · Drizzle ORM · PostgreSQL/Neon · Server Actions · shadcn/ui

---

## Summary: What Phase 1 Audit Found

Before diving into the roadmap, the key findings that drive build order:

**Already solid (no action needed):**
- Invoice/quote full lifecycle (6-state status management)
- Partial payment with FIFO/LIFO allocation — production quality
- Period locking via snapshots (`isPeriodClosed`)
- PDF export (html2canvas-pro + jsPDF)
- Email delivery (Resend — receipts, reminders)
- Client statements page
- Division reporting charts

**Bugs to fix first:**
1. `reports.ts` hardcodes PMG share rate as `0.20` — should be `ACCOUNT_RATES.pmg_share` (0.25)
2. `vatEnabled` can be set to `true` on invoices — no system-level `isVatRegistered` gate
3. `recordClientPayment` lacks a DB transaction wrapper — orphaned allocation risk

**Missing accounting infrastructure:**
- `chart_of_accounts` table
- `journal_entries` + `journal_entry_lines` tables
- `bank_accounts` (manual balance tracking)
- `audit_logs` table
- Formal P&L, Aged Receivables, Trial Balance, General Ledger report pages

---

## Effort Estimates

| Phase | Focus | Estimated Effort |
|---|---|---|
| 1 | Stabilisation & bug fixes | 1–2 days |
| 2 | VAT lockdown | 0.5 day |
| 3 | AR report + Aged Receivables page | 1 day |
| 4 | Chart of Accounts | 1–1.5 days |
| 5 | Journal entries + posting helpers | 2–3 days |
| 6 | General Ledger + Trial Balance reports | 1.5–2 days |
| 7 | Profit & Loss report page | 1 day |
| 8 | Bank/Cash account summary | 1 day |
| 9 | Audit trail | 1.5 days |
| 10 | Future accounting reports | Post-MVP |
| **Total MVP** | | **~12–14 working days** |

---

## Phase 1: Repo Stabilisation & Bug Fixes

**Objective:** Fix confirmed bugs before building new features. A shaky foundation makes the accounting layer unreliable.

### 1.1 Fix PMG share rate in CSV export

**File:** `apps/admin/src/app/actions/reports.ts`

**Bug:** Line ~34 hardcodes `0.20` for PMG share. The actual rate is `ACCOUNT_RATES.pmg_share = 0.25`. Every CSV export sent to an accountant has been wrong.

**Fix:**
```typescript
// Before
const pmgShare = revenue * 0.20;
const reinvest = profitPool * 0.30;
const reserve  = profitPool * 0.30;
// etc.

// After
import { ACCOUNT_RATES, PROFIT_POOL_RATES } from '@pmg/db';

const pmgShare   = revenue  * ACCOUNT_RATES.pmg_share;
const profitPool = revenue  - expenses - pmgShare;
const salary     = profitPool * PROFIT_POOL_RATES.salary;
const reinvest   = profitPool * PROFIT_POOL_RATES.reinvest;
const reserve    = profitPool * PROFIT_POOL_RATES.reserve;
const flex       = profitPool * PROFIT_POOL_RATES.flex;
```

**Testing checklist:**
- [ ] Export CSV for a known month. Verify PMG share = revenue × 0.25
- [ ] Verify profit pool = revenue − expenses − pmgShare
- [ ] Verify salary + reinvest + reserve + flex sums to profit pool

---

### 1.2 Wrap `recordClientPayment` in a DB transaction

**File:** `apps/admin/src/app/actions/billing-payments.ts`

**Bug:** Multiple sequential DB writes (create income row, insert allocations, update invoice statuses) run without a transaction. A failure midway leaves the database in an inconsistent state.

**Fix pattern:**
```typescript
export async function recordClientPayment(data: PaymentInput): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    await db.transaction(async (tx) => {
      // 1. Insert income row
      const [incomeRow] = await tx.insert(income).values({ ... }).returning({ id: income.id });

      // 2. Insert allocations
      for (const alloc of data.allocations) {
        await tx.insert(paymentAllocations).values({
          incomeId: incomeRow!.id,
          invoiceId: alloc.invoiceId,
          amount: String(alloc.amount),
        });
      }

      // 3. Recalculate and update each invoice status
      for (const alloc of data.allocations) {
        await recalculateInvoiceStatusTx(alloc.invoiceId, tx);
      }
    });

    revalidatePath('/billing/payments');
    return {};
  } catch (err) {
    return { error: 'Failed to record payment.' };
  }
}
```

**Testing checklist:**
- [ ] Record a payment that fully pays one invoice. Verify invoice status → `paid`.
- [ ] Record a partial payment. Verify invoice status → `partially_paid`.
- [ ] Simulate a failure after income insert (mock). Verify income row does not persist.

---

### 1.3 Add `isPeriodClosed` check to `issueInvoice` and `updateInvoice`

**File:** `apps/admin/src/app/actions/billing-invoices.ts`

**Bug:** The period close check runs for payments and expenses but not for `issueInvoice`. A user could issue an invoice dated in a closed month, backdating revenue.

**Fix:**
```typescript
export async function issueInvoice(id: string): Promise<{ error?: string }> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return { error: 'Invoice not found.' };

  if (await isPeriodClosed(invoice.invoiceDate)) {
    return { error: 'Cannot issue an invoice dated in a closed period.' };
  }
  // ... rest of issue logic
}
```

**Testing checklist:**
- [ ] Try to issue an invoice dated in a closed month. Expect error.
- [ ] Issue a current-month invoice. Expect success.

---

### 1.4 Migrate `expenses.category` to FK (low-priority, do after Phase 4)

**Current state:** `expenses.category` is a free-text column. `expense_categories` table exists but is not FK-linked.

**Migration plan:**
1. Add `category_id uuid REFERENCES expense_categories(id)` (nullable) to `expenses`
2. Run backfill: `UPDATE expenses e SET category_id = ec.id FROM expense_categories ec WHERE ec.name = e.category`
3. After verification, deprecate `category` column (keep for 1 release, then drop)

**Note:** Do this after Chart of Accounts is set up, so you can also map `expense_categories` → `chart_of_accounts.code` in the same pass.

**Testing checklist:**
- [ ] After migration, all expenses have a `category_id` that resolves to a valid `expense_categories` row
- [ ] Expense create/edit form uses category_id, not free text
- [ ] Existing reports still filter correctly

---

### Phase 1 acceptance criteria

- [ ] CSV export shows correct PMG share rate (0.25)
- [ ] Payment recording is atomic (transaction-wrapped)
- [ ] `issueInvoice` rejects invoices dated in closed periods
- [ ] No regressions in invoice/payment tests

---

## Phase 2: VAT Lockdown (Non-VAT Setting)

**Objective:** Ensure PMG cannot accidentally issue VAT invoices while not VAT registered.

### 2.1 Add `isVatRegistered` to `organisation_settings`

**File:** `packages/db/src/schema/billing.ts`

```typescript
// Add to organisationSettings table
isVatRegistered: boolean("is_vat_registered").notNull().default(false),
```

**Migration:** `ALTER TABLE organisation_settings ADD COLUMN is_vat_registered boolean NOT NULL DEFAULT false;`

Then seed: `UPDATE organisation_settings SET is_vat_registered = false;`

---

### 2.2 Gate VAT in Server Actions

**File:** `apps/admin/src/app/actions/billing-invoices.ts`

In `createInvoice` and `updateInvoice`:

```typescript
// Load org settings at action start
const settings = await getOrganisationSettings();
const vatAllowed = settings?.isVatRegistered ?? false;

// Override vatEnabled to false if org not VAT registered
const effectiveVatEnabled = vatAllowed ? (parsed.data.vatEnabled ?? false) : false;

// Use effectiveVatEnabled in calcTotals()
const { subtotal, discountAmount, vatAmount, total } = calcTotals(
  lineItems, effectiveVatEnabled, discountType, discountValue
);
```

Same guard applies to `billing-quotes.ts`.

---

### 2.3 Hide VAT toggle in invoice UI

**File:** `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx` and `edit`

Pass `isVatRegistered` from server to client component. When `false`, hide the VAT toggle completely.

---

### 2.4 Block VAT number from appearing on PDFs

**File:** `apps/admin/src/components/billing/document-preview.tsx`

```typescript
// Current (risky)
{org.vatNumber && <span>VAT: {org.vatNumber}</span>}

// Fixed
{org.isVatRegistered && org.vatNumber && <span>VAT: {org.vatNumber}</span>}
```

---

### Phase 2 acceptance criteria

- [ ] `isVatRegistered = false` in `organisation_settings`
- [ ] Creating an invoice with `vatEnabled: true` via Server Action silently forces it to `false` when not VAT registered
- [ ] VAT toggle not visible in invoice form when `isVatRegistered = false`
- [ ] Invoice PDF does not show VAT number
- [ ] Invoice is not labelled "Tax Invoice"
- [ ] `vatAmount` is always `0.00` on all new invoices

---

## Phase 3: Accounts Receivable & Aged Receivables Report Pages

**Objective:** Surface existing AR data as formal report pages.

### 3.1 AR Report page

**Route:** `/finance/ar`

**Data source:** `getClientOutstandingInvoices` (already exists in `billing-payments.ts`) — promote to a shared query helper.

**Page content:**
- Filter bar: division, date range, status, client
- Summary stats: total outstanding, count of unpaid invoices
- Table: client, invoice number, date, due date, total, paid, outstanding, status, days overdue
- CSV export button

---

### 3.2 Aged Receivables page

**Route:** `/finance/aged-receivables`

**Data source:** `getAgingReport()` already exists in `packages/db/src/queries/billing.ts`. The `aging-report-grid` component already exists in `components/dashboard`.

**Page content:**
- Summary grid (reuse `aging-report-grid` component)
- Drill-down: click a bucket to see the invoices in that bucket
- Per-client totals across buckets

**Testing checklist:**
- [ ] An overdue invoice appears in the correct bucket
- [ ] Partially-paid invoice shows outstanding amount (not full invoice total) in bucket
- [ ] Current invoices (not yet due) show in "Current" bucket
- [ ] No invoice appears in more than one bucket

---

### Phase 3 acceptance criteria

- [ ] `/finance/ar` route accessible and shows correct data
- [ ] `/finance/aged-receivables` route accessible
- [ ] Sum of all AR = sum of all aged buckets (consistency check)
- [ ] CSV export works on AR page

---

## Phase 4: Chart of Accounts

**Objective:** Create the `chart_of_accounts` table and seed PMG's account list.

### 4.1 Create schema

**New file:** `packages/db/src/schema/accounting.ts`

See `03-pmg-manual-bookkeeping-schema-plan.md` → Deliverable 4 for the full Drizzle schema.

### 4.2 Run Drizzle migration

```bash
cd packages/db
npx drizzle-kit generate --name=add-chart-of-accounts
npx drizzle-kit push   # or use migration files depending on workflow
```

### 4.3 Seed PMG Chart of Accounts

**New file:** `packages/db/src/seeds/chart-of-accounts.ts`

```typescript
export const PMG_CHART_OF_ACCOUNTS = [
  // Assets
  { code: '1001', name: 'Business Bank Account',       accountType: 'asset',   isSystem: true },
  { code: '1002', name: 'Cash on Hand',                accountType: 'asset',   isSystem: true },
  { code: '1100', name: 'Accounts Receivable',         accountType: 'asset',   isSystem: true },
  { code: '1900', name: 'Other Assets',                accountType: 'asset',   isSystem: false },
  // Liabilities
  { code: '2000', name: 'General Liabilities',         accountType: 'liability', isSystem: false },
  { code: '2100', name: 'Accounts Payable',            accountType: 'liability', isSystem: false },
  { code: '2900', name: 'Other Liabilities',           accountType: 'liability', isSystem: false },
  // Equity
  { code: '3000', name: 'Owner Equity',                accountType: 'equity',  isSystem: true },
  { code: '3100', name: 'Retained Earnings',           accountType: 'equity',  isSystem: true },
  { code: '3200', name: 'Owner Drawings',              accountType: 'equity',  isSystem: true },
  { code: '3900', name: 'Opening Balance Equity',      accountType: 'equity',  isSystem: true },
  // Revenue
  { code: '4000', name: 'Service Revenue',             accountType: 'revenue', isSystem: true },
  { code: '4100', name: 'TenderEdge Solutions Revenue',accountType: 'revenue', isSystem: false },
  { code: '4200', name: 'Apex Web Solutions Revenue',  accountType: 'revenue', isSystem: false },
  { code: '4300', name: 'PMG Services Revenue',        accountType: 'revenue', isSystem: false },
  { code: '4900', name: 'Other Income',                accountType: 'revenue', isSystem: false },
  // Expenses
  { code: '5000', name: 'General Expenses',            accountType: 'expense', isSystem: true },
  { code: '5100', name: 'Software & Subscriptions',    accountType: 'expense', isSystem: false },
  { code: '5200', name: 'Printing & Stationery',       accountType: 'expense', isSystem: false },
  { code: '5300', name: 'Transport & Courier',         accountType: 'expense', isSystem: false },
  { code: '5400', name: 'Marketing & Advertising',     accountType: 'expense', isSystem: false },
  { code: '5500', name: 'Communication',               accountType: 'expense', isSystem: false },
  { code: '5600', name: 'Professional Fees',           accountType: 'expense', isSystem: false },
  { code: '5700', name: 'Bank Charges',                accountType: 'expense', isSystem: false },
  { code: '5800', name: 'Office & Admin',              accountType: 'expense', isSystem: false },
  { code: '5900', name: 'Miscellaneous Expenses',      accountType: 'expense', isSystem: false },
];
```

Run seed once after migration. Add a `--if-not-exists` guard or check `isSystem` rows before inserting.

### 4.4 Map expense categories to CoA codes

Extend `expense_categories` with an optional `accountCode` reference:

```typescript
accountCode: text("account_code"), // e.g. "5100" — soft reference to chart_of_accounts.code
```

This allows the posting helper to look up the correct 5xxx debit account when posting expenses.

---

### Phase 4 acceptance criteria

- [ ] `chart_of_accounts` table exists in production DB
- [ ] All PMG accounts seeded (at minimum the 1001, 1100, 3200, 4000, 5000 system accounts)
- [ ] `isSystem: true` accounts cannot be deleted via UI
- [ ] Account list accessible at `/settings/chart-of-accounts` (or similar)

---

## Phase 5: Journal Entries & Posting Helpers

**Objective:** Build the double-entry posting layer. This is the most technically complex phase.

### 5.1 Create journal_entries and journal_entry_lines schema

**File:** `packages/db/src/schema/accounting.ts`

See schema plan document for full Drizzle definitions.

### 5.2 Build `postJournalEntry` helper

**New file:** `packages/db/src/queries/accounting.ts`

See schema plan document for full TypeScript implementation with balance validation.

### 5.3 Wire posting into `createIncome` Server Action

**File:** `apps/admin/src/app/actions/income.ts`

Wrap income insert + journal post in `db.transaction()`:

```typescript
// Posting for invoice payment income
lines: [
  { accountCode: '1001', lineType: 'debit',  amount: parsedAmount },
  { accountCode: '4000', lineType: 'credit', amount: parsedAmount },
]

// Posting for manual income (no invoice)
lines: [
  { accountCode: '1001', lineType: 'debit',  amount: parsedAmount },
  { accountCode: '4900', lineType: 'credit', amount: parsedAmount },
]
```

### 5.4 Wire posting into `createExpense` Server Action

**File:** `apps/admin/src/app/actions/expenses.ts`

Resolve expense account code from `expense_categories.accountCode` (fall back to `5000`):

```typescript
const debitAccountCode = await resolveExpenseAccountCode(expenseData.categoryId);
lines: [
  { accountCode: debitAccountCode, lineType: 'debit',  amount: parsedAmount },
  { accountCode: '1001',          lineType: 'credit', amount: parsedAmount },
]
```

### 5.5 Wire posting into owner withdrawal (optional — pending Jacob's confirmation)

**File:** `apps/admin/src/app/actions/account-withdrawal.ts`

Only post if withdrawal represents actual cash leaving business:

```typescript
lines: [
  { accountCode: '3200', lineType: 'debit',  amount: parsedAmount }, // Owner Drawings
  { accountCode: '1001', lineType: 'credit', amount: parsedAmount }, // Bank
]
```

### 5.6 Handle historical records (opening balances)

Existing income/expense records have no journal entries. Decision needed:

**Option A (Recommended):** Post a single opening balance entry as of a chosen date. `Dr 3900 Opening Balance Equity` / `Cr 3100 Retained Earnings` for the net position. Historical transactions are excluded from the GL but remain in income/expenses tables for reporting via direct queries.

**Option B:** Retroactively post all historical transactions. Complex, risky, time-consuming.

**Recommendation:** Start the journal from a clean date (e.g., start of current financial year). Use historical income/expense records for P&L queries until the GL has sufficient history.

---

### Phase 5 acceptance criteria

- [ ] `journal_entries` and `journal_entry_lines` tables exist in production
- [ ] Every new income record auto-generates a balanced journal entry
- [ ] Every new expense record auto-generates a balanced journal entry
- [ ] If journal posting fails, the income/expense row is rolled back (transaction integrity)
- [ ] Sum of debits = sum of credits for every journal entry (validated in helper)
- [ ] Existing income/expense create actions still work (no regression)

---

## Phase 6: General Ledger & Trial Balance Reports

**Objective:** Build the two core accounting reports that prove the books balance.

### 6.1 General Ledger report

**Route:** `/finance/general-ledger`

**Query:** `journal_entry_lines` joined to `journal_entries` and `chart_of_accounts`, filtered by account and date range.

```typescript
// packages/db/src/queries/accounting.ts

export async function getGeneralLedger(filters: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<GeneralLedgerRow[]> {
  // Group by account, ordered by entry_date ASC
  // Compute running balance per account
}
```

**Page content:**
- Account selector (dropdown of all active accounts)
- Date range filter
- Table: date, description, reference, debit, credit, running balance
- Opening balance row at top

### 6.2 Trial Balance report

**Route:** `/finance/trial-balance`

**Query:** Sum of all debits and credits per account, as at a given date.

```typescript
export async function getTrialBalance(asAtDate: string): Promise<TrialBalanceRow[]> {
  // GROUP BY account_id, line_type
  // Return per-account: total_debits, total_credits, net_balance
  // Include totals row: sum of all debits must equal sum of all credits
}
```

**Page content:**
- As-at date picker
- Table: account code, account name, type, total debits, total credits, net balance
- Totals row: verify debit total = credit total
- Warning banner if out of balance

---

### Phase 6 acceptance criteria

- [ ] GL report shows all posted entries for selected account
- [ ] Running balance on GL is correct (opening balance + sequential running total)
- [ ] Trial balance total debits = total credits
- [ ] Out-of-balance warning shown if totals do not match (should never happen after Phase 5 guards)

---

## Phase 7: Profit & Loss Report Page

**Objective:** Build a formal, filterable P&L page. The dashboard already has raw totals — this is the proper accountant-ready version.

### 7.1 P&L query

**Two implementation options:**

**Option A (immediate):** Build from `income` and `expenses` tables directly. Fast. Works before journal entries are live. Accurate for cash-basis.

**Option B (after Phase 5):** Build from `journal_entry_lines` grouped by account type. More future-proof, aligned with accounting standards.

**Recommendation:** Ship Option A immediately. Plan to migrate to Option B in a later cleanup phase.

### 7.2 P&L page

**Route:** `/finance/profit-loss`

**Page content:**
- Date range filter + financial year selector + division filter
- Revenue section: line per account (4xxx), subtotal
- Expenses section: line per account (5xxx), subtotal
- Net Profit / Net Loss line
- CSV export
- Comparison toggle: vs previous period / vs same period last year

---

### Phase 7 acceptance criteria

- [ ] P&L revenue total matches `sum(income.amount)` for the selected period and filters
- [ ] P&L expense total matches `sum(expenses.amount)` for the selected period and filters
- [ ] Net profit = revenue − expenses
- [ ] Division filter works correctly
- [ ] CSV export produces correct data

---

## Phase 8: Manual Bank/Cash Account Summary

**Objective:** Create internal bank/cash account tracking with opening balance and calculated running balance.

### 8.1 Create `bank_accounts` table

See schema plan document for Drizzle definition.

### 8.2 Seed default bank account

Create one default `bank_accounts` row for PMG's business bank account:

```typescript
{
  name: 'FNB Business Cheque',    // update to actual bank
  accountType: 'cheque',
  chartAccountId: <id of 1001>,
  openingBalance: <Jacob to provide>,
  openingBalanceDate: <start date>,
  isDefault: true,
}
```

### 8.3 Bank summary page

**Route:** `/finance/bank-summary`

**Page content:**
- Card per bank/cash account
- Opening balance (from `bank_accounts.openingBalance`)
- Total receipts in period (sum of debit postings to account `1001`)
- Total payments in period (sum of credit postings to account `1001`)
- Calculated closing balance: opening + receipts − payments
- Period filter

---

### Phase 8 acceptance criteria

- [ ] Bank summary shows calculated closing balance that matches expected cash position
- [ ] Closing balance changes correctly when new income/expense is added

---

## Phase 9: Audit Trail

**Objective:** Log all create/edit/delete/issue/void/pay actions for accountability and accountant review.

### 9.1 Create `audit_logs` table

**New file:** `packages/db/src/schema/audit.ts`

See schema plan document for Drizzle definition.

### 9.2 Build `logAuditEvent` helper

```typescript
// packages/db/src/queries/audit.ts

export async function logAuditEvent(
  input: {
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    userId: string;
    userName?: string;
    previousData?: unknown;
    newData?: unknown;
  },
  tx?: typeof db,
): Promise<void> {
  const client = tx ?? db;
  await client.insert(auditLogs).values({
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    userId: input.userId,
    userName: input.userName ?? null,
    previousData: input.previousData ? JSON.stringify(input.previousData) : null,
    newData: input.newData ? JSON.stringify(input.newData) : null,
  });
}
```

### 9.3 Wire into financial actions

Priority order:
1. `issueInvoice` → log `issue / invoice`
2. `voidInvoice` → log `void / invoice` with previous status snapshot
3. `recordClientPayment` → log `pay / income`
4. `deleteIncome` → log `delete / income`
5. `deleteClientPayment` → log `delete / income`
6. `createExpense` / `deleteExpense` → log `create / expense`, `delete / expense`
7. `closeMonth` → log `close_period / snapshot`

### 9.4 Audit log viewer

**Route:** `/settings/audit` (admin only)

**Page content:**
- Filter by entity, action, user, date range
- Table: timestamp, user, action, entity, entity ID, summary
- Drill-down to view previous/new data diff (optional, nice-to-have)

---

### Phase 9 acceptance criteria

- [ ] `audit_logs` table exists
- [ ] Issuing, voiding, and paying invoices writes audit rows
- [ ] Recording and deleting income writes audit rows
- [ ] Period close writes audit row
- [ ] `audit_logs` has no delete or update actions exposed via UI
- [ ] Audit viewer accessible at `/settings/audit`

---

## Phase 10: Future Accounting Reports

**Deferred to post-MVP. Build only after Phases 1–9 are stable.**

### 10.1 Balance Sheet

**Dependencies:** Equity opening balances, full journal entry history, proper asset/liability accounts seeded.

**Route:** `/finance/balance-sheet`

### 10.2 Cash Flow Statement

**Dependencies:** Bank accounts table live, journal entries categorised by cash vs non-cash activity.

**Route:** `/finance/cash-flow`

### 10.3 Accounts Payable module

**Dependencies:** `suppliers` table, `bills` table, `bill_payments` table.

**Route group:** `/billing/payables/*`

### 10.4 Credit Notes

**Dependencies:** New `credit_notes` table, credit note PDF template.

### 10.5 Refunds

**Dependencies:** Credit notes, or standalone refund record linked to income.

### 10.6 VAT Registration Support

**When PMG becomes VAT registered:**
1. Set `isVatRegistered = true` in `organisation_settings`
2. Unlock VAT toggle on invoice form
3. Add `2200 - VAT Output Account` to chart of accounts
4. Add VAT posting rule: on payment, `Dr Bank / Cr Revenue + Dr Revenue / Cr VAT Output`
5. Build VAT report (input/output tax by period)
6. Invoice PDF: show "Tax Invoice", VAT number, VAT line

### 10.7 Bank CSV Import

**When manual reconciliation becomes cumbersome:**
1. Add `bank_transactions` table
2. Build CSV parser for FNB/ABSA/Nedbank statement formats
3. Build matching UI to link bank transactions to income/expense records
4. Build reconciliation report

---

## Critical Risks & Blockers

| Severity | Risk | File | Blocks MVP? | Mitigation |
|---|---|---|---|---|
| 🔴 High | PMG share rate hardcoded as 0.20 — CSV exports wrong | `reports.ts` | Accountant trust risk | Fix in Phase 1.1 |
| 🔴 High | No `isVatRegistered` gate — VAT can be enabled on invoices | `billing-invoices.ts`, `billing-schema.ts` | Tax compliance risk | Fix in Phase 2 |
| 🟡 Medium | `recordClientPayment` not transaction-wrapped | `billing-payments.ts` | Data integrity risk | Fix in Phase 1.2 |
| 🟡 Medium | No audit trail for financial events | All financial actions | Accountability gap | Phase 9 |
| 🟡 Medium | `expenses.category` not FK-linked to `expense_categories` | `expenses.ts` | CoA mapping impossible until fixed | Phase 1.4 / Phase 4 |
| 🟡 Medium | `isPeriodClosed` not called in `issueInvoice` | `billing-invoices.ts` | Backdating risk | Phase 1.3 |
| 🟡 Medium | No chart_of_accounts, journal entries, GL | All accounting schema | Core bookkeeping gap | Phases 4–6 |
| 🟢 Low | Historical records have no journal entries | All financial schemas | GL will be incomplete until decision made | Phase 5 — opening balance entry |
| 🟢 Low | `quotationId` is a soft reference (no FK) | `billing.ts` | Data integrity edge case | Non-blocking for MVP |
| 🟢 Low | Dashboard missing AR balance KPI | Dashboard | UX gap | Add in Phase 3 cleanup |

---

## Recommended First 5 Development Tasks

Start here. These unblock everything downstream and fix the most urgent risks.

1. **Fix CSV export rate bug** — 30-minute fix, high accountant impact
   - File: `apps/admin/src/app/actions/reports.ts`
   - Replace hardcoded `0.20` with `ACCOUNT_RATES.pmg_share`

2. **Add `isVatRegistered: false` to org settings** — 2-hour task
   - Schema: add column to `organisation_settings`
   - Action: gate `vatEnabled` in `billing-invoices.ts` and `billing-quotes.ts`
   - UI: hide VAT toggle when flag is false
   - PDF: block VAT number when flag is false

3. **Wrap `recordClientPayment` in DB transaction** — 1-hour refactor
   - File: `apps/admin/src/app/actions/billing-payments.ts`
   - Prevents orphaned allocations on failure

4. **Build `/finance/ar` AR report page** — 1-day task
   - Promote `getClientOutstandingInvoices` to a shared query
   - Build route `/finance/ar` with table and filters
   - Add AR balance KPI to dashboard

5. **Create `chart_of_accounts` table and seed** — 1-day task
   - New file: `packages/db/src/schema/accounting.ts`
   - Drizzle migration
   - Seed script with PMG accounts

---

## Suggested Commit / PR Strategy

Each phase maps to one PR. Keep PRs focused and independently deployable.

| PR | Title | Phases |
|---|---|---|
| `fix/financial-calculations` | Fix CSV rate bug, add period close to issue invoice | 1.1, 1.3 |
| `fix/payment-transaction-safety` | Wrap payment recording in DB transaction | 1.2 |
| `feat/vat-lockdown` | Add isVatRegistered, gate VAT across app | 2 |
| `feat/ar-reports` | AR report page, aged receivables page | 3 |
| `feat/chart-of-accounts` | CoA schema, migration, seed, settings UI | 4 |
| `feat/journal-entries` | Journal schema, posting helper, wire into income/expense | 5 |
| `feat/gl-trial-balance` | General ledger report, trial balance report | 6 |
| `feat/profit-loss-report` | Formal P&L page with filters | 7 |
| `feat/bank-accounts` | Bank account table, opening balance, bank summary page | 8 |
| `feat/audit-trail` | Audit log schema, helper, wiring, viewer page | 9 |

---

## Open Questions for Jacob

1. **PMG allocation withdrawals and cash:** When a salary/reinvest/flex withdrawal is recorded in the `ledger`, does this always represent actual cash leaving a bank account? If yes: post `Dr Owner Drawings / Cr Bank` journal entry on withdrawal. If no (budget allocation only): do not post — keep the existing `ledger` model separate from the accounting GL and never double-count.

2. **Opening balance date:** When the GL goes live, from what date should journal entries start? Options: (a) start of current financial year (March 2025 or March 2026), (b) app go-live date, (c) specific date Jacob chooses. This determines whether historical income/expense records get retroactive journal entries or whether one opening balance entry is used.

3. **Bank accounts:** Does PMG have one primary bank account for all divisions, or separate accounts per division? This affects how the `bank_accounts` table is seeded and how posting rules are configured.

4. **Revenue accounts — one vs per-division:** Should `income` always post to `4000 Service Revenue`, with division filtering used to segment reports? Or should TenderEdge income always post to `4100`, Apex income to `4200`, etc.? Recommendation: use one account (`4000`) + division filter. But Jacob may have accountant requirements for separate revenue lines.

5. **Expense categories and CoA mapping:** When migrating `expenses.category` to a FK, which existing categories should map to which CoA codes? A mapping table is needed for the backfill. Jacob or his accountant should sign off on this.

6. **Client address fields for invoices:** The `clients` schema has no address fields. Invoice PDFs presumably need a billing address. Should this be added to `clients` (for a single billing address per client) or to a separate billing contact record?

7. **Who is the accountant?** When building the export / accountant view, it helps to know whether there is an external accountant who will use these reports. If yes: what format do they prefer? CSV, PDF, or do they have accounting software PMG should be able to export to (e.g., Sage, QuickBooks)?

---

*Schema details, Drizzle code, and Chart of Accounts are in `03-pmg-manual-bookkeeping-schema-plan.md`.*  
*Phase 1 audit findings are in `01-pmg-manual-bookkeeping-mvp-audit.md`.*
