# PMG Manual Bookkeeping MVP — Independent Code Audit

**Researcher:** Buffy (Codebuff AI Agent)
**Date:** 2026-06-12
**Method:** Direct codebase file reading, grep searches, schema inspection, Server Action analysis

---

## Executive Summary

PMG Control Center is a **functional billing, invoicing, and management reporting tool** but is **not yet a bookkeeping system**. After directly scanning every schema file, Server Action, query helper, and financial library in the codebase, the conclusion is clear:

- ✅ **Strong commercial workflows** — Quotes, invoices, payment allocations, expense tracking, period locking
- 🔴 **Zero accounting backbone** — No Chart of Accounts, no journal entries, no General Ledger, no Trial Balance, no audit trail
- ⚠️ **VAT still wired in** — Despite PMG being non-VAT, every invoice/quote action has 15% VAT calculation logic
- ⚠️ **No transaction boundaries** — Multi-row financial writes are sequential, not transactional

This report is based on **actual file contents I read directly from the codebase**, not from documentation claims.

---

## 1. Schema Audit (packages/db/src/schema/)

### Tables That Exist

| Table | File | Purpose | Accounting-Ready? |
|---|---|---|---|
| `clients` | `clients.ts` | Customer master | ✅ Operational OK |
| `divisions` | `divisions.ts` | Department/cost-center | ✅ Operational OK |
| `invoices` | `billing.ts` | Customer billing documents | ✅ Operational OK |
| `quotations` | `billing.ts` | Pre-sale estimates | ✅ Operational OK |
| `billing_line_items` | `billing.ts` | Polymorphic line items for quotes/invoices | ✅ Operational OK |
| `billing_items` | `billing.ts` | Reusable item catalogue | ✅ Operational OK |
| `document_sequences` | `billing.ts` | Auto-incrementing doc numbers with FOR UPDATE locking | ✅ Good concurrency |
| `payment_allocations` | `billing.ts` | Junction table linking income to invoices | ✅ Good allocation model |
| `income` | `income.ts` | Cash receipt register | ⚠️ No account/bank linkage |
| `expenses` | `expenses.ts` | Paid expenses register | ⚠️ No account/bank linkage |
| `ledger` | `ledger.ts` | **Management allocation ledger** (salary/reinvest/reserve/flex/pmg_share) | ❌ Not a General Ledger |
| `snapshots` | `snapshots.ts` | Frozen monthly P&L + profit pool metrics | ✅ Good for management |
| `expense_categories` | `expense-categories.ts` | Predefined expense categories | ⚠️ Not linked to COA |
| `organisation_settings` | `billing.ts` | Company settings incl. `vatNumber` | ⚠️ No `isVatRegistered` flag |
| `division_billing_settings` | `billing.ts` | Per-division settings incl. `defaultVatRate: "15"` | ⚠️ Hardcoded 15% VAT |

### Critical Schema Gaps

| Missing Table | Impact | Evidence |
|---|---|---|
| `chart_of_accounts` | No account master = no way to categorize transactions as assets/liabilities/equity/revenue/expenses | Searched entire schema - not found |
| `journal_entries` | No transaction header = no balanced accounting events | Searched entire schema - not found |
| `journal_entry_lines` | No debit/credit rows = no double-entry posting | Searched entire schema - not found |
| `bank_accounts` | No manual cash/bank accounts = payments don't track destination | Searched entire schema - not found |
| `audit_logs` | No mutation trail = financial changes are invisible | Only `email_audit_log` exists for email sending |

---

## 2. VAT Analysis — Still Active Despite Non-VAT Scope

**Finding: VAT is wired into the system at every layer despite PMG being non-VAT registered.**

### Schema Level
- `invoices.vatEnabled` — boolean toggle, defaults to `false` but user can enable it
- `invoices.vatAmount` — numeric field, stored but not guarded
- `quotations.vatEnabled` — same toggle
- `billingLineItems.vatRate` — per-line-item VAT rate
- `billingItems.vatApplicable` — defaults to `true`
- `organisationSettings.vatNumber` — VAT number stored in org settings
- `divisionBillingSettings.defaultVatRate` — defaults to `"15"` (15%)

