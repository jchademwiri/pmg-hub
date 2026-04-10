# PMG Control Center — Financial Statements Module
### Feature Specification — Phase 11 (Financial Statements)

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-financial-statements.md` · March 2026 · v1.0
>
> This document specifies the three core financial statements to be added to
> `apps/admin`, plus the supporting database tables required to produce them.
> It follows the exact conventions established in Phases 0–3: Drizzle ORM,
> Server Actions, shadcn/ui, Zod validation, `revalidatePath`, no REST layer.

---

## Purpose of This Document

Every registered South African business — including PMG (PTY) Ltd — is legally
required to maintain financial records and produce financial statements for SARS,
CIPC, and its own management purposes. This document specifies exactly how the
PMG Control Center will generate all three core financial statements:

1. **Income Statement (Profit & Loss)** — what came in, what went out, and what
   was left over for a given period.
2. **Cash Flow Statement** — the actual movement of cash: how it arrived, how it
   was spent, and what the opening and closing bank balance was.
3. **Balance Sheet** — a snapshot of what PMG owns (assets), what it owes
   (liabilities), and the difference between the two (equity/net worth).

These are not dashboard charts. They are formal financial documents that match
the structure an accountant, SARS, or CIPC would expect to see.

---

## What We Are Building and Why

### The Goal

By the end of this phase, Jacob will be able to:

- Generate a formal P&L for any month, quarter, or year with one click
- See a cash flow statement that reconciles directly to his actual bank balance
- Produce a balance sheet showing PMG's net worth at any point in time
- Export any of the three statements as a clean PDF ready to share with an
  accountant or submit to SARS

### Why This Matters for PMG Specifically

PMG generated approximately R2.1M in revenue across the 12 months of seed data.
At that scale, informal financial tracking is a liability. SARS provisional tax
(IRP6) is filed twice a year and requires a reliable P&L. CIPC annual returns
signal a functioning company. Any future investor, bank loan, or business
partnership will require formal financial statements as a minimum. Building this
now — while the data is clean and the system is fresh — is the right time.

### Relationship to Existing Phases

This phase sits on top of everything already built:

```
Phase 0  — Foundation (schema, migrations, seed)            ✅ COMPLETE
Phase 1  — Financial Engine (queries, calculations)         ✅ COMPLETE
Phase 2  — Dashboard UI                                     ✅ COMPLETE
Phase 3  — Income Management                                ✅ COMPLETE
Phase 4  — Expense Management                               (next in queue)
Phase 5  — Leads Management                                 (planned)
Phase 6  — Division Management                              (planned)
Phase 7  — Financial Snapshots                              (critical — lock months)
Phase 8  — Reporting & Insights                             (charts)
Phase 9  — System Hardening                                 (auth, error bounds)
Phase 11 — Financial Statements  ← THIS DOCUMENT
```

> **Important:** Phase 7 (Financial Snapshots) must be completed before
> Phase 11 produces reliable historical statements. Without snapshots, editing
> a past income entry retroactively changes the P&L for that month. Phase 11
> can be built against live data for testing, but should only go into production
> use after Phase 7 is in place.

---

## Table of Contents

1. [What We Can Build Right Now vs What We Need to Add](#1-what-we-can-build-right-now-vs-what-we-need-to-add)
2. [New Database Tables Required](#2-new-database-tables-required)
3. [Schema — Drizzle Definitions](#3-schema--drizzle-definitions)
4. [How Each Statement is Calculated](#4-how-each-statement-is-calculated)
5. [Query Helpers](#5-query-helpers)
6. [Route Structure](#6-route-structure)
7. [Server Actions](#7-server-actions)
8. [UI Component Breakdown](#8-ui-component-breakdown)
9. [PDF Export Strategy](#9-pdf-export-strategy)
10. [Build Sequence](#10-build-sequence)
11. [System Rules](#11-system-rules)
12. [Updates to Existing Documentation](#12-updates-to-existing-documentation)

---

## 1. What We Can Build Right Now vs What We Need to Add

### Income Statement — Buildable Today ✅

All the data required for a formal P&L already exists in the database. The
`income` table holds all revenue. The `expenses` table holds all costs. The
financial engine in `lib/financial.ts` already computes PMG share, profit pool,
and all allocations. The only work needed is to shape this into a formal
document layout with a period selector and PDF export.

**No new tables required for the Income Statement.**

### Cash Flow Statement — Needs One New Table 🟡

PMG's income is recorded on the actual date payment was received (cash basis),
which is correct. The `withdrawals` table already captures owner salary
withdrawals. The expenses table captures operating costs. What is missing is:

1. **Bank account balance** — a way to record the opening balance of PMG's bank
   account so the system can verify that cash in matches cash out plus the
   closing balance.
2. **Capital expenditure flag** — the ability to mark an expense as a capital
   purchase (equipment, computer) so it flows into the Investing Activities
   section of the cash flow statement rather than Operating Activities.

**New table required: `bank_accounts`**
**New column required: `is_capital_expenditure` on `expenses`**

### Balance Sheet — Needs Two New Tables 🟡

A balance sheet requires knowing what PMG owns and what it owes. Currently the
system only tracks money flowing in and out — it has no record of physical assets
(equipment, computers, vehicles) or liabilities (loans, outstanding payments owed
to suppliers).

**New tables required: `assets` and `liabilities`**

---

## 2. New Database Tables Required

### Summary of All New Tables

| Table | Purpose | Required For |
|---|---|---|
| `bank_accounts` | Track PMG's bank account balances | Cash Flow Statement |
| `assets` | Track what PMG owns — equipment, computers, vehicles | Balance Sheet |
| `liabilities` | Track what PMG owes — loans, credit, outstanding payables | Balance Sheet |

### New Column on Existing Table

| Table | Column | Type | Purpose |
|---|---|---|---|
| `expenses` | `is_capital_expenditure` | boolean DEFAULT false | Flags equipment/asset purchases for the Investing Activities section of the cash flow statement |

---

## 3. Schema — Drizzle Definitions

Add these files to `packages/db/src/schema/`.

### `bank_accounts.ts`

Tracks PMG's real-world bank accounts. The balance is updated manually each time
Jacob reconciles with his actual bank statement. This keeps the system simple —
it does not attempt to be a full bank ledger.

```ts
import {
  boolean, date, index, numeric, pgTable,
  text, timestamp, uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id:           uuid("id").primaryKey().defaultRandom(),

    // Account identity
    name:         text("name").notNull(),
    // e.g. "PMG FNB Cheque Account", "Apex Web Solutions Savings"
    bankName:     text("bank_name").notNull(),
    // e.g. "FNB", "Standard Bank", "Capitec"
    accountNo:    text("account_no"),
    accountType:  text("account_type"),
    // e.g. "Cheque", "Savings", "Business Current"
    branchCode:   text("branch_code"),

    // Balance tracking — manually updated on reconciliation
    currentBalance:    numeric("current_balance", { precision: 12, scale: 2 })
                         .notNull().default("0"),
    lastReconciledDate: date("last_reconciled_date"),
    // The date Jacob last checked this balance against his bank statement

    // Flags
    isActive:     boolean("is_active").notNull().default(true),
    isPrimary:    boolean("is_primary").notNull().default(false),
    // isPrimary marks the main operating account used in the cash flow statement

    // Audit
    createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("bank_accounts_name_idx").on(t.name),
    index("bank_accounts_is_active_idx").on(t.isActive),
  ],
);

