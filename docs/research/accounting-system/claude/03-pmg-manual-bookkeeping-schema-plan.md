# PMG Manual Bookkeeping MVP — Schema Plan

**Phase 2 · Schema & Database Design**  
**Scope:** PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds  
**Date:** June 2026  
**Repo:** https://github.com/jchademwiri/pmg-hub.git  
**Stack:** Drizzle ORM · PostgreSQL (Neon) · Next.js App Router · TypeScript · Server Actions

---

## Context: What Already Exists

Before proposing new tables, the Phase 1 audit confirmed these financial tables are **already in production**:

| Table | Location | Purpose |
|---|---|---|
| `income` | `packages/db/src/schema/income.ts` | Cash received — date, divisionId, clientId, amount |
| `expenses` | `packages/db/src/schema/expenses.ts` | Cash paid — date, divisionId, category (free-text), amount |
| `expense_categories` | `packages/db/src/schema/expense-categories.ts` | Category name list (not FK-linked to expenses yet) |
| `invoices` | `packages/db/src/schema/billing.ts` | Full invoice lifecycle, vatEnabled flag |
| `quotations` | `packages/db/src/schema/billing.ts` | Quote lifecycle |
| `billing_line_items` | `packages/db/src/schema/billing.ts` | Polymorphic line items for quotes and invoices |
| `billing_items` | `packages/db/src/schema/billing.ts` | Reusable catalogue items |
| `payment_allocations` | `packages/db/src/schema/billing.ts` | Many-to-many payment-to-invoice mapping |
| `document_sequences` | `packages/db/src/schema/billing.ts` | Per-division, per-year sequential numbering |
| `snapshots` | `packages/db/src/schema/snapshots.ts` | Monthly locked period summaries |
| `ledger` | `packages/db/src/schema/ledger.ts` | PMG internal allocation buckets (NOT accounting GL) |
| `organisation_settings` | `packages/db/src/schema/billing.ts` | Singleton org config |
| `division_billing_settings` | `packages/db/src/schema/billing.ts` | Per-division billing config |
| `clients` | `packages/db/src/schema/clients.ts` | Client records |
| `divisions` | `packages/db/src/schema/divisions.ts` | Division records |

---

## Deliverable 4: Recommended Database Changes

### Table Evaluation Matrix

| Table | Required for MVP | Purpose | Create Now? | Migration Risk |
|---|---|---|---|---|
| `chart_of_accounts` | ✅ Yes | Account codes and types for double-entry | Yes | Low — new table, no FK impact yet |
| `journal_entries` | ✅ Yes | Parent record for each double-entry transaction | Yes | Low — new table |
| `journal_entry_lines` | ✅ Yes | Individual debit/credit lines per journal entry | Yes | Low — new table |
| `bank_accounts` | ✅ Yes (manual only) | Internal cash/bank tracking without real feeds | Yes | Low — new table |
| `audit_logs` | ✅ Yes | Immutable log of create/edit/delete/issue/void/pay | Yes | Low — append-only |
| `bank_transactions` | 🔵 Future | Links bank_account movements to journal entries | No | Medium |
| `manual_reconciliations` | 🔵 Future | Period reconciliation for manual bank balance | No | Low |
| `credit_notes` | 🔵 Future | Reversal document for a paid invoice | No | Low |
| `refunds` | 🔵 Future | Cash out to client | No | Low |
| `suppliers` | 🔵 Future | Vendor master for Accounts Payable | No | Low |
| `bills` | 🔵 Future | Supplier invoices received | No | Low |
| `bill_payments` | 🔵 Future | Payments made to suppliers | No | Low |
| `tax_settings` | ⚪ Not needed | VAT registration settings | No — use `organisation_settings` column instead | None |
| `attachments` | 🔵 Future | File uploads linked to transactions | No | Low |
| `assets` | 🔵 Future | Asset register | No | Low |
| `liabilities` | 🔵 Future | Liability register | No | Low |

---

### New Table: `organisation_settings` — Add Column (ALTER, not new table)

The existing `organisation_settings` singleton needs one new column:

```typescript
// packages/db/src/schema/billing.ts — add to organisationSettings table

isVatRegistered: boolean("is_vat_registered").notNull().default(false),
defaultVatRate: numeric("default_vat_rate", { precision: 5, scale: 2 }).default("15"),
financialYearStartMonth: integer("financial_year_start_month").notNull().default(3), // March = SA financial year
```

