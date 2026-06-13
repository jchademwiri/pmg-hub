# Accounting Readiness Improvement Audit

Date: 2026-06-12

## Executive Summary

PMG Control Center has a solid operational foundation: dashboard, relationships, billing, payments, statements, expenses, snapshots, settings, user management, and internal allocation tracking are already in place. The app is not yet ready to safely add accounting modules until several reliability, naming, authorization, data-integrity, and reporting issues are cleaned up.

The most important finding is that the current system is **operational finance**, not accounting. Quotes, invoices, payments, expenses, and PMG allocation buckets are useful business records, but they are not posted to a Chart of Accounts, Journal Entries, Journal Lines, a General Ledger, or a Trial Balance. That separation must be made explicit before accounting work starts.

Highest-priority blockers before accounting:

1. Remove data mutation from read/render paths, especially the self-healing `payment_allocations` backfill in `apps/admin/src/app/(admin)/billing/payments/page.tsx`.
2. Add role/permission guards to finance and billing Server Actions. Most financial mutations currently require only an authenticated session.
3. Wrap multi-table financial writes in database transactions.
4. Add a global non-VAT mode and remove active VAT behavior from billing while PMG is not VAT registered.
5. Rename or clearly separate the existing `ledger` feature as an allocation/spend ledger, not the future accounting General Ledger.
6. Add a financial audit trail before introducing irreversible accounting entries.

## Scope Reviewed

Code and app areas inspected:

- App routes under `apps/admin/src/app`, including dashboard, billing, finance, relationships, insights, and settings.
- Navigation in `apps/admin/src/components/navigation/app-sidebar.tsx` and `apps/admin/src/components/navigation/nav-data.ts`.
- Database schema in `packages/db/src/schema/*`.
- Billing and payment actions in `apps/admin/src/app/actions/billing-invoices.ts`, `billing-quotes.ts`, `billing-payments.ts`, and `income.ts`.
- Expense and allocation actions in `apps/admin/src/app/actions/expenses.ts`, `expense-categories.ts`, `ledger.ts`, and `account-withdrawal.ts`.
- Reporting helpers in `packages/db/src/queries/general.ts`, `billing.ts`, `ledger.ts`, and `expenses.ts`.
- Auth and roles in `apps/admin/src/lib/auth.ts`, `apps/admin/src/app/actions/users.ts`, and `packages/db/src/schema/auth.ts`.
- UI patterns in invoice, payment, expense, and ledger client components.

This audit does not implement accounting modules.

## 1. Current System Review

### What Is Working Well

| Area | What works | Preserve |
|---|---|---|
| App structure | Next.js App Router route groups separate auth/admin areas cleanly. | Keep route-group structure. |
| Navigation | `nav-data.ts` is a single source of truth for sidebar groups and route labels. | Continue adding routes through `nav-data.ts`. |
| Billing schema | `quotations`, `invoices`, `billing_line_items`, `billing_items`, `document_sequences`, and `payment_allocations` are well-scoped operational tables. | Keep billing as operational source of truth. |
| Payment allocation | `payment_allocations` supports partial payments and multi-invoice allocation. | Preserve and harden this model. |
| Period locking | Financial actions call `isPeriodClosed()` in many places. | Keep and centralize lock enforcement. |
| Snapshots | Monthly financial snapshots exist in `packages/db/src/schema/snapshots.ts`. | Preserve for management reporting. |
| User management | Better Auth with invited users and role fields is present. | Extend role model for finance permissions. |
| Email auditing | Email sends use `email_audit_log` with idempotency keys. | Use this as a pattern for financial audit logs. |

### System Weak Areas

