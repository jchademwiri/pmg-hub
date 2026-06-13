You are a senior full-stack engineer, accounting-systems architect, and database designer.

This is Phase 2 of the PMG accounting system design project.

**Prerequisite:** You must have completed the Phase 1 audit (deliverables 1-3). If you are seeing this prompt cold, first review the research audit output to understand what PMG currently has and what gaps exist.

---

# Important business scope clarification

PMG is not VAT registered at this stage.

PMG will not link bank accounts, bank feeds, open banking, third-party bank APIs, or automatic bank imports for now.

Therefore, the MVP must be scoped as:

**PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds**

---

# Technical stack context

PMG Control Center is expected to use:

* Next.js App Router
* TypeScript
* Drizzle ORM
* PostgreSQL/Neon
* Server Actions
* shadcn/ui or similar UI patterns
* Better Auth
* existing modules for divisions, clients, income, expenses, leads, billing, invoices, quotes, payment allocations, snapshots, and ledger/allocation tracking

Follow the existing codebase style.

Do not introduce a REST API, use the Server Actions.

Do not rewrite the whole app.

Do not overbuild enterprise accounting features.

Prioritise correctness, auditability, simple bookkeeping, and clean reporting.

---

# Code reference

Repository:

https://github.com/jchademwiri/pmg-hub.git

When proposing schema changes, inspect:

* `packages/db/src/schema/*` for existing Drizzle ORM patterns
* `packages/db/src/queries/*` for existing query helpers
* `apps/admin/src/lib/financial.ts` for financial calculation patterns
* existing invoice, income, expense, and allocation schemas

---

# Deliverable 4: Recommended database changes

Propose database changes using the existing Drizzle ORM style.

Evaluate whether PMG needs these tables now or later:

* `chart_of_accounts`
* `journal_entries`
* `journal_entry_lines`
* `bank_accounts`
* `bank_transactions`
* `manual_reconciliations`
* `credit_notes`
* `refunds`
* `suppliers`
* `bills`
* `bill_payments`
* `tax_settings`
* `audit_logs`
* `attachments`
* `assets`
* `liabilities`

For each table, state:

* Required for MVP or future
* Purpose
* Key columns
* Relationships
* Whether existing tables can be reused
* Whether it should be created now
* Migration risks
* How it fits the current repo structure

For the MVP, prioritise:

1. `chart_of_accounts`
2. `journal_entries`
3. `journal_entry_lines`
4. `bank_accounts` as manual/internal accounts only
5. `audit_logs`

Do not prioritise VAT tables unless needed for future settings.

---

# Deliverable 5: Recommended Chart of Accounts for PMG

Create a simple starting Chart of Accounts for PMG.

It must support:

* non-VAT operation
* manual cash-basis bookkeeping
* multiple divisions
* service income
* project/admin expenses
* owner withdrawals
* PMG share/allocation model

Use account codes similar to:

## Assets

* 1001 Business Bank Account
* 1002 Cash on Hand
* 1100 Accounts Receivable

## Liabilities

* 2000 General Liabilities
* 2100 Accounts Payable, future
* 2300 Loans Payable, future if needed

## Equity

* 3000 Owner Equity
* 3100 Retained Earnings
* 3200 Owner Drawings
* 3300 PMG Share / Internal Allocation Equity if appropriate

## Revenue

* 4000 Service Revenue
* 4100 Tender Edge Revenue
* 4200 Apex Web Solutions Revenue
* 4300 PMG Services Revenue
* 4900 Other Income

## Expenses

* 5000 General Expenses
* 5100 Software & Subscriptions
* 5200 Printing & Stationery
* 5300 Transport & Courier
* 5400 Marketing
* 5500 Communication
* 5600 Professional Fees
* 5700 Bank Charges
* 5800 Office/Admin Expenses
* 5900 Miscellaneous Expenses

Recommend whether revenue accounts should be per division or whether division should remain a separate dimension.

---

# Deliverable 6: Posting rules

Define simple posting rules for PMG's non-VAT cash-basis MVP.

Use this approach:

## When invoice is created

No journal entry required for pure cash-basis MVP, unless PMG wants to track Accounts Receivable formally.

Recommended practical option:

* Create invoice record
* Do not count it as income yet
* Include it in Accounts Receivable reports
* Do not include it in Profit & Loss until paid

## When invoice payment is recorded

Post:

* Dr Business Bank Account
* Cr Service Revenue

If using Accounts Receivable tracking with double-entry:

On invoice issue:

* Dr Accounts Receivable
* Cr Service Revenue

On payment:

* Dr Business Bank Account
* Cr Accounts Receivable

Explain which option is better for PMG now.

## When manual income is recorded without invoice

Post:

* Dr Business Bank Account or Cash on Hand
* Cr Other Income or relevant Revenue account

## When expense is recorded

Post:

* Dr Expense account
* Cr Business Bank Account or Cash on Hand

## When owner withdrawal is recorded

Post:

* Dr Owner Drawings
* Cr Business Bank Account

## When PMG allocation/spending is recorded

Explain how the existing PMG allocation model should map into the accounting layer without double-counting expenses.

Warn clearly against treating salary/reinvest/reserve/flex allocations as normal expenses unless money is actually spent or withdrawn.

---

# Deliverable 7: Report requirements