**Migration:** `ALTER TABLE organisation_settings ADD COLUMN is_vat_registered boolean NOT NULL DEFAULT false;`

**Why:** PMG is not VAT registered. This single flag becomes the gate for all VAT behaviour across the app. When `false`: VAT toggle hidden, VAT amount forced to zero, no VAT number on PDFs, no "Tax Invoice" label.

---

### New Table: `chart_of_accounts`

```typescript
// packages/db/src/schema/accounting.ts — NEW FILE

import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),           // e.g. "1001", "4100"
    name: text("name").notNull(),                    // e.g. "Business Bank Account"
    accountType: accountTypeEnum("account_type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isSystem: boolean("is_system").notNull().default(false), // system accounts cannot be deleted
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("chart_of_accounts_code_idx").on(t.code),
    index("chart_of_accounts_type_idx").on(t.accountType),
  ],
);

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
```

**Relationships:** Referenced by `journal_entry_lines.accountId`, `income.accountId` (future), `expenses.categoryAccountId` (future migration).

**Migration risk:** Low. New table. No existing table changes required at this stage.

---

### New Table: `journal_entries`

```typescript
// packages/db/src/schema/accounting.ts — ADD TO SAME FILE

export const journalSourceEnum = pgEnum("journal_source", [
  "income_payment",      // auto-posted when income row is created
  "expense_payment",     // auto-posted when expense row is created
  "owner_withdrawal",    // auto-posted when ledger withdrawal is recorded
  "manual",              // manually entered journal entry
  "opening_balance",     // one-time entries to establish opening GL balances
]);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryDate: date("entry_date").notNull(),
    reference: text("reference"),               // e.g. "INV-TES-2025-0042", "EXP-001"
    description: text("description").notNull(),
    source: journalSourceEnum("source").notNull(),
    // Source record links — only one will be set per entry
    incomeId: uuid("income_id").references(() => income.id, { onDelete: "set null" }),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    ledgerEntryId: uuid("ledger_entry_id").references(() => ledger.id, { onDelete: "set null" }),
    isReversed: boolean("is_reversed").notNull().default(false),
    reversedBy: uuid("reversed_by"),            // FK to another journal_entries.id (soft ref)
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("journal_entries_entry_date_idx").on(t.entryDate),
    index("journal_entries_source_idx").on(t.source),
    index("journal_entries_income_id_idx").on(t.incomeId),
    index("journal_entries_expense_id_idx").on(t.expenseId),
  ],
);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
```

---

### New Table: `journal_entry_lines`

```typescript
// packages/db/src/schema/accounting.ts — ADD TO SAME FILE

export const entryLineTypeEnum = pgEnum("entry_line_type", ["debit", "credit"]);

export const journalEntryLines = pgTable(
  "journal_entry_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: "restrict" }),
    lineType: entryLineTypeEnum("line_type").notNull(),  // "debit" | "credit"
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("journal_entry_lines_amount_positive", sql`${t.amount} > 0`),
    index("journal_entry_lines_journal_id_idx").on(t.journalEntryId),
    index("journal_entry_lines_account_id_idx").on(t.accountId),
    index("journal_entry_lines_line_type_idx").on(t.lineType),
  ],
);

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert;
```

**Key constraint to add in posting helper:** Sum of debits must equal sum of credits for each `journal_entry_id`. Enforce this in the posting helper function, not at DB level (DB-level balance checks are impractical across rows).

---

### New Table: `bank_accounts` (manual, no API)

```typescript
// packages/db/src/schema/accounting.ts — ADD TO SAME FILE

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "cheque",
  "savings",
  "cash",         // petty cash / cash on hand
]);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),               // e.g. "FNB Business Cheque"
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    accountType: bankAccountTypeEnum("account_type").notNull().default("cheque"),
    chartAccountId: uuid("chart_account_id")
      .references(() => chartOfAccounts.id, { onDelete: "set null" }),  // links to 1001/1002
    openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    openingBalanceDate: date("opening_balance_date"),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),  // default bank for posting
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("bank_accounts_chart_account_id_idx").on(t.chartAccountId),
  ],
);

export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
```

