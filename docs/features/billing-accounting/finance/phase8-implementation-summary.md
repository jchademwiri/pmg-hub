# Phase 8 — AR Journal Posting Implementation Summary

**Date:** 2026-06-18  
**Branch:** `dev`

## Overview

Implemented automatic double-entry journal posting across the entire billing lifecycle: invoice issue, payment receipt, invoice void, payment delete/edit, expense record/edit/delete, and invoice amount edits. All journal entries fire atomically via `db.batch()` on the Neon HTTP driver.

---

## What Was Built

### 1. Core Posting Module (`accounting-auto-post.ts`)

**703 lines** — the canonical module for all auto-posted journal entries.

| Function | Entry Shape | Trigger |
|----------|------------|---------|
| `postInvoiceIssueJournalEntry` | Dr AR (1100) / Cr Revenue (4010) | Invoice issued |
| `postPaymentJournalEntries` | Dr Bank (1010) / Cr AR (1100) + Dr Savings (1020) / Cr Bank (1010) | Payment received |
| `voidInvoiceJournalEntries` | Voids AR + payment entries linked to invoice | Invoice voided |
| `voidPaymentJournalEntries` | Voids entries linked to income record | Payment deleted |
| `updatePaymentJournalEntries` | Void + repost with new amount | Payment adjusted |
| `updateInvoiceJournalEntry` | Voids ONLY AR entry (not payment entries) + repost | Invoice amount edited |
| `postExpenseJournalEntry` | Dr Expense Account / Cr Bank (1010) | Expense recorded |
| `voidExpenseJournalEntries` | Voids expense entry | Expense deleted |
| `updateExpenseJournalEntry` | Void + repost with new amount/category | Expense edited |

### 2. Atomicity via `db.batch()`

- `db.transaction()` is unavailable on Neon HTTP driver
- All posting functions use `db.batch()` with pre-generated UUIDs (`randomUUID()`)
- Either all queries succeed or none do — single HTTP round trip
- Void functions batch multiple UPDATE statements

### 3. Wiring Into Server Actions

| File | Changes |
|------|---------|
| `billing-invoices.ts` | `issueInvoice`, `bulkIssueInvoices`, `markInvoicePaid`, `voidInvoice`, `bulkVoidInvoices`, `updateInvoice` (amount edit → void+repost AR) |
| `billing-payments.ts` | `recordClientPayment`, `adjustClientPayment`, `updateClientPayment`, `deleteClientPayment` |
| `expenses.ts` | `createExpense`, `updateExpense`, `deleteExpense` |
| `income.ts` | `deleteIncome` |

### 4. Backfill Script (`backfill-accrual-ar.ts`)

494-line migration script that:
- Voids old cash-basis income entries (pre-flight cleanup)
- Posts Dr AR / Cr Revenue for all existing invoices
- Posts Dr Bank / Cr AR per payment allocation
- Posts Dr Savings / Cr Bank for PMG share using historical `distribution_settings` rates
- Posts Client Credits (2200) for unallocated overpayments
- Verifies trial balance at the end

**Ran successfully:** 12 old entries voided, 20 invoice entries created, 12 payment entries created. Trial balance: **R 63,065.00 debits = R 63,065.00 credits** ✅

### 5. Test Mock Fixes

Updated `finance-expenses.test.tsx` mocks to include:
- `chartAccounts`, `journalEntries`, `journalLines`, `paymentAllocations` tables
- `ACCOUNT_RATES`, `getNextJournalEntryNumber`, `ensureOpenPeriod`, `sql`, `and`, `batch`
- Proper `db.select().from().where()` chain support
- `.returning()` support on insert chains

---

## Key Design Decisions

1. **`db.batch()` over `db.transaction()`** — Neon HTTP doesn't support transactions. `db.batch()` provides the same atomicity in a single round trip.

2. **Pre-generated UUIDs** — Batch queries can't depend on `.returning()` from earlier queries, so all IDs are generated with `randomUUID()` before building the batch.

3. **Void-only AR on invoice edit** — `updateInvoiceJournalEntry` only voids `sourceTable: 'invoices'` entries, NOT payment entries. This prevents incorrectly voiding payment records when an invoice amount is adjusted.

4. **`sourceModule: 'expense'` (singular)** — Matches the existing `backfill-accounting.ts` convention so voids correctly find entries from either source.

5. **Non-fatal auto-post** — All auto-post failures are caught and logged as warnings, never blocking the primary business action (create/issue/pay/void).

---

## Test Results

- **Build:** ✅ All 4 packages build successfully
- **Tests:** 283 passed, 16 failed (all 16 failures are pre-existing mock issues — `getActiveRates`, `ACCOUNT_KEYS`, etc. not in existing test mocks)
- **No regressions** introduced by this work

---

## Files Changed

| File | Lines Changed |
|------|--------------|
| `apps/admin/src/app/actions/accounting-auto-post.ts` | +703 (new) |
| `apps/admin/src/app/actions/billing-invoices.ts` | +98 |
| `apps/admin/src/app/actions/billing-payments.ts` | +52 |
| `apps/admin/src/app/actions/expenses.ts` | +45 |
| `apps/admin/src/app/actions/income.ts` | +13 |
| `packages/db/src/backfill-accrual-ar.ts` | +494 (new) |
| `apps/admin/src/__tests__/finance-expenses.test.tsx` | ~30 (mock updates) |
| `pmg-hub-phase8-ar-journal-posting-plan.md` | +229 (reference doc) |

**Total:** ~1,600+ lines across 8 files

---

## Remaining Follow-ups (Phase 8 Plan)

- [ ] Replace `getNextJournalEntryNumber()` with atomic upsert (race condition under concurrent posts)
- [ ] Add new revenue accounts: 4011 TES, 4012 AWS, 4013 PMG Professional Services
- [ ] Retire 4010 Sales Revenue and 4020 PMG Share Revenue
- [ ] Fix VAT seed: deactivate 2020/2030 accounts
- [ ] Add `UNIQUE (source_module, source_table, source_id)` constraint on `journal_entries`
- [ ] Create dedicated posting module at `apps/admin/src/lib/accounting/posting.ts`
- [ ] Add unit tests for balanced entries, void correctness, and idempotency