| Finding | Evidence | Why it matters | Recommendation |
|---|---|---|---|
| Operational finance and accounting names are mixed | Sidebar has `Finance > Ledger`; schema table is `ledger` with allocation buckets. | A future General Ledger will be confused with PMG allocation spending. | Rename current UI to "Allocation Ledger" or "Allocation Spending" before creating accounting GL. |
| Read route mutates financial data | `billing/payments/page.tsx` inserts `paymentAllocations` during page render when count is zero. | Accounting systems cannot have read paths silently changing records. | Move backfill to one-time migration/admin repair action with audit log. |
| Most financial actions only require login | `billing-*`, `expenses.ts`, `ledger.ts`, `clients.ts`, `divisions.ts` mostly call `getSessionOrRedirect()` only. | Viewer users may mutate sensitive financial records. | Add finance-specific permission checks to Server Actions. |
| Multiple financial writes are sequential | `recordClientPayment`, `markInvoicePaid`, `convertQuoteToInvoice`, `deleteIncome` perform multi-step writes without transactions. | Partial failure can corrupt payments, allocations, and invoice statuses. | Wrap all multi-table financial actions in `db.transaction()`. |
| VAT is partially active | Billing schema/actions/forms include `vatEnabled`, `vatAmount`, `defaultVatRate`, VAT labels, and 15% logic. | PMG is non-VAT; accidental VAT invoices/totals are high risk. | Add `isVatRegistered=false` and force VAT zero until enabled later. |
| No general financial audit log | Only email audit log exists. | Edits/deletes/payments/voids need traceability before journals exist. | Add `financial_audit_logs` or general `audit_logs`. |

## 2. UI/UX Audit

### Good UI Patterns To Preserve

- Sidebar grouping is clear: Finance, Billing, Relationships, Insights, System.
- `TopNav`/page header context gives the app a consistent shell.
- Empty states exist in places such as invoices and expenses.
- Tables use row-click navigation for many records.
- Confirmation dialog exists and is used for destructive invoice/payment actions.
- shadcn-style primitives exist under `apps/admin/src/components/ui`.

### UI/UX Issues And Improvements

| Problem found | Evidence | Why it matters | Proposed solution | Likely files | Priority | Effort | Risk if ignored |
|---|---|---|---|---|---|---|---|
| Finance naming is ambiguous | `nav-data.ts` labels current allocation table as `Ledger`. | Users will confuse allocation entries with accounting General Ledger. | Rename to `Allocation Ledger`; reserve `General Ledger` for journal-line accounting. | `nav-data.ts`, finance ledger pages/components | Critical | S | High confusion and wrong accounting assumptions. |
| Inconsistent page composition | Some pages use Cards around tables; others render client shells directly. | Users experience inconsistent density and hierarchy. | Standardize list pages: header, filters, table, pagination, empty state. Use cards only when framing a tool or repeated item. | invoice/payment/expense/ledger pages | Important | M | Harder to maintain and polish. |
| Raw links used for pagination | `expenses-client.tsx` uses `<a>` styled manually; invoices use `Link`; payments use `Button asChild`. | Inconsistent navigation and design-system usage. | Use one Pagination/Button/Link pattern across all tables. | `expenses-client.tsx`, `invoices-client.tsx`, `payments-client.tsx` | Important | S | UI drift and accessibility inconsistency. |
| Icons manually sized in buttons | Examples: `Plus className="h-4 w-4 mr-2"`, `MoreHorizontal className="size-4"`. | Local shadcn rules prefer button-managed icon sizing and `data-icon`. | Standardize button icons with `data-icon` and remove manual sizing where components support it. | Many client components | Nice-to-have | S-M | Visual inconsistency. |
| Custom status/chip styling | `payments-client.tsx` uses raw emerald classes for credit balance and custom division badge. | Design tokens are bypassed; dark mode and consistency can drift. | Use `Badge` variants and semantic tokens. | `payments-client.tsx`, table components | Nice-to-have | S | The UI becomes harder to theme. |
| Forms are functional but not fully standardized | `ExpenseAddForm` and `LedgerAddForm` use `Field`, but not `FieldGroup`; layout is custom grid. | Form validation and spacing patterns will diverge as accounting forms are added. | Create a shared finance form layout pattern using `FieldGroup`, `Field`, `Alert`, and consistent action row. | expense/ledger/payment/invoice forms | Important | M | Accounting forms duplicate inconsistent patterns. |
| Mobile table behavior is uneven | Payments table has `overflow-x-auto`; invoices table does not wrap in an overflow container. | Billing/finance records are table-heavy and need mobile scanning. | Wrap all wide tables in `overflow-x-auto`, define minimum widths, keep actions stable. | invoice/quote/client/expense tables | Important | M | Mobile workflows become unreliable. |
| Empty states vary | Invoices use `EmptyState`; payments render a table row message. | Empty state UX feels inconsistent. | Use `EmptyState` consistently outside table body or standardize table empty rows. | payments, reports, lists | Nice-to-have | S | Minor UX inconsistency. |
| Loading states are limited | Route-level loading exists, but table/form pending states vary. | Accounting workflows will need clear pending, disabled, and retry states. | Use `Skeleton` for tables/cards and button disabled/spinner patterns consistently. | route loading files, forms | Important | M | Users may double-submit or lose confidence. |