**Note:** This table is for internal balance tracking only. No API connections. The calculated running balance is: `openingBalance + sum(income entries) - sum(expense entries)` — derived from journal entry lines, not stored.

---

### New Table: `audit_logs`

```typescript
// packages/db/src/schema/audit.ts — NEW FILE

import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "issue",
  "void",
  "pay",
  "close_period",
  "reopen_period",
  "post_journal",
  "reverse_journal",
]);

export const auditEntityEnum = pgEnum("audit_entity", [
  "invoice",
  "quotation",
  "income",
  "expense",
  "payment_allocation",
  "journal_entry",
  "snapshot",
  "client",
  "division",
  "organisation_settings",
  "bank_account",
  "ledger_entry",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: auditActionEnum("action").notNull(),
    entity: auditEntityEnum("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    userId: text("user_id").notNull(),           // Better Auth session user id
    userName: text("user_name"),                 // denormalised for readability
    previousData: jsonb("previous_data"),        // snapshot before change
    newData: jsonb("new_data"),                  // snapshot after change
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entity, t.entityId),
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_created_at_idx").on(t.createdAt),
    index("audit_logs_action_idx").on(t.action),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
```

**Important:** `audit_logs` is append-only. No update or delete should ever be permitted on this table. Enforce via Server Action guard: never expose a delete audit log action.

---

### Existing Table Changes (ALTER, not new tables)

#### 1. `expenses` — add `category_id` FK (migration required)

```typescript
// Phase 1: Add nullable column
categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),

// Phase 2: Backfill from existing category text
// UPDATE expenses e SET category_id = ec.id
// FROM expense_categories ec WHERE ec.name = e.category

// Phase 3: Make NOT NULL, drop old column (after verification)
```

#### 2. `income` — add `source` discriminator (optional, low risk)

```typescript
incomeSource: text("income_source").default("manual"),
// Values: 'invoice_payment' | 'manual'
// Set to 'invoice_payment' in recordClientPayment action
// Set to 'manual' in createIncome action
```

#### 3. `income` and `expenses` — add `journalEntryId` backlink (optional, add after journal entries are live)

```typescript
journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, { onDelete: "set null" }),
```

---

## Deliverable 5: Recommended Chart of Accounts for PMG

This is a minimal, practical Chart of Accounts for a South African service business operating cash-basis with multiple divisions.

### Seeding strategy

Create a migration file: `packages/db/src/migrations/seed-chart-of-accounts.ts`

Run once after `chart_of_accounts` table is created. Mark seeded rows with `isSystem: true`.

---

### Assets (1xxx)

| Code | Name | Type | Notes |
|---|---|---|---|
| 1001 | Business Bank Account | asset | Links to `bank_accounts` default entry |
| 1002 | Cash on Hand | asset | Petty cash |
| 1100 | Accounts Receivable | asset | Outstanding invoice balances |
| 1200 | Prepaid Expenses | asset | Future phase |
| 1900 | Other Assets | asset | Catch-all |

### Liabilities (2xxx)

| Code | Name | Type | Notes |
|---|---|---|---|
| 2000 | General Liabilities | liability | Catch-all |
| 2100 | Accounts Payable | liability | Future — supplier bills |
| 2300 | Loans Payable | liability | Future — if needed |
| 2900 | Other Liabilities | liability | Catch-all |

### Equity (3xxx)

| Code | Name | Type | Notes |
|---|---|---|---|
| 3000 | Owner Equity | equity | Starting capital / retained earnings |
| 3100 | Retained Earnings | equity | Accumulated profit b/f |
| 3200 | Owner Drawings | equity | Cash withdrawals — Dr this when owner takes money out |
| 3300 | PMG Internal Allocation Equity | equity | Maps to PMG share / allocation model if cash is moved |
| 3900 | Opening Balance Equity | equity | Temporary account for GL opening balances |

### Revenue (4xxx)

| Code | Name | Type | Notes |
|---|---|---|---|
| 4000 | Service Revenue | revenue | General / unclassified service income |
| 4100 | TenderEdge Solutions Revenue | revenue | Division-specific — per phase 2 prompt guidance |
| 4200 | Apex Web Solutions Revenue | revenue | Division-specific |
| 4300 | PMG Services Revenue | revenue | Division-specific |
| 4900 | Other Income | revenue | Non-service miscellaneous income |

