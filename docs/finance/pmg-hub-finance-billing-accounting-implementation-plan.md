# PMG Hub — Finance, Billing, Distributions, Credit, and Accounting Implementation Plan

**Prepared for:** PMG Hub Admin App  
**Repository context:** `jchademwiri/pmg-hub`  
**Implementation style:** phased, safe, and continuously deployable  
**Primary goal:** cleanly separate Billing, Finance, Distributions, and Accounting while keeping the app usable after every phase.

---

## 1. Executive Summary

PMG Hub currently has a useful billing and money-management foundation, but some route names and module boundaries can confuse future accounting work.

The main issue is that the current `/finance/accounts` and `/finance/ledger` pages are not true accounting accounts or a true general ledger. They are management allocation views used to track PMG Share, salary/drawings, reinvestment, reserve, and flex buckets. Since the long-term goal is to build a proper accounting system, these routes should not remain under names that accountants would interpret as Chart of Accounts or General Ledger.

The updated plan will:

1. Keep Billing as the client-facing invoicing and receivables module.
2. Keep Finance as the cash and business money-management module.
3. Replace the old allocation bucket pages with a simpler Finance Distributions page.
4. Add Coming Soon pages for future Accounting routes so the navigation structure is ready without forcing the full accounting build now.
5. Automate payment references from allocated invoice numbers.
6. Add Billing Credits as a proper module for overpayments, credit notes, credit applications, refunds, and credit history.
7. Preserve existing income, expenses, invoices, payments, and payment allocation data.
8. Phase the work so the app remains usable after every stage.

---

## 2. Final Route Groups

### 2.1 Dashboard

```txt
/dashboard
```

Purpose: top-level business overview.

---

### 2.2 Billing

```txt
/billing/quotes
/billing/invoices
/billing/payments
/billing/credits
/billing/statements
/billing/items
```

Billing owns client-facing commercial documents and Accounts Receivable workflows:

| Route | Purpose |
|---|---|
| `/billing/quotes` | Client quotations |
| `/billing/invoices` | Client invoices |
| `/billing/payments` | Client payments and invoice allocations |
| `/billing/credits` | Credit notes, overpayments, refunds, and applications |
| `/billing/statements` | Client statements and aged receivables |
| `/billing/items` | Reusable billable services/items |

---

### 2.3 Finance

```txt
/finance/overview
/finance/income
/finance/expenses
/finance/categories
/finance/distributions
```

Finance owns cash movement and owner/business financial management:

| Route | Purpose |
|---|---|
| `/finance/overview` | Finance summary and key metrics |
| `/finance/income` | All money received / cash receipts |
| `/finance/expenses` | Business expenses |
| `/finance/categories` | Expense categories |
| `/finance/distributions` | PMG Share, Owner Drawings, Reinvestment, Activity, Rules |

---

### 2.4 Accounting

```txt
/finance/accounting/chart-of-accounts
/finance/accounting/journals
/finance/accounting/general-ledger
/finance/accounting/trial-balance
/finance/accounting/profit-and-loss
/finance/accounting/periods
/finance/accounting/exports
```

Accounting owns the future accountant-grade system:

| Route | Purpose | Initial status |
|---|---|---|
| `/finance/accounting/chart-of-accounts` | Real accounting accounts | Coming Soon |
| `/finance/accounting/journals` | Journal entries | Coming Soon |
| `/finance/accounting/general-ledger` | Debit/credit ledger | Coming Soon |
| `/finance/accounting/trial-balance` | Debit/credit balance report | Coming Soon |
| `/finance/accounting/profit-and-loss` | Income, expenses, net profit | Coming Soon |
| `/finance/accounting/periods` | Open/close/lock accounting months | Coming Soon |
| `/finance/accounting/exports` | Accountant exports | Coming Soon |

---

### 2.5 Relationships

```txt
/relationships/clients
/relationships/leads
/relationships/divisions
```

Purpose: people, clients, leads, and business divisions.

---

### 2.6 Insights

```txt
/insights/snapshots
/insights/reports
```

