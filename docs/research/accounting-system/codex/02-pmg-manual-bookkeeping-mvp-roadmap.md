# PMG Manual Bookkeeping MVP - Implementation Roadmap

Date: 2026-06-12

## Roadmap summary

Build the accounting system in small, testable phases. Do not replace the current billing system. Stabilize it, disable VAT for the MVP, then add a journal-backed accounting layer behind payment, income, expense, and owner-draw events.

Estimated effort assumes a solo developer familiar with this repo.

## Phase 1: Stabilize current financial flows

Objective: confirm and harden invoice, payment, income, expense, and report behavior before adding accounting tables.

Files likely to change:

- `apps/admin/src/app/actions/billing-invoices.ts`
- `apps/admin/src/app/actions/billing-payments.ts`
- `apps/admin/src/app/actions/income.ts`
- `apps/admin/src/app/actions/expenses.ts`
- `packages/db/src/queries/billing.ts`
- `apps/admin/src/lib/financial.ts`

Database changes: none.

UI changes:

- Make outstanding balance and allocated amount visible and consistent.
- Clarify that the existing finance ledger is an allocation ledger, not a General Ledger.

Server Actions:

- Wrap quote conversion, mark-paid, record-payment, update-payment, and delete-payment writes in `db.transaction()`.
- Ensure payment allocation total cannot exceed payment amount.
- Recalculate invoice status inside the same transaction as allocation changes.

Testing checklist:

- Create invoice.
- Issue invoice.
- Record partial payment.
- Record final payment.
- Delete payment and confirm invoice status rolls back.
- Adjust payment up/down and confirm FIFO/LIFO allocation rules.

Acceptance criteria:

- No multi-row financial operation can leave income, allocations, and invoice status out of sync.

Effort: 1-2 days.

## Phase 2: Non-VAT setting and invoice simplification

Objective: make PMG explicitly non-VAT for the MVP.

Files likely to change:

- `packages/db/src/schema/billing.ts`
- `packages/db/src/migrations/*`
- `apps/admin/src/app/actions/settings.ts`
- `apps/admin/src/app/actions/billing-invoices.ts`
- `apps/admin/src/app/actions/billing-quotes.ts`
- `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`
- `apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`
- `apps/admin/src/components/billing/document-preview.tsx`
- `apps/admin/src/components/billing/billing-totals-block.tsx`

Database changes:

- Add `organisation_settings.is_vat_registered boolean not null default false`.

UI changes:

- Hide VAT toggles when false.
- Hide VAT number on invoice documents when false.
- Remove active VAT wording from item/pricing labels when false.
- Never show "Tax Invoice" while false.

Server Actions:

- Force `vatEnabled=false`, `vatAmount=0`, `vatRate=0` while not registered.
- Ignore client-submitted VAT values unless setting is enabled.

Validation:

- Tests should fail if VAT changes totals while `isVatRegistered=false`.

Acceptance criteria:

- A user cannot create a VAT-bearing quote/invoice while PMG is non-VAT.

Effort: 1 day.

## Phase 3: Accounts Receivable and payment flow

Objective: make operational AR reliable before GL work.

Files likely to change:

- `packages/db/src/queries/billing.ts`
- `apps/admin/src/app/actions/billing-payments.ts`
- `apps/admin/src/app/(admin)/billing/statements/*`
- `apps/admin/src/components/dashboard/aging-report-grid.tsx`

Database changes:

- Existing `payment_allocations` indexes are present. Add constraints if missing:
  - allocation amount positive
  - optional unique `(income_id, invoice_id)` if one allocation per payment/invoice is desired

UI changes:

- Add clear paid, outstanding, and unallocated credit fields.
- Add report filters for client, division, and as-of date.

Acceptance criteria:

- AR equals issued/overdue/partial invoice totals minus allocations.
- Aged AR uses due date and outstanding balance.

Effort: 1-2 days.

## Phase 4: Chart of Accounts