### Server Action Level
In `apps/admin/src/app/actions/billing-invoices.ts`:
```ts
const vatAmount = vatEnabled ? vatBase * 0.15 : 0;
```
Hardcoded 15% VAT calculation. Same in `billing-quotes.ts`:
```ts
const vatAmount = vatEnabled ? vatBase * 0.15 : 0;
```

### UI Level
- Invoice/quote forms have a **VAT toggle switch** labeled "VAT (15%)"
- `document-preview.tsx` shows "VAT (15%)" with calculated amount
- `billing-totals-block.tsx` conditionally shows "VAT (15%)" when `vatEnabled`
- Item pages show "excl. VAT" labels
- Settings page has "Default VAT Rate (%)" field and "VAT Number" field

### Risk Assessment
**Severity: HIGH** — If a user toggles VAT on, invoices will have 15% VAT applied even though PMG is not VAT-registered. There is no global `isVatRegistered: false` guard that prevents this.

---

## 3. Transaction Boundary Audit

**Finding: Financial operations are NOT wrapped in database transactions.**

### `recordClientPayment` (billing-payments.ts)
This function does **4+ sequential DB writes** without a transaction:
1. `INSERT INTO income` — creates income record
2. `INSERT INTO payment_allocations` (per allocation) — creates allocation
3. `SELECT SUM(allocations)` — reads back sum
4. `UPDATE invoices SET status` — updates invoice status

If step 3 or 4 fails after step 1 and 2 succeeded, the system has an orphan income record with partial allocations. **This is a data integrity risk.**

### `markInvoicePaid` (billing-invoices.ts)
Same issue — creates income record and updates invoice status sequentially.

### `adjustClientPayment` (billing-payments.ts)
Downward/LIFO and upward/FIFO adjustments do multiple sequential deletes/updates without a transaction.

### `updateClientPayment` (billing-payments.ts)
Multiple allocation updates, invoice status recalculations, and income updates — all sequential.

### `deleteIncome` (income.ts)
Fetches allocations, updates invoices, deletes allocations, deletes income — sequential, not transactional.

### Only 1 transaction found:
`packages/db/src/schema/expense-categories.ts` — `await db.transaction(async (tx) => {` — only for expense category management, not financial writes.

**Risk: HIGH** — In case of crash or error between steps, database state becomes inconsistent.

---

## 4. Period Locking Audit

**Finding: Period locking is well-implemented across the codebase.**

`isPeriodClosed()` in `apps/admin/src/lib/date-rules.ts`:
- Checks if a date's month is before the previous month AND has a snapshot (closed)
- 5-day grace period: if current day <= 5, previous month is open if no snapshot
- Used in: `billing-invoices.ts`, `billing-payments.ts`, `billing-quotes.ts`, `income.ts`, `expenses.ts`, `account-withdrawal.ts`, `ledger.ts`

**Issue:** Period lock checks are done before writes, but since writes aren't transactional, a period could theoretically close between the check and the write (rare but possible in theory).

**Verdict:** Good implementation, but would benefit from transactional enforcement.

---

## 5. Payment & Allocation Audit

**Finding: Payment allocation model is sophisticated and well-designed.**

### Strengths
- `payment_allocations` junction table properly links income to invoices
- FIFO allocation on payment increase, LIFO on decrease
- Partial payment tracking with `partially_paid` invoice status
- `getClientOutstandingInvoices` correctly calculates remaining balances
- `getClientCreditBalance` computes unallocated credit dynamically
- `getAgingReport` produces well-structured aging buckets (current, 1-14, 15-30, 31-60, 61+)

### Weaknesses
- No link to bank/cash accounts — payments don't record *where* money went
- No journal entries — payments don't produce accounting records
- `incomeId` on invoices is legacy single-payment link, but payment_allocations are the real source of truth
- Overpayment is computed dynamically (`getClientCreditBalance`) but not stored as a formal liability

---

## 6. Allocation Ledger Audit (Existing "Ledger" Table)

**Finding: The existing `ledger` table is NOT a General Ledger.**

The `ledger` table tracks **PMG profit pool allocations**:
- `allocationEnum: 'salary' | 'reinvest' | 'reserve' | 'flex' | 'pmg_share'`
- `entryTypeEnum: 'spend' | 'transfer' | 'adjustment'`

