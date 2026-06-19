You are working in the `pmg-hub` monorepo. The latest commit added accounting journal posting for invoices/payments and reclassified “PMG Share Revenue” as an asset savings account.

Please review and improve the implementation so it is production-safe, accounting-correct, and aligned with the business rules below.

## Business context

The business is not VAT-registered yet.

There are 3 main service revenue streams:

1. TES — tendering services and compliance
2. AWS — websites, hosting, emails
3. PMG — other professional services such as graphic design, tutorials, consulting, and miscellaneous professional services

“PMG Share Revenue” is not income/revenue. It is a savings account. Each time income is received, 25% of that receipt should be moved into this savings account.

Accounts Receivable must show balances for issued, unpaid, and partially paid invoices.

## Current suspected issues to fix

1. The previous implementation likely posts Accounts Receivable only when invoices are explicitly issued through `issueInvoice`, but invoices can also become issued via email delivery or bulk issue flows. All invoice status transitions from `draft` to `issued` must create the same receivable journal entry.

2. Payment journal entries currently split receipts directly as:
   - Dr Business Bank 75%
   - Dr PMG Share Revenue savings 25%
   - Cr Accounts Receivable / Client Credits 100%

   Confirm whether this matches actual bank movement. If the cash first lands in the main bank and is later transferred to savings, the accounting should either:
   - post the receipt fully to Business Bank first, then post a separate internal transfer Dr PMG Share Revenue savings / Cr Business Bank; or
   - keep the current split only if the system intentionally treats the receipt as immediately allocated between bank accounts.

3. The helper functions added to `billing-invoices.ts` and `billing-payments.ts` are duplicated. Extract shared accounting posting logic into a reusable module.

4. The accounting posting and invoice/payment updates are not clearly wrapped in database transactions. If a journal entry succeeds but the invoice/payment update fails, the data can become inconsistent. Make these flows atomic where possible.

5. Existing issued/unpaid/partially paid invoices will still not have historical Accounts Receivable journal entries unless a backfill/migration is added. Add a safe idempotent backfill script or migration.

6. The migration reclassifies `1020` as “PMG Share Revenue” but only deactivates legacy `4020`. Confirm any existing journal lines posted to `4020` are either left intentionally as historical data or migrated/reclassified safely.

7. No VAT accounts should be active by default while the business is not VAT-registered. Ensure invoice forms, calculation logic, and seeded accounts do not accidentally enable VAT unless explicitly configured.

## Desired accounting behavior

### When an invoice is issued

Post:

Dr Accounts Receivable  
Cr Revenue account

The revenue account should ideally depend on the service/division/category:

- TES Revenue
- AWS Revenue
- PMG Professional Services Revenue

If this mapping does not exist yet, add a minimal clean mapping using existing division/service metadata.

### When a payment is received and allocated to invoices

Preferred conservative accounting:

Receipt:

Dr Business Bank 100%  
Cr Accounts Receivable allocated amount  
Cr Client Credits unallocated/overpayment amount, if any

PMG savings transfer:

Dr PMG Share Revenue savings 25% of received amount  
Cr Business Bank 25% of received amount

This keeps total cash correct while showing the 25% movement into savings.

### When a payment is partially allocated

Example: receive R1,000, allocate R600 to invoice, R400 remains client credit.

Receipt:

Dr Business Bank R1,000  
Cr Accounts Receivable R600  
Cr Client Credits R400

Savings transfer:

Dr PMG Share Revenue savings R250  
Cr Business Bank R250

### When invoice is partially paid

Accounts Receivable should remain with the unpaid balance.

Example: invoice R1,000, payment R400.

Invoice issue:

Dr Accounts Receivable R1,000  
Cr Revenue R1,000

Payment:

Dr Business Bank R400  
Cr Accounts Receivable R400

Remaining AR balance: R600.

## Implementation requirements

1. Inspect these files:
   - `apps/admin/src/app/actions/billing-invoices.ts`
   - `apps/admin/src/app/actions/billing-payments.ts`
   - `apps/admin/src/app/actions/email-delivery.ts`
   - `packages/db/src/queries/accounting.ts`
   - `packages/db/src/seed-accounting.ts`
   - `packages/db/src/backfill-accounting.ts`
   - `packages/db/src/schema/accounting.ts`
   - `packages/db/src/schema/billing.ts`
   - `packages/db/src/migrations/0022_reclassify_pmg_share_revenue.sql`

2. Extract shared journal posting code into a module such as:
   - `apps/admin/src/lib/accounting/posting.ts`
   or, if more appropriate:
   - `packages/db/src/accounting/posting.ts`

3. Ensure every invoice issue path calls the same posting function:
   - single issue
   - bulk issue
   - email-send issue transition
   - quote-to-invoice if it ever creates an issued invoice in future
   - any other status update from `draft` to `issued`

4. Ensure payment posting is atomic and idempotent:
   - one journal entry or journal group per payment receipt
   - no duplicate journal entries for the same `income.id`
   - safe handling of partially paid invoices
   - safe handling of unallocated payments / overpayments

5. Add or update a backfill script for existing data:
   - create missing invoice issue journal entries for existing `issued`, `overdue`, `partially_paid`, and `paid` invoices
   - create missing payment receipt journal entries for existing `income` records
   - do not duplicate entries if source journal entries already exist
   - clearly document whether historical PMG share transfers are included

6. Add/update tests if the repository has existing tests for billing/accounting:
   - issuing an invoice creates Dr AR / Cr Revenue
   - recording a partial payment reduces AR only by allocated amount
   - recording overpayment creates Client Credits
   - PMG Share Revenue savings receives 25% of receipts via transfer logic
   - trial balance only includes posted matching entries
   - duplicate issue/payment calls do not double-post