Objective: add a locked, seeded account list for PMG.

Files likely to change:

- `packages/db/src/schema/accounting.ts` (new)
- `packages/db/src/schema/index.ts`
- `packages/db/src/queries/accounting.ts` (new)
- `packages/db/src/migrations/*`
- `packages/db/src/seed*` or existing seed location
- income and expense forms/actions

Database changes:

- Add `chart_of_accounts`.
- Add optional account links to categories/income/expenses, or bridge with journal posting only.

UI changes:

- Read-only Chart of Accounts page.
- Account dropdowns for expenses and non-invoice income.

Validation:

- Revenue events require revenue account.
- Expense events require expense account.
- Bank/cash movement requires asset account.

Acceptance criteria:

- Seeded COA exists and cannot be casually renamed/deleted through MVP UI.

Effort: 1 day.

## Phase 5: Manual bank/cash accounts

Objective: add internal cash accounts without feeds or API integrations.

Files likely to change:

- `packages/db/src/schema/accounting.ts`
- `packages/db/src/queries/accounting.ts`
- payment, income, expense, and draw actions/forms

Database changes:

- Add `bank_accounts` linked to a COA asset account.

UI changes:

- Let user choose Business Bank Account or Cash on Hand when recording payment/income/expense/draw.
- Add opening balance and opening balance date.

Acceptance criteria:

- Cash summary can calculate opening balance + inflows - outflows.

Effort: 1 day.

## Phase 6: Journal entries and posting helper

Objective: make every cash event produce balanced accounting records.

Files likely to change:

- `packages/db/src/schema/accounting.ts`
- `packages/db/src/queries/accounting.ts`
- `apps/admin/src/lib/accounting/posting.ts` (new)
- `apps/admin/src/app/actions/billing-payments.ts`
- `apps/admin/src/app/actions/income.ts`
- `apps/admin/src/app/actions/expenses.ts`
- `apps/admin/src/app/actions/account-withdrawal.ts`

Database changes:

- Add `journal_entries`.
- Add `journal_entry_lines`.

Posting helper contract:

- Accept a transaction client, journal header, and lines.
- Reject zero-line journals.
- Reject journals where debit total != credit total.
- Reject lines with both debit and credit.
- Reject lines with neither debit nor credit.

Acceptance criteria:

- Invoice issue posts no journal.
- Payment receipt posts Dr Bank / Cr Revenue.
- Manual income posts Dr Bank/Cash / Cr Revenue or Other Income.
- Expense posts Dr Expense / Cr Bank/Cash.
- Owner draw posts Dr Owner Drawings / Cr Bank.

Effort: 2-3 days.

## Phase 7: General Ledger, Trial Balance, and export

Objective: expose journal-backed reports and accountant exports.

Files likely to change:

- `packages/db/src/queries/accounting.ts`
- `apps/admin/src/app/(admin)/finance/general-ledger/page.tsx`
- `apps/admin/src/app/(admin)/finance/trial-balance/page.tsx`
- `apps/admin/src/components/reports/export-csv-button.tsx`

Reports added:

- General Ledger
- Trial Balance
- Accountant journal CSV

CSV columns:

- date
- source type
- source reference
- division
- client
- account code
- account name
- description
- debit
- credit
- payment method or bank account
- created by
- created at

Acceptance criteria:

- Trial Balance total debit equals total credit.
- GL can filter by account, division, client, date range, and source type.

Effort: 2 days.

## Phase 8: Formal cash-basis Profit and Loss

Objective: replace informal P&L with journal-backed reporting.

Files likely to change:

- `packages/db/src/queries/accounting.ts`
- `apps/admin/src/app/(admin)/finance/reports/profit-loss/page.tsx`
- dashboard helpers after reconciliation

Report rules:

- Revenue: credit lines to `revenue` accounts.
- Expenses: debit lines to `expense` accounts.
- Owner drawings do not affect P&L.
- PMG allocation buckets do not affect P&L unless cash is actually spent as an expense.

