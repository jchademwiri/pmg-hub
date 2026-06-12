You are a senior full-stack engineer, accounting-systems analyst, technical auditor, and product architect.

I need you to perform a deep research and code audit for my PMG Control Center app.

The goal is to define the minimum viable bookkeeping/accounting system I should build into PMG Control Center.

This must be based on:

1. Industry research into common accounting and invoicing systems
2. My existing uploaded research document: `PMG-Accounting-Research-Gap-Analysis.docx`
3. A real code scan of my public GitHub repo

Repository:

https://github.com/jchademwiri/pmg-hub.git

Clone the repo and inspect the actual source code before making conclusions.

Use:

```bash
git clone https://github.com/jchademwiri/pmg-hub.git
cd pmg-hub
```

Do not give a theoretical answer only. The final output must compare accounting best practice against what is actually implemented in the repo.

---

# Important business scope clarification

PMG is not VAT registered at this stage.

PMG will not link bank accounts, bank feeds, open banking, third-party bank APIs, or automatic bank imports for now.

Therefore, the MVP must be scoped as:

**PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds**

This means the app should work as a manual internal bookkeeping system where the user records invoices, payments, income, and expenses manually.

The app should still have internal accounting accounts such as:

* `1001 - Business Bank Account`
* `1002 - Cash on Hand`
* `1100 - Accounts Receivable`
* `3000 - Owner Equity / Retained Earnings`
* `4000 - Sales / Service Revenue`
* `5000+ - Expense Accounts`

These are accounting accounts only. They are not linked to real bank APIs.

---

# VAT scope

For the MVP:

* Do not require VAT support.
* Do not create VAT Output or VAT Input journal entries.
* Do not create VAT reports as an MVP requirement.
* Do not treat PMG invoices as VAT tax invoices.
* Disable VAT by default.
* Add or verify a system setting such as `isVatRegistered: false`.
* When `isVatRegistered` is false:

  * VAT toggle should be hidden or disabled on invoices.
  * VAT amount must always be `0`.
  * VAT rate must be ignored.
  * invoice PDFs must not show a VAT number.
  * invoice PDFs must not say “Tax Invoice” unless PMG becomes VAT registered.
  * invoice totals must be calculated without VAT.

Move VAT to a later phase called:

**Future VAT Registration Support**

If existing VAT fields already exist in the codebase, keep them only as future-ready fields, but ensure they do not affect invoice totals, journal entries, reports, or PDFs while PMG is not VAT registered.

---

# Bank scope

For the MVP:

* Do not build bank feed integration.
* Do not build bank API connection.
* Do not build automatic bank syncing.
* Do not require imported bank statements.
* Do not overbuild bank reconciliation.

Instead, build manual bank/cash tracking only.

The user should manually record:

* invoice payments received
* other income received
* expenses paid
* owner withdrawals
* transfers between internal cash/bank accounts if needed

The system should post these manual transactions to the General Ledger.

Manual reconciliation can be a later feature, but the MVP may include a simple “manual bank balance check” where the user records an opening balance and compares it to calculated system balance.

---

# Existing research baseline

Use the document `PMG-Accounting-Research-Gap-Analysis.docx` as a starting point, but do not treat its implementation status as final truth.

The document already identifies these major accounting concepts:

* double-entry bookkeeping
* Chart of Accounts
* General Ledger
* journal entries
* journal lines
* Accounts Receivable
* Accounts Payable
* Profit & Loss
* Balance Sheet
* Cash Flow Statement
* Trial Balance
* Aged Receivables
* Aged Payables
* financial period locking
* VAT/tax handling
* bank reconciliation
* audit trail

Your task is to validate which of these are actually needed for PMG’s revised MVP and which should be deferred.

For every item marked Done, Partial, or Missing in the document, verify the actual implementation in the repo.

Clearly separate:

1. Implemented in code
2. Documented/spec only
3. Partially implemented
4. Missing completely
5. Not required for current MVP
6. Later/future feature

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

Do not introduce a REST API if the repo uses Server Actions.

Do not rewrite the whole app.

Do not overbuild enterprise accounting features.

Prioritise correctness, auditability, simple bookkeeping, and clean reporting.

---

# Code scan requirements

Do a deep scan of the repo.

Inspect at minimum:

* `package.json`
* workspace/monorepo config files
* `packages/db/src/schema/*`
* `packages/db/src/queries/*`
* `packages/db/src/*`
* `apps/admin/src/app/actions/*`
* `apps/admin/src/app/(admin)/*`
* `apps/admin/src/lib/financial.ts`
* billing routes/pages/components
* income routes/pages/actions
* expense routes/pages/actions
* dashboard/reporting routes
* snapshot/month-locking logic
* ledger/allocation logic
* PDF/export logic if available
* email/payment reminder logic if available
* docs/specifications
* docs/architecture
* docs/audits
* docs/implementation-plans

Do not only search filenames.

Read the actual schema, queries, Server Actions, validation schemas, UI pages, and documented implementation plans.