Define the minimum reports PMG should have.

For MVP:

1. Accounts Receivable report
2. Aged Receivables report
3. Profit & Loss report
4. General Ledger report
5. Trial Balance report
6. Manual Bank/Cash balance summary
7. Income report
8. Expense report
9. Client statement
10. Division performance report

For future:

1. Balance Sheet
2. Cash Flow Statement
3. Aged Payables
4. VAT report
5. Bank reconciliation report
6. Asset register
7. Liability report

For each report, define:

* purpose
* required data
* filters
* route suggestion
* whether it is MVP or future
* acceptance criteria

---

# Deliverable 8: Implementation roadmap

Create a phased implementation plan.

Each phase must include:

* objective
* files likely to change
* database changes
* UI changes
* Server Actions
* query helpers
* validation rules
* reports added
* testing checklist
* acceptance criteria

Use this revised build order:

## Phase 1: Repo audit and financial flow stabilisation

* Audit current invoice, payment, income, expense, and report flows
* Identify bugs and inconsistencies
* Confirm what already exists vs documented only
* update what needs fixing to meet basic bookkeeping needs, such as: we have a ledger already but may not meet the accounting needs, instead of building a new one from scratch, we can adapt the existing ledger to serve as a simple General Ledger and refactor it as needed to better fit accounting principles, without overhauling the whole system
* Fix obvious calculation and status issues

## Phase 2: Non-VAT setting and invoice simplification

* Add/verify `isVatRegistered: false`
* Disable VAT UI and calculations
* Ensure invoices are not labelled tax invoices
* Ensure VAT amount is always zero while disabled

## Phase 3: Accounts Receivable and payment flow

* Ensure issued/unpaid invoices appear in AR
* Add reliable partial payment support if missing
* Add outstanding balance calculation
* Add Aged Receivables report

## Phase 4: Chart of Accounts

* Add `chart_of_accounts`
* Seed PMG accounts
* Link income and expenses to accounts
* Keep division as reporting dimension

## Phase 5: Journal entries and journal lines

* Add `journal_entries`
* Add `journal_entry_lines`
* Add posting helpers
* Ensure every posted transaction balances
* Use DB transactions for multi-step writes

## Phase 6: General Ledger and Trial Balance

* Build General Ledger report
* Build Trial Balance report
* Add debit/credit validation
* Add out-of-balance warnings

## Phase 7: Profit & Loss report

* Build formal P&L using revenue and expense accounts
* Add filters by date range, division, and account
* Compare against existing dashboard figures

## Phase 8: Manual Bank/Cash account summary

* Add internal bank/cash account balances
* Show opening balance, money in, money out, calculated closing balance
* No external bank linking

## Phase 9: Audit trail and period lock hardening

* Add `audit_logs`
* Log create/edit/delete/issue/void/pay actions
* Ensure closed periods cannot be changed through Server Actions
* Add reversal flow instead of editing locked records

## Phase 10: Future accounting reports

* Balance Sheet
* Cash Flow Statement
* Accounts Payable
* Credit notes
* Refunds
* VAT registration support
* Bank CSV import/reconciliation

---

# Deliverable 9: Critical bugs and risk scan

Look specifically for:

* invoice totals not matching line items
* VAT being applied even though PMG is not VAT registered
* invoice PDF showing VAT/tax invoice incorrectly
* hardcoded VAT rate
* paid invoices editable
* issued invoices editable without audit trail
* missing DB transactions
* income being created without reliable invoice/payment linkage
* partial payment status not fully implemented
* payment allocation bugs
* period lock bypasses
* financial calculations done only in UI
* rounding errors
* duplicate document numbers
* orphaned line items
* missing indexes
* missing constraints
* inconsistent date/timezone handling
* user permission gaps
* old PMG allocation ledger being confused with true accounting General Ledger
* salary/reinvest/reserve/flex being double-counted as expenses
* documented features not actually implemented

For each risk, provide:

* severity: High / Medium / Low
* affected file path
* explanation
* recommended fix
* whether it blocks MVP

---

# Deliverable 10: Final output files

Create the final documentation in the repo as markdown files.

Save the schema plan here:

`docs/research/accounting-system/03-pmg-manual-bookkeeping-schema-plan.md`

Save the implementation roadmap here:

`docs/research/accounting-system/02-pmg-manual-bookkeeping-mvp-roadmap.md`

The documents must be practical, implementation-ready, and specific to PMG.

Do not produce generic accounting theory only.

---

# Final answer requirements for Phase 2

At the end of this schema and roadmap phase, provide:

1. Database schema summary
2. Proposed Chart of Accounts (complete list)
3. Posting rules reference card
4. Minimum reports checklist
5. Phased roadmap with effort estimates
6. Critical risks and blockers
7. Recommended first 5 development tasks
8. Suggested commit/PR strategy
9. Open questions for Jacob

Keep the recommendations practical for a solo developer building an internal business app.

---

# Output locations

All three final deliverables will be saved here:

* `docs/research/accounting-system/01-pmg-manual-bookkeeping-mvp-audit.md` (Phase 1)
* `docs/research/accounting-system/02-pmg-manual-bookkeeping-mvp-roadmap.md` (Phase 2)
* `docs/research/accounting-system/03-pmg-manual-bookkeeping-schema-plan.md` (Phase 2)