### Navigation Improvements

Recommended future sidebar structure before accounting:

- Finance
  - Expenses
  - Categories
  - Allocation Ledger
  - Allocation Accounts
- Billing
  - Quotes
  - Invoices
  - Payments
  - Statements
  - Items
- Accounting (new later, after cleanup)
  - Chart of Accounts
  - Journal Entries
  - General Ledger
  - Trial Balance
  - Profit & Loss
  - Cash/Bank Accounts

Do not put the future General Ledger under the same route/name as the existing allocation ledger.

## 3. Data Flow And Business Logic Audit

### Current Data Flow

Quote flow:

1. Quote created in `billing-quotes.ts`.
2. Line items written to `billing_line_items`.
3. Quote status changes through `updateQuotationStatus`.
4. Accepted quote can convert to invoice in `convertQuoteToInvoice`.

Invoice flow:

1. Invoice created as draft in `billing-invoices.ts`.
2. Line items inserted separately.
3. Invoice can be issued, marked paid, voided, or bulk issued/voided.
4. `markInvoicePaid` creates an `income` row and marks invoice paid.

Payment flow:

1. `recordClientPayment` inserts `income`.
2. Inserts `payment_allocations`.
3. Updates invoice status to `paid` or `partially_paid`.
4. Optionally sends payment receipt email.

Expense flow:

1. `createExpense` inserts expense row.
2. Expense category is a string, optionally maintained through `expense_categories`.
3. No cash/bank account or accounting account is recorded.

Allocation ledger flow:

1. `createLedgerEntry` writes PMG allocation bucket spending.
2. It checks available bucket balance from `getLedgerBalances`.
3. It is management allocation tracking, not accounting.

### Business Logic Risks

| Risk | Evidence | Recommendation |
|---|---|---|
| Multi-step financial writes are not atomic | `recordClientPayment`, `markInvoicePaid`, `deleteIncome`, `convertQuoteToInvoice` | Wrap in transactions and move status recalculation inside the transaction. |
| Page render can create payment allocations | `billing/payments/page.tsx` self-healing backfill | Move to migration/admin repair action. |
| Payment allocation can exceed payment amount | Payment action inserts allocation rows but does not visibly enforce total allocation <= payment amount at DB level. | Add server validation and optional DB checks. |
| `incomeId` on invoices overlaps with `payment_allocations` | `invoices.incomeId` kept for legacy compatibility. | Treat `payment_allocations` as source of truth; document `incomeId` as legacy or deprecate later. |
| Paid timestamp can be recalculated incorrectly | Recalculation sets `paidAt: new Date()` when allocations reach total. | Preserve actual payment date or latest allocation date, not current edit time. |
| Invoice issue can be sent/issued without financial audit | `issueInvoice`, email send updates status | Add audit log for status changes and sends. |
| Issued invoice edits are allowed | `updateInvoice` allows draft/issued/overdue edits even in closed periods due current condition. | Restrict issued invoice edits or require revision/audit trail. |
| Expense categories are mutable strings | `expense-categories.ts` renames category and updates all expenses. | Move toward `expenseCategoryId` or COA account mapping before accounting. |
| Allocation bucket spending may be double-counted | `ledger` and `expenses` are separate, both can represent spend. | Define whether allocation entries are planning/internal allocation only or real cash spend; do not feed both into P&L. |

