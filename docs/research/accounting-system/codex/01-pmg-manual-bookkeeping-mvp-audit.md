# PMG Manual Bookkeeping MVP - Research and Code Audit

Date: 2026-06-12

## Executive summary

PMG Control Center is currently a billing, client, income, expense, dashboard, snapshot, and internal allocation system. It is not yet a complete bookkeeping system because the repository does not contain a Chart of Accounts, balanced journal entries, journal entry lines, manual cash/bank accounts, accountant exports, or a true General Ledger.

The right MVP is **PMG Manual Bookkeeping MVP - Cash Basis, Non-VAT, No Bank Feeds**. That keeps the existing invoice/payment/expense flows, disables VAT behavior by default, and adds the smallest accounting backbone needed to produce reliable cash-basis reports.

The strongest code-backed findings are:

- Billing is substantially implemented in `packages/db/src/schema/billing.ts`, `packages/db/src/queries/billing.ts`, `apps/admin/src/app/actions/billing-invoices.ts`, and `apps/admin/src/app/actions/billing-payments.ts`.
- Partial payments and payment allocations are implemented through `payment_allocations`, but payment writes are sequential and should be wrapped in `db.transaction()`.
- Expenses and income exist in `packages/db/src/schema/expenses.ts` and `packages/db/src/schema/income.ts`, but neither posts double-entry accounting entries.
- `packages/db/src/schema/ledger.ts` is an internal allocation ledger for salary/reinvest/reserve/flex/PMG share. It is not a General Ledger.
- VAT is still exposed through invoice/quote fields, settings, UI toggles, and 15% calculations. There is no confirmed `isVatRegistered` setting in schema.
- Period locking exists in Server Actions through `apps/admin/src/lib/date-rules.ts`, but several multi-row financial operations lack transaction boundaries and audit logging.

## External research summary

Modern small-business accounting systems combine operating documents with accounting records. Xero presents invoicing as a workflow for creating quotes/invoices, sending them, accepting payments, tracking unpaid invoices, reminders, permissions, and audit trail. Wave describes accounting software as organizing income, expenses, payments, invoices, reports, and double-entry records. FreshBooks groups invoicing with payments, accounting, expenses, reports, estimates, clients, and bookkeeping features. IRS Publication 538 defines the cash method as reporting income when received and deducting expenses when paid, while accrual reports income when earned and expenses when incurred.

Sources:

- Xero invoicing and accounting workflow: https://www.xero.com/us/accounting-software/send-invoices/
- Wave accounting reports and double-entry positioning: https://www.waveapps.com/accounting
- FreshBooks invoicing feature set: https://www.freshbooks.com/invoice
- IRS Publication 538, accounting methods: https://www.irs.gov/publications/p538
- Zoho Books feature baseline, used as competitor context: https://www.techradar.com/reviews/zoho-books

PMG should not copy the full product breadth of those platforms. For the current business scope, PMG needs the accounting core only where it supports manual bookkeeping: customer records, invoices, manual receipts, expenses, operational AR, cash-basis journals, GL, Trial Balance, P&L, period locks, audit logs, and export.

## Practical accounting model for PMG

### Quote, invoice, payment, income, journal, ledger

- Quote: pre-sale document. No accounting posting.
- Invoice: client obligation. For PMG's cash-basis MVP, it is operational AR only until paid.
- Payment: cash received from the client.
- Income: existing PMG cash receipt record in `income`.
- Journal entry: accounting event header; missing today.
- Journal entry line: debit/credit posting to an account; missing today.
- General Ledger: account-by-account history built from journal lines; missing today.

### Cash basis vs accrual

For PMG's MVP, invoice issue should not recognize revenue. Payment receipt should recognize revenue:

- Dr Business Bank Account
- Cr Service Revenue

This preserves a cash-basis P&L. AR can still exist operationally from invoices and payment allocations, but it is not a ledger balance until PMG later moves to accrual posting.

## Corrected MVP scope

### Required for MVP

