You are a senior full-stack engineer, accounting-systems analyst, technical auditor, and product architect.

I need you to perform a deep research and code audit for my PMG Control Center app.

The goal is to define the minimum viable bookkeeping/accounting system I should build into PMG Control Center.

This must be based on:

1. Industry research into common accounting and invoicing systems
2. My existing uploaded research document: `PMG-Accounting-Research-Gap-Analysis.docx`
3. A real code scan of my public GitHub repo

Repository:
current app or clone
https://github.com/jchademwiri/pmg-hub.git

Clone the repo and inspect the actual source code before making conclusions.

Use:

```bash
# current app or clone
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
  * invoice PDFs must not say "Tax Invoice" unless PMG becomes VAT registered.
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

Manual reconciliation can be a later feature, but the MVP may include a simple "manual bank balance check" where the user records an opening balance and compares it to calculated system balance.

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

Your task is to validate which of these are actually needed for PMG's revised MVP and which should be deferred.

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

Do not introduce a REST API, use the Server Actions.

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

Focus only on what is relevant to PMG's revised MVP.

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

Do not over-focus on VAT or bank feeds because those are excluded from PMG's current MVP.

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

# Final answer requirements for Phase 1

At the end of this audit phase, provide:

1. Executive summary
2. What PMG already has
3. What PMG still needs
4. What should be removed from MVP scope
5. Key findings from industry research
6. Open questions for Jacob

Keep the recommendations practical for a solo developer building an internal business app.

---

# Next step

After completing this audit and research, proceed to **Phase 2 schema and roadmap prompt** (`docs/research/accounting-system/ai-prompts/02-accounting-system-schema-roadmap-prompt.md`) which will define database changes, posting rules, reports, and the detailed implementation roadmap.