## 4. Database And Schema Audit

### Strengths

- UUID primary keys are consistently used for business tables.
- Important financial amounts use `numeric(12,2)`.
- Core enums exist for quote, invoice, billing item, allocation, lead, and email audit statuses.
- Useful indexes exist on dates, statuses, division IDs, client IDs, document relationships, and payment allocations.
- FK delete behavior is considered in many places (`restrict`, `set null`, `cascade`).

### Schema Issues To Clean Up

| Problem found | Why it matters | Proposed solution | Likely files | Priority | Effort | Risk if ignored |
|---|---|---|---|---|---|---|
| No global non-VAT flag | VAT fields exist but PMG is not VAT registered. | Add `organisation_settings.is_vat_registered default false`. | `billing.ts`, migration, settings action/forms | Critical | S | Incorrect tax behavior. |
| Expenses store category text | Text categories are weak for COA mapping. | Add `expense_category_id` or account mapping table; keep text as display/backfill. | `expenses.ts`, `expense-categories.ts` | Important | M | Harder accounting backfill and reporting drift. |
| `ledger` table name conflicts with accounting GL | Future `general_ledger`/journal reports will collide conceptually. | Rename UI first; optionally rename table later only with careful migration. | `ledger.ts`, routes/components | Critical | M | Major conceptual confusion. |
| No financial audit table | Email audit exists, financial audit does not. | Add `audit_logs` before accounting module. | new schema, financial actions | Critical | M | No reliable trace of changes. |
| `updatedAt` relies on app layer | Many schemas note direct DB operations leave `updatedAt` stale. | Add DB triggers later or strict mutation helper. | all financial schemas | Important | M-L | Audit/reporting metadata drift. |
| Invoice line items use polymorphic reference without FK | `billing_line_items.documentId` points to quotes or invoices. | Keep for now; add app-level orphan checks and cleanup tests. | `billing.ts`, queries/actions | Important | M | Orphaned line items affect totals. |
| VAT/default settings are division-level but registration is org-level | `divisionBillingSettings.defaultVatRate`; org has `vatNumber`. | Make registration org-wide, rates future-only. | settings schema/actions | Critical | S | Mixed VAT behavior across documents. |
| No cash/bank account fields | Income and expenses cannot identify cash destination/source. | Add later before accounting postings; design now. | `income.ts`, `expenses.ts` | Important | M | Journal backfill assumptions become fragile. |

### Schema Readiness For Future Accounting

| Future feature | Current support | Readiness |
|---|---|---|
| Invoices | Strong operational support. | Good, after VAT and transaction cleanup. |
| Payments | Good allocation model; weak atomicity and bank account linkage. | Partial. |
| Expenses | Basic register exists; category mapping weak. | Partial. |
| Clients | Good master data for AR and statements. | Good. |
| Divisions | Good reporting dimension. | Good. |
| Allocations | Useful management layer, not accounting. | Must be separated. |
| Journals | Not present. | Not ready. |
| Accounts | No COA/cash accounts. | Not ready. |
| Reporting | Management reports exist; not accounting-grade. | Partial. |

## 5. Billing And Finance Readiness

### Current Classification

The current billing system is **mixed operational/cash-basis**:

- Invoices and quotes are operational documents.
- Payment receipt creates `income`, so revenue is mostly cash-basis.
- Operational AR exists from invoices minus allocations.
- There is no accrual posting on invoice issue.
- There is no double-entry ledger.
- Expenses are paid-expense records, not journal entries.

