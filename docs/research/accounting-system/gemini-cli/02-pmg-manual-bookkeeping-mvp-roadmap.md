# PMG Manual Bookkeeping MVP — Phase 2: Implementation Roadmap

This document outlines the phased build plan and risk scan for implementing PMG's manual, cash-basis, non-VAT bookkeeping engine.

---

## 1. Phased Build Plan

The roadmap is divided into 10 development phases to allow a solo developer to implement, verify, and commit changes iteratively without breaking the main app.

### Phase 1: Repo Audit & Financial Flow Stabilisation
- **Objective:** Fix baseline discrepancies in quotes, invoices, payments, and allocation queries.
- **Files to Change:** `apps/admin/src/app/actions/billing-invoices.ts`, `apps/admin/src/app/actions/billing-payments.ts`, `packages/db/src/queries/billing.ts`.
- **Database Changes:** None.
- **UI Changes:** Ensure dashboard displays correct outstanding AR figures.
- **Server Actions:** Validate that the invoice `poNumber` and `reference` inputs are properly stored and sanitized.
- **Validation Rules:** Require `clientId` for all invoice status transitions.
- **Reports Added:** None (use current views).
- **Testing Checklist:** Verify invoice creation, client payment recording, and LIFO/FIFO allocation updates.
- **Acceptance Criteria:** Invoice status flows ('draft' -> 'issued' -> 'paid'/'partially_paid') execute without DB errors.

### Phase 2: Non-VAT Setting & Invoice Simplification
- **Objective:** Add global toggle to disable VAT calculations, remove "Tax Invoice" terminology, and force VAT calculations to zero.
- **Files to Change:** `packages/db/src/schema/billing.ts` (add setting field), `apps/admin/src/app/actions/settings.ts`, `apps/admin/src/components/billing/document-preview.tsx`.
- **Database Changes:** Add `isVatRegistered: boolean` column to `organisationSettings` table (default `false`).
- **UI Changes:** Hide VAT toggle from invoice/quote form sidebars when `isVatRegistered` is false. Remove VAT number display from A4 headers.
- **Server Actions:** Update `updateOrganisationSettings` to parse and save `isVatRegistered`. Update `calcTotals` to ignore VAT if setting is false.
- **Validation Rules:** Force VAT inputs to `0` if `isVatRegistered` is false.
- **Reports Added:** None.
- **Testing Checklist:** Toggle VAT on setting page. Open new invoice screen and confirm VAT switch is invisible. Verify PDF preview displays "Invoice" instead of "Tax Invoice".
- **Acceptance Criteria:** Invoice PDF shows `VAT (15%)` as `R 0.00` and displays no VAT numbers.

### Phase 3: Accounts Receivable & Payment Flow
- **Objective:** Tighten outstanding balance tracking and AR aging buckets.
- **Files to Change:** `packages/db/src/queries/billing.ts` (`getAgingReport`), `apps/admin/src/app/actions/billing-payments.ts`.
- **Database Changes:** Add indexes on `paymentAllocations.invoiceId` and `paymentAllocations.incomeId`.
- **UI Changes:** Ensure aging chart handles partial allocations.
- **Server Actions:** Protect payment edits; recalculate outstanding balance.
- **Query Helpers:** Optimize `getClientOutstandingInvoices` to compute remaining balances using database aggregation.
- **Reports Added:** Aged Receivables Report (`/reports/aged-receivables`).
- **Testing Checklist:** Create invoice for R1000. Apply R300 payment. Validate status shifts to `partially_paid`. Verify remaining R700 is listed in the 0–30 day aging bucket.
- **Acceptance Criteria:** Outstanding AR matches the sum of unpaid invoice totals minus active payment allocations.