These are **management accounting buckets** for tracking how PMG's profit pool is being spent. They are NOT:
- Balanced debit/credit entries
- Tied to a chart of accounts
- The source of truth for financial reporting

The allocation logic in `apps/admin/src/lib/financial.ts` computes:
```
revenue - expenses - pmgShare = profitPool
profitPool × 35% = salary
profitPool × 30% = reinvest
profitPool × 30% = reserve
profitPool × 5% = flex
```

**Risk:** If these allocations are treated as expenses on the P&L, profit will be **double-counted** — once by the actual expense and once by the allocation.

---

## 7. Reporting & Dashboard Audit

**Finding: Reports are built on raw income/expense sums, not journal-backed accounting.**

### Current Reports
| Report | Data Source | Accounting-Ready? |
|---|---|---|
| Dashboard Revenue | `SELECT SUM(amount) FROM income` | ❌ No formal P&L |
| Dashboard Expenses | `SELECT SUM(amount) FROM expenses` | ❌ No account categorization |
| Profit Pool | `income - expenses - pmgShare` | ❌ Management only |
| Division Revenue | `income JOIN divisions GROUP BY` | ❌ Not journal-backed |
| MoM Snapshot | Current/previous month sums | ❌ Not period-locked |
| Monthly Financials | Monthly sums of income & expenses | ❌ No accruals |
| Aged Receivables | invoice balances minus allocations | ✅ Operational AR |
| Client Statement | invoices + income per client | ✅ Operational |

### Missing Accounting Reports
- General Ledger (account-by-account transaction history)
- Trial Balance (debits = credits verification)
- Formal Profit & Loss (from revenue/expense accounts)
- Balance Sheet (assets, liabilities, equity)
- Cash Flow Statement
- Journal entry export for accountants

---

## 8. Web Research Synthesis

### How Small Business Accounting Systems Work

**QuickBooks, Xero, FreshBooks, Wave, Zoho Books, and Sage** all converge on a similar architecture:

1. **Chart of Accounts** — Master list categorizing every financial item as asset, liability, equity, revenue, or expense
2. **Double-entry journaling** — Every financial event produces balanced debit/credit entries
3. **General Ledger** — Account-by-account view derived from journal entries
4. **Reports** — P&L, Balance Sheet, Trial Balance, AR Aging all derived from the GL
5. **Period closing** — Locked periods prevent changes to historical data
6. **Audit trail** — Immutable logs of who changed what

**Key distinction:** PMG currently operates like a **billing app with reporting** — it records invoices and payments in operational tables, then sums them for dashboards. A proper bookkeeping system records every cash event as a balanced journal entry (Dr Bank / Cr Revenue), then builds reports from those entries.

### Cash-basis vs Accrual for PMG

For PMG's current scope, **cash-basis** is the right choice:
- Revenue recognized when cash is received (not when invoiced)
- Expenses recognized when paid (not when bill arrives)
- Simpler implementation — no Accounts Receivable/Accounts Payable on the ledger
- Sufficient for a non-VAT, services-based business
- Can migrate to accrual later by adding AR/AP posting

### Industry Minimum for a Bookkeeping MVP

Based on research across all six platforms, the minimum viable bookkeeping system needs:

| Feature | PMG Status |
|---|---|
| Client/customer records | ✅ Good |
| Quotes/estimates | ✅ Good |
| Invoices with line items | ✅ Good |
| Invoice status management | ✅ Good |
| Payment recording | ⚠️ No bank account linkage |
| Partial payments | ✅ Good |
| Expense tracking | ⚠️ No COA linkage |
| **Chart of Accounts** | 🔴 Missing |
| **Journal entries (double-entry)** | 🔴 Missing |
| **General Ledger** | 🔴 Missing |
| **Trial Balance** | 🔴 Missing |
| **P&L from journals** | 🔴 Missing |
| **Manual bank/cash accounts** | 🔴 Missing |
| **Audit trail** | 🔴 Missing |
| Period locking | ✅ Good |
| Accountant export | 🔴 Missing |

---

## 9. Critical Risks (My Own Assessment)