Purpose: historical summaries, reports, and analytics.

---

### 2.7 System

```txt
/settings
/settings/users
/settings/organisation
/settings/billing
/settings/security
/settings/data
```

Purpose: configuration, users, organisation data, billing settings, security, and exports.

---

## 3. Key Naming Decisions

### 3.1 Remove misleading routes

The following old routes should be removed after auditing and replacing usages:

```txt
/finance/accounts
/finance/accounts/[account]
/finance/ledger
```

They should not be redirected by default because the system currently has one main user and all internal references can be updated directly.

### 3.2 New route for owner/business distributions

Use one route:

```txt
/finance/distributions
```

Inside the page, use cards or tabs:

```txt
PMG Share
Owner Drawings
Reinvestment
Activity
Rules
```

### 3.3 Why distributions, not accounts

The existing buckets are not formal accounting accounts. They are management distribution categories.

Recommended simplified distribution categories:

| Distribution | Meaning |
|---|---|
| PMG Share | 25% of gross revenue allocated to PMG |
| Owner Drawings | Money taken personally by the owner |
| Reinvestment | Money kept for business growth, tools, development, marketing, systems, etc. |

Tax Reserve is intentionally excluded for now.

---

## 4. Payment Reference Automation

### 4.1 Problem

When recording a payment, the user currently has to manually type a reference even though the system already knows which invoices are being paid through the allocation table.

### 4.2 Required behavior

The system must automatically generate the payment reference from invoice document numbers selected in the payment allocations.

Examples:

| Scenario | Auto-generated reference |
|---|---|
| One invoice paid | `Payment for INV-2026-001` |
| Multiple invoices paid | `Payment for INV-2026-001, INV-2026-002` |
| Invoice paid plus unallocated credit | `Payment for INV-2026-001; Unallocated credit R500.00` |
| No invoice allocation | `Unallocated client credit / deposit` |
| Optional bank reference entered | `Payment for INV-2026-001 | Bank ref: EFT-89201` |

### 4.3 UI changes

Rename the current payment reference field from:

```txt
Reference / EFT Reference
```

to:

```txt
Payment Note / Bank Reference Optional
```

Add a preview section before submission:

```txt
Auto Reference:
Payment for INV-2026-001, INV-2026-002
```

### 4.4 Server-side rule

The server action that records client payments must generate the trusted invoice-based reference on the server by fetching invoice document numbers from submitted allocation IDs.

Do not rely only on frontend-generated text.

---

## 5. Credit Management Corrections

### 5.1 Credit module route

Add:

```txt
/billing/credits
/billing/credits/[id]
```

### 5.2 Credit module scope

The Billing Credits module should cover:

- Overpayment credits
- Manual credit notes
- Credit applications to invoices
- Credit refunds
- Credit expiry
- Client credit history
- Credit dashboard
- Audit trail of credit movements

### 5.3 Correct lock-period rule

A credit that originated from a locked/closed financial period may still be applied in a later open period if it is:

1. Active
2. Unexpired
3. Has remaining balance
4. Belongs to the same client
5. Meets division rules, if division restriction is enabled

The closed period must block changes to the original source transaction, not the later use of the remaining credit.

| Action | Rule |
|---|---|
| Edit original payment in closed period | Block |
| Delete original payment in closed period | Block |
| Void old credit source | Block or reversal-only |
| Apply active credit in open period | Allow |
| Refund active credit in open period | Allow |
| Apply expired credit | Block unless reactivated/extended |

---

## 6. PMG Share and Distribution Rules

### 6.1 Confirmed PMG Share

PMG Share remains:

```txt
25% of gross revenue
```

This is confirmed and should not be treated as a bug.

### 6.2 Future dynamic settings

Eventually, distribution percentages should move from hardcoded code into the database.

Recommended future table:

```txt
distribution_settings
  id
  pmg_share_rate
  owner_drawings_rate
  reinvestment_rate
  effective_from
  effective_to
  is_active
  created_at
  updated_at
```