1. Clients
2. Divisions
3. Quotes
4. Invoices
5. Invoice line items
6. Invoice numbering
7. Invoice status management
8. Manual payment recording
9. Partial payment support
10. Income tracking
11. Expense tracking
12. Expense categories
13. Manual cash/bank account
14. Chart of Accounts
15. Journal entries
16. Journal lines
17. General Ledger
18. Operational Accounts Receivable
19. Aged Receivables
20. Profit and Loss
21. Trial Balance
22. Period locking
23. Financial snapshots
24. Audit trail
25. Invoice and statement export
26. Basic accountant CSV export

### Not required for MVP

1. Bank feeds
2. Automatic bank syncing
3. Imported bank statements
4. VAT reports
5. SARS VAT submission
6. Payroll
7. Inventory
8. Multi-currency
9. Automated depreciation
10. Full Accounts Payable
11. Supplier portal
12. Bank API integration

### Future phase

1. VAT registration support
2. Bank CSV import
3. Proper bank reconciliation
4. Accounts Payable
5. Supplier bills
6. Credit notes
7. Refunds
8. Balance Sheet
9. Cash Flow Statement
10. Asset register
11. Liability register
12. Accountant portal

## Current-state audit

Legend:

- GOOD: good enough for MVP
- PARTIAL: exists but incomplete or risky
- MISSING: required but absent
- DOC_ONLY: documented/spec only, not implemented
- FUTURE: useful later, not MVP
- NOT_MVP: intentionally excluded now