This is a good base for a **cash-basis manual bookkeeping MVP**, but it must be standardized before accounting modules are layered on top.

### Billing Operations vs Accounting Responsibilities

Billing should own:

- Quotes
- Invoices
- Invoice line items
- Document numbers
- Invoice statuses
- Client statements
- Payment allocation to invoices
- Emailing invoices/quotes/reminders/receipts

Accounting should own later:

- Chart of Accounts
- Journal entries
- Journal lines
- General Ledger
- Trial Balance
- Profit and Loss
- Balance Sheet
- Cash/bank accounts
- Accounting exports
- Period close/reversal rules

Bridge layer should own:

- Posting helpers that translate billing/payment/expense events into journals.
- Idempotency so the same payment cannot post twice.
- Audit logs for every accounting-impacting event.

### Must Fix Before Ledger Functionality

1. Non-VAT enforcement.
2. Transactional writes for payment/invoice state changes.
3. Audit trail for invoice issue/void/pay/update/delete.
4. Clear source of truth for payment allocations.
5. Remove page-render backfill.
6. Rename allocation ledger UI.
7. Add finance permissions.

## 6. Code Quality And Architecture Audit

### Strengths

- Monorepo boundaries are sensible: `apps/admin`, `packages/db`, `packages/emails`, shared UI.
- Most data access is routed through Drizzle schema/query helpers.
- Server Actions match the app's architecture; there is no unnecessary REST API layer for app mutations.
- Zod validation exists for many forms/actions.
- Tests exist for financial calculations, billing, expenses, reports, snapshots, auth, and property scenarios.

### Refactoring Priorities

| Problem found | Why it matters | Proposed solution | Files/routes/components likely affected | Priority | Effort | Risk if ignored |
|---|---|---|---|---|---|---|
| Billing totals duplicated across client/server | Invoice and quote form clients and actions calculate totals independently. | Extract shared billing totals helper used by UI and Server Actions, with tests. | `billing-invoices.ts`, `billing-quotes.ts`, invoice/quote form clients | Critical | M | UI/server total mismatches. |
| Financial mutation patterns are duplicated | Payment/invoice/delete flows each recalculate statuses manually. | Extract payment allocation/status service. | `billing-payments.ts`, `income.ts`, `billing-invoices.ts` | Critical | M-L | Bugs during accounting posting. |
| Permission checks not centralized | Each action calls session/role ad hoc. | Add `requireFinanceRole()` / permission map. | all financial actions | Critical | M | Broad mutation access. |
| Date-period logic spread across actions | Many actions manually check `isPeriodClosed`. | Add shared financial mutation guard checking old/new dates. | `date-rules.ts`, actions | Important | M | Lock bypasses. |
| Reporting SQL mixes raw fragments and helper logic | `general.ts` has repeated FY/month SQL patterns. | Create shared fiscal-period helpers/query builders. | `queries/general.ts`, reports | Important | M | Date/report drift. |
| Read routes contain repair logic | Payment page backfill. | Move repair tasks out of pages. | `billing/payments/page.tsx` | Critical | S-M | Hidden mutations. |
| UI table/pagination patterns duplicated | Invoices, payments, expenses use different pagination markup. | Create shared table pagination component. | list clients | Nice-to-have | S-M | UI drift. |

## 7. Security, Permissions, And Access Control

### Current State

- Better Auth magic-link authentication is configured in `apps/admin/src/lib/auth.ts`.
- User table has `role` and `isActive`.
- Role hierarchy exists: `viewer`, `admin`, `super_admin`.
- User-management actions require `super_admin`.
- Some email reminder actions require admin-level permission.
- Most billing, expense, ledger, client, and division actions require only a session.

### Access Control Gaps