Use effective dates so historical months remain accurate after future rate changes.

---

## 7. Coming Soon Pages

All future routes must exist as pages with a clear Coming Soon state, even if they are not fully implemented yet.

### 7.1 Coming Soon page requirements

Each Coming Soon page should include:

1. Page title
2. One-sentence purpose
3. Status badge: `Coming Soon`
4. Short explanation of what will be added later
5. No broken buttons
6. Optional link back to Finance Overview or Dashboard

### 7.2 Routes that should start as Coming Soon

```txt
/finance/overview
/finance/accounting/chart-of-accounts
/finance/accounting/journals
/finance/accounting/general-ledger
/finance/accounting/trial-balance
/finance/accounting/profit-and-loss
/finance/accounting/periods
/finance/accounting/exports
/billing/credits
```

If `/finance/income` is not fully ready in the first deploy, it can also start as Coming Soon, but the goal is to implement it early because existing income data already exists.

---

## 8. Phased Implementation Plan

## Phase 0 — Pre-implementation Audit

**Goal:** identify all references before changing routes.

### Tasks

1. Search for all usages of:
   - `/finance/accounts`
   - `/finance/accounts/[account]`
   - `/finance/ledger`
   - `Accounts`
   - `Ledger`
   - `ACCOUNT_KEYS`
   - `ACCOUNT_LABELS`
   - `LOCKED_ACCOUNTS`
   - `ledger` action references
2. Classify each usage as:
   - navigation
   - page route
   - action/helper
   - test
   - documentation
   - app config
3. Create a mapping table before editing.
4. Confirm no external dependency requires redirect support.

### App must remain running

No production behavior changes in this phase.

### Done when

- Audit list is complete.
- All old route references are mapped to their target replacement.

---

## Phase 1 — Route Skeleton and Coming Soon Pages

**Goal:** introduce the new route structure without breaking the current working modules.

### Tasks

1. Update navigation groups:
   - Dashboard
   - Billing
   - Finance
   - Accounting
   - Relationships
   - Insights
   - System
2. Add route skeletons:
   - `/finance/overview`
   - `/finance/income`
   - `/finance/distributions`
   - `/finance/accounting/chart-of-accounts`
   - `/finance/accounting/journals`
   - `/finance/accounting/general-ledger`
   - `/finance/accounting/trial-balance`
   - `/finance/accounting/profit-and-loss`
   - `/finance/accounting/periods`
   - `/finance/accounting/exports`
   - `/billing/credits`
3. Add Coming Soon pages for routes not yet implemented.
4. Do not delete old `/finance/accounts` and `/finance/ledger` until Phase 2 is complete.

### App must remain running

Existing routes continue to work while new route skeletons are added.

### Done when

- New routes load without errors.
- New navigation renders correctly.
- Coming Soon pages display cleanly.
- No current workflow is broken.

---

## Phase 2 — Replace Old Accounts/Ledger With Distributions

**Goal:** remove misleading route names and move useful bucket logic to `/finance/distributions`.

### Tasks

1. Build `/finance/distributions` page with sections:
   - PMG Share
   - Owner Drawings
   - Reinvestment
   - Activity
   - Rules
2. Move useful logic from old `/finance/accounts` and `/finance/ledger` into Distributions.
3. Update all internal links to use `/finance/distributions`.
4. Update navigation labels.
5. Update tests:
   - rename `finance-accounts` tests to `finance-distributions` tests
   - merge or replace `finance-ledger` tests with distribution activity tests
6. Update action/helper names gradually:
   - `account-withdrawal` -> `distribution-withdrawal` or `recordDistributionMovement`
   - `ledger.ts` -> `distributions.ts` later, if safe
7. Delete old route folders only after references are replaced:
   - `/finance/accounts`
   - `/finance/accounts/[account]`
   - `/finance/ledger`

### App must remain running

Do the move in small commits:

1. Create new page.
2. Copy logic.
3. Update navigation.
4. Update links/tests.
5. Delete old pages last.

### Done when