**Division as dimension, not account:** Division separation should remain a **filter dimension** (via `divisionId` FK) rather than a separate CoA branch. Using `4100`, `4200`, `4300` per division is acceptable but creates CoA sprawl as divisions grow. Recommended approach: use one `4000 - Service Revenue` account + filter by `divisionId` in all P&L queries. Add division-specific codes only if the accountant requires separate revenue lines on financial statements.

### Expenses (5xxx)

| Code | Name | Type | Notes |
|---|---|---|---|
| 5000 | General Expenses | expense | Catch-all |
| 5100 | Software & Subscriptions | expense | SaaS tools, hosting, etc. |
| 5200 | Printing & Stationery | expense | Office supplies |
| 5300 | Transport & Courier | expense | Travel, delivery |
| 5400 | Marketing & Advertising | expense | Digital ads, print |
| 5500 | Communication | expense | Phone, internet, data |
| 5600 | Professional Fees | expense | Accountant, legal, consulting |
| 5700 | Bank Charges | expense | Transaction fees |
| 5800 | Office & Admin | expense | Rent, cleaning, general admin |
| 5900 | Miscellaneous Expenses | expense | Anything unclassified |
| 5950 | Owner Drawings Expense | expense | **Do not use** — use account 3200 (Owner Drawings) instead |

### Owner Withdrawals — important classification note

**Do not post owner withdrawals as expenses.** Salary/reinvest/reserve/flex withdrawals from the PMG allocation `ledger` must be classified as:

- `Dr 3200 Owner Drawings` — decreases equity
- `Cr 1001 Business Bank Account` — decreases cash

This keeps P&L accurate. Posting these as expenses would overstate costs and understate profit.

---

## Deliverable 6: Posting Rules

### Overview

PMG's cash-basis MVP requires exactly **four posting templates**. All other postings are future-phase.

The posting helper should be a server-side function (`packages/db/src/queries/accounting.ts`) called from within the relevant Server Actions, inside a DB transaction.

---

### Posting Rule 1: Income from Invoice Payment

**Trigger:** `recordClientPayment` in `billing-payments.ts` — when an income row is created linked to an invoice.

```
Dr  1001  Business Bank Account    [payment amount]
Cr  4000  Service Revenue          [payment amount]
```

**Journal entry fields:**
- `source: 'income_payment'`
- `reference: invoice.documentNumber`
- `incomeId: income.id`
- `description: 'Payment received — {client name} — {invoice number}'`

**If using Accounts Receivable tracking (recommended but optional for MVP):**

At invoice issue:
```
Dr  1100  Accounts Receivable      [invoice total]
Cr  4000  Service Revenue          [invoice total]
```

At payment:
```
Dr  1001  Business Bank Account    [amount paid]
Cr  1100  Accounts Receivable      [amount paid]
```

**Recommendation for PMG MVP:** Skip the AR double-entry for now. Cash-basis means income is only recognised when cash is received. Post only the single `Dr Bank / Cr Revenue` entry on payment. The AR report is derived from `invoices` table status, not from journal entries. This is correct cash-basis behaviour.

---

### Posting Rule 2: Manual Income (no invoice)

**Trigger:** `createIncome` action in `income.ts` — when income is recorded without an invoice link.

```
Dr  1001  Business Bank Account    [income amount]
Cr  4900  Other Income             [income amount]
```

**Journal entry fields:**
- `source: 'income_payment'`
- `incomeId: income.id`
- `description: income.description`

---

### Posting Rule 3: Expense Recorded

**Trigger:** `createExpense` action in `expenses.ts`.

```
Dr  5xxx  [Expense Account by category]    [expense amount]
Cr  1001  Business Bank Account            [expense amount]
```

**Resolving the expense account:** When expenses are linked to `expense_categories`, and `expense_categories` are linked to `chart_of_accounts` codes, the posting helper can look up the correct 5xxx account. For MVP, default all unmapped categories to `5000 General Expenses`.

**Journal entry fields:**
- `source: 'expense_payment'`
- `expenseId: expense.id`
- `description: expense.description`

---

### Posting Rule 4: Owner Withdrawal