| Gap | Evidence | Recommendation |
|---|---|---|
| Viewer can likely mutate finance data if they can access forms/actions | Most finance/billing actions call only `getSessionOrRedirect()`. | Server-side permission checks for create/update/delete/issue/void/pay/export. |
| Inactive user enforcement is unclear | `isActive` exists, sessions deleted on revoke, but auth helper does not visibly block inactive sessions. | Ensure session helper rejects inactive users every time. |
| No finance role granularity | Only super_admin/admin/viewer. | Add permission constants: `finance.read`, `finance.write`, `billing.write`, `settings.write`, `accounting.close_period`. |
| Destructive actions lack audit trail | Deletes/voids update data without financial audit log. | Add audit logs before accounting. |
| Cron/email endpoints need clear authorization | Cron route exists for reminders. | Verify secret-based cron auth and log outcomes. |

Recommended permission model before accounting:

- `viewer`: read dashboards/reports only.
- `admin`: create/update operational records, send billing emails.
- `super_admin`: user management, settings, destructive deletes, period close/reopen.
- Future `accountant` or `finance_admin`: accounting entries, period close, exports.

## 8. Reporting And Dashboard Audit

### Current Reporting Strengths

- Dashboard aggregates YTD, current month, previous month, division revenue, MoM charts, expenses, aging report, snapshots.
- Reports page and snapshot cockpit exist.
- `getAgingReport()` subtracts payment allocations from invoice totals.
- CSV export component exists under reports.

### Reporting Risks

| Problem | Evidence | Recommendation |
|---|---|---|
| Dashboard reports are management reports, not accounting reports | `financial.ts` uses income/expenses and PMG allocation formulas. | Label them as management summaries until journal-backed. |
| Current reports derive from `income`/`expenses`, not journals | No journal tables exist. | Plan migration to journal-backed reports after accounting core. |
| Fiscal year logic is repeated | `queries/general.ts` repeats March-start fiscal year SQL. | Centralize fiscal period helpers. |
| Current P&L is informal | Revenue = income; expenses = expenses; PMG share/profit pool are management calculations. | Keep but do not call it formal accounting P&L. |
| CSV export is generic, not accountant-ready | `export-csv-button.tsx`; no journal export. | Add accountant export after journal lines exist. |
| Aged AR needs more filters | Current query returns global buckets. | Add as-of date, client, division filters. |

Pre-accounting reporting improvements:

1. Add labels: "Management Dashboard", "Operational AR", "Allocation Ledger".
2. Add report definitions explaining source tables.
3. Standardize date filters across billing, finance, and insights.
4. Add reconciliation checks: invoice total vs line items, invoice total vs allocations, income total vs allocations.
5. Prepare accountant export requirements before implementing journals.

## 9. Accounting Module Readiness Assessment

### Overall Readiness

Status: **Not ready for accounting implementation yet.**

The app is close as an operational foundation, but accounting should wait until critical cleanup is complete. The current system can support a cash-basis accounting layer after cleanup because it already has clients, divisions, invoices, payment allocations, income, expenses, snapshots, and period locks.

### Readiness By Module

| Module | Ready? | Dependencies before implementation |
|---|---|---|
| Chart of Accounts | Partial | Rename allocation ledger, define COA seed, map expense categories. |
| Journal Entries | Not ready | Transactions, audit logs, posting helper, permissions, non-VAT mode. |
| General Ledger | Not ready | Journal lines and naming separation from allocation ledger. |
| Trial Balance | Not ready | Balanced journal lines and validation. |
| Profit & Loss | Partial | Journal-backed revenue/expense postings; allocation separation. |
| Balance Sheet | Not ready | Accrual decision, cash accounts, liabilities/assets/equity model. |
| Accounts Receivable | Partial | Existing operational AR is good; formal ledger AR deferred. |
| Accounts Payable | Not ready | Supplier/bill/bill payment schemas needed later. |
| Loan Tracking | Unknown/partial | Keep operational unless liability posting is designed. |
| Cash/Bank Accounts | Not ready | Add manual bank/cash account model. |
| Division-based reporting | Good | Preserve `divisionId` as reporting dimension. |