- `/finance/distributions` replaces the old bucket system.
- Old route folders are removed.
- No redirects are needed.
- Type-check and tests pass.

---

## Phase 3 — Payment Reference Automation

**Goal:** automatically generate payment references from invoice allocations.

### Tasks

1. Rename payment form field:
   - from `Reference / EFT Reference`
   - to `Payment Note / Bank Reference Optional`
2. Add auto-reference preview on the payment form.
3. Build client-side helper to preview selected invoice document numbers.
4. Update `recordClientPayment()` server action to generate trusted invoice references from allocation invoice IDs.
5. Append optional bank reference only if the user entered one.
6. Ensure receipt emails use the same allocated invoice reference logic.
7. Add tests for:
   - one invoice payment
   - multiple invoice payment
   - overpayment with unallocated credit
   - no allocation / deposit
   - optional bank reference

### App must remain running

If auto-generation fails for any reason, the payment should still save with a safe fallback:

```txt
Payment received - Client Name
```

### Done when

- User no longer has to type invoice numbers manually.
- Saved payment descriptions clearly show paid invoice numbers.
- Payment receipts still work.

---

## Phase 4 — Finance Income Page

**Goal:** give Finance its own view of money received while Billing Payments remains focused on invoice allocation.

### Tasks

1. Build `/finance/income` using existing `income` data.
2. Show:
   - date
   - division
   - client
   - payment reference/description
   - amount
   - allocated amount
   - unallocated amount
   - source
   - period status
3. Add filters:
   - month
   - division
   - client
   - source
4. Link finance income rows to relevant billing payment detail pages.
5. Respect closed-period rules.
6. Avoid duplicate creation flows if Billing already owns client payment recording.

### App must remain running

This phase is read-heavy and should not change payment recording behavior except for links and display improvements.

### Done when

- Finance has a proper Income/Cash Receipts view.
- Existing three months of income data is visible.
- Billing payments and Finance income have clearly different purposes.

---

## Phase 5 — Billing Credits MVP

**Goal:** fix the credit application gap and introduce a proper credit lifecycle.

### Tasks

1. Add credit schema:
   - `credit_notes`
   - `credit_applications`
   - `credit_refunds`
2. Backfill existing overpayments into credit notes.
3. Add `/billing/credits` page.
4. Add `CreditBalanceCard` to invoice and client billing views.
5. Add `ApplyCreditDialog`.
6. Add server actions:
   - `createCreditNote`
   - `applyCreditToInvoice`
   - `applyCreditToInvoices`
   - `getClientCreditSummary`
   - `getClientCreditHistory`
7. Correct period-lock behavior:
   - block source edits in closed periods
   - allow active credits to be applied in open periods
8. Add tests for locked-period credit use.

### App must remain running

Use shadow accounting:

1. Add new credit tables.
2. Backfill existing overpayments.
3. Keep current credit calculation temporarily.
4. Switch reads only after validation.

### Done when

- Existing client credits can be applied to invoices.
- Credits have an audit trail.
- Locked-period source credits can still be used in open periods.

---

## Phase 6 — Distribution Rules and Settings

**Goal:** stop hardcoding distribution rates long term.

### Tasks

1. Add `distribution_settings` table.
2. Seed current rules:
   - PMG Share: 25% of gross revenue
   - Owner Drawings: optional/manual or configured percentage later
   - Reinvestment: optional/manual or configured percentage later
3. Add Rules tab/section inside `/finance/distributions`.
4. Add effective dates.
5. Ensure historical months keep their original rates unless intentionally recalculated.
6. Add tests for rate changes and effective-date calculations.

### App must remain running

Keep existing hardcoded rates as fallback until settings are fully validated.

### Done when

- PMG Share remains 25%.
- Future rate changes can happen from the UI.
- Historical records remain stable.

---

## Phase 7 — Accounting Foundation Skeleton

**Goal:** prepare the real accounting system without forcing it into current workflows yet.

### Tasks

1. Add schema:
   - `chart_accounts`
   - `journal_entries`
   - `journal_lines`
   - `accounting_periods`