**Trigger:** `recordAccountWithdrawal` in `account-withdrawal.ts` — when a PMG allocation withdrawal is recorded in the `ledger`.

```
Dr  3200  Owner Drawings            [withdrawal amount]
Cr  1001  Business Bank Account     [withdrawal amount]
```

**Important caveat:** Only post this journal entry if the withdrawal represents **actual cash leaving the business**. If the PMG allocation `ledger` entries are budget allocations (not actual cash flows), do NOT post journal entries — they would overstate drawings and understate the bank balance.

**Recommendation:** Ask Jacob to confirm whether `ledger` withdrawals always represent real cash movements (see Open Questions in Phase 1 doc). Until confirmed, add a `isCashWithdrawal: boolean` flag to the withdrawal UI and only post the journal entry when `true`.

---

### Posting Helper Design

```typescript
// packages/db/src/queries/accounting.ts — NEW FILE

import { db } from '../client';
import { journalEntries, journalEntryLines, chartOfAccounts } from '../schema/accounting';
import { income, expenses, ledger } from '../schema';

export interface PostingLine {
  accountCode: string;
  lineType: 'debit' | 'credit';
  amount: number;
  description?: string;
}

export interface PostingInput {
  entryDate: string;
  reference?: string;
  description: string;
  source: 'income_payment' | 'expense_payment' | 'owner_withdrawal' | 'manual' | 'opening_balance';
  incomeId?: string;
  expenseId?: string;
  ledgerEntryId?: string;
  lines: PostingLine[];
  createdBy: string;
}

/**
 * Posts a balanced journal entry in a single DB transaction.
 * Throws if debits !== credits (books would be out of balance).
 * Must be called from within an existing tx, or will create its own.
 */
export async function postJournalEntry(
  input: PostingInput,
  tx?: typeof db,
): Promise<string> {
  const client = tx ?? db;

  // 1. Validate balance
  const debits = input.lines
    .filter((l) => l.lineType === 'debit')
    .reduce((sum, l) => sum + l.amount, 0);
  const credits = input.lines
    .filter((l) => l.lineType === 'credit')
    .reduce((sum, l) => sum + l.amount, 0);

  if (Math.abs(debits - credits) > 0.001) {
    throw new Error(
      `Journal entry out of balance: debits ${debits.toFixed(2)} ≠ credits ${credits.toFixed(2)}`
    );
  }

  // 2. Resolve account IDs from codes
  const codes = [...new Set(input.lines.map((l) => l.accountCode))];
  const accounts = await client
    .select({ id: chartOfAccounts.id, code: chartOfAccounts.code })
    .from(chartOfAccounts)
    .where(inArray(chartOfAccounts.code, codes));

  const accountMap = Object.fromEntries(accounts.map((a) => [a.code, a.id]));

  for (const line of input.lines) {
    if (!accountMap[line.accountCode]) {
      throw new Error(`Chart of Accounts code not found: ${line.accountCode}`);
    }
  }

  // 3. Insert journal entry
  const [entry] = await client
    .insert(journalEntries)
    .values({
      entryDate: input.entryDate,
      reference: input.reference ?? null,
      description: input.description,
      source: input.source,
      incomeId: input.incomeId ?? null,
      expenseId: input.expenseId ?? null,
      ledgerEntryId: input.ledgerEntryId ?? null,
      createdBy: input.createdBy,
    })
    .returning({ id: journalEntries.id });

  // 4. Insert lines
  await client.insert(journalEntryLines).values(
    input.lines.map((line) => ({
      journalEntryId: entry!.id,
      accountId: accountMap[line.accountCode]!,
      lineType: line.lineType,
      amount: String(line.amount.toFixed(2)),
      description: line.description ?? null,
    })),
  );

  return entry!.id;
}
```

---

### DB Transaction Pattern

Wrap posting in the same DB transaction as the source record insert. This ensures atomicity: if the journal entry fails, the income/expense row also rolls back.

```typescript
// Example: createIncome Server Action with journal posting
await db.transaction(async (tx) => {
  const [incomeRow] = await tx.insert(income).values(incomeData).returning({ id: income.id });

  await postJournalEntry(
    {
      entryDate: incomeData.date,
      reference: incomeData.description,
      description: `Income: ${incomeData.description}`,
      source: 'income_payment',
      incomeId: incomeRow!.id,
      createdBy: session.user.id,
      lines: [
        { accountCode: '1001', lineType: 'debit',  amount: parsedAmount },
        { accountCode: '4000', lineType: 'credit', amount: parsedAmount },
      ],
    },
    tx, // pass the transaction client
  );
});
```