### Phase 4: Chart of Accounts (COA)
- **Objective:** Create and seed the Chart of Accounts table.
- **Files to Change:** `packages/db/src/schema/accounting.ts` (new schema), `packages/db/src/queries/accounting.ts` (new queries), seeding script.
- **Database Changes:** Add `chart_of_accounts` and `bank_accounts` tables.
- **UI Changes:** Add Account dropdowns to Income and Expense forms.
- **Server Actions:** Update `createExpense` and `createIncome` to require account assignment.
- **Validation Rules:** Check that chosen account code exists in COA and matches the category type (e.g. expenses link to `5xxx` codes).
- **Reports Added:** Chart of Accounts List.
- **Testing Checklist:** Run seed command. Select accounts on expense page.
- **Acceptance Criteria:** Every expense is successfully associated with a COA code.

### Phase 5: Journal Entries & Journal Lines
- **Objective:** Build the journal transaction engine to log balanced debits and credits on financial events.
- **Files to Change:** `packages/db/src/schema/accounting.ts` (`journalEntries`, `journalEntryLines`), `apps/admin/src/app/actions/billing-payments.ts` (insert postings), `apps/admin/src/app/actions/expenses.ts` (insert postings).
- **Database Changes:** Add `journal_entries` and `journal_entry_lines` tables.
- **Server Actions:** Implement `postJournalEntry(tx, header, lines)` helper called from inside DB transactions.
- **Validation Rules:** Assert that total Debits equal total Credits for each post.
- **Testing Checklist:** Record a payment and check that a balanced journal entry (Dr Bank 1001, Cr Service Revenue 4000) is written.
- **Acceptance Criteria:** Financial writes fail (rollback) if journal entry lines do not balance.

### Phase 6: General Ledger & Trial Balance
- **Objective:** Build queries summarizing journals into account activity logs.
- **Files to Change:** `packages/db/src/queries/accounting.ts`, `apps/admin/src/app/(admin)/finance/ledger/page.tsx`, `apps/admin/src/app/(admin)/finance/accounts/page.tsx`.
- **Database Changes:** None.
- **UI Changes:** Add Ledger detail tables and Trial Balance pages.
- **Query Helpers:** Implement `getGeneralLedger(filters)` and `getTrialBalance()`.
- **Reports Added:** General Ledger (`/reports/general-ledger`), Trial Balance (`/reports/trial-balance`).
- **Testing Checklist:** Verify Trial Balance sum totals. Check that debit and credit columns match perfectly.
- **Acceptance Criteria:** Trial Balance Debits minus Credits equals `0.00`.

### Phase 7: Profit & Loss Report
- **Objective:** Construct cash-basis Profit & Loss statement based on journal line items.
- **Files to Change:** `apps/admin/src/app/(admin)/finance/reports/profit-loss/page.tsx`.
- **Database Changes:** None.
- **UI Changes:** Standard Profit & Loss print-friendly view.
- **Query Helpers:** Query journal entry lines matching `4xxx` (Revenue) and `5xxx` (Expense) accounts.
- **Reports Added:** Profit & Loss Report (`/reports/profit-loss`).
- **Testing Checklist:** Filter by division and date range. Reconcile P&L totals against dashboard figures.
- **Acceptance Criteria:** Net Income matches revenue journals minus expense journals for the specified period.

### Phase 8: Manual Bank/Cash Account Summary
- **Objective:** Add internal bank registers with opening balances and cash flow activity logs.
- **Files to Change:** `packages/db/src/schema/accounting.ts` (`bankAccounts`), `apps/admin/src/app/(admin)/finance/accounts/page.tsx`.
- **UI Changes:** Show bank statement summary (Opening Balance + Inflows - Outflows = Closing Balance).
- **Query Helpers:** Sum journal entries tagged to `1001` or `1002` cash accounts.
- **Reports Added:** Cash summary.
- **Testing Checklist:** Deposit money via payment recording. Transfer cash from bank to hand. Verify balances change.
- **Acceptance Criteria:** Closing balances match calculated cash in/out totals.