### Best Implementation Sequence

1. Foundation cleanup: permissions, transaction boundaries, VAT disablement, audit log, naming cleanup.
2. Billing/payment standardization: allocations, paidAt semantics, status recalculation service.
3. Schema preparation: expense category mapping, cash/bank account design.
4. Accounting core: COA, journal entries, journal lines, posting helper.
5. Accounting reports: GL, Trial Balance, cash-basis P&L, cash summary.
6. Future accrual modules: Balance Sheet, AP, loans, VAT, bank reconciliation.

## 10. Prioritized Action Plan

### Critical Fixes Before Accounting

| Recommendation | Problem found | Why it matters | Proposed solution | Files/routes/components likely affected | Priority | Effort | Risk if ignored |
|---|---|---|---|---|---|---|---|
| Remove render-time payment backfill | `billing/payments/page.tsx` mutates `payment_allocations` while rendering. | Read pages must not alter financial records. | Move to migration or admin repair action with preview and audit log. | `billing/payments/page.tsx`, migration script/admin settings | Critical | M | Silent data changes and accounting backfill corruption. |
| Add finance/billing permission guards | Most financial actions only require session. | Accounting data requires strict access. | Add central permission helper and enforce in all Server Actions. | `auth.ts`, billing/finance actions | Critical | M | Unauthorized financial mutation. |
| Wrap multi-step financial writes in transactions | Payment/invoice flows write several tables sequentially. | Partial failure corrupts financial state. | Use `db.transaction()` for create/update/delete payment, mark paid, convert quote, delete income. | `billing-payments.ts`, `billing-invoices.ts`, `income.ts` | Critical | M-L | Broken invoices/payments and invalid journals later. |
| Add non-VAT enforcement | VAT toggles/calculations remain active. | PMG is not VAT registered. | Add org flag, hide UI, force VAT zero in actions. | billing schema/actions/forms/settings/preview | Critical | M | Incorrect invoice totals/tax wording. |
| Rename allocation ledger | Existing `Ledger` is not accounting GL. | Accounting GL needs clean conceptual space. | Rename UI/routes where practical; at minimum labels/docs to "Allocation Ledger". | `nav-data.ts`, finance ledger pages/components | Critical | S-M | Users confuse allocation spending with legal/accounting ledger. |
| Add financial audit log | Financial mutations are not centrally audited. | Accounting entries require traceability. | Add `audit_logs` and write from all financial mutations. | new schema + financial actions | Critical | M-L | No trustworthy change history. |
| Extract billing totals helper | VAT/discount totals duplicated. | Accounting postings depend on correct totals. | Shared server-safe totals function with tests. | invoice/quote actions/forms/tests | Critical | M | UI/server total mismatch. |

### Important Improvements Before Accounting

| Recommendation | Problem found | Why it matters | Proposed solution | Files/routes/components likely affected | Priority | Effort | Risk if ignored |
|---|---|---|---|---|---|---|---|
| Standardize payment allocation source of truth | `incomeId` and `payment_allocations` overlap. | Journal posting needs one source. | Treat `payment_allocations` as source; document/deprecate `invoices.incomeId`. | billing schema/actions/queries | Important | M | Double-posting or wrong AR balances. |
| Improve paidAt semantics | Status recalculation can set `paidAt` to current edit time. | Payment date should be accurate. | Set `paidAt` from payment date/latest settlement date. | `billing-payments.ts`, `income.ts` | Important | S-M | Wrong aging/report dates. |
| Add expense category/account mapping | Expense category is free text. | COA mapping will be brittle. | Add category IDs or mapping to future account code. | `expenses.ts`, `expense-categories.ts` | Important | M | Messy accounting backfill. |
| Centralize fiscal year/date filters | FY SQL repeats in queries. | Reports must agree across dashboards/accounting. | Shared fiscal period helpers. | `queries/general.ts`, billing/report queries | Important | M | Date-range inconsistencies. |
| Standardize table UI and pagination | List pages use varied patterns. | Accounting list pages should follow one pattern. | Shared table shell/pagination/empty state. | invoice/payment/expense/ledger clients | Important | M | UX inconsistency grows. |
| Harden period lock checks | Checks exist but vary by action. | Accounting requires strict close rules. | Shared mutation guard checking existing and new date. | `date-rules.ts`, financial actions | Important | M | Closed period bypasses. |
| Add reconciliation diagnostics | No systematic checks for totals/allocations. | Pre-accounting data needs cleanup. | Add admin data quality page/report. | settings/data, billing queries | Important | M | Bad historical data enters journals. |