---

## Deliverable 7: Report Requirements

### MVP Reports (build in this order)

---

#### Report 1: Accounts Receivable

| | |
|---|---|
| **Purpose** | List all invoices that have been issued but not fully paid |
| **Required data** | `invoices` joined to `clients`, `divisions`; `payment_allocations` aggregated |
| **Key fields** | Client name, invoice number, invoice date, due date, invoice total, amount paid, outstanding balance, days outstanding, status |
| **Filters** | Division, date range, status (issued/partially_paid/overdue), client |
| **Route** | `/finance/ar` |
| **MVP or Future** | ✅ MVP |
| **Acceptance criteria** | Sum of outstanding balances matches expected AR; per-client totals correct; outstanding = invoice.total − sum(allocations) |

**Query basis:** `getClientOutstandingInvoices` already exists in `billing-payments.ts`. Promote to a query helper in `packages/db/src/queries/billing.ts` and build a route around it.

---

#### Report 2: Aged Receivables

| | |
|---|---|
| **Purpose** | Show outstanding invoices bucketed by how overdue they are |
| **Required data** | Same as AR, plus `dueDate` vs today for bucket calculation |
| **Buckets** | Current (not yet due), 1–14 days, 15–30 days, 31–60 days, 61+ days |
| **Filters** | Division, client |
| **Route** | `/finance/aged-receivables` |
| **MVP or Future** | ✅ MVP |
| **Acceptance criteria** | Each invoice appears in exactly one bucket; `getAgingReport()` already exists in `billing.ts` — use it |

**Note:** `getAgingReport()` is already implemented in `packages/db/src/queries/billing.ts`. The `aging-report-grid` component exists in `components/dashboard`. Build a dedicated report page using these.

---

#### Report 3: Profit & Loss

| | |
|---|---|
| **Purpose** | Revenue minus expenses for a selected period |
| **Required data** | `income` table (revenue), `expenses` table (costs) |
| **Format** | Revenue section, Expenses section (by category/account), Net Profit line |
| **Filters** | Date range, financial year, division |
| **Route** | `/finance/profit-loss` |
| **MVP or Future** | ✅ MVP |
| **Acceptance criteria** | Net profit = sum(income) − sum(expenses) for period; matches dashboard figures; CSV export available |

**After journal entries:** P&L can be rebuilt from `journal_entry_lines` grouped by account type (revenue vs expense). For MVP, build from `income` and `expenses` tables directly — faster to ship.

---

#### Report 4: General Ledger

| | |
|---|---|
| **Purpose** | Full transaction history per account — the source of truth |
| **Required data** | `journal_entry_lines` joined to `journal_entries`, `chart_of_accounts` |
| **Format** | Account header, then list of debit/credit entries with running balance |
| **Filters** | Account, date range, journal source |
| **Route** | `/finance/general-ledger` |
| **MVP or Future** | ✅ MVP (requires journal entries to be live first) |
| **Acceptance criteria** | Every posted transaction appears; running balance per account; total debits = total credits |

---

#### Report 5: Trial Balance

| | |
|---|---|
| **Purpose** | Confirm the books are balanced — sum of all debits = sum of all credits |
| **Required data** | `journal_entry_lines` grouped by account, summed by line_type |
| **Format** | Account code, account name, total debits, total credits, net balance |
| **Filters** | Date range (as-at date) |
| **Route** | `/finance/trial-balance` |
| **MVP or Future** | ✅ MVP (requires journal entries) |
| **Acceptance criteria** | Total debits column = total credits column; any imbalance is flagged prominently |

---

#### Report 6: Manual Bank/Cash Balance Summary

| | |
|---|---|
| **Purpose** | Show calculated running balance per internal bank/cash account |
| **Required data** | `bank_accounts.openingBalance` + sum of debit postings to account − sum of credit postings |
| **Format** | Account name, opening balance, total receipts, total payments, closing balance |
| **Filters** | Date range |
| **Route** | `/finance/bank-summary` |
| **MVP or Future** | ✅ MVP |
| **Acceptance criteria** | Closing balance = opening balance + receipts − payments; matches sum of income minus expenses in period |