7. Run:
   - typecheck
   - lint
   - relevant tests
   - any existing billing/accounting test suite

8. Update the PR summary with:
   - accounting flow before/after
   - AR behavior
   - PMG savings behavior
   - migration/backfill notes
   - any manual steps required after deploy
  


Implementation Plan
Phase 1 — Verify all invoice issue paths
Review every place where invoice status changes to issued.

Likely files:

apps/admin/src/app/actions/billing-invoices.ts

apps/admin/src/app/actions/email-delivery.ts

possibly bulk actions in billing-invoices.ts

The key risk is that only issueInvoice() posts the AR journal entry, while other flows can still issue invoices without touching Accounts Receivable.

Suggested task
Route every invoice issue path through one receivables posting function

Start task
Phase 2 — Extract shared accounting posting utilities
The previous implementation added similar helpers in both invoice and payment actions. That should be centralized.

Suggested module:

apps/admin/src/lib/accounting/posting.ts
Suggested exported functions:

postInvoiceIssuedEntry(...)
postPaymentReceiptEntry(...)
postPmgShareTransferEntry(...)
journalEntryExists(...)
getPostingAccountIdByCode(...)
Suggested task
Extract duplicated journal posting helpers into a shared accounting module

Start task
Phase 3 — Correct PMG Share Revenue savings treatment
Because PMG Share Revenue is a savings account, not income, the clean accounting model is:

When payment is received:

Dr Business Bank 100%
Cr Accounts Receivable / Client Credits 100%
Then transfer 25% to savings:

Dr PMG Share Revenue savings 25%
Cr Business Bank 25%
This is cleaner than directly splitting the receipt into two debit lines unless your bank feed actually deposits 75% and 25% separately.

Suggested task
Post PMG 25% share as an internal bank-to-savings transfer

Start task
Phase 4 — Use revenue accounts for TES, AWS, and PMG services
Right now the previous implementation appears to credit a generic Sales Revenue account.

You asked for only the accounts you absolutely need, but your revenue reporting needs at least these 3 income accounts:

4010 TES Revenue
4020 AWS Revenue
4030 PMG Professional Services Revenue
However, the previous migration deactivated old 4020 because it was legacy PMG Share Revenue. So the final account coding should be chosen carefully.

Possible clean mapping:

4000 Revenue header
4010 TES Revenue
4020 AWS Revenue
4030 PMG Professional Services Revenue
4040 Other Income
Then PMG savings can be:

1020 PMG Share Revenue
Suggested task
Map invoice revenue to TES, AWS, or PMG service revenue accounts

Start task
Phase 5 — Make invoice/payment + journal posting atomic
Current flows appear to do multiple sequential database writes. If one succeeds and another fails, the ledger and billing records can disagree.

The most important flows to wrap transactionally:

issue invoice + create AR journal entry

record payment + create payment journal entry + insert allocations + update invoice statuses

mark invoice paid + create income row + payment journal entry + update invoice

Suggested task
Wrap billing and journal posting writes in database transactions

Start task
Phase 6 — Backfill historical AR and payment entries
Existing invoices/payments created before this fix will still not show correctly in Trial Balance unless backfilled.

You need a safe, idempotent script.

Suggested file:

packages/db/src/backfill-billing-accounting.ts
Backfill behavior:

For each invoice with status:

issued

overdue

partially_paid

paid

If no journal_entries row exists with:

source_table = 'invoices'
source_id = invoice.id
then create:

Dr Accounts Receivable
Cr Revenue
For each income/payment row:

If no journal_entries row exists with:

source_table = 'income'
source_id = income.id
then create receipt and PMG savings transfer entries.

Use payment allocations to determine:

AR credit amount

Client Credits amount

Suggested task
Add an idempotent backfill for historical invoice and payment accounting

Start task
Phase 7 — Fix trial balance query semantics permanently
The previous fix changed the sums to only count lines with matching posted journal entries. That is the right direction.

However, confirm this behavior for:

no period filter

period filter

draft journal entries

void journal entries

lines whose journal header is missing or filtered out

Suggested task
Add regression tests for trial balance posted-entry filtering

Start task
Phase 8 — Ensure VAT stays disabled until registration
You said there is no VAT registration yet.

The chart seed and migration should deactivate/remove VAT accounts, but also check the invoice UI and schema defaults.

Look for:

vatEnabled

vatRate

vatAmount

VAT display in invoice form

VAT defaults in line items

Suggested task
Ensure VAT cannot be accidentally enabled while business is not VAT-registered

Start task
Phase 9 — Add tests for the full accounting lifecycle
Minimum scenarios:

Issue invoice R1,000:

AR debit R1,000

revenue credit R1,000

Record payment R400 allocated to invoice:

bank debit R400

AR credit R400

PMG savings transfer R100

Record payment R1,200 for R1,000 invoice:

bank debit R1,200

AR credit R1,000

client credits credit R200

PMG savings transfer R300

Trial balance after partial payment:

AR still shows R600 debit balance

Suggested task
Add end-to-end accounting tests for invoice issue and payment allocation

Start task
Recommended Final Accounting Flow
Issued invoice
Dr 1100 Accounts Receivable
Cr 4010/4020/4030 Service Revenue
Payment received
Dr 1010 Business Cheque Account
Cr 1100 Accounts Receivable
Cr 2200 Client Credits, if unallocated/overpaid
PMG savings movement
Dr 1020 PMG Share Revenue savings
Cr 1010 Business Cheque Account
No VAT for now
Do not use:

VAT Output
VAT Input
VAT Receivable
VAT Payable
until VAT registration is active.