Acceptance criteria:

- P&L totals reconcile to journal lines.
- Division filter uses `divisionId`, not duplicated accounts.

Effort: 1-2 days.

## Phase 9: Manual bank/cash summary

Objective: provide a bank/cash balance view without bank feeds.

Files likely to change:

- `packages/db/src/queries/accounting.ts`
- `apps/admin/src/app/(admin)/finance/cash-summary/page.tsx`

Report:

- Opening balance
- Money in
- Money out
- Calculated closing balance
- Account filter
- Date range filter

Acceptance criteria:

- Business Bank Account and Cash on Hand balances tie to journal lines.

Effort: 1 day.

## Phase 10: Audit trail and period-lock hardening

Objective: make financial records auditable and closed periods immutable.

Files likely to change:

- `packages/db/src/schema/accounting.ts`
- `apps/admin/src/lib/date-rules.ts`
- all financial Server Actions
- possibly shared action middleware/helper

Database changes:

- Add `audit_logs`.

Audit events:

- create
- update
- delete
- issue
- void
- pay
- allocate
- reverse
- close period

Acceptance criteria:

- Every mutation on invoices, payments, expenses, journals, bank accounts, and settings writes an audit log.
- Closed periods cannot be edited directly; corrections are reversal/new-entry flows.

Effort: 2 days.

## Phase 11: Future accounting modules

Defer until the MVP is stable:

- VAT registration support
- Credit notes
- Refunds
- Suppliers
- Bills
- Bill payments
- Accounts Payable
- Bank CSV imports
- Bank reconciliation
- Balance Sheet
- Cash Flow Statement
- Asset/liability schedules
- Accountant portal

## Minimum reports checklist

| Report | MVP/future | Data source | Acceptance criteria |
|---|---|---|---|
| Accounts Receivable | MVP | invoices + payment allocations | Outstanding balances match invoice totals less allocations. |
| Aged Receivables | MVP | invoices + due dates + allocations | Buckets use due date and partial balances. |
| General Ledger | MVP | journal entries + lines | Every line has account and source. |
| Trial Balance | MVP | journal lines grouped by account | Debits equal credits. |
| Profit and Loss | MVP | revenue and expense journal lines | Net income = revenue - expenses. |
| Manual Bank/Cash Summary | MVP | bank accounts + asset journal lines | Closing balance ties to GL. |
| Income Report | MVP | income + revenue journals | Ties to P&L revenue. |
| Expense Report | MVP | expenses + expense journals | Ties to P&L expenses. |
| Client Statement | MVP | invoices + payments | Client balance reconciles. |
| Division Performance | MVP | division-tagged journals | Division totals reconcile to GL. |
| Balance Sheet | Future | full accrual-ready ledger | Defer. |
| Cash Flow Statement | Future | classified cash movement | Defer. |
| Aged Payables | Future | bills + bill payments | Defer. |
| VAT Report | Future | tax settings + VAT lines | Disabled for MVP. |
| Bank Reconciliation | Future | imported/manual statement rows | Defer. |

## Recommended first five development tasks

1. Add non-VAT mode and force VAT zero in server actions.
2. Wrap payment/invoice multi-row writes in DB transactions.
3. Add accounting schema: COA, bank accounts, journal entries, journal lines, audit logs.
4. Build posting helper and wire payments, income, expenses, and owner draws.
5. Add General Ledger, Trial Balance, cash-basis P&L, and accountant CSV export.

## Suggested commit plan

1. `docs: add accounting mvp audit and roadmap`
2. `fix(billing): enforce non-vat mvp mode`
3. `fix(finance): wrap payment and invoice writes in transactions`
4. `feat(db): add accounting core schema`
5. `feat(accounting): add cash-basis posting helper`
6. `feat(reports): add gl trial balance and p&l`
7. `feat(audit): log financial mutations`