### Nice-To-Have Polish Items

| Recommendation | Problem found | Why it matters | Proposed solution | Files/routes/components likely affected | Priority | Effort | Risk if ignored |
|---|---|---|---|---|---|---|---|
| Normalize button icon usage | Manual icon sizing/classes. | Better visual consistency. | Use existing button/icon conventions. | many UI clients | Nice | S | Minor visual drift. |
| Use Badge for custom chips | Raw division/credit chip styling. | Theme consistency. | Replace custom spans with `Badge`. | `payments-client.tsx`, table rows | Nice | S | Minor theme drift. |
| Consistent empty states | Payment table uses inline empty row. | Better UX polish. | Use shared `EmptyState` where appropriate. | payment/report pages | Nice | S | Inconsistent feel. |
| Improve mobile table constraints | Not all wide tables have overflow wrappers. | Finance workflows need mobile support. | Add overflow wrappers and min widths. | billing/finance tables | Nice | M | Mobile usability issues. |
| Add page-level help text for operational vs accounting | Users need clarity. | Reduces confusion while accounting is added. | Short descriptions/tooltips on ledger/reports. | finance pages | Nice | S | Users infer wrong meaning. |

### Future Enhancements After Accounting

| Recommendation | Problem found | Why it matters | Proposed solution | Files/routes/components likely affected | Priority | Effort | Risk if ignored |
|---|---|---|---|---|---|---|---|
| Add accountant role | Current roles are broad. | Accounting may need read/export without admin power. | Add `accountant` or granular permissions. | auth schema/actions/navigation | Future | M | Overbroad admin access. |
| Add AP module | No suppliers/bills. | Needed for accrual accounting. | Suppliers, bills, bill payments, AP aging. | new schema/routes/actions | Future | L | AP remains manual/outside app. |
| Add Balance Sheet | No asset/liability/equity model. | Needed for full accounting. | Implement after journals/cash/accounts stable. | accounting reports | Future | L | Limited formal statements. |
| Add bank CSV import/reconciliation | No bank transactions. | Useful after manual cash accounts. | CSV import, matching, reconciliation report. | accounting/bank modules | Future | L | Manual balance checks only. |
| Add VAT support | PMG currently non-VAT. | Future registration. | Enable VAT settings, tax invoice behavior, VAT reports. | billing/accounting/tax | Future | L | Cannot handle VAT registration in-app. |

## Recommended Immediate Work Order

1. Rename current Ledger UI to Allocation Ledger.
2. Remove payment backfill from `billing/payments/page.tsx`.
3. Add central finance permissions and apply them to Server Actions.
4. Add `db.transaction()` around payment/invoice multi-step writes.
5. Add `isVatRegistered=false` and hard-disable VAT behavior.
6. Add financial audit logs.
7. Extract shared billing totals and payment allocation services.
8. Add data-quality checks for invoices, line items, income, allocations, expenses, and snapshots.

After those are complete, the app will be a clean operational base for Chart of Accounts, Journal Entries, General Ledger, Trial Balance, cash-basis P&L, cash/bank accounts, and eventually Balance Sheet/AP/loan accounting.