Where possible, cite exact file paths and explain what each file currently does.

---

# Research requirement

Research how common invoicing/accounting systems handle their minimum features.

Look at systems such as:

* QuickBooks
* Xero
* FreshBooks
* Wave
* Zoho Books
* Sage

Focus only on what is relevant to PMG’s revised MVP.

Research these areas:

1. invoice lifecycle
2. quote-to-invoice conversion
3. manual payments
4. partial payments
5. overpayments
6. credit notes
7. refunds
8. income tracking
9. expense tracking
10. manual cash/bank accounts
11. Chart of Accounts
12. double-entry posting
13. General Ledger
14. Accounts Receivable
15. Profit & Loss
16. Trial Balance
17. Balance Sheet
18. Cash Flow Statement
19. audit trail
20. period locking
21. accountant/export readiness

Do not over-focus on VAT or bank feeds because those are excluded from PMG’s current MVP.

---

# Deliverable 1: Industry research summary

Create a concise summary explaining how modern invoicing/accounting systems work.

Include:

* common invoice lifecycle
* difference between quote, invoice, payment, income, journal entry, and ledger entry
* difference between cash-basis and accrual-basis accounting
* what reports can be built on cash-basis
* what requires full double-entry accounting
* what is needed for a practical non-VAT small business bookkeeping system
* what PMG can safely defer

Make the explanation practical and PMG-focused.

---

# Deliverable 2: Corrected MVP scope

Define the revised MVP as:

**PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds**

Split features into these categories:

## Required for MVP

Include at least:

1. clients
2. divisions
3. quotes
4. invoices
5. invoice line items
6. invoice numbering
7. invoice status management
8. manual payment recording
9. partial payment support
10. income tracking
11. expense tracking
12. expense categories
13. manual cash/bank account
14. Chart of Accounts
15. journal entries
16. journal lines
17. General Ledger
18. Accounts Receivable
19. Aged Receivables
20. Profit & Loss
21. Trial Balance
22. period locking
23. financial snapshots
24. audit trail
25. PDF export for invoices/statements
26. basic accountant export

## Not required for MVP

Include:

1. bank feeds
2. automatic bank syncing
3. imported bank statements
4. VAT reports
5. SARS VAT submission
6. payroll
7. inventory
8. multi-currency
9. automated depreciation
10. full Accounts Payable module
11. supplier portal
12. bank API integration

## Future phase

Include:

1. VAT registration support
2. bank CSV import
3. proper bank reconciliation
4. Accounts Payable
5. supplier bills
6. credit notes
7. refunds
8. Balance Sheet
9. Cash Flow Statement
10. asset register
11. liability register
12. accountant portal

---

# Deliverable 3: PMG current-state code audit

Create a detailed table with these columns:

| Feature | Industry standard | Old research status | Actual repo status | Evidence from file paths | MVP decision | Recommendation |

Use these statuses:

* ✅ Good enough for MVP
* 🟡 Partially implemented
* 🔴 Missing / required
* ⚪ Not required for MVP
* 🔵 Future phase
* 📄 Documented only, not implemented

Audit at least these areas:

1. clients
2. divisions
3. quotes
4. invoices
5. invoice numbering
6. invoice line items
7. invoice statuses
8. invoice PDFs
9. quote-to-invoice conversion
10. invoice due dates
11. invoice issue/void/paid flow
12. manual payments
13. partial payments
14. payment allocations
15. overpayments
16. credit notes
17. refunds
18. Accounts Receivable
19. Aged Receivables
20. income table
21. expense table
22. expense categories
23. supplier/vendor records
24. Accounts Payable
25. manual cash/bank accounts
26. bank reconciliation
27. Chart of Accounts
28. current ledger/allocation table
29. true accounting General Ledger
30. journal entries
31. journal lines
32. Profit & Loss
33. Trial Balance
34. Balance Sheet
35. Cash Flow Statement
36. VAT settings
37. VAT invoice behaviour
38. period locking
39. financial snapshots
40. audit trail
41. user permissions
42. accountant export
43. reporting pages
44. financial calculation engine
45. dashboard metrics

Be strict. If something exists only in documentation, mark it as documented only.

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

Define simple posting rules for PMG’s non-VAT cash-basis MVP.

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

Save the main audit here:

`docs/research/accounting-system/01-pmg-manual-bookkeeping-mvp-audit.md`

Save the implementation roadmap here:

`docs/research/accounting-system/02-pmg-manual-bookkeeping-mvp-roadmap.md`

Save the proposed schema plan here:

`docs/research/accounting-system/03-pmg-manual-bookkeeping-schema-plan.md`

The documents must be practical, implementation-ready, and specific to PMG.

Do not produce generic accounting theory only.

---

# Final answer requirements

At the end, provide:

1. Executive summary
2. What PMG already has
3. What PMG still needs
4. What should be removed from MVP
5. Recommended first 5 development tasks
6. Risks to fix before building more features
7. Suggested commit plan
8. Open questions for Jacob

Keep the recommendations practical for a solo developer building an internal business app.
