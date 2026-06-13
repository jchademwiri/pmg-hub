# PMG Control Center — Accounting Readiness Improvement Audit

> **Audit Date:** June 2026  
> **Scope:** All modules in `apps/admin` and `packages/db`  
> **Goal:** Review, polish, and strengthen the existing system so that double-entry accounting modules (Chart of Accounts, Journal Entries, General Ledger, Trial Balance, P&L, Balance Sheet, AR/AP, Cash/Bank) can be built on a clean, reliable foundation.

---

## Table of Contents

1. [Current System Review](#1-current-system-review)
2. [UI/UX Audit](#2-uiux-audit)
3. [Data Flow and Business Logic Audit](#3-data-flow-and-business-logic-audit)
4. [Database and Schema Audit](#4-database-and-schema-audit)
5. [Billing and Finance Readiness](#5-billing-and-finance-readiness)
6. [Code Quality and Architecture Audit](#6-code-quality-and-architecture-audit)
7. [Security, Permissions, and Access Control](#7-security-permissions-and-access-control)
8. [Reporting and Dashboard Audit](#8-reporting-and-dashboard-audit)
9. [Accounting Module Readiness Assessment](#9-accounting-module-readiness-assessment)
10. [Final Recommendations](#10-final-recommendations)

---

## 1. Current System Review

### 1.1 What Exists

The PMG Control Center is a Next.js 15 admin app with the following operational modules:

| Module | Tables | Status | Notes |
|---|---|---|---|
| **Clients** | `clients` | ✅ Complete | Business name + individual name, email, phone, active flag |
| **Divisions** | `divisions` | ✅ Complete | Name, active flag; FK from most financial tables |
| **Leads** | `leads` | ✅ Complete | Status workflow (new → contacted → converted/lost), source tracking |
| **Quotations** | `quotations`, `billing_line_items` | ✅ Functional | Status workflow (draft → sent → accepted/declined/expired → converted/cancelled) |
| **Invoices** | `invoices`, `billing_line_items` | ✅ Functional | Status workflow (draft → issued → partially_paid/paid/overdue/void) |
| **Payments/Income** | `income`, `payment_allocations` | ✅ Functional | Cash-basis income tracking; many-to-many allocation to invoices |
| **Expenses** | `expenses`, `expense_categories` | ✅ Functional | Category-based, optional client link |
| **Ledger (PMG Buckets)** | `ledger` | ✅ Functional | Salary/Reinvest/Reserve/Flex/PMG Share allocation tracking |
| **Snapshots** | `snapshots` | ✅ Functional | Monthly period snapshots for financial reporting |
| **Billing Items** | `billing_items` | ✅ Functional | Catalogue of reusable billable items |
| **Settings** | `organisation_settings`, `division_billing_settings` | ✅ Functional | Per-division VAT rate, payment terms, bank details |
| **Auth** | `user`, `session`, `account`, `verification` | ✅ Functional | Better Auth with magic link, role system (super_admin/admin/viewer) |
| **Invitations** | `invitations` | ✅ Functional | Role-based invitation system with expiry |
| **Document Preview** | — | ✅ Functional | Print-ready PDF preview for invoices, quotes, and statements |
| **Reports** | — | ✅ Functional | P&L charts, MoM comparison, revenue by division, expense categories |
| **Dashboard** | — | ✅ Functional | KPI grid, ageing report, division revenue chart, budget cards |

### 1.2 What Is Working Well (Preserve)

- **Polymorphic line items** — `billing_line_items` uses `document_type` + `document_id` to serve both quotes and invoices. This is a clean pattern.
- **Document numbering** — `document_sequences` with `SELECT ... FOR UPDATE` locking prevents duplicate numbers under concurrency.
- **Payment allocation model** — `payment_allocations` junction table with FIFO/LIFO spread logic is well-designed and handles partial payments correctly.
- **Period locking** — `snapshots`-based period close with the grace-period rule (days 1-5) is a solid cash-basis pattern.
- **Role-based auth** — Better Auth with magic link, role hierarchy, and invitation system is modern and secure.
- **SAST-aware date handling** — `getSASTParts()` and `fmtDateLong()` ensure consistent South African timezone handling.
- **Self-healing migration patterns** — The `payments/page.tsx` backfill check for missing `payment_allocations` is pragmatic.
- **Collapsible sidebar** — Well-organized navigation groups with auto-open for active section.

### 1.3 Key Inconsistencies & Weaknesses

| Issue | Location | Severity |
|---|---|---|
| **VAT hardcoded at 15%** in `calcTotals()` and `calcDocumentTotals()` — no `isVatRegistered` guard | `billing-invoices.ts`, `billing-quotes.ts` | 🔴 High |
| **`vatRate` always set to `'0'`** in line item inserts despite schema supporting per-item VAT | `billing-invoices.ts:120`, `billing-quotes.ts:98` | 🟡 Medium |
| **Hardcoded 15% VAT in `document-preview.tsx`** `vatRate = 15` — not using division's `defaultVatRate` | `document-preview.tsx` | 🟡 Medium |
| **`divisionBillingSettings.defaultVatRate`** defaults to `"15"` in schema but is never read by `calcTotals()` | `billing.ts` schema, `billing-invoices.ts` | 🟡 Medium |
| **No `isVatRegistered` flag** on division settings — VAT can be toggled per-document but org-wide VAT status is untracked | Schema | 🟡 Medium |
| **No database transactions** — `recordClientPayment()` does 4+ sequential writes (income insert → allocations → invoice status updates → email dispatch) with no rollback protection | `billing-payments.ts` | 🔴 High |
| **No audit trail** — Zero audit table exists for financial mutations (payment edits, deletions, invoice status changes) | Entire codebase | 🔴 High |
| **`ledger` is NOT a General Ledger** — Tracks salary/reinvest/reserve/flex/PMG buckets only, not accounting accounts | `schema/ledger.ts` | 🔴 High |
| **`incomeId` on invoices is legacy** — Comment says "Legacy backwards compatibility" in `billing-payments.ts:165` | `billing-payments.ts` | 🟡 Medium |
| **`hasQuotationReferenceColumn()` and `hasBillingLineItemItemIdColumn()`** — Runtime column detection for migration compatibility adds complexity throughout queries and actions | `queries/billing.ts`, `billing-line-item-compat.ts` | 🟡 Medium |
| **`expenses` has a free-text `category` field** — Not FK-constrained to `expense_categories`, allowing orphaned categories | `schema/expenses.ts` | 🟡 Medium |
| **`income` table has no `source` or `paymentMethod`** — Impossible to distinguish cash/EFT/card/retainer payments | `schema/income.ts` | 🟡 Medium |
| **No `reference` column check on quotations** — Server action queries `information_schema` at runtime (see `hasQuotationReferenceColumn`) | `billing-quotes.ts`, `queries/billing.ts` | 🟡 Medium |
| **`email` package is used but not fully integrated** — Resend email sending with `@pmg/emails` but no sent-email tracking table | `billing-payments.ts` | 🟢 Low |

---

## 2. UI/UX Audit

### 2.1 Page Layout & Navigation

**✅ Good:**
- Collapsible sidebar groups with auto-open for active section
- Breadcrumb in top nav with dynamic labels from nav-data.ts
- Responsive: Sidebar collapses on mobile with sheet drawer
- Consistent card-based page layouts across listing pages
- Page totals in top nav (e.g., outstanding invoices, total received)

**⚠️ Issues Found:**

**Missing Loading States**
- Pages use `force-dynamic` but no `loading.tsx` or `Suspense` boundaries exist. Users see blank pages while data fetches.
- Particularly problematic on `/dashboard` which makes ~12 parallel DB queries.
- **Affected routes:** All (30+ page files)

**Missing Error Boundaries**
- No `error.tsx` files exist for any route group. DB failures show Next.js error overlay in dev, blank page in production.
- Server actions have try-catch but page-level data fetching does not.
- **Affected routes:** All

**Empty States**
- Many listing pages have no dedicated empty state component.
- `Invoices list` — shows empty table with headers when no data.
- `Payments list` — same issue.
- `Expenses list` — same issue.
- **Exception:** `/insights/reports` uses `<EmptyState>` component. This pattern should be standardized.

**Inconsistent Table Patterns**
- Some tables use pagination (invoices, payments, expenses) with server-side pagination.
- Others (clients, divisions, ledger entries) have no pagination at all.
- Filter bar pattern exists for `expenses` and `payments` but not for `invoices` or `leads`.

**Navigation Gaps**
- No "View Client" link from invoice detail page.
- No "View Division" link from invoice/quote detail pages.
- No back-navigation patterns on detail pages.
- Statements page (`/billing/statements`) has a client selector but no way to navigate back to a client's statement from the client detail page.

**Mobile Responsiveness**
- Table horizontal overflow is not handled consistently — some tables wrap, others overflow.
- The document preview component (`document-preview.tsx`) uses fixed-width `max-w-[794px]` which breaks on mobile.
- The ageing report table on the dashboard uses `grid` layout that may overflow on small screens.

**Form UX**
- Invoice/Quote create forms use `Select` for catalogue items but the dropdown can be very long (no search).
- Date inputs are plain text fields — no date picker component.
- No dirty-form detection — navigating away loses unsaved changes without warning.
- No form autosave/draft persistence.

### 2.2 Recommended UI/UX Improvements

| Priority | Improvement | Location |
|---|---|---|
| 🔴 High | Add `loading.tsx` and `Suspense` boundaries to all route groups | Each `(admin)` route group |
| 🔴 High | Add `error.tsx` to `(admin)` and `(auth)` route groups | Root and group levels |
| 🟡 Medium | Standardize empty states across all list pages | Listing pages |
| 🟡 Medium | Add search to catalogue item dropdown in line items form | `billing-line-items-form.tsx` |
| 🟡 Medium | Add date picker component for date fields | Shared UI |
| 🟡 Medium | Add back-navigation links on detail pages | Invoice/Quote/Client detail pages |
| 🟡 Medium | Add horizontal scroll containment to all data tables | Table components |
| 🟢 Low | Add dirty-form detection with navigation guard | Form components |
| 🟢 Low | Standardize filter bar pattern across all list pages | Billing/quotes, leads |

---

## 3. Data Flow and Business Logic Audit

### 3.1 Invoice Lifecycle

```
Draft → Issued → Partially Paid → Paid
  → Void (from draft/issued/overdue only)
  → Overdue (auto when past due date)
```

**🔴 Issues Found:**

1. **No overdue auto-detection.** The "overdue" status exists in the enum but no scheduled job or trigger sets it. Invoices past their due date remain "issued" indefinitely.
2. **No db.transaction() in createInvoice.** Invoice insert + line item insert are two separate writes with no rollback. If line items fail, a ghost invoice remains.
3. **No db.transaction() in updateInvoice.** Delete old line items + update invoice + insert new line items — any step can fail mid-way.
4. **No permission check on `issueInvoice`.** Any authenticated user can issue an invoice regardless of role.
5. **`bulkIssueInvoices` and `bulkVoidInvoices`** have no period lock check. Draft invoices from closed periods could be issued.
6. **`convertQuoteToInvoice`** creates invoice with `status: 'draft'` — but the quote was already accepted. Should the invoice auto-issue?

### 3.2 Payment Lifecycle

```
Income Record → Payment Allocation(s) → Invoice Status Updates
```

**🔴 Issues Found:**

1. **No db.transaction() in `recordClientPayment`.** The function does: income INSERT → N× allocation INSERTs → N× invoice status UPDATEs. Any mid-way failure leaves the system in an inconsistent state.
2. **No `payment_allocations` integrity constraint.** There is no CHECK constraint ensuring `amount <= invoice.total - SUM(other allocations)`.
3. **FIFO/LIFO logic in `adjustClientPayment` and `updateClientPayment`** is complex and duplicate code between the two functions (~80 lines repeated). Should be extracted.
4. **`incomeId` legacy field on invoices** — set to null when partially paid, set to payment ID when fully paid. But with multi-payment per invoice (via payment_allocations), this field is misleading. Code comment says "Legacy backwards compatibility."
5. **No payment method tracking.** Cash, EFT, card, retainer — all are indistinguishable.
6. **Email dispatch is fire-and-forget** with no retry or delivery tracking.

### 3.3 Quote Lifecycle

```
Draft → Sent → Accepted → Converted
  → Declined
  → Cancelled
  → Expired
```

**🔴 Issues Found:**

1. **No db.transaction() in `createQuotation` or `updateQuotation`.** Same ghost-row risk as invoices.
2. **No expiry auto-detection.** Quotes past their `expiryDate` remain in "sent" status forever.
3. **Status transition validation is weak.** The allowed transitions map only covers: `draft→[sent,cancelled]`, `sent→[accepted,declined,cancelled]`. It does not handle `accepted→converted`.
4. **No `convertedInvoiceId` in schema.** Instead queried via reverse lookup (`invoices WHERE quotation_id = ?`). This works but an explicit FK would be cleaner.

### 3.4 Expense Lifecycle

```
Create → View → Edit → Delete
```

**🔴 Issues Found:**

1. **No expense approval workflow.** Expenses are created directly with no review/approval step.
2. **Category is free-text** — no FK to `expense_categories`. If a category is renamed or deleted, old expenses retain the old name string.
3. **No receipt attachment support.** No `receipt_url` or `attachment` field.
4. **No expense type classification.** No way to distinguish operating expense vs COGS vs capital expenditure.

### 3.5 Ledger (PMG Buckets) Lifecycle

```
Revenue → Profit Pool Calculation → Bucket Allocation → Withdrawal
```

**🔴 Issues Found:**

1. **Hardcoded allocation rates in `accounts.ts`** — `pmg_share: 0.25`, `salary: 0.35`, `reinvest: 0.30`, etc. Changing rates requires a code deploy.
2. **The ledger is NOT an accounting General Ledger.** It tracks profit-pool distribution across PMG internal buckets. This is a management accounting tool, not financial accounting.
3. **No ledger entry reversal** — if an entry is entered in error, it must be deleted (hard delete, no trace). A reversing entry pattern would be better.
4. **The `getLedgerBalances` function recalculates everything from scratch** — it sums all income, all expenses, applies rates, subtracts ledger spends. This is O(n) on every page load and duplicates snapshot logic.

---

## 4. Database and Schema Audit

### 4.1 Schema Overview

| Table | PK | FKs | Indexes | Checks |
|---|---|---|---|---|
| `clients` | `uuid` | — | name, email (unique where not null) | — |
| `divisions` | `uuid` | — | name | — |
| `leads` | `uuid` | division_id (SET NULL) | status, created_at, email, division_id | email OR phone required |
| `quotations` | `uuid` | division_id (RESTRICT), client_id (RESTRICT) | division_id, client_id, status, quote_date | total >= 0 |
| `invoices` | `uuid` | division_id (RESTRICT), client_id (RESTRICT), income_id (SET NULL) | division_id, client_id, status, invoice_date, quotation_id | total >= 0 |
| `billing_line_items` | `uuid` | item_id (SET NULL) — NO FK to document_id | (document_type, document_id), item_id | quantity > 0, unit_price >= 0 |
| `billing_items` | `uuid` | — | status, name | — |
| `income` | `uuid` | division_id (RESTRICT), client_id (RESTRICT) | date, division_id, client_id | amount > 0 |
| `expenses` | `uuid` | division_id (RESTRICT), client_id (SET NULL) | date, division_id, category, client_id | amount > 0 |
| `expense_categories` | `uuid` | — | — | — |
| `ledger` | `uuid` | — | date, allocation_type | amount > 0 |
| `snapshots` | `uuid` | — | period | — |
| `payment_allocations` | `uuid` | income_id (CASCADE), invoice_id (RESTRICT) | income_id, invoice_id | — |
| `document_sequences` | `uuid` | division_id (RESTRICT) | (division_id, document_type, year) UNIQUE | — |
| `division_billing_settings` | `uuid` | division_id (CASCADE, UNIQUE) | — | — |
| `organisation_settings` | `uuid` | — | — | — |
| `invitations` | `uuid` | invited_by → user.id | — | — |
| `user` | `text` | — | — | — |
| `session` | `text` | user_id (CASCADE) | user_id | — |
| `account` | `text` | user_id (CASCADE) | user_id | — |

### 4.2 Issues Found

**🔴 High:**

1. **No `isVatRegistered` flag.** The system has `vatEnabled` per document but no org-wide or division-level VAT registration flag. Accounting needs to know if VAT is applicable at all.
2. **`expenses.category` is free-text (TEXT, no FK).** The `expense_categories` table exists but expenses don't reference it. This creates data integrity issues for accounting categorization.
3. **`income` lacks payment metadata.** No `payment_method`, `reference_number`, `bank_reference`, or `source` fields. Accounting needs to reconcile payments to bank statements.
4. **No audit/change tracking.** None of the financial tables have an associated audit log table. Hard to detect unauthorized changes or debug data issues.
5. **No `transaction_id` or correlation ID.** Related financial events (e.g., an invoice payment that creates an income record + allocation + status update) cannot be grouped.

**🟡 Medium:**

6. **`invoices.incomeId` is a legacy single-payment FK** that conflicts with the many-to-many payment_allocations model. Should be deprecated and removed.
7. **`quotations.reference` column detection at runtime** — The server action checks `information_schema` at runtime. This should have been a migration, not runtime detection.
8. **`billing_line_items.itemId` column detection at runtime** — Same pattern. Runtime column detection adds ~50ms per query.
9. **`invoices.quotationId` has NO FK constraint** — Comment says "soft reference to avoid circular dependency." Application-layer integrity only.
10. **`billing_line_items.documentId` has NO FK constraint** — Polymorphic references mean no DB-level referential integrity.
11. **No composite indexes on date-range queries** — Queries filter by `(division_id, date)` but indexes are only on individual columns.

**🟢 Low:**

12. **`organisation_settings` is a singleton** — No mechanism enforces single-row. Application must handle this.
13. **`ledger` has no FK to user** — `created_by` is TEXT with no constraint.
14. **No `updatedAt` trigger on tables** — Comments acknowledge this: "managed by application layer." Direct SQL edits leave stale timestamps.
15. **`expense_categories` has no status/archived flag** — Categories cannot be soft-deactivated.

### 4.3 Schema Changes Needed Before Accounting

```sql
-- 1. Add is_vat_registered to division_billing_settings
ALTER TABLE division_billing_settings ADD COLUMN is_vat_registered BOOLEAN DEFAULT false;

-- 2. Add payment_method to income
ALTER TABLE income ADD COLUMN payment_method TEXT;
ALTER TABLE income ADD COLUMN reference_number TEXT;

-- 3. Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  old_data JSONB,
  new_data JSONB,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add FK from expenses.category to expense_categories.name
-- (Requires migration of existing free-text categories first)
ALTER TABLE expenses ADD COLUMN expense_category_id UUID REFERENCES expense_categories(id);

-- 5. Add category and source to income
ALTER TABLE income ADD COLUMN income_category TEXT;
ALTER TABLE income ADD COLUMN source TEXT;

-- 6. Deprecate invoices.income_id
-- Track usage, then drop in a future migration
```

---

## 5. Billing and Finance Readiness

### 5.1 Current State: Cash-Basis, Single-Entry

The current system is **cash-basis, single-entry bookkeeping**:

| Concept | Current Implementation | Accounting Requirement |
|---|---|---|
| Revenue recognition | When cash is received (income table) | When invoiced (accrual) or when cash received (cash basis) |
| Expense tracking | When cash is spent | When incurred (accrual) or when cash spent (cash basis) |
| Invoice → Revenue link | Via `income_id` FK + `payment_allocations` | Via Journal Entry (Dr Bank, Cr Revenue) |
| Client balances | Computed on-the-fly (SUM income - SUM allocations) | Stated in AR subledger |
| Asset tracking | None | Cash/Bank accounts, Accounts Receivable |
| Liability tracking | None | Accounts Payable, Deferred Revenue |
| Equity tracking | PMG ledger (salary/reinvest/reserve/flex) | Capital accounts, Retained Earnings |
| Double-entry | None | Debits always equal credits |

### 5.2 What Belongs to Billing vs Accounting

**Billing Operations (keep in current system):**
- Quote creation, approval, sending
- Invoice creation, issuing, delivery
- Payment receipt and allocation
- Payment reminders, overdue tracking
- Document numbering, preview, PDF export
- Client-facing statements

**Accounting (to be built separately):**
- Chart of Accounts (COA)
- Journal Entries (double-entry posting)
- General Ledger (account-level history)
- Trial Balance (debit = credit verification)
- Financial Statements (P&L, Balance Sheet, Cash Flow)
- AR/AP subledgers
- Bank/Cash account reconciliation
- Audit trail

### 5.3 The Bridging Pattern

The billing system should **post journal entries** when financial events occur:

| Billing Event | Accounting Posting |
|---|---|
| Invoice issued | Dr Accounts Receivable, Cr Revenue |
| Payment received | Dr Bank/Cash, Cr Accounts Receivable |
| Refund issued | Cr Bank/Cash, Dr Accounts Receivable (or Dr Revenue) |
| Expense recorded | Dr Expense account, Cr Bank/Cash (or AP) |
| Quote → Invoice converted | No entry (quote is not a financial event) |
| Period closed | Dr Revenue, Cr Retained Earnings (or equivalent) |

**Key Principle:** The billing system remains the operational source of truth. The accounting module reads billing events and posts corresponding journal entries. This separation means:
- Deleting an invoice in billing should NOT automatically delete accounting entries.
- Voiding an invoice should trigger a **reversing journal entry**, not a deletion.
- The accounting module has its own lifecycle and approval workflow.

### 5.4 Critical Fixes Before Accounting

1. **Add `db.transaction()` wrappers** around all multi-step financial writes
2. **Add audit logging** for all financial mutations
3. **Deprecate `invoices.incomeId`** — payment_allocations is the correct model
4. **Add payment method tracking** to income records
5. **Add VAT registration guard** (org/division level toggle)
6. **Add expense category FK** constraint
7. **Add overdue auto-detection** for invoices
8. **Extract shared FIFO/LIFO allocation logic** from duplicate code in billing-payments.ts

---

## 6. Code Quality and Architecture Audit

### 6.1 Folder Structure

```
apps/admin/src/
  ├── app/                    # Next.js App Router
  │   ├── (admin)/            # Authenticated routes
  │   │   ├── billing/        # Invoices, quotes, payments, items, statements
  │   │   ├── dashboard/      # KPI dashboard
  │   │   ├── finance/        # Expenses, categories, ledger, accounts
  │   │   ├── insights/       # Snapshots, reports
  │   │   ├── relationships/  # Clients, leads, divisions
  │   │   └── settings/       # Org, billing, security, users, data
  │   ├── (auth)/             # Login, invite
  │   └── actions/            # Server actions (flat list)
  ├── components/
  │   ├── accounts/           # Account card components
  │   ├── billing/            # Invoice/quote/payment components
  │   ├── clients/            # Client CRUD components
  │   ├── dashboard/          # Dashboard cards, charts
  │   ├── divisions/          # Division CRUD components
  │   ├── expense-categories/  # Category management
  │   ├── expenses/           # Expense CRUD components
  │   ├── insights/           # Snapshot components
  │   ├── leads/              # Lead CRUD components
  │   ├── ledger/             # Ledger entry components
  │   ├── login/              # Login form
  │   ├── navigation/         # Sidebar, top-nav, nav-data
  │   ├── reports/            # Charts, CSV export, year filter
  │   └── ui/                 # Shared shadcn-style UI components
  └── lib/
      ├── auth.ts             # Better Auth config
      ├── financial.ts        # Financial calculation engine
      ├── date-rules.ts       # Period lock rules
      ├── format.ts           # Date/currency formatting
      └── utils.ts            # Shared utilities
```

### 6.2 Issues Found

**🔴 High:**

1. **Server actions are a flat list** — All actions (billing-invoices, billing-payments, income, expenses, ledger, etc.) are at the root of `app/actions/`. As accounting grows, this will become unmanageable. Should be organized by domain module.
2. **`billing-payments.ts` is 650+ lines** — The largest file. Contains overlapping FIFO/LIFO logic duplicated between `adjustClientPayment` and `updateClientPayment`. The `recordClientPayment` function alone is ~150 lines of sequential DB operations with no transaction.
3. **`queries/billing.ts` is 800+ lines** — Contains queries, types, helper functions, and runtime column detection. The `getClientStatement` function is 200+ lines.
4. **`financial.ts` is 190 lines of re-exports** — Most functions are thin wrappers that import from `@pmg/db` queries. This adds indirection without clear benefit.
5. **No validation library consistency** — Zod is used for billing schemas but `expenses.ts` uses inline `FormData` parsing. Inconsistent patterns increase maintenance burden.

**🟡 Medium:**

6. **`db` proxy is deprecated** — `client.ts` has `getDb()` (preferred) and `@deprecated use getDb() instead` `db` proxy. Some imports use `db`, others use `getDb()`. Should standardize.
7. **Runtime column detection in 3 places** — `hasQuotationReferenceColumn` is duplicated in `billing-quotes.ts` and `queries/billing.ts`. `hasBillingLineItemItemIdColumn` is duplicated in `billing-line-item-compat.ts` and `queries/billing.ts`. Each adds 50ms query overhead.
8. **No barrel index for components** — Components must be imported via deep paths like `@/components/billing/invoice-form`. Adding accounting components will exacerbate this.
9. **`utils.ts` is bare** — Only has `cn()` (classname merging). Formatters, validators, and other utilities should be separated.
10. **Magic strings in revalidatePath** — Path strings like `'/billing/invoices'`, `'/dashboard'` are hardcoded throughout actions. A single rename means searching all files.

### 6.3 Refactoring Priorities Before Accounting

| Priority | Refactoring | Effort |
|---|---|---|
| 🔴 High | Wrap all multi-step writes in `db.transaction()` | 2 days |
| 🔴 High | Extract shared FIFO/LIFO allocation logic | 1 day |
| 🔴 High | Remove runtime column detection (run pending migrations) | 1 day |
| 🟡 Medium | Organize server actions into domain subdirectories | 1 day |
| 🟡 Medium | Standardize all validation to use Zod schemas | 1 day |
| 🟡 Medium | Standardize `getDb()` usage, remove deprecated `db` proxy | 0.5 day |
| 🟢 Low | Add component barrel exports | 0.5 day |
| 🟢 Low | Extract path constants into a shared config | 0.5 day |

---

## 7. Security, Permissions, and Access Control

### 7.1 Current State

- **Auth:** Better Auth with magic-link-only authentication (no email/password)
- **Roles:** `super_admin`, `admin`, `viewer` (hierarchy: 3, 2, 1)
- **Session:** Server-side session validation, redirect on missing session
- **Rate limiting:** In-memory rate limiter for `/api/auth/*` (10 req/60s per IP)
- **Invitations:** Email-based invitation with expiry, role assignment on first login
- **Middleware:** Session cookie check + inactive user rejection via `proxy.ts`

### 7.2 Issues Found

**🔴 High:**

1. **No role-based access control on financial actions.** Server actions call `getSessionOrRedirect()` but never `requireRole()`. Any authenticated user (including `viewer`) can:
   - Create/edit/delete invoices and quotes
   - Record payments and adjust allocations
   - Create/edit/delete expenses
   - Create ledger entries and withdrawals
   - Issue/bulk-issue/void invoices
   - Access all financial data

2. **No data-level permissions.** A `viewer` from one division can see all divisions' financial data. There's no division-scoped access control.

3. **No sensitive action confirmation.** Deleting a payment, voiding an invoice, or recording a withdrawal has no secondary confirmation (beyond the confirm dialog which is UI-only, not auth).

**🟡 Medium:**

4. **In-memory rate limiter is not production-ready.** Restarting the server resets all rate limits. For production with multiple instances, this should use a distributed store (Redis/Upstash) or DB-backed rate limiting.
5. **No audit logging for auth events.** Failed login attempts, invitation acceptances, and role changes are not logged anywhere.
6. **`requireRole()` is defined but never called** in any server action. This is dead code that should either be used or removed.
7. **Session invalidation on role change is not immediate.** If an admin demotes a user to `viewer`, the existing session remains valid until it expires.

### 7.3 Recommended Access Control Model for Accounting

```
Role-based access (same hierarchy):
  super_admin: Full access to all accounting modules
  admin:       Create/read journals, post to GL, run reports
  viewer:      Read-only access to accounting reports and GL

Action-level permissions needed:
  - Approve journal entries
  - Post journal entries to GL
  - Close accounting periods
  - Reverse journal entries
  - Access audit logs
  - Export financial data
  - Configure COA
```

**Implementation pattern:**
```typescript
// Examples of permission checks needed in accounting server actions
export async function postJournalEntry(data: JournalEntryInput) {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'admin')) {
    return { error: 'Insufficient permissions to post journal entries.' };
  }
  // ... proceed with posting
}
```

---

## 8. Reporting and Dashboard Audit

### 8.1 Current Reports

| Report | Type | Location | Status |
|---|---|---|---|
| KPI Dashboard | Grid + Charts | `/dashboard` | ✅ Functional |
| Month-over-Month Comparison | Bar chart | `/insights/reports` | ✅ Functional |
| Revenue by Division | Stacked area chart | `/insights/reports` | ✅ Functional |
| Expenses by Category | Bar/horizontal chart | `/insights/reports` | ✅ Functional |
| Profit Pool Split | Area chart | `/insights/reports` | ✅ Functional |
| Aged Receivables | Bucket table | `/dashboard` | ✅ Functional |
| Client Statement | Document + summary | `/billing/statements/[clientId]` | ✅ Functional |
| Snapshots Cockpit | Summary table | `/insights/snapshots` | ✅ Functional |

### 8.2 Issues Found

**🔴 High:**

1. **No Trial Balance report.** Essential for accounting — verifies debits = credits before any financial statement is generated.
2. **No General Ledger report.** No way to see all transactions for a specific account across time.
3. **No P&L by division** — Currently only global P&L. Division-level P&L is computed but not displayed as a standalone report.
4. **No Balance Sheet.** All current reporting is income-statement-focused (revenue, expenses, profit). No asset, liability, or equity reporting exists (because the data doesn't exist yet — this is expected).

**🟡 Medium:**

5. **No date range picker for reports** — Reports are locked to the current financial year. Users cannot view arbitrary date ranges.
6. **No CSV/Excel export on the dashboard** — ExportCsvButton exists on reports page only.
7. **Dashboard KPI cards show all-time totals** — `getFinancialSummary()` sums ALL income and expenses, not a time-bounded period. This means the dashboard shows cumulative since inception, which may be misleading.
8. **Snapshots are created but not visualized** — The snapshots table stores computed monthly data but there's no historical trend chart showing profit pool, revenue, or expense trends over time.

### 8.3 Recommended Improvements

| Priority | Improvement | Effort |
|---|---|---|
| 🔴 High | Add General Ledger report (account history with running balance) | 3 days |
| 🔴 High | Add Trial Balance report (debit/credit verification) | 2 days |
| 🟡 Medium | Add date range picker to all report pages | 1 day |
| 🟡 Medium | Make dashboard KPIs time-bounded (this month / YTD toggle) | 1 day |
| 🟡 Medium | Add historical trend chart from snapshots data | 1 day |
| 🟢 Low | Add export functionality to dashboard | 0.5 day |
| 🟢 Low | Add division-filter to all reports | 0.5 day |

---

## 9. Accounting Module Readiness Assessment

### 9.1 Blocker Summary

| Blocker | Description | Severity | Required Before |
|---|---|---|---|
| No `db.transaction()` | Multi-step writes risk data corruption | 🔴 **Blocking** | Any accounting module |
| No audit trail | Financial mutations leave no trace | 🔴 **Blocking** | Journal Entries, GL |
| Hardcoded VAT 15% | `calcTotals()` ignores division settings | 🟡 Non-blocking | GL (clean data) |
| `invoices.incomeId` legacy field | Conflicts with many-to-many model | 🟡 Non-blocking | AR subledger |
| No payment method tracking | Cannot reconcile to bank | 🟡 Non-blocking | Bank/Cash accounts |
| Free-text expense categories | Data integrity risk for mapped accounts | 🟡 Non-blocking | COA mapping |
| No overdue auto-detection | Invoices stuck in "issued" status | 🟢 Low priority | AR reporting |
| No role enforcement on actions | Any user can do anything | 🟡 Non-blocking | Accounting period close |

### 9.2 Implementation Sequence for Accounting Modules

The accounting modules should be built in this order:

| Phase | Module | Depends On | Effort |
|---|---|---|---|
| **Phase 0** | Critical fixes (transactions, audit, VAT cleanup) | — | 1 week |
| **Phase 1** | **Chart of Accounts** + COA management UI | Phase 0 | 2 days |
| **Phase 2** | **Journal Entry system** + manual entry UI | Phase 1 | 3 days |
| **Phase 3** | **Auto-posting hooks** from billing events | Phase 2 | 3 days |
| **Phase 4** | **General Ledger** report + Trial Balance | Phase 2 | 2 days |
| **Phase 5** | **Accounts Receivable subledger** | Phase 3 | 2 days |
| **Phase 6** | **Cash/Bank Accounts** reconciliation | Phase 3 | 2 days |
| **Phase 7** | **Profit & Loss** from GL (not snapshots) | Phase 4 | 1 day |
| **Phase 8** | **Balance Sheet** from GL | Phase 4 | 2 days |
| **Phase 9** | **Accounts Payable subledger** | Phase 3 | 2 days |
| **Phase 10** | **Division-based reporting** from GL | Phase 4 | 1 day |

### 9.3 COA Design (Pre-Implementation)

```
PMG Chart of Accounts (Cash-Basis, Non-VAT)

Assets (1000-1999)
  1001  Cash - PMG Business Account
  1002  Cash - TES Business Account
  1003  Cash - AWS Business Account
  1100  Accounts Receivable
  1200  Petty Cash

Revenue (4000-4999)
  4001  Revenue - PMG
  4002  Revenue - TES
  4003  Revenue - AWS

Expenses (5000-5999)
  5001  Operating Expenses
  5002  Marketing & Advertising
  5003  Software & Subscriptions
  5004  Office & Administration
  5005  Professional Fees
  5006  Travel & Transport
  5007  Staff Costs / Salary
  5100  Cost of Sales

Equity (3000-3999)
  3001  Owner's Equity
  3002  Retained Earnings
  3100  Profit Pool - Salary
  3101  Profit Pool - Reinvest
  3102  Profit Pool - Reserve
  3103  Profit Pool - Flex
  3104  PMG Share
```

> **Note:** Balance Sheet accounts (Liabilities) omitted for cash-basis MVP. Added in future phase.

### 9.4 Journal Entry Design Pattern

```typescript
// Journal Entry = Header + Lines (must balance: sum(debits) = sum(credits))
interface JournalEntry {
  id: string;
  entryDate: string;
  reference: string;         // e.g., "INV-2026-001" linking to billing
  description: string;
  entryType: 'manual' | 'auto';  // auto = posted by billing event
  sourceModule: 'billing' | 'expenses' | 'ledger' | 'manual';
  status: 'draft' | 'posted' | 'reversed';
  postedAt: Date | null;
  postedBy: string | null;
  createdAt: Date;
}

interface JournalEntryLine {
  id: string;
  journalEntryId: string;    // FK to journal_entries
  accountId: string;         // FK to chart_of_accounts
  debit: number;             // one of debit/credit must be 0
  credit: number;
  description: string | null;
  divisionId: string | null; // optional division attribution
}
```

### 9.5 Auto-Posting Hooks

When billing events fire, the accounting module should post entries:

| Event | Debit | Credit | Notes |
|---|---|---|---|
| Invoice issued | AR (1100) | Revenue (4xxx) | At invoice total |
| Payment received | Bank (100x) | AR (1100) | At payment amount |
| Expense recorded | Expense (5xxx) | Bank (100x) | At expense amount |
| Invoice voided | Revenue (4xxx) | AR (1100) | Reversal of original |
| Payment refunded | AR (1100) | Bank (100x) | Reversal |
| Period close summary | Revenue (4xxx) | Retained Earnings (3002) | Net income transfer |

---

## 10. Final Recommendations

### 10.1 🔴 Critical Fixes (Do Before Accounting)

| # | Problem | Why It Matters | Solution | Files Affected | Effort | Risk If Ignored |
|---|---|---|---|---|---|---|
| C1 | No `db.transaction()` on multi-step writes | Data corruption if any mid-way write fails | Wrap all financial writes in `db.transaction()` | `billing-invoices.ts`, `billing-payments.ts`, `billing-quotes.ts`, `income.ts`, `expenses.ts`, `ledger.ts` | 2 days | **Data integrity loss** — ghost income rows, orphan allocations, partial updates |
| C2 | No audit trail for financial mutations | No way to detect or reverse unauthorized changes | Create `audit_logs` table + wrapper function for all financial mutations | New `schema/audit-logs.ts`, all action files | 2 days | **Compliance risk** — cannot prove data integrity for financial records |
| C3 | Hardcoded 15% VAT in `calcTotals()` with no `isVatRegistered` guard | Division-level VAT settings are ignored, non-VAT entities show VAT | Fix `calcTotals()` to read division's `defaultVatRate` and `isVatRegistered` | `billing-invoices.ts`, `billing-quotes.ts`, `billing-schema.ts`, `divisionBillingSettings` schema | 1 day | **Incorrect invoices** — VAT applied to non-VAT entities after accounting migration |
| C4 | No `payment_method` on income records | Cannot reconcile payments to bank statements | Add `payment_method` and `reference_number` columns to `income` | `schema/income.ts`, payment forms, queries | 0.5 day | **Bank reconciliation impossible** — accounting module can't match payments |
| C5 | Runtime column detection (`information_schema` queries) | ~50ms overhead per query, blocks schema cleanup | Run pending migrations to add `reference` and `item_id` columns, remove runtime detection | `billing-quotes.ts`, `billing-line-item-compat.ts`, `queries/billing.ts` | 1 day | **Performance drag** — every billing query checks information_schema |

### 10.2 🟡 Important Improvements (Do Before Accounting)

| # | Problem | Why It Matters | Solution | Files Affected | Effort | Risk If Ignored |
|---|---|---|---|---|---|---|
| I1 | No role-based access control on actions | Any user can create/edit/delete financial records | Add `requireRole()` checks to all server actions | All action files | 2 days | **Security gap** — viewer user could post journal entries |
| I2 | `expenses.category` is free-text, no FK to `expense_categories` | Data integrity risk for COA mapping | Add `expense_category_id` FK, migrate existing data | `schema/expenses.ts`, expense forms, queries | 1 day | **Messy COA mapping** — accounting can't reliably categorize expenses |
| I3 | Duplicate FIFO/LIFO allocation logic in `billing-payments.ts` | 80 lines of duplicated logic, bugs in one copy won't appear in the other | Extract shared allocation functions | `billing-payments.ts` | 1 day | **Maintenance burden** — any allocation bug must be fixed in 2 places |
| I4 | No overdue auto-detection for invoices | Invoices past due remain "issued" indefinitely | Add scheduled check or trigger on invoice read | `queries/billing.ts`, new cron job or DB trigger | 1 day | **Misleading AR ageing** — overdue invoices appear current |
| I5 | `invoices.incomeId` legacy field conflicts with many-to-many payment_allocations | Confusing dual model for payment tracking | Deprecate field, remove from queries, keep in schema for backward compat | `queries/billing.ts`, `billing-payments.ts`, `income.ts` | 1 day | **Confusion** — new accounting devs will be misled by the legacy field |

### 10.3 🟢 Nice-to-Have Polish

| # | Problem | Why It Matters | Solution | Effort |
|---|---|---|---|---|
| N1 | No `loading.tsx` or Suspense boundaries | Blank pages during data fetch | Add loading skeletons to all route groups | 1 day |
| N2 | No `error.tsx` boundaries | DB failures show error overlay or blank page | Add error boundaries to route groups | 0.5 day |
| N3 | No empty state for listing pages | Empty tables with headers when no data | Add `<EmptyState>` component to all list pages | 0.5 day |
| N4 | No date picker component | Date inputs are plain text fields | Add shadcn date picker or native `<input type="date">` | 0.5 day |
| N5 | No search in catalogue item dropdown | Long dropdowns with no search | Add search/filter to `Select` component | 0.5 day |
| N6 | Navigation gaps between detail pages | No "View Client" from invoice detail | Add cross-links between related records | 0.5 day |
| N7 | Hardcoded allocation rates in `accounts.ts` | Rate changes require code deploy | Move rates to `division_billing_settings` or new config table | 1 day |

### 10.4 ➡️ Future Enhancements (Build After Accounting MVP)

| # | Enhancement | Description | Effort |
|---|---|---|---|
| F1 | Accounts Payable module | Track unpaid bills, vendor management, payment scheduling | 3 days |
| F2 | Bank reconciliation UI | Upload bank statement CSV, match to payments/expenses | 3 days |
| F3 | Budgeting & forecasting | Set budget per COA account, track variance | 2 days |
| F4 | Multi-currency support | FX rates, foreign currency invoices/payments | 3 days |
| F5 | Automated period close checklist | Month-end close workflow with validation steps | 2 days |
| F6 | Financial report scheduling | Email PDF reports automatically on schedule | 2 days |
| F7 | Audit log viewer UI | Searchable, filterable audit trail interface | 2 days |

---

## Appendix: File Inventory

### Server Actions (`apps/admin/src/app/actions/`)

| File | Lines | Issues |
|---|---|---|
| `billing-invoices.ts` | ~270 | No transactions, hardcoded VAT, no role check |
| `billing-payments.ts` | ~650 | No transactions, duplicate FIFO/LIFO, legacy incomeId, ~150-line function |
| `billing-quotes.ts` | ~240 | No transactions, runtime column detection |
| `billing-schema.ts` | ~60 | Zod schemas — well-structured |
| `billing-line-item-compat.ts` | ~45 | Runtime column detection (duplicate) |
| `income.ts` | ~60 | Recalculates invoice statuses after delete |
| `expenses.ts` | ~90 | Inline FormData parsing, no Zod |
| `ledger.ts` | ~130 | Has constraint check pattern (good) |
| `account-withdrawal.ts` | ~30 | Thin wrapper around ledger |

### Queries (`packages/db/src/queries/`)

| File | Lines | Issues |
|---|---|---|
| `billing.ts` | ~800 | Runtime column detection, 200-line getClientStatement |
| `general.ts` | ~250 | Clean SQL CTEs |
| `income.ts`, `expenses.ts`, etc. | Various | Standard CRUD |

### Schema (`packages/db/src/schema/`)

| File | Tables | Issues |
|---|---|---|
| `billing.ts` | quotations, invoices, billing_line_items, billing_items, payment_allocations, document_sequences, organisation_settings, division_billing_settings | Polymorphic FK (no constraint), legacy incomeId |
| `income.ts` | income | No payment_method, no category |
| `expenses.ts` | expenses | Free-text category |
| `ledger.ts` | ledger | Not a GL, no user FK |
| `snapshots.ts` | snapshots | Clean |
| `clients.ts` | clients | Clean |
| `divisions.ts` | divisions | Clean |
| `leads.ts` | leads | Clean |
| `auth.ts` | user, session, account, verification | Better Auth standard |
| `expense-categories.ts` | expense_categories | No status/archived flag |

### UI Components (`apps/admin/src/components/`)

| Directory | Files | Notes |
|---|---|---|
| `ui/` | 28 | shadcn-style primitives — good coverage |
| `billing/` | 15 | Document preview, line items form, totals, filters |
| `dashboard/` | 10 | KPI grid, ageing report, charts, budget cards |
| `navigation/` | 4 | Sidebar, top-nav, nav-data, sign-out |
| `reports/` | 5 | Charts, CSV export, year filter |
| `ledger/` | 3 | Add/edit form, table |
| `expenses/` | 4 | CRUD forms, filter bar, table |

---

*End of Audit.*