export type BankAccount    = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
```

### `assets.ts`

Tracks physical and intangible assets that PMG owns. These represent things of
lasting value — equipment, computers, vehicles. Each asset has a purchase value
and a current estimated value (manually updated). Assets appear on the Balance
Sheet under Current Assets or Fixed Assets depending on their type.

```ts
import {
  boolean, check, date, index, numeric, pgEnum,
  pgTable, text, timestamp, uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { divisions } from "./divisions";

export const assetTypeEnum = pgEnum("asset_type", [
  "fixed",    // long-term: equipment, vehicles, computers, furniture
  "current",  // short-term: cash equivalents, prepaid expenses
]);

export const assets = pgTable(
  "assets",
  {
    id:            uuid("id").primaryKey().defaultRandom(),

    // Identity
    name:          text("name").notNull(),
    // e.g. "MacBook Pro 14-inch", "Canon EOS Camera", "Company Vehicle"
    description:   text("description"),
    category:      text("category").notNull(),
    // Freeform: "Computer Equipment", "Camera & Lenses", "Furniture", "Software Licence"
    type:          assetTypeEnum("type").notNull().default("fixed"),

    // Division ownership — which division this asset primarily serves
    divisionId:    uuid("division_id")
                     .references(() => divisions.id, { onDelete: "set null" }),

    // Values
    purchaseDate:  date("purchase_date").notNull(),
    purchaseValue: numeric("purchase_value", { precision: 12, scale: 2 }).notNull(),
    // Original cost paid — never changes after entry
    currentValue:  numeric("current_value",  { precision: 12, scale: 2 }).notNull(),
    // Updated manually when Jacob estimates current worth (depreciation)

    // Disposal
    isDisposed:    boolean("is_disposed").notNull().default(false),
    disposalDate:  date("disposal_date"),
    disposalValue: numeric("disposal_value", { precision: 12, scale: 2 }),
    // If the asset was sold, the amount received

    // Audit
    createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:     timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("assets_purchase_value_positive", sql`${t.purchaseValue} > 0`),
    check("assets_current_value_non_negative", sql`${t.currentValue} >= 0`),
    index("assets_type_idx").on(t.type),
    index("assets_division_id_idx").on(t.divisionId),
    index("assets_is_disposed_idx").on(t.isDisposed),
    index("assets_purchase_date_idx").on(t.purchaseDate),
  ],
);

export type Asset    = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
```

### `liabilities.ts`

Tracks money PMG owes to external parties. This includes loans (e.g. a business
loan from a bank), outstanding supplier invoices not yet paid, and any other
financial obligation. Liabilities appear on the Balance Sheet and reduce PMG's
net worth (equity).

```ts
import {
  boolean, check, date, index, numeric, pgEnum,
  pgTable, text, timestamp, uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const liabilityTypeEnum = pgEnum("liability_type", [
  "short_term",  // due within 12 months: supplier invoices, credit card balance
  "long_term",   // due beyond 12 months: business loans, equipment finance
]);

export const liabilities = pgTable(
  "liabilities",
  {
    id:              uuid("id").primaryKey().defaultRandom(),

    // Identity
    name:            text("name").notNull(),
    // e.g. "FNB Business Loan", "Adobe CC Outstanding Invoice", "Equipment Finance"
    description:     text("description"),
    creditor:        text("creditor").notNull(),
    // Who PMG owes the money to: "FNB Bank", "Adobe Inc", "Capitec"
    type:            liabilityTypeEnum("type").notNull().default("short_term"),

    // Amounts
    originalAmount:  numeric("original_amount",  { precision: 12, scale: 2 }).notNull(),
    // The full amount when the liability was first recorded
    currentBalance:  numeric("current_balance",  { precision: 12, scale: 2 }).notNull(),
    // What is still owed — updated manually as payments are made
    interestRate:    numeric("interest_rate",     { precision: 5, scale: 2 }),
    // Annual interest rate as a percentage, if applicable

    // Dates
    startDate:       date("start_date").notNull(),
    dueDate:         date("due_date"),
    // For short-term: when payment is due. For loans: final repayment date.

    // Status
    isSettled:       boolean("is_settled").notNull().default(false),
    settledDate:     date("settled_date"),

    // Audit
    createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:       timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("liabilities_original_amount_positive",  sql`${t.originalAmount} > 0`),
    check("liabilities_current_balance_non_negative", sql`${t.currentBalance} >= 0`),
    index("liabilities_type_idx").on(t.type),
    index("liabilities_is_settled_idx").on(t.isSettled),
    index("liabilities_due_date_idx").on(t.dueDate),
  ],
);

export type Liability    = typeof liabilities.$inferSelect;
export type NewLiability = typeof liabilities.$inferInsert;
```

### Expense Table — Add `is_capital_expenditure` Column

This is an ALTER on the existing `expenses` table. Capital expenditure (CapEx)
expenses are asset purchases — they should not reduce operating profit but
instead appear as Investing Activities in the Cash Flow Statement and as assets
on the Balance Sheet.

```ts
// In packages/db/src/schema/expenses.ts — add this column to the existing definition:

isCapitalExpenditure: boolean("is_capital_expenditure").notNull().default(false),
// When true: this expense was an asset purchase (computer, camera, equipment).
// It flows into Investing Activities on the Cash Flow Statement.
// It should also be linked to a corresponding entry in the assets table.
```

### Barrel Export — Update `packages/db/src/schema/index.ts`

```ts
export * from "./aws";
export * from "./divisions";
export * from "./clients";
export * from "./income";
export * from "./expenses";
export * from "./leads";
export * from "./withdrawals";
export * from "./bank_accounts";  // NEW
export * from "./assets";         // NEW
export * from "./liabilities";    // NEW
```

### Migration Note

After adding the new schema files and the `is_capital_expenditure` column, run:

```bash
bun db:generate   # generates the SQL migration file
bun db:migrate    # applies it to Neon
```

The existing `expenses` table migration will use `ALTER TABLE expenses ADD COLUMN
is_capital_expenditure boolean NOT NULL DEFAULT false`. This is safe — all
existing expense rows will default to `false`.

---

## 4. How Each Statement is Calculated

### 4.1 Income Statement (Profit & Loss)

The Income Statement answers: **"Did PMG make money this period?"**

```
INCOME STATEMENT — [Period]
─────────────────────────────────────────────────────────

REVENUE
  Tender Edge Solutions                    R XX,XXX
  Apex Web Solutions                       R XX,XXX
  Playhouse Media Group                    R XX,XXX
                                          ─────────
  Total Revenue                            R XX,XXX

OPERATING EXPENSES
  Advertising                              R X,XXX
  Freelancers                              R X,XXX
  Hosting & Software                       R X,XXX
  Printing                                 R X,XXX
  Professional Services                    R X,XXX
  Transport                                R X,XXX
  General                                  R X,XXX
                                          ─────────
  Total Operating Expenses                 R XX,XXX

  Note: Capital expenditure (equipment purchases)
  is excluded from operating expenses and shown
  separately below.

GROSS PROFIT (Revenue − Operating Expenses)   R XX,XXX

PMG GROUP ALLOCATION (20% of Revenue)         R XX,XXX

PROFIT POOL (Gross Profit − PMG Allocation)   R XX,XXX

PROFIT POOL DISTRIBUTION
  Owner Salary       (35%)                R XX,XXX
  Reinvestment Fund  (30%)                R XX,XXX
  Reserve Fund       (30%)                R XX,XXX
  Flex Fund          (5%)                 R XX,XXX

CAPITAL EXPENDITURE (shown for completeness)  R XX,XXX
  (equipment purchases — not counted as operating expense)

OWNER WITHDRAWALS (actual salary taken)       R XX,XXX
```

**Calculation source:**

```ts
// All from existing queries — no new queries needed

revenue         = SUM(income.amount) for period
opExpenses      = SUM(expenses.amount WHERE is_capital_expenditure = false) for period
capEx           = SUM(expenses.amount WHERE is_capital_expenditure = true) for period
grossProfit     = revenue - opExpenses
pmgShare        = revenue * 0.20
profitPool      = grossProfit - pmgShare
withdrawals     = SUM(withdrawals.amount) for period

// Division breakdown from getRevenueByDivision() filtered by period
// Expense breakdown by category from expenses table grouped by category
```

### 4.2 Cash Flow Statement

The Cash Flow Statement answers: **"Where did the cash actually go?"**

It is structured into three sections matching the international standard:

```
CASH FLOW STATEMENT — [Period]
─────────────────────────────────────────────────────────

OPERATING ACTIVITIES
  (Cash received from clients and paid for day-to-day costs)

  Cash received from clients               R XX,XXX
    (= SUM income.amount for period)

  Cash paid for operating expenses        (R XX,XXX)
    (= SUM expenses.amount WHERE is_capital_expenditure = false)

  NET CASH FROM OPERATING ACTIVITIES       R XX,XXX

INVESTING ACTIVITIES
  (Cash spent on assets and equipment)

  Purchase of equipment / assets          (R XX,XXX)
    (= SUM expenses.amount WHERE is_capital_expenditure = true)

  Proceeds from asset disposal             R X,XXX
    (= SUM assets.disposalValue WHERE disposalDate in period)

  NET CASH FROM INVESTING ACTIVITIES      (R XX,XXX)

FINANCING ACTIVITIES
  (Cash flows related to owner and loans)

  Owner salary withdrawals                (R XX,XXX)
    (= SUM withdrawals.amount for period)

  Loans received                           R X,XXX
    (= liabilities where startDate in period)

  Loan repayments                         (R X,XXX)
    (= reduction in liabilities.currentBalance for period)

  NET CASH FROM FINANCING ACTIVITIES      (R XX,XXX)

─────────────────────────────────────────────────────────
NET CHANGE IN CASH                         R XX,XXX
  (Operating + Investing + Financing)

OPENING BANK BALANCE                       R XX,XXX
  (bank_accounts.currentBalance at start of period)

CLOSING BANK BALANCE                       R XX,XXX
  (Opening + Net Change in Cash)

ACTUAL BANK BALANCE (from reconciliation)  R XX,XXX
  (bank_accounts.currentBalance — manually updated)

VARIANCE                                   R X,XXX
  (Closing calculated vs Actual — should be R0 if fully reconciled)
```

**The variance check is the most important number on this statement.**
If calculated closing balance ≠ actual bank balance, something was not recorded.

### 4.3 Balance Sheet

The Balance Sheet answers: **"What is PMG worth right now?"**

```
BALANCE SHEET — as at [Date]
─────────────────────────────────────────────────────────

ASSETS
  Current Assets
    Cash and Bank Balances              R XX,XXX
      (= SUM bank_accounts.currentBalance WHERE is_active = true)
    Total Current Assets                R XX,XXX

  Fixed Assets
    Equipment at cost                   R XX,XXX
      (= SUM assets.purchaseValue WHERE type = 'fixed' AND is_disposed = false)
    Less: Accumulated depreciation     (R XX,XXX)
      (= SUM (purchaseValue - currentValue) WHERE type = 'fixed' AND is_disposed = false)
    Net Book Value of Fixed Assets      R XX,XXX

  TOTAL ASSETS                          R XX,XXX

─────────────────────────────────────────────────────────

LIABILITIES
  Current Liabilities
    Short-term liabilities              R XX,XXX
      (= SUM liabilities.currentBalance WHERE type = 'short_term' AND is_settled = false)
    Total Current Liabilities           R XX,XXX

  Long-term Liabilities
    Loans and financing                 R XX,XXX
      (= SUM liabilities.currentBalance WHERE type = 'long_term' AND is_settled = false)
    Total Long-term Liabilities         R XX,XXX

  TOTAL LIABILITIES                     R XX,XXX

─────────────────────────────────────────────────────────

EQUITY (Owner's Interest)
  Retained earnings                     R XX,XXX
    (= Total Assets - Total Liabilities)
    This represents PMG's net worth — what would remain
    if all assets were sold and all debts paid.

  TOTAL EQUITY                          R XX,XXX

─────────────────────────────────────────────────────────
TOTAL LIABILITIES + EQUITY              R XX,XXX
  (Must equal TOTAL ASSETS — the Balance Sheet must balance)
```

---

## 5. Query Helpers

Add these to `packages/db/src/queries.ts`:

```ts
// ── Income Statement ──────────────────────────────────────────────────────────

/**
 * Returns all data required to render an Income Statement for a period.
 * startExpr and endExpr are raw SQL date expressions (same pattern as
 * getFinancialSummaryForPeriod).
 */
export async function getIncomeStatementData(
  startExpr: string,
  endExpr: string
): Promise<{
  revenueByDivision: { divisionName: string; total: number }[];
  expensesByCategory: { category: string; total: number }[];
  capEx: number;
  totalRevenue: number;
  totalOpExpenses: number;
  grossProfit: number;
  pmgShare: number;
  profitPool: number;
  salary: number;
  reinvest: number;
  reserve: number;
  flex: number;
  withdrawalsTotal: number;
}> { ... }

/**
 * Returns revenue grouped by division for a specific date range.
 */
export async function getRevenueByDivisionForPeriod(
  startExpr: string,
  endExpr: string
): Promise<{ divisionName: string; total: number }[]> { ... }

/**
 * Returns expenses grouped by category for a period.
 * Excludes capital expenditure from operating expenses.
 */
export async function getExpensesByCategoryForPeriod(
  startExpr: string,
  endExpr: string
): Promise<{ category: string; total: number; isCapEx: boolean }[]> { ... }

// ── Cash Flow Statement ───────────────────────────────────────────────────────

/**
 * Returns all data required to render a Cash Flow Statement.
 * Includes operating cash flow, investing activities, financing activities,
 * and opening/closing bank balances.
 */
export async function getCashFlowData(
  startExpr: string,
  endExpr: string
): Promise<{
  operatingCashIn: number;
  operatingCashOut: number;
  netOperating: number;
  capExSpend: number;
  assetDisposalProceeds: number;
  netInvesting: number;
  ownerWithdrawals: number;
  loansReceived: number;
  loanRepayments: number;
  netFinancing: number;
  netChange: number;
  openingBalance: number;
  closingBalanceCalculated: number;
  closingBalanceActual: number;
  variance: number;
}> { ... }

// ── Balance Sheet ─────────────────────────────────────────────────────────────

/**
 * Returns all data required to render a Balance Sheet as at a specific date.
 */
export async function getBalanceSheetData(asAtDate: string): Promise<{
  // Assets
  bankBalances: { name: string; balance: number }[];
  totalCashAndBank: number;
  fixedAssets: { name: string; category: string; purchaseValue: number; currentValue: number; netValue: number }[];
  totalFixedAssetsAtCost: number;
  totalAccumulatedDepreciation: number;
  netFixedAssets: number;
  totalAssets: number;
  // Liabilities
  currentLiabilities: { name: string; creditor: string; balance: number; dueDate: string | null }[];
  totalCurrentLiabilities: number;
  longTermLiabilities: { name: string; creditor: string; balance: number; dueDate: string | null }[];
  totalLongTermLiabilities: number;
  totalLiabilities: number;
  // Equity
  equity: number;  // totalAssets - totalLiabilities
  totalLiabilitiesAndEquity: number;  // must equal totalAssets
}> { ... }

// ── Bank Account Management ───────────────────────────────────────────────────

export async function getAllBankAccounts(): Promise<BankAccount[]> { ... }
export async function getBankAccountById(id: string): Promise<BankAccount | null> { ... }
export async function updateBankBalance(id: string, balance: number, reconciledDate: string): Promise<void> { ... }

// ── Asset Management ──────────────────────────────────────────────────────────

export async function getAllAssets(includeDisposed?: boolean): Promise<Asset[]> { ... }
export async function getAssetById(id: string): Promise<Asset | null> { ... }
export async function getTotalAssetValue(): Promise<{ atCost: number; current: number }> { ... }

// ── Liability Management ──────────────────────────────────────────────────────

export async function getAllLiabilities(includeSettled?: boolean): Promise<Liability[]> { ... }
export async function getLiabilityById(id: string): Promise<Liability | null> { ... }
export async function getTotalLiabilities(): Promise<{ shortTerm: number; longTerm: number }> { ... }
```

---

## 6. Route Structure

Add these routes to `apps/admin/src/app/(admin)/`:

```
/reports                      ← existing stub — becomes the reports hub

/reports/income-statement     ← Income Statement with period selector
/reports/cash-flow            ← Cash Flow Statement with period selector
/reports/balance-sheet        ← Balance Sheet with date selector

/bank-accounts                ← List + manage PMG bank accounts
/bank-accounts/new            ← Add new bank account
/bank-accounts/[id]           ← Edit account / update balance (reconcile)

/assets                       ← List all assets (active + disposed)
/assets/new                   ← Add new asset
/assets/[id]                  ← Edit asset / update current value / mark disposed

/liabilities                  ← List all liabilities (active + settled)
/liabilities/new              ← Add new liability
/liabilities/[id]             ← Edit liability / update balance / mark settled
```

### API Route for PDF Export

```
GET /api/reports/income-statement/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/cash-flow/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/balance-sheet/pdf?asAt=YYYY-MM-DD
```

---

## 7. Server Actions

All actions in `apps/admin/src/app/actions/`:

### `actions/bank-accounts.ts`

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const BankAccountSchema = z.object({
  name:        z.string().min(1).max(100),
  bankName:    z.string().min(1).max(100),
  accountNo:   z.string().optional(),
  accountType: z.string().optional(),
  branchCode:  z.string().optional(),
  isPrimary:   z.coerce.boolean().default(false),
});

export async function createBankAccount(formData: FormData): Promise<{ error?: string }> {}
export async function updateBankAccount(id: string, formData: FormData): Promise<{ error?: string }> {}
export async function deleteBankAccount(id: string): Promise<{ error?: string }> {}

// Called when Jacob reconciles against his actual bank statement
export async function reconcileBankAccount(
  id: string,
  balance: number,
  date: string
): Promise<{ error?: string }> {}
```

### `actions/assets.ts`

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const AssetSchema = z.object({
  name:          z.string().min(1),
  description:   z.string().optional(),
  category:      z.string().min(1),
  type:          z.enum(['fixed', 'current']).default('fixed'),
  divisionId:    z.string().uuid().optional(),
  purchaseDate:  z.string().min(1),
  purchaseValue: z.coerce.number().positive(),
  currentValue:  z.coerce.number().min(0),
});

export async function createAsset(formData: FormData): Promise<{ error?: string }> {}
export async function updateAsset(id: string, formData: FormData): Promise<{ error?: string }> {}
export async function updateAssetValue(id: string, currentValue: number): Promise<{ error?: string }> {}
export async function disposeAsset(
  id: string,
  disposalDate: string,
  disposalValue: number
): Promise<{ error?: string }> {}
```

### `actions/liabilities.ts`

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const LiabilitySchema = z.object({
  name:           z.string().min(1),
  description:    z.string().optional(),
  creditor:       z.string().min(1),
  type:           z.enum(['short_term', 'long_term']).default('short_term'),
  originalAmount: z.coerce.number().positive(),
  currentBalance: z.coerce.number().min(0),
  interestRate:   z.coerce.number().min(0).optional(),
  startDate:      z.string().min(1),
  dueDate:        z.string().optional(),
});

export async function createLiability(formData: FormData): Promise<{ error?: string }> {}
export async function updateLiability(id: string, formData: FormData): Promise<{ error?: string }> {}
export async function updateLiabilityBalance(id: string, currentBalance: number): Promise<{ error?: string }> {}
export async function settleLiability(id: string, settledDate: string): Promise<{ error?: string }> {}
```

**All actions must:**
- Return `Promise<{ error?: string }>` — never throw
- Call `revalidatePath` on success only, inside the `try` block, never in `catch`
- Validate with Zod before any DB operation
- Revalidate: `/bank-accounts`, `/assets`, `/liabilities`, `/reports/balance-sheet`,
  `/reports/cash-flow` as appropriate

---

## 8. UI Component Breakdown

### Report Pages — Server Components

Each report page is an async Server Component that fetches data and passes it to
a client shell component for period switching (same pattern as the dashboard).

| Page | File | Description |
|---|---|---|
| Income Statement | `reports/income-statement/page.tsx` | Period selector + fetches data + renders `IncomeStatementShell` |
| Cash Flow | `reports/cash-flow/page.tsx` | Period selector + fetches data + renders `CashFlowShell` |
| Balance Sheet | `reports/balance-sheet/page.tsx` | Date picker + fetches data + renders `BalanceSheetShell` |

### Report Components

| Component | File | Description |
|---|---|---|
| `IncomeStatementShell` | `components/reports/income-statement-shell.tsx` | Client — period tab switcher, renders `IncomeStatementTable` |
| `IncomeStatementTable` | `components/reports/income-statement-table.tsx` | Server-safe — the actual formatted P&L with all line items |
| `CashFlowShell` | `components/reports/cash-flow-shell.tsx` | Client — period tab switcher, renders `CashFlowTable` |
| `CashFlowTable` | `components/reports/cash-flow-table.tsx` | The three-section cash flow layout |
| `BalanceSheetTable` | `components/reports/balance-sheet-table.tsx` | Assets / Liabilities / Equity layout with balance check |
| `ReportPeriodSelector` | `components/reports/report-period-selector.tsx` | Reusable date range picker used across all three reports |

### Management Pages — follow income management pattern exactly

| Page | Components | Notes |
|---|---|---|
| `/bank-accounts` | `BankAccountList`, `BankAccountAddForm` | Same pattern as `/income` |
| `/bank-accounts/[id]` | `BankAccountEditForm`, `ReconcileButton` | Edit + reconcile balance |
| `/assets` | `AssetList`, `AssetAddForm` | Filter by type, division, category |
| `/assets/[id]` | `AssetEditForm`, `UpdateValueButton`, `DisposeButton` | |
| `/liabilities` | `LiabilityList`, `LiabilityAddForm` | Filter by type, settled/active |
| `/liabilities/[id]` | `LiabilityEditForm`, `UpdateBalanceButton`, `SettleButton` | |

### Period Selector Logic

The Income Statement and Cash Flow Statement use the same period presets as the
dashboard, plus a custom date range option:

| Preset | Date range |
|---|---|
| This Month | `DATE_TRUNC('month', NOW())` → now |
| Last Month | Previous calendar month |
| This Quarter | Q1/Q2/Q3/Q4 of current year |
| Year to Date | Jan 1 → now |
| Last Year | Full previous financial year |
| Custom | User picks from/to date |

---

## 9. PDF Export Strategy

Use the same approach specified in `pmg-invoicing-module.md` — `@react-pdf/renderer`
running inside a Next.js Route Handler.

```
GET /api/reports/income-statement/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
  → Route Handler
  → getIncomeStatementData(startExpr, endExpr)
  → renderToStream(<IncomeStatementPDF data={data} />)
  → application/pdf response
```

### PDF Layout Structure

All three statement PDFs share the same letterhead:

```
[LETTERHEAD]
  Playhouse Media Group (PTY) Ltd
  285 Erasmus Ave, Raslouw AH, Centurion, 0157
  info@playhousemedia.net | Reg No: XXXX/XXXXXX/07

  [STATEMENT TITLE]
  For the period: [From] to [To]   OR   As at: [Date]
  Generated: [Today's date]

[STATEMENT BODY]
  ... all line items with amounts right-aligned ...

[FOOTER]
  "This statement was generated by the PMG Control Center."
  "For accounting and tax purposes, please verify with your accountant."
```

### V1 Rule

Text-only, no logo image, navy heading colour. Same rule as the invoicing module:
get it correct first, make it beautiful in v2.

---

## 10. Build Sequence

Build in this exact order. Each step is independently testable.

```
Step 1: Database migrations
  - Add bank_accounts.ts schema file
  - Add assets.ts schema file
  - Add liabilities.ts schema file
  - Add is_capital_expenditure column to expenses.ts
  - Update schema/index.ts barrel export
  - Run bun db:generate && bun db:migrate
  - Verify bun db:studio shows new tables and new column
  - Test: insert one bank account, one asset, one liability manually in db:studio

Step 2: Bank account management (required for cash flow statement)
  - /bank-accounts page + add form
  - createBankAccount, updateBankAccount, deleteBankAccount Server Actions
  - reconcileBankAccount Server Action
  - /bank-accounts/[id] edit page
  - Test: add PMG FNB Cheque Account with opening balance, reconcile it

Step 3: Asset management (required for balance sheet)
  - /assets page + add form
  - createAsset, updateAsset, updateAssetValue, disposeAsset Server Actions
  - /assets/[id] edit page
  - Test: add MacBook Pro (Nov 2025 purchase — R28,000 in seed data), update current value

Step 4: Liability management (required for balance sheet)
  - /liabilities page + add form
  - createLiability, updateLiability, updateLiabilityBalance, settleLiability Server Actions
  - /liabilities/[id] edit page
  - Test: add a test liability, update balance, mark as settled

Step 5: Income Statement
  - getIncomeStatementData() query helper
  - getRevenueByDivisionForPeriod() query helper
  - getExpensesByCategoryForPeriod() query helper (with is_capital_expenditure flag)
  - /reports/income-statement page
  - IncomeStatementShell + IncomeStatementTable components
  - Test: generate March 2026 P&L, verify numbers match dashboard totals

Step 6: Cash Flow Statement
  - getCashFlowData() query helper
  - /reports/cash-flow page
  - CashFlowShell + CashFlowTable components
  - Test: generate March 2026 cash flow, verify operating section matches income/expenses
  - Test: variance check — calculated closing balance vs bank_accounts balance

Step 7: Balance Sheet
  - getBalanceSheetData() query helper
  - /reports/balance-sheet page
  - BalanceSheetTable component
  - Test: generate balance sheet, verify totalAssets == totalLiabilities + equity

Step 8: PDF export
  - Install @react-pdf/renderer
  - Route Handler: /api/reports/income-statement/pdf
  - Route Handler: /api/reports/cash-flow/pdf
  - Route Handler: /api/reports/balance-sheet/pdf
  - IncomeStatementPDF, CashFlowPDF, BalanceSheetPDF components
  - Test: download all three PDFs, verify layout and numbers are correct

Step 9: Sidebar navigation update
  - Add "Bank Accounts", "Assets", "Liabilities" to sidebar nav
  - Group under a "Finance" section or add directly after "Expenses"
  - Update /reports/page.tsx to show links to all three statement pages

Step 10: Dashboard integration (optional but valuable)
  - Add a small Balance Sheet KPI card to the dashboard:
    "Net Worth: R XX,XXX" (totalAssets - totalLiabilities)
  - Add bank balance to the salary card area as a reference figure
```

---

## 11. System Rules

These rules govern how financial statements work and must not be violated:

1. **Capital expenditure is never an operating expense.** Computers, cameras,
   and equipment purchased must be flagged `is_capital_expenditure = true`. They
   belong in the Investing Activities section of the cash flow statement and as
   assets on the balance sheet — not as operating costs that reduce the profit
   pool.

2. **Bank balance is manually reconciled, not auto-calculated.** The system
   calculates what the bank balance *should* be from transactions. The actual
   balance is what Jacob enters after checking his bank statement. The variance
   between these two is the integrity check. A variance of R0 means the books
   are clean.

3. **Assets must be entered at purchase cost.** The `purchaseValue` field never
   changes after the first entry — it is the historical cost. The `currentValue`
   field is updated over time to reflect depreciation or revaluation.

4. **Liabilities must be updated when payments are made.** When PMG makes a
   repayment on a loan or pays off a supplier, the `currentBalance` on the
   liability must be reduced. This is a manual step — the system does not
   auto-deduct from liabilities when an expense is recorded.

5. **The balance sheet must balance.** Total Assets must equal Total Liabilities
   plus Equity. If it does not balance, there is a data entry error somewhere.
   The UI must display a clear warning when this condition is not met.

6. **Salary withdrawals are a financing activity, not an operating expense.**
   They are sourced from the `withdrawals` table and always appear in the
   Financing Activities section of the cash flow statement. They must never be
   entered in the `expenses` table. (This rule already exists in Phase 1 — it
   is restated here because it directly affects how the cash flow statement
   balances.)

7. **Phase 7 snapshots must precede historical reporting in production.** Until
   financial snapshots are in place, generating a P&L for a past month will
   include any edits made to that month's data after it closed. This is
   acceptable for internal management use but not for SARS submissions.

---

## 12. Updates to Existing Documentation

The following changes should be made to existing docs when this phase is
added to the development plan:

### `docs/pmg-admin-development-phases.md`

**Update Phase 8 — Reporting & Insights** to reflect that the three existing
chart components (`MoMComparisonChart`, `RevenueByDivisionChart`,
`RevenueVsExpensesChart`) remain in scope for Phase 8 alongside the wiring of
`/reports/page.tsx`. Phase 8 is purely charts and trend analysis — Phase 11
handles the formal financial statement documents.

**Add Phase 11 — Financial Statements** (this document) to the phase table:

| Phase | Name | Summary |
|---|---|---|
| 11 | Financial Statements | Income Statement, Cash Flow Statement, Balance Sheet — with PDF export |

**Add to Admin URL Structure** (`docs/pmg-admin-specification.md`):

```
/reports/income-statement  → Income Statement (P&L) with period selector
/reports/cash-flow         → Cash Flow Statement with period selector
/reports/balance-sheet     → Balance Sheet as at a selected date
/bank-accounts             → PMG bank account management and reconciliation
/assets                    → Asset register — equipment and fixed assets
/liabilities               → Liability register — loans and outstanding payables
```

**Add to Database Schema section** (`docs/pmg-admin-specification.md`):

```
bank_accounts
  id, name, bank_name, account_no, account_type, branch_code,
  current_balance, last_reconciled_date, is_active, is_primary,
  created_at, updated_at

assets
  id, name, description, category, type (fixed|current), division_id,
  purchase_date, purchase_value, current_value,
  is_disposed, disposal_date, disposal_value,
  created_at, updated_at

liabilities
  id, name, description, creditor, type (short_term|long_term),
  original_amount, current_balance, interest_rate,
  start_date, due_date, is_settled, settled_date,
  created_at, updated_at
```

**Add to System Rules:**

```
10. Capital expenditure must be flagged on the expenses table using the
    is_capital_expenditure boolean. This separates operating costs from
    asset purchases in both the Income Statement and Cash Flow Statement.

11. Bank account balances are manually reconciled — the system shows what
    the balance should be from transactions, and the actual balance is what
    the owner enters after checking their real bank statement.

12. Assets are recorded at purchase cost and current value. Purchase cost
    never changes. Current value is updated manually to reflect depreciation.

13. Liabilities are updated manually when payments are made. The system
    does not auto-deduct from a liability when an expense is recorded.
```

### `docs/pmg-financial-model.md`

**Update Section 5 (Database Structure)** to mention the three new tables
and their role in the financial model.

**Add Section 10 — Financial Statements Model:**

The financial model powering the statements is an extension of the existing
P&L model. The Income Statement is the most direct output of the model as
already specified. The Cash Flow Statement adds the dimension of actual cash
movement vs theoretical profit. The Balance Sheet adds the dimension of
accumulated wealth over time (equity = all profits retained minus all losses
minus all withdrawals, expressed as assets minus liabilities).

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
*"Every rand has a job. Every statement tells the truth about the work."*