| Feature | Industry standard | Old research status | Actual repo status | Evidence from file paths | MVP decision | Recommendation |
|---|---|---|---|---|---|---|
| Clients | Customer master with invoice/payment history | Present | GOOD | `packages/db/src/schema/clients.ts`, billing queries join clients | Required | Keep as customer master for AR and statements. |
| Divisions | Department/cost-center reporting dimension | Present | GOOD | `packages/db/src/schema/divisions.ts`, `divisionId` on invoices/income/expenses | Required | Keep division separate from COA. |
| Quotes | Draft/sent/accepted/converted lifecycle | Present | GOOD | `quotations`, `quotationStatusEnum`, `billing-quotes.ts` | Required | Keep; test conversion paths. |
| Invoices | Customer billing document | Present | GOOD | `invoices`, `invoiceStatusEnum`, invoice pages/actions | Required | Keep as sales document and operational AR source. |
| Invoice numbering | Unique sequential numbers | Present | GOOD | `documentSequences`, `packages/db/src/lib/document-numbers.ts` | Required | Keep sequence lock pattern; verify concurrency in tests. |
| Invoice line items | Quantity/rate/service detail | Present | GOOD | `billingLineItems` shared by quote/invoice | Required | Keep; add stronger orphan checks later. |
| Invoice statuses | Draft/issued/partial/paid/overdue/void | Present | GOOD | `invoiceStatusEnum`, `issueInvoice`, `markInvoicePaid`, `voidInvoice` | Required | Add audit logs for state changes. |
| Invoice PDFs/preview | Printable/sendable invoice | Present | PARTIAL | `document-preview.tsx`, PDF/print components | Required | Remove VAT wording when not registered; ensure totals match DB. |
| Quote-to-invoice conversion | Accepted quote becomes draft invoice | Present | GOOD | `convertQuoteToInvoice` in `billing-invoices.ts` | Required | Wrap quote conversion in a transaction. |
| Invoice due dates | Due date drives aging/overdue | Present | GOOD | `dueDate` in schema and queries | Required | Continue using due date for AR aging. |
| Issue/void/paid flow | Controlled immutable transitions | Present | PARTIAL | Server actions exist; audit trail missing | Required | Add audit logs and reversal rules. |
| Manual payments | Record payment received | Present | PARTIAL | `recordClientPayment`, `income`, `paymentAllocations` | Required | Add bank account field and journal posting. |
| Partial payments | Allocate partial cash and keep balance open | Present | GOOD | `payment_allocations`, `partially_paid` status | Required | Keep; add transaction boundaries and tests. |
| Payment allocations | Map income to invoices | Present | GOOD | `paymentAllocations` schema and payment actions | Required | Keep; enforce allocation total <= income total. |
| Overpayments | Track unapplied cash/credit | Partial | PARTIAL | `getClientCreditBalance` computes dynamic credit | Future | Keep computed credit now; formal credit ledger later. |
| Credit notes | Formal reduction document | Missing | MISSING | No schema/action found | Future | Defer; use void/reversal only for MVP. |
| Refunds | Return customer cash | Missing | MISSING | No schema/action found | Future | Defer until credit notes and bank accounts exist. |
| Accounts Receivable | Outstanding invoices by client | Present | PARTIAL | `getClientOutstandingInvoices`, `getAgingReport`, statements | Required | Operational AR is good; ledger AR deferred. |
| Aged Receivables | Buckets by due date/outstanding amount | Present | GOOD | `getAgingReport` subtracts allocations | Required | Add client/division/as-of filters. |
| Income table | Cash receipt register | Present | GOOD | `packages/db/src/schema/income.ts` | Required | Keep; add account/bank/journal linkage. |
| Expense table | Paid expense register | Present | GOOD | `packages/db/src/schema/expenses.ts`, expense actions | Required | Keep; map category to COA account. |
| Expense categories | Reporting categories | Present | PARTIAL | `expense_categories`, string `expenses.category` | Required | Link categories to COA expense accounts. |
| Supplier/vendor records | Vendor master | Missing | MISSING | No supplier schema found | Future | Defer to AP phase. |
| Accounts Payable | Bills/payables/aging | Missing | MISSING | No bills/AP schema found | Future | Defer. |
| Manual cash/bank accounts | Internal cash accounts | Missing | MISSING | No `bank_accounts` schema found | Required | Add manual accounts, no feeds. |
| Bank reconciliation | Statement matching | Missing | NOT_MVP | Spec docs only | Not required | Defer; maybe add manual balance check later. |
| Chart of Accounts | Account master | Missing | MISSING | No COA schema found | Required | Add `chart_of_accounts`. |
| Current ledger/allocation table | Internal spend/allocation register | Present | GOOD | `packages/db/src/schema/ledger.ts` | Required as management layer | Keep separate from GL. |
| True General Ledger | Account history from journal lines | Missing | MISSING | No journal schema found | Required | Build from `journal_entry_lines`. |
| Journal entries | Balanced accounting event header | Missing | MISSING | No `journal_entries` table found | Required | Add and post cash events. |
| Journal lines | Debit/credit account postings | Missing | MISSING | No `journal_entry_lines` table found | Required | Add validation debits = credits. |
| Profit and Loss | Revenue minus expenses report | Partial | PARTIAL | `financial.ts`, `queries/general.ts`, dashboards | Required | Rebuild formal P&L from journals. |
| Trial Balance | Debits equal credits by account | Missing | MISSING | No GL/journal tables | Required | Build after journal lines. |
| Balance Sheet | Assets/liabilities/equity snapshot | Missing | FUTURE | Spec docs only | Future | Defer until accrual/liability/asset model. |
| Cash Flow Statement | Operating/investing/financing cash | Partial docs | FUTURE | `docs/specifications/pmg-financial-statements.md` | Future | MVP cash summary first. |
| VAT settings | Registration flag/rates | Partial | PARTIAL | `vatNumber`, `defaultVatRate`, no `isVatRegistered` | Required to disable | Add global `isVatRegistered=false`. |
| VAT invoice behavior | Tax invoice/tax amount handling | Partial | PARTIAL | VAT toggles and 15% calculations in invoice/quote forms/actions | Not active in MVP | Hide toggles and force VAT zero. |
| Period locking | Prevent closed-period mutation | Present | GOOD | `isPeriodClosed` used in income/expense/payment/invoice actions | Required | Also check original and new dates on updates. |
| Financial snapshots | Frozen monthly metrics | Present | GOOD | `packages/db/src/schema/snapshots.ts`, snapshot actions/tests | Required | Keep for management reporting. |
| Audit trail | Who changed what and when | Missing | MISSING | No `audit_logs` schema found | Required | Add immutable audit logs early. |
| User permissions | Role-controlled finance actions | Partial | PARTIAL | Better Auth and settings/users exist | Required | Add finance-specific permissions later. |
| Accountant export | CSV/accountant pack | Partial | MISSING | Generic report CSV component, no journal export | Required | Export journal lines, invoices, payments, expenses. |
| Reporting pages | Financial dashboards/reports | Present | PARTIAL | dashboard, insights reports, billing statements, finance ledger | Required | Replace informal accounting reports with journal-backed reports. |
| Financial calculation engine | PMG allocations/profit pool | Present | GOOD | `apps/admin/src/lib/financial.ts` | Required | Keep as management layer, not P&L expense layer. |
| Dashboard metrics | KPIs/charts | Present | GOOD | dashboard components and financial helpers | Required | Reconcile dashboards to journal-backed reports later. |

