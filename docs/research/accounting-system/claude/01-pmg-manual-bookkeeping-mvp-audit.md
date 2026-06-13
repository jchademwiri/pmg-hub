# PMG Manual Bookkeeping MVP — Phase 1 Audit

**Scope:** PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds  
**Date:** June 2026  
**Repo:** https://github.com/jchademwiri/pmg-hub.git  
**Auditor:** AI-assisted deep code scan + industry research  

---

## Executive Summary

PMG Control Center is further along than most small-business apps at this stage. It already has a solid invoice/payment lifecycle, partial payment support via `payment_allocations`, period locking via snapshots, division-based expense tracking, and a working PDF export pipeline.

However, the system currently operates as an **income tracker and billing tool**, not a true bookkeeping system. The critical missing layer is double-entry posting: there are no `chart_of_accounts`, `journal_entries`, or `journal_entry_lines` tables. The existing `ledger` table is a **PMG internal allocation ledger** (salary/reinvest/reserve/flex buckets) — it is not an accounting General Ledger and must not be confused with one.

There are also specific issues that need fixing before the accounting layer can be layered on top:

1. **VAT toggle exists but is not locked off** — PMG is not VAT registered, but `vatEnabled` can be set to `true` on any invoice. There is no system-level `isVatRegistered` gate.
2. **The CSV export in `reports.ts` hardcodes the PMG share rate at 0.20**, while `ACCOUNT_RATES.pmg_share` is `0.25`. This is a real calculation discrepancy.
3. **The document preview labels invoices as simply "Invoice"** — this is safe for now since there is no "Tax Invoice" label, but there is no programmatic enforcement preventing a VAT number from appearing.
4. **No `audit_log` table** — edits and deletes are not logged anywhere.
5. **No `chart_of_accounts`** — income and expenses are free-form categories. No double-entry posting exists.
6. **No formal AR report** — there is a client statement page and outstanding invoice queries, but no dedicated Aged Receivables report.

The roadmap to a proper bookkeeping MVP is realistic for a solo developer in 8–10 phases over 6–10 weeks.

---

## Deliverable 1: Industry Research Summary

### How Modern Invoicing/Accounting Systems Work

#### Invoice Lifecycle (QuickBooks, Xero, FreshBooks pattern)

```
Quote (optional) → Invoice (Draft) → Invoice (Issued/Sent) → Payment Recorded → Invoice (Paid)
                                                            → Partially Paid → More Payments → Paid
                                                            → Overdue (auto-flag past due date)
                                                            → Void (with audit trail)
```

All serious systems treat these as distinct state transitions, not just a status field update. Each transition may trigger downstream events: journal entries, AR balance updates, email notifications.

#### Key Terminology Clarifications

| Term | What it is |
|---|---|
| **Quote** | A price proposal. Not income. Not a liability. Just a document. |
| **Invoice** | A request for payment. Creates an AR balance when issued (accrual) or nothing until paid (cash). |
| **Payment** | Cash received. Creates income and clears AR. |
| **Income entry** | The revenue record — created when cash is received (cash-basis) or when invoice is issued (accrual). |
| **Journal entry** | The accounting record that posts debits and credits to accounts. May be auto-generated from a payment or manually entered. |
| **Ledger entry** | A single line in the General Ledger — a debit or credit to one account, linked to a journal entry. |

#### Cash Basis vs Accrual Basis

| | Cash Basis | Accrual Basis |
|---|---|---|
| Income recognised | When cash received | When invoice issued |
| Expense recognised | When cash paid | When bill received |
| AR balance | Only as a list; not in P&L | Posts to P&L immediately |
| Complexity | Low | High |
| Best for | Small service businesses | Larger, more complex businesses |
| **Recommended for PMG** | ✅ Yes | Not yet |

**Cash-basis means:** P&L only shows income and expenses when cash actually moves. Issued-but-unpaid invoices show up in the AR report but not in P&L revenue.

#### Reports Available on Cash Basis