2. Seed starter Chart of Accounts:
   - Bank
   - Accounts Receivable
   - Client Credits / Deposits
   - Sales Revenue
   - Owner Drawings
   - PMG Share / Distribution
   - Reinvestment Reserve
   - Main expense accounts
3. Implement `/finance/accounting/chart-of-accounts` first.
4. Keep other Accounting pages as Coming Soon.
5. Add validation that journal entries must balance:

```txt
Total debits = Total credits
```

### App must remain running

Do not automatically post journals from live payments/expenses yet.

### Done when

- Accounting route group exists.
- Chart of Accounts foundation exists.
- No current billing/finance workflow is forced into incomplete accounting logic.

---

## Phase 8 — Journal Posting and Backfill

**Goal:** start turning existing income and expenses into proper accounting entries.

### Tasks

1. Build `postJournalEntry()` helper.
2. Post cash-basis journals for income:

```txt
Dr Bank
Cr Sales Revenue
```

3. Post cash-basis journals for expenses:

```txt
Dr Expense Account
Cr Bank
```

4. Add source references:
   - source module
   - source table
   - source row ID
   - source document number/reference
5. Backfill journals for existing three months of data after testing.
6. Add reports:
   - General Ledger
   - Trial Balance
   - Profit & Loss

### App must remain running

Backfill must be idempotent:

```txt
Running the backfill twice must not duplicate journal entries.
```

### Done when

- Existing records have matching journal entries.
- Accounting reports can be produced.
- Trial Balance balances.

---

## 9. Safe Migration Principles

1. Never delete financial data.
2. Add new pages before removing old pages.
3. Delete old routes only after all references are audited and updated.
4. Use Coming Soon pages instead of broken routes.
5. Use server-side validation for financial references and calculations.
6. Keep old calculations as fallback during migrations.
7. Introduce accounting gradually after operational billing and finance are stable.
8. Preserve historical accuracy with effective dates.
9. Avoid fake accounting names for management-only features.
10. Keep the app deployable and usable after every phase.

---

## 10. Testing Checklist

### Route tests

- All new routes load.
- Old route usages are removed.
- Navigation renders correct groups.
- Coming Soon pages render correctly.

### Billing payment tests

- One invoice payment reference is correct.
- Multiple invoice payment reference is correct.
- Overpayment reference includes unallocated credit.
- Deposit/no-allocation reference is correct.
- Optional bank reference is appended correctly.

### Finance tests

- Income page shows existing income records.
- Expenses remain unaffected.
- Distributions show PMG Share, Owner Drawings, and Reinvestment.
- PMG Share remains 25%.

### Credit tests

- Overpayment creates credit.
- Credit can be applied to invoice.
- Credit from closed source period can be applied in open period.
- Expired credit cannot be applied.
- Refund reduces available credit.

### Accounting tests

- Chart of Accounts loads.
- Journal entries must balance.
- Backfill is idempotent.
- Trial Balance balances after posting.

---

## 11. Recommended First Development Batch

The first batch should be small and safe:

1. Add new route groups and Coming Soon pages.
2. Create `/finance/distributions` page skeleton.
3. Update navigation.
4. Add `/finance/income` skeleton or initial read-only version.
5. Add `/billing/credits` Coming Soon page.
6. Do not delete old accounts/ledger routes yet.
7. Run app, type-check, and tests.

Then the second batch can remove the old routes after reference mapping is complete.

---

## 12. Final Target Outcome

After all phases, PMG Hub will have:

1. A clean Billing module for client documents, receivables, payments, credits, and statements.
2. A clean Finance module for income, expenses, distributions, and cash management.
3. A simplified Distributions feature for PMG Share, Owner Drawings, and Reinvestment.
4. A future-ready Accounting module with Chart of Accounts, Journals, General Ledger, Trial Balance, Profit & Loss, Periods, and Exports.
5. Cleaner payment references generated automatically from invoice allocations.
6. Proper credit handling for overpayments and credit application.
7. A phased path toward a real accounting system without breaking the app during development.