## Critical bugs and risks

| Risk | Severity | Affected files | Explanation | Recommended fix | Blocks MVP |
|---|---|---|---|---|---|
| VAT can still affect totals | High | `billing-invoices.ts`, `billing-quotes.ts`, invoice/quote form clients, settings | 15% VAT calculation and toggles still exist without a global non-VAT guard. | Add `isVatRegistered=false`; force VAT zero in UI and server actions. | Yes |
| No double-entry accounting core | High | `packages/db/src/schema/*` | Income/expenses are standalone rows, not balanced debit/credit entries. | Add COA, journals, lines, posting helper. | Yes |
| Payment writes are not transactional | High | `billing-payments.ts`, `billing-invoices.ts`, `income.ts` action | Income, allocations, and invoice statuses can partially write if a later step fails. | Wrap multi-row financial writes in `db.transaction()`. | Yes |
| Allocation ledger can be mistaken for GL | High | `ledger.ts`, `financial.ts`, finance ledger UI | Existing ledger tracks PMG allocation buckets, not accounting accounts. | Rename in UI/docs or keep clearly separated from GL. | Yes |
| No audit log | High | Financial actions | Voids, edits, deletes, and payments are not centrally auditable. | Add `audit_logs` and write for every mutation. | Yes |
| VAT wording on documents | Medium | `document-preview.tsx`, billing item pages | UI still references VAT and unit price excl. VAT. | Remove/hide VAT language while non-registered. | Yes |
| Overpayment is computed only | Medium | `billing-payments.ts` | Client credit is dynamic, not a durable credit-note or liability record. | Accept for MVP; formalize later. | No |
| Period lock update coverage | Medium | payment/expense/invoice actions | Some update paths check dates, but consistency should be audited action-by-action. | Check original date and new date in every mutation. | Yes |
| Paid/issued edit controls need audit | Medium | `billing-invoices.ts` | Paid/void edit is blocked, but issued edits are allowed without audit. | Log changes and restrict issued invoice edits after sending. | Yes |
| Dashboard may not reconcile to accounting | Medium | `financial.ts`, reports, dashboard | Management metrics derive from income/expenses and allocation math, not journal lines. | Rebuild accounting reports from journals; keep dashboard as summary. | No |

## What PMG already has

- Clients, divisions, quotes, invoices, line items, document sequences, invoice statuses, due dates.
- Payment allocation model with partial payment support.
- Income and expense registers.
- Expense categories.
- Aged receivables query and client statements.
- Period locking checks.
- Financial snapshots and management dashboard metrics.
- Internal allocation ledger for PMG share/profit pool spending.

## What PMG still needs

- Global non-VAT mode.
- Manual cash/bank account table.
- Chart of Accounts.
- Journal entries and journal entry lines.
- Balanced posting helper wrapped in DB transactions.
- General Ledger report.
- Trial Balance report.
- Formal cash-basis P&L.
- Audit logs.
- Accountant CSV export.

## What should be removed from MVP scope

Remove or defer active work on bank feeds, imported statements, VAT reports, SARS VAT submission, payroll, inventory, multi-currency, full AP, supplier portal, asset register, liability register, Balance Sheet, and Cash Flow Statement.

## Open questions for Jacob

1. Should invoice issue remain operational-only for MVP, with revenue posted only when paid? Recommended: yes.
2. Should bank/cash accounts be global PMG accounts, with division only as a reporting tag? Recommended: yes.
3. Should COA be locked to seeded accounts for MVP? Recommended: yes.
4. Should loan tracking post journals now or remain operational? Recommended: operational for MVP.
5. What exact CSV export does the accountant want first: journal lines, invoice/payment register, or monthly pack?