- ✅ Profit & Loss (by date range, when cash moved)
- ✅ Accounts Receivable (what's owed, not yet received)
- ✅ Aged Receivables (overdue buckets: 0–30, 31–60, 61–90, 90+ days)
- ✅ Income Report (what has been received)
- ✅ Expense Report (what has been paid out)
- ✅ Trial Balance (confirms debit = credit)
- ✅ General Ledger (full transaction history by account)
- ⚠️ Balance Sheet (needs equity/liability accounts to be meaningful)
- ❌ Cash Flow Statement (needs bank account tracking for accuracy)

#### What Requires Full Double-Entry

Practically everything in proper bookkeeping. But for a **cash-basis non-VAT system**, the minimum journal postings are:

1. Cash received from client → Dr Bank, Cr Revenue
2. Expense paid → Dr Expense Account, Cr Bank
3. Owner withdrawal → Dr Drawings, Cr Bank

These three posting rules cover 90% of PMG's daily transactions.

#### What PMG Can Safely Defer

- VAT journal entries (PMG not registered)
- Bank reconciliation (no bank feeds)
- Accounts Payable module (no supplier bills yet)
- Balance Sheet (needs opening equity balances)
- Cash Flow Statement (needs bank account tracking)
- Credit notes and refunds
- Asset/liability register
- Payroll

---

## Deliverable 2: Corrected MVP Scope

### PMG Manual Bookkeeping MVP — Cash Basis, Non-VAT, No Bank Feeds

#### Required for MVP

1. ✅ Clients — already implemented
2. ✅ Divisions — already implemented
3. ✅ Quotes — already implemented
4. ✅ Invoices — already implemented
5. ✅ Invoice line items — already implemented
6. ✅ Invoice numbering (per-division sequences) — already implemented
7. ✅ Invoice status management (draft/issued/partially_paid/paid/overdue/void) — already implemented
8. ✅ Manual payment recording — already implemented
9. ✅ Partial payment support — already implemented via `payment_allocations`
10. ✅ Income tracking — already implemented
11. ✅ Expense tracking — already implemented
12. ✅ Expense categories — already implemented (free-text + `expense_categories` table)
13. 🔴 Manual cash/bank account balance tracking — missing (internal accounts only, no balance tracking)
14. 🔴 Chart of Accounts — missing
15. 🔴 Journal entries — missing
16. 🔴 Journal entry lines — missing
17. 🔴 General Ledger — missing (existing `ledger` table is PMG allocation buckets, not accounting GL)
18. 🟡 Accounts Receivable — partial (queries exist; no formal AR report page)
19. 🔴 Aged Receivables report — missing
20. 🔴 Profit & Loss report — missing (dashboard shows revenue/expenses but no formal P&L)
21. 🔴 Trial Balance report — missing
22. ✅ Period locking — already implemented (snapshot-based)
23. ✅ Financial snapshots — already implemented
24. 🔴 Audit trail — missing (`audit_logs` table not present)
25. ✅ PDF export for invoices/quotes — already implemented
26. 🟡 Basic accountant export — partial (CSV export exists but has a rate discrepancy bug)

#### Not Required for MVP

1. Bank feeds / automatic bank syncing
2. Imported bank statements
3. VAT reports / SARS VAT submission
4. Payroll
5. Inventory
6. Multi-currency
7. Automated depreciation
8. Full Accounts Payable module (supplier portal, bill management)
9. Bank API integration
10. Open banking

#### Future Phase (Post-MVP)

1. VAT registration support (enable `isVatRegistered: true`, unlock VAT fields)
2. Bank CSV import
3. Proper bank reconciliation
4. Accounts Payable module (suppliers, bills, bill payments)
5. Credit notes
6. Refunds
7. Balance Sheet (requires opening equity entries)
8. Cash Flow Statement
9. Asset register
10. Liability register
11. Accountant portal / client login

---

## Deliverable 3: PMG Current-State Code Audit

### 45-Point Feature Audit Table

| # | Feature | Industry Standard | Actual Repo Status | Evidence (File Paths) | MVP Decision | Recommendation |
|---|---|---|---|---|---|---|
| 1 | **Clients** | Contact record with name, email, address. Linked to invoices and payments. | ✅ Good enough for MVP | `packages/db/src/schema/clients.ts` — uuid PK, name, businessName, email, phone, isActive | ✅ Good enough | Add address fields (street, city, postal, province) for invoice PDFs |
| 2 | **Divisions** | Multi-entity or department separation with own revenue/expense reporting | ✅ Good enough for MVP | `packages/db/src/schema/divisions.ts` — name, isActive, relations to income/expenses | ✅ Good enough | No changes needed for MVP |
| 3 | **Quotes** | Draft → Sent → Accepted/Declined/Expired/Converted lifecycle | ✅ Good enough for MVP | `packages/db/src/schema/billing.ts` — full status enum, expiry date, discount support | ✅ Good enough | Quote PDF should not show VAT if `vatEnabled=false` |
| 4 | **Invoices** | Full lifecycle from draft to void, with line items, totals, due dates | ✅ Good enough for MVP | `packages/db/src/schema/billing.ts` — full invoice schema with all required fields | ✅ Good enough | Add `isVatRegistered` guard to prevent `vatEnabled=true` on new invoices |
| 5 | **Invoice numbering** | Sequential, per-division, per-year, duplicate-proof | ✅ Good enough for MVP | `packages/db/src/schema/billing.ts` → `document_sequences` table with unique constraint | ✅ Good enough | `SELECT ... FOR UPDATE` pattern noted in schema comment — verify it's used in action |
| 6 | **Invoice line items** | Quantity × unit price, sort order, optional catalogue items | ✅ Good enough for MVP | `billing_line_items` — polymorphic (quote/invoice), sortOrder, vatRate stored at line level | ✅ Good enough | `vatRate` is always `'0'` per `billing-schema.ts:13`. Correct for non-VAT MVP. |
| 7 | **Invoice statuses** | draft/issued/partially_paid/paid/overdue/void | ✅ Good enough for MVP | `invoiceStatusEnum` in `billing.ts` — all 6 states present | ✅ Good enough | Verify auto-overdue flagging runs on schedule |
| 8 | **Invoice PDFs** | Professional branded document, no "Tax Invoice" label when not VAT registered | 🟡 Partially implemented | `document-preview.tsx` — labelled "Invoice" (safe). VAT number shown only if `org.vatNumber` set. | 🟡 Needs fix | Add programmatic block: if `!isVatRegistered`, never show VAT number in PDF |
| 9 | **Quote-to-invoice conversion** | One-click conversion preserving line items and client | ✅ Good enough for MVP | `billing-invoices.ts` → `convertQuoteToInvoice` action exists | ✅ Good enough | Mark source quote as `converted` — verify this happens |
| 10 | **Invoice due dates** | Configurable payment terms, auto-calculate due date | 🟡 Partially implemented | `dueDate` field exists on invoices. `divisionBillingSettings.paymentTermsDays` exists. | 🟡 Needs attention | Auto-populate `dueDate` from `invoiceDate + paymentTermsDays` on invoice creation |
| 11 | **Invoice issue/void/paid flow** | Issue locks editing; void creates reversal record; paid marks timestamp | ✅ Good enough for MVP | `billing-invoices.ts` — `issueInvoice`, `voidInvoice`, `markInvoicePaid` actions exported | ✅ Good enough | Verify issued invoices cannot be edited (check action guards) |
| 12 | **Manual payments** | Record cash receipt against client, link to invoice | ✅ Good enough for MVP | `billing-payments.ts` → `recordClientPayment` — creates income row + allocations | ✅ Good enough | No changes needed for MVP |
| 13 | **Partial payments** | Allocate payment across multiple invoices, track outstanding balance | ✅ Good enough for MVP | `payment_allocations` table + FIFO/LIFO logic in `billing-payments.ts` | ✅ Good enough | Robust implementation. Minor: no DB transaction wrapper — see Critical Bugs |
| 14 | **Payment allocations** | Many-to-many: one payment can cover multiple invoices | ✅ Good enough for MVP | `payment_allocations` schema + `getClientOutstandingInvoices` query | ✅ Good enough | No changes needed |
| 15 | **Overpayments** | Excess payment creates credit balance, available for future invoices | 🟡 Partially implemented | `getClientCreditBalance` calculates `sum(income) - sum(allocations)`. Not surfaced as a formal credit memo. | 🟡 Needs attention | Surface credit balance prominently on client page and in AR report |
| 16 | **Credit notes** | Formal document reversing an invoice | 🔵 Future phase | Not in schema, not in actions | 🔵 Future | Add after MVP stabilises |
| 17 | **Refunds** | Cash out to client for overpayment or cancelled service | 🔵 Future phase | Not implemented | 🔵 Future | Add with credit notes in future phase |
| 18 | **Accounts Receivable** | List of issued/unpaid invoices with outstanding balances | 🟡 Partially implemented | `getClientOutstandingInvoices` query exists. Client statement page exists. No dedicated AR report route. | 🔴 Missing report | Build `/finance/ar` report page using existing queries |
| 19 | **Aged Receivables** | Buckets: Current, 1–30, 31–60, 61–90, 90+ days overdue | 🔴 Missing completely | No aged receivables report or query exists | 🔴 Required | Build aged buckets query using `invoiceDate` / `dueDate` vs today |
| 20 | **Income table** | Revenue records linked to payments and invoices | ✅ Good enough for MVP | `packages/db/src/schema/income.ts` — date, divisionId, clientId, description, amount | ✅ Good enough | Add `source` field: `'invoice_payment'` or `'manual'` to differentiate income types |
| 21 | **Expense table** | Expense records with category and division | ✅ Good enough for MVP | `packages/db/src/schema/expenses.ts` — date, divisionId, category, clientId, amount | ✅ Good enough | Add `accountCode` FK to `chart_of_accounts` when that table is created |
| 22 | **Expense categories** | Named, reusable categories | ✅ Good enough for MVP | `expense_categories` table exists with name + unique constraint | 🟡 Needs attention | Expenses use free-text `category` field — not a FK to `expense_categories`. Migrate to FK. |
| 23 | **Supplier/vendor records** | Vendor master for AP | ⚪ Not required for MVP | Not implemented | ⚪ Not required | Defer to Accounts Payable phase |
| 24 | **Accounts Payable** | Track bills owed to suppliers | ⚪ Not required for MVP | Not implemented | ⚪ Not required | Future phase |
| 25 | **Manual cash/bank accounts** | Internal account balances (no bank feed) | 🔴 Missing completely | `divisionBillingSettings` has bank name/account number as text fields (metadata only, no balance tracking) | 🔴 Required | Add `bank_accounts` table for manual balance tracking |
| 26 | **Bank reconciliation** | Match bank statement to system records | 🔵 Future phase | Not implemented | 🔵 Future | Defer |
| 27 | **Chart of Accounts** | Account codes, names, types (asset/liability/equity/revenue/expense) | 🔴 Missing completely | No `chart_of_accounts` table exists anywhere in the repo | 🔴 Required | Create `chart_of_accounts` table and seed PMG accounts |
| 28 | **Current ledger/allocation table** | PMG internal allocation buckets (salary/reinvest/reserve/flex/pmg_share) | ✅ Present (but different purpose) | `packages/db/src/schema/ledger.ts` — allocation buckets, entry type (spend/transfer/adjustment) | ✅ Keep as-is | This is NOT an accounting GL. Keep it separate. Do not confuse with journal entries. |
| 29 | **True accounting General Ledger** | All debit/credit postings per account, balanced | 🔴 Missing completely | Not in schema. `ledger` table is allocation buckets only. | 🔴 Required | Requires `journal_entries` + `journal_entry_lines` first |
| 30 | **Journal entries** | Double-entry records linking transactions to accounts | 🔴 Missing completely | No `journal_entries` table | 🔴 Required | Core MVP requirement for proper bookkeeping |
| 31 | **Journal entry lines** | Individual debit/credit lines per journal entry | 🔴 Missing completely | No `journal_entry_lines` table | 🔴 Required | Required with journal entries |
| 32 | **Profit & Loss report** | Revenue minus expenses for a period | 🔴 Missing as formal report | Dashboard shows totals. Reports page has charts. No formal P&L page with filters and line-item breakdown. | 🔴 Required | Build `/finance/profit-loss` report page |
| 33 | **Trial Balance** | Sum of all account debits vs credits — confirms books balance | 🔴 Missing completely | Not implemented | 🔴 Required | Build after journal entries are in place |
| 34 | **Balance Sheet** | Assets = Liabilities + Equity snapshot | 🔵 Future phase | Not implemented. Requires equity opening balances. | 🔵 Future | Defer until equity accounts are properly seeded |
| 35 | **Cash Flow Statement** | Cash in / cash out by category | 🔵 Future phase | Not implemented. Requires bank account tracking. | 🔵 Future | Defer |
| 36 | **VAT settings** | `isVatRegistered` system flag controlling VAT behaviour | 🔴 Missing completely | No `isVatRegistered` field anywhere. `vatEnabled` is a per-document boolean only. | 🔴 Required | Add `isVatRegistered: false` to `organisation_settings`. Gate all VAT UI on this flag. |
| 37 | **VAT invoice behaviour** | If not VAT registered: no "Tax Invoice" label, no VAT amount, no VAT number shown | 🟡 Partially safe | Document preview labels as "Invoice" (correct). VAT number shown if `org.vatNumber` set (risk). VAT toggle on invoices not gated by system setting. | 🔴 Needs fix | Add system-level guard. Hide VAT toggle. Zero VAT amount when `isVatRegistered=false`. |
| 38 | **Period locking** | Closed periods cannot be modified | ✅ Good enough for MVP | `isPeriodClosed()` in `date-rules.ts` — checks snapshots and day-of-month rules. Used in payment and expense actions. | ✅ Good enough | Verify all financial actions (income, expenses, invoices) check `isPeriodClosed` |
| 39 | **Financial snapshots** | Monthly locked summaries | ✅ Good enough for MVP | `snapshots` table + `closeMonth` action + `autoClosePreviousMonthIfNeeded` | ✅ Good enough | No changes needed for MVP |
| 40 | **Audit trail** | Log of create/edit/delete/issue/void/pay events | 🔴 Missing completely | No `audit_logs` table. `email.ts` schema has email log but not general action audit. | 🔴 Required | Create `audit_logs` table. Log key transitions: issue, void, pay, delete. |
| 41 | **User permissions** | Role-based access control | 🟡 Partially implemented | Better Auth session used. `getSessionOrRedirect()` guards all actions. No granular role model. | 🟡 Needs attention | Add `role` field to user or use Better Auth roles for admin vs read-only |
| 42 | **Accountant export** | CSV or structured export for accountant review | 🟡 Partially implemented | `exportFinancialsCsv` in `reports.ts` — monthly financials by year. Has PMG share rate bug (0.20 vs 0.25). | 🔴 Bug to fix | Fix rate discrepancy. Expand to include per-transaction detail. |
| 43 | **Reporting pages** | Revenue, expense, division, and period-based reports | 🟡 Partially implemented | `/insights/reports` — MoM chart, revenue by division chart, expense by category, profit pool chart. No AR, no P&L page, no Trial Balance. | 🟡 Needs expansion | Add formal P&L, AR, Aged Receivables, and Trial Balance report pages |
| 44 | **Financial calculation engine** | Accurate totals, no rounding errors, consistent rates | 🟡 Partially implemented | `calcTotals()` in `billing-invoices.ts` calculates correctly for non-VAT. `financial.ts` uses ACCOUNT_RATES constants. CSV export hardcodes 0.20 rate (bug). | 🔴 Bug to fix | Fix CSV export rate. Add server-side total recalculation before invoice save. |
| 45 | **Dashboard metrics** | Current month revenue, expenses, outstanding invoices | ✅ Good enough for MVP | Dashboard uses `getCurrentMonthSummary`, `getPreviousMonthSummary`, `getYTDSummary`. Division breakdowns available. | ✅ Good enough | Add outstanding invoice count and total AR balance to dashboard |

---

## What PMG Already Has

**Solid foundations:**
- Complete invoice/quote lifecycle with 6-state status management
- Partial payment support with FIFO/LIFO allocation logic
- Per-division, per-year sequential document numbering
- Period locking via snapshot system (auto-closes on day 5+)
- PDF export via `html2canvas-pro` + `jsPDF`
- Email delivery (payment receipts, overdue reminders via Resend)
- Client statements page with running balance
- Expense categories
- Division-level revenue/expense reporting
- Charts and MoM comparisons in reports
- Turbo monorepo with `packages/db` separation (clean architecture)

**Notable strengths:**
- `payment_allocations` with FIFO/LIFO logic is production-quality work
- `isPeriodClosed()` is correctly implemented with snapshot + day-of-month rules
- Schema has proper constraints: positive-amount checks, unique document numbers, FK integrity

---

## What PMG Still Needs

Priority order for MVP completion:

1. **`isVatRegistered: false` system setting** — prevent accidental VAT on invoices
2. **`chart_of_accounts` table** — seeded with PMG accounts
3. **`journal_entries` + `journal_entry_lines` tables** — double-entry posting
4. **Posting helpers** — auto-post income and expense records to the GL on save
5. **AR report page** `/finance/ar` — list of unpaid invoices with outstanding totals
6. **Aged Receivables report** — buckets by age
7. **Formal P&L page** `/finance/profit-loss` — date-filtered income minus expenses
8. **Trial Balance page** `/finance/trial-balance` — account-level debit/credit totals
9. **`audit_logs` table** — log key financial events
10. **Fix CSV export rate bug** — 0.20 → use `ACCOUNT_RATES.pmg_share`
11. **Migrate expense `category` field to FK** — point to `expense_categories.id`

---

## What Should Be Removed from MVP Scope

- Bank reconciliation (no bank feeds)
- VAT reports and SARS submission
- Accounts Payable / supplier bills
- Credit notes and refunds
- Balance Sheet (requires equity opening balances to be meaningful)
- Cash Flow Statement (requires proper bank account tracking)
- Multi-currency
- Payroll
- Asset register

---

## Key Findings from Industry Research

1. **Cash-basis is the right choice for PMG now.** It's simpler, appropriate for a service business, and supported by SARS for small businesses. Move to accrual only if external funding, audits, or larger client contracts require it.

2. **The PMG allocation model (salary/reinvest/reserve/flex) is not standard accounting.** It is a profit-distribution model layered on top of accounting. It should continue to live in the existing `ledger` table. It must not be conflated with the accounting General Ledger. If allocation withdrawals are actual cash outflows, they should also post to journal entries as `Dr Owner Drawings / Cr Bank`. If they are just budget allocations without cash movement, they must NOT be posted as expenses.

3. **Double-entry doesn't have to be complex for PMG's MVP.** With only 3–4 posting rules (income from invoice, income manual, expense, withdrawal), the journal entry layer can be auto-generated by posting helpers called from existing Server Actions. No manual journal entry UI is required at MVP stage.

4. **The `payment_allocations` implementation is the most sophisticated feature in the repo.** It correctly handles partial payments, FIFO spreading, LIFO reversal on downward adjustment, and orphan allocation cleanup. This is better than some commercial tools.

5. **Snapshot-based period locking is a pragmatic solution.** True accounting would use a locked-period flag on the GL. PMG's approach of using snapshot existence + day-5 rules is workable for MVP. Harden it by ensuring all financial write actions call `isPeriodClosed`.

---

## Critical Bugs Found

| Severity | Bug | File | Impact | Recommendation |
|---|---|---|---|---|
| 🔴 High | PMG share rate hardcoded as `0.20` in CSV export but `ACCOUNT_RATES.pmg_share` is `0.25`. Every export is producing wrong P&L calculations. | `apps/admin/src/app/actions/reports.ts` line ~34 | Wrong financials exported to accountant | Replace `0.20` with `ACCOUNT_RATES.pmg_share`. Import constant from `@pmg/db`. |
| 🔴 High | No `isVatRegistered` system gate. `vatEnabled` can be set to `true` on any invoice. PMG is not VAT registered — issuing VAT invoices creates tax risk. | `packages/db/src/schema/billing.ts`, `apps/admin/src/app/actions/billing-invoices.ts`, `billing-schema.ts` | Tax compliance risk | Add `isVatRegistered: false` to `organisation_settings`. Gate `vatEnabled` in Server Actions. |
| 🟡 Medium | `recordClientPayment` makes multiple sequential DB writes without a single DB transaction. If step 3 (allocation insert) succeeds but step 4 (invoice status update) fails, the data will be inconsistent. | `apps/admin/src/app/actions/billing-payments.ts` | Potential orphaned allocations | Wrap in `db.transaction(async (tx) => { ... })` using Drizzle transaction API |
| 🟡 Medium | `expenses.category` is a free-text field, not a FK to `expense_categories`. The `expense_categories` table exists but is not used for enforcement. | `packages/db/src/schema/expenses.ts` | Inconsistent expense categorisation; future Chart of Accounts linking impossible | Migrate `category` column to `categoryId uuid FK → expense_categories.id` |
| 🟡 Medium | No audit trail for financial events. Issued invoices, voids, payments, and deletions leave no permanent record. | All financial actions | Non-repudiation risk; accountant cannot trace changes | Add `audit_logs` table and log all key events |
| 🟡 Medium | `updatedAt` is set by application layer, not a DB trigger. Direct SQL operations (migrations, fixes) will leave `updatedAt` stale. Comment acknowledges this. | Multiple schemas | Stale timestamps in audit views | Add PostgreSQL trigger `BEFORE UPDATE` on financial tables, or accept the risk |
| 🟡 Medium | `isPeriodClosed` is called in payment and expense actions but **not verified** in `billing-invoices.ts` for `issueInvoice` or `voidInvoice`. A user could issue an invoice dated in a closed month. | `apps/admin/src/app/actions/billing-invoices.ts` | Backdating risk | Add `isPeriodClosed(invoiceDate)` check in `issueInvoice` and `updateInvoice` |
| 🟢 Low | `quotationId` on invoices is a soft reference (no FK). Comment says application layer enforces integrity but no such enforcement was found in the actions. | `packages/db/src/schema/billing.ts` | Orphaned quote references | Add FK or add existence check in `convertQuoteToInvoice` action |
| 🟢 Low | Dashboard metrics do not show total outstanding AR balance (issued + partially_paid + overdue invoices). | Dashboard page | Incomplete financial overview | Add AR balance KPI tile to dashboard |

---

## Open Questions for Jacob

1. **PMG allocation withdrawals:** When salary/reinvest/flex is withdrawn from the `ledger`, is this actual cash leaving a bank account? If yes, these must post as `Dr Owner Drawings / Cr Bank` in the accounting GL. If they are budget allocations that may or may not result in cash movement, the current separate ledger approach is correct and nothing should be double-counted.

2. **Expense categories vs Chart of Accounts:** Do you want the Chart of Accounts to replace the current free-text expense categories, or sit alongside them? Recommendation: Chart of Accounts codes become the master, and `expense_categories` become human-friendly labels mapped to CoA codes.

3. **Multiple bank accounts:** PMG has multiple divisions. Should each division have its own internal bank account for tracking purposes, or should there be one company-wide cash account?

4. **Opening balances:** When the accounting layer goes live, there will be historical income and expenses with no journal entries. Do you want to enter an opening GL balance as of a specific date, or retroactively post all historical transactions?

5. **Client address fields:** Client invoices likely need a billing address. The current `clients` schema has no address fields. Should this be added to the client record or to a separate billing contact?

---

*Proceed to Phase 2 (`02-accounting-system-schema-roadmap-prompt.md`) for database schema, Chart of Accounts, posting rules, and the detailed implementation roadmap.*