| # | Risk | Severity | Evidence | Blocks MVP? |
|---|---|---|---|---|
| 1 | No global `isVatRegistered` guard — VAT can be enabled on invoices | **HIGH** | Hardcoded 15% VAT in `calcTotals()`, `calcDocumentTotals()`, VAT toggle in UI | Yes |
| 2 | No double-entry accounting — financial data is not auditable | **HIGH** | No COA, journals, or journal lines exist in schema | Yes |
| 3 | Multi-row writes not wrapped in transactions | **HIGH** | `recordClientPayment()` does 4+ sequential writes with no transaction | Yes |
| 4 | No audit trail for financial mutations | **HIGH** | Only `email_audit_log` exists — no financial audit table | Yes |
| 5 | Allocation ledger could be mistaken for accounting GL | **HIGH** | Named "ledger" in DB/UI but tracks only salary/reinvest/reserve/flex buckets | Yes |
| 6 | No manual bank/cash accounts — payments don't track destination | **HIGH** | Income and expenses have no `bankAccountId` field | Yes |
| 7 | No expense-to-COA mapping — P&L can't be formally structured | **MEDIUM** | Expenses use free-form `category` text, not account codes | Yes |
| 8 | VAT wording on invoices even when disabled | **MEDIUM** | "excl. VAT" on item pages, "VAT (15%)" in totals block | Yes |
| 9 | No accountant export capability | **MEDIUM** | No CSV/PDF export of journal entries or GL | Yes |
| 10 | Revenue/expense reporting done via raw sums, not journals | **MEDIUM** | `getTotalRevenue()` does `SUM(income.amount)` with no account context | Yes |

---

## 10. Recommendations (First 5 Development Tasks)

Based on my independent audit, here is the order I recommend:

### Task 1: Add Non-VAT Mode (1 day)
- Add `isVatRegistered: boolean default false` to `organisationSettings`
- Force `vatEnabled=false`, `vatAmount=0` in all Server Actions when not registered
- Hide VAT toggle in invoice/quote forms
- Remove "excl. VAT" and "VAT (15%)" wording from UI
- Remove "Tax Invoice" wording from documents

### Task 2: Add Accounting Schema (1 day)
- Create `packages/db/src/schema/accounting.ts` with:
  - `chart_of_accounts` — seeded with PMG's account codes (1001-5900)
  - `journal_entries` — transaction headers
  - `journal_entry_lines` — debit/credit rows
  - `bank_accounts` — manual cash/bank accounts
  - `audit_logs` — immutable mutation trail

### Task 3: Wrap Financial Writes in Transactions (1-2 days)
- Wrap `recordClientPayment`, `markInvoicePaid`, `adjustClientPayment`, `updateClientPayment`, `deleteIncome` in `db.transaction()`
- Ensure atomicity across income + allocations + invoice status updates

### Task 4: Build Posting Helper + Wire Payments (2-3 days)
- Build `postJournalEntry(tx, header, lines)` that validates debits = credits
- Wire: payment received → Dr Bank / Cr Revenue
- Wire: expense paid → Dr Expense / Cr Bank
- Wire: owner withdrawal → Dr Owner Drawings / Cr Bank
- Wire: manual income → Dr Bank / Cr Revenue or Other Income

### Task 5: Build GL, Trial Balance, P&L Reports (2 days)
- General Ledger report — filterable by account, date, division
- Trial Balance — verify debits = credits
- Cash-basis P&L — from revenue and expense accounts
- CSV export of journal lines

---

## Methodology

This report was produced by directly reading source files from the codebase at `D:\websites\pmg-hub` including:

- **6 schema files** read in full: `billing.ts`, `income.ts`, `expenses.ts`, `ledger.ts`, `clients.ts`, `divisions.ts`, `snapshots.ts`
- **5 Server Action files** read in full: `billing-invoices.ts`, `billing-payments.ts`, `billing-quotes.ts`, `income.ts`, `expenses.ts`, `ledger.ts`
- **2 library files** read in full: `financial.ts`, `date-rules.ts`
- **2 query files** read in full: `billing.ts` (800+ lines), `general.ts`
- **grep searches** performed for: `vat|VAT|vatEnabled|vatRate`, `db.transaction`, `isPeriodClosed|closePeriod`, `audit.*log`
- **Web research** on QuickBooks, Xero, FreshBooks, Wave, Zoho, Sage, and double-entry bookkeeping best practices