---

#### Report 7: Income Report

| | |
|---|---|
| **Purpose** | All income entries with filters |
| **Required data** | `income` table with joins |
| **Filters** | Division, date range, client, source (invoice/manual) |
| **Route** | `/finance/income` (already partially exists under `/billing/payments`) |
| **MVP or Future** | ✅ MVP — already functional, needs minor enhancement |

---

#### Report 8: Expense Report

| | |
|---|---|
| **Purpose** | All expense entries with category breakdown |
| **Required data** | `expenses` table with joins |
| **Filters** | Division, date range, category |
| **Route** | `/finance/expenses` (already exists) |
| **MVP or Future** | ✅ MVP — already functional |

---

#### Report 9: Client Statement

| | |
|---|---|
| **Purpose** | Per-client view of all invoices, payments, and outstanding balance |
| **Required data** | `invoices`, `income`, `payment_allocations` for one client |
| **Filters** | Client, date range, year |
| **Route** | `/billing/statements/[clientId]` (already exists) |
| **MVP or Future** | ✅ MVP — already implemented |

---

#### Report 10: Division Performance

| | |
|---|---|
| **Purpose** | Revenue and expenses per division for a period |
| **Required data** | `income` and `expenses` grouped by `divisionId` |
| **Filters** | Date range, financial year |
| **Route** | `/insights/reports` (already exists, charts available) |
| **MVP or Future** | ✅ MVP — partially implemented, enhance with tabular data |

---

### Future Reports

| Report | Why Deferred |
|---|---|
| Balance Sheet | Requires equity opening balances and full double-entry history |
| Cash Flow Statement | Requires bank account tracking with proper categorisation |
| Aged Payables | Requires Accounts Payable module (supplier bills) |
| VAT Report | PMG not VAT registered |
| Bank Reconciliation Report | Requires bank CSV import or feeds |
| Asset Register | Requires `assets` table |
| Accountant Portal | Multi-user access for external accountant |

---

## Schema File Summary

### New file: `packages/db/src/schema/accounting.ts`

Contains:
- `accountTypeEnum`
- `chartOfAccounts`
- `journalSourceEnum`
- `journalEntries`
- `entryLineTypeEnum`
- `journalEntryLines`
- `bankAccountTypeEnum`
- `bankAccounts`

### New file: `packages/db/src/schema/audit.ts`

Contains:
- `auditActionEnum`
- `auditEntityEnum`
- `auditLogs`

### Modified file: `packages/db/src/schema/billing.ts`

- Add `isVatRegistered boolean NOT NULL DEFAULT false` to `organisationSettings`
- Add `defaultVatRate numeric(5,2) DEFAULT 15` to `organisationSettings`
- Add `financialYearStartMonth integer NOT NULL DEFAULT 3` to `organisationSettings`

### Modified file: `packages/db/src/schema/expenses.ts`

- Add `categoryId uuid REFERENCES expense_categories(id)` (nullable initially)

### Modified file: `packages/db/src/schema/income.ts`

- Add `incomeSource text DEFAULT 'manual'` (optional)
- Add `journalEntryId uuid REFERENCES journal_entries(id)` (after GL is live)

### New file: `packages/db/src/queries/accounting.ts`

- `postJournalEntry(input, tx?)` — posting helper
- `getGeneralLedger(filters)` — GL report query
- `getTrialBalance(asAtDate)` — trial balance query

### Update: `packages/db/src/schema/index.ts`

Export all new schema tables and enums.

---

## Migration Order

1. Add `is_vat_registered` to `organisation_settings` (safe ALTER, no data impact)
2. Create `chart_of_accounts` table + run seed migration
3. Create `bank_accounts` table
4. Create `journal_entries` table
5. Create `journal_entry_lines` table
6. Create `audit_logs` table
7. Add `category_id` to `expenses` (nullable) + backfill from `category` text
8. Add `income_source` to `income` (nullable with default)
9. Add `journal_entry_id` to `income` and `expenses` (after GL is verified live)

---

*Refer to `02-pmg-manual-bookkeeping-mvp-roadmap.md` for the phased implementation plan with effort estimates and development tasks.*