### Phase 9: Audit Trail & Period Lock Hardening
- **Objective:** Implement the `audit_logs` engine and enforce strict Server Action blocks on closed periods.
- **Files to Change:** `apps/admin/src/lib/date-rules.ts` (harden locks), new `audit_logs` action middleware.
- **Database Changes:** Add `audit_logs` table.
- **Server Actions:** Log actions on create, update, delete, void, and pay. Enforce `isPeriodClosed` check on both database level and server action validation.
- **Validation Rules:** Throw Server Exception if mutations target locked periods.
- **Testing Checklist:** Attempt to inject database writes into closed periods using raw actions.
- **Acceptance Criteria:** All mutations trigger audit log writes; locked periods are completely immutable.

### Phase 10: Future Accounting Reports
- **Objective:** Support advanced reports (Balance Sheet, Cash Flow, Accounts Payable, supplier registries) for future business expansion.
- **Files to Change:** Future schema files.
- **Database Changes:** Add AP tables, VAT logs, credit notes, refunds.
- **Reports Added:** Balance Sheet, Cash Flow Statement, Aged Payables.
- **Testing Checklist:** Standard tests for future features.
- **Acceptance Criteria:** Defer implementation to future phase; plan structural hooks now.

---

## 2. Critical Bugs & Risk Scan

The following table flags system-level risks identified in the code audit and provides architectural fixes:

| Risk Description | Severity | Affected File Paths | Explanation | Recommended Fix | Blocks MVP |
|---|---|---|---|---|---|
| **VAT Totals Discrepancy** | **High** | `document-preview.tsx`, `billing-invoices.ts` | Form sidebar totals include VAT, but PDF previews display VAT as 0 due to hardcoded line item mapping (`vatApplicable: false`). | Add a global `isVatRegistered` setting and restrict VAT calculations on both UI and actions when set to false. | **Yes** |
| **No True Double-Entry GL** | **High** | `packages/db/src/schema` | Separate `income` and `expenses` are recorded, but no transactional debits and credits exist, making accounting audits impossible. | Implement `journal_entries` and `journal_entry_lines` tables and wire posting actions. | **Yes** |
| **Double-Counting PMG Allocations** | **High** | `apps/admin/src/lib/financial.ts`, `ledger.ts` | Managerial profit pool allocations (salary, reinvest, flex) could be double-counted as operational expenses, reducing P&L margin inaccurately. | Treat allocations purely as equity drawings/transfers. Do not post them as business expenses on the P&L. | **Yes** |
| **Lack of Transactional Mutexes** | **Medium** | `apps/admin/src/app/actions` | Multiple writes (income + allocations) are done sequentially without database transactions, exposing the database to partial failure corruption. | Wrap multi-table inserts inside `db.transaction()` blocks. | **Yes** |
| **Paid Invoices Editable** | **Medium** | `billing-invoices.ts` | Although UI restricts editing paid invoices, the server actions must enforce database checks to prevent status overrides. | Implement server action guards throwing validation errors if `status === 'paid'` or `status === 'void'`. | **Yes** |
| **Missing Audit Trail** | **Medium** | `packages/db/src/schema` | No central audit table exists, meaning balance corrections or invoice voiding actions leave no transaction history logs. | Introduce the `audit_logs` table and record all mutations. | **Yes** |
| **Period Lock Bypasses** | **Medium** | `apps/admin/src/lib/date-rules.ts` | UI blocks edit actions on closed rows, but raw Server Actions must explicitly check `isPeriodClosed` on both the old and new transaction dates. | Add double date-check checks inside Server Actions (`updateIncome`, `updateExpense`). | **Yes** |
| **Rounding Errors in Allocations** | **Low** | `apps/admin/src/app/actions/billing-payments.ts` | Parsing numeric decimals from strings can lead to fractional rounding drift over time. | Standardize database fields as `numeric(12, 2)` and format results to two decimals during operations. | **No** |
