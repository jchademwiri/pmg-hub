# Billing System Audit — Implementation Plan

> **Scope:** Full verification of 14 findings from a deep-audit across the billing surface.  
> **Codebase:** `pmg-hub` monorepo — `apps/admin/src/app/actions/`, `apps/admin/src/lib/accounting/`, `packages/db/src/queries/`  
> **Date:** July 2026  
> **Severity Guide:** 🔴 Critical — active financial corruption | 🟠 High — exploitable / data integrity | 🟡 Medium — correctness/robustness

---

## Quick Summary

| #   | Finding                                              | Severity    | Effort | Affected Files                                 |
| --- | ---------------------------------------------------- | ----------- | ------ | ---------------------------------------------- |
| 1   | Mark Paid inflates credit balances                   | 🔴 Critical | Small  | `billing-invoices.ts`, `billing-payments.ts`   |
| 2   | Void partially-paid erases cash entries              | 🔴 Critical | Medium | `billing-invoices.ts`, `posting.ts`            |
| 3   | Credit notes double-subtracted on statements         | 🔴 Critical | Small  | `billing.ts` (queries), `credit-management.ts` |
| 4   | `recordClientPayment` no server-side alloc sum check | 🟠 High     | Tiny   | `billing-payments.ts`                          |
| 5   | `applyCreditToInvoices` no client cross-check        | 🟠 High     | Tiny   | `credit-management.ts`                         |
| 6   | Quote edits drop per-line-item discounts             | 🟠 High     | Small  | `billing-quotes.ts`                            |
| 7   | Posting failures silently swallowed (most actions)   | 🟠 High     | Medium | `billing-invoices.ts`, `posting.ts`            |
| 8   | Update journal void+repost can orphan                | 🟠 High     | Medium | `posting.ts`                                   |
| 9   | `bulkVoidInvoices` no credit reversal                | 🟠 High     | Small  | `billing-invoices.ts`                          |
| 10  | `applyCreditToInvoices` bulk no transaction/locks    | 🟠 High     | Medium | `credit-management.ts`                         |
| 11  | `getAllInvoices` pagination total mismatch           | 🟡 Medium   | Tiny   | `billing.ts` (queries)                         |
| 12  | Quote expiry never enforced server-side              | 🟡 Medium   | Small  | `billing-quotes.ts`                            |
| 13  | `writeOffInvoice` blocked on `partially_paid`        | 🟡 Medium   | Tiny   | `billing-invoices.ts`                          |
| 14  | Cent-level rounding drift (header vs lines)          | 🟡 Medium   | Small  | `billing-invoices.ts`, `billing-quotes.ts`     |

---

## 🔴 Finding #1 — Mark Paid inflates client credit balances

### Verification

✅ **Resolved in Source Code.** `markInvoicePaid` (`billing-invoices.ts:638-642`) inserts a `payment_allocations` row inside the transaction whenever an invoice is marked as paid:

```ts
await tx.insert(paymentAllocations).values({
  incomeId: row.id,
  invoiceId: id,
  amount: invoiceLocked.total!,
});
```

Because `payment_allocations` is written, `getClientCreditBalance` (`totalPaid - totalAllocated`) correctly accounts for the allocation, preventing artificial inflation of client credit balances.

### Status

✅ **Resolved.** Fixed in `billing-invoices.ts`. (Existing historical data should be checked for missing `payment_allocations` if any prior records exist).

---

## 🔴 Finding #2 — Voiding a partially-paid invoice erases real cash from the ledger

### Verification

✅ **Confirmed against source.** In `voidInvoice` (`billing-invoices.ts:665-679`), the status check only blocks `paid` and `void`:

```ts
if (invoice.status === 'paid') return { error: 'Cannot void a paid invoice.' };
if (invoice.status === 'void') return { error: 'Invoice is already void.' };
```

Notably absent: `partially_paid`, `written_off`.

`voidInvoiceJournalEntries` (`posting.ts:591-655`) does two things:

1. Voids AR entries linked to the invoice (`sourceTable = 'invoices'`)
2. **Finds all payment entries linked via `payment_allocations`** and voids those too:

```ts
const linkedIncome = await db
  .selectDistinct({ incomeId: paymentAllocations.incomeId })
  .from(paymentAllocations)
  .where(eq(paymentAllocations.invoiceId, invoiceId));
// ... voids every journal entry for those income IDs
```

`reverseCreditApplication` (`credit-management.ts`) is called first, but it only reverses allocations where `income.description LIKE 'Credit applied to%'`. Real cash payments pass through untouched — then get their journal entries erased by `voidInvoiceJournalEntries`.

**Net result:** Real bank-deposit entries are voided from the trial balance. The income row and payment_allocations row still exist — they're orphaned, pointing at a now-void invoice. The cash genuinely exists in the bank, but the trial balance no longer shows it.

### Impact

Real money silently vanishes from the trial balance. An audit would show bank > trial balance with no explanation.

### Fix Strategy

**Step 1 — Block voiding on `partially_paid` invoices** (simple guard):

```ts
if (invoice.status === 'partially_paid') {
  return { error: 'Cannot void a partially paid invoice. Reverse payments first.' };
}
```

**Step 2 — Fix the real use case:** If the user legitimately needs to void a partially-paid invoice, require manually reversing all payment allocations first (via payment adjustment), then voiding the draft/issued invoice.

**Step 3 — Audit data:** After deploying, find any voided invoices that have `payment_allocations` rows with real cash income linked, and restore those journal entries.

---

## 🔴 Finding #3 — Credit notes double-subtracted from client statements

### Verification

✅ **Confirmed against source.** In `applyCreditToInvoice` (`credit-management.ts`), applying credit creates **two** records:

1. A `creditApplications` row (R500)
2. A synthetic `income` row with description `'Credit applied to XYZ'` + a `payment_allocations` linking it — "for dashboard visibility"

In `getClientStatement` (`packages/db/src/queries/billing.ts:877`), `totalOutstanding` is computed as:

```ts
const totalOutstanding = globalInvoiced - globalPaid - globalCreditApplied;
```

Where:

- `globalPaid = SUM(income.amount)` — **includes the synthetic R500 income row**
- `globalCreditApplied = SUM(creditApplications.amount)` — **includes the R500 credit application**

So for an invoice of R1,000 with R300 credit applied (no cash):

```text
totalOutstanding = 1000 - 300(income) - 300(creditApps) = 400 // Should be 700!
```

The synthetic income row was created to make credit applications show up on the income page and dashboard. But it's not netted out — `getClientStatement` subtracts it again via `globalCreditApplied`.

### Impact

Every client statement understates the outstanding balance by the amount of credit applied. This affects:

- PDF statements sent to clients
- Billing overview dashboard
- Client workspace financial summary

### Fix Strategy

**Option A (Recommended):** Fix `getClientStatement` to exclude the synthetic credit income rows:

```ts
const globalIncomeConditions = [
  eq(income.clientId, clientId),
  sql`${income.description} NOT ILIKE 'Credit applied to%'`, // Exclude synthetic credit entries
];
```

**Option B:** Stop creating the synthetic income row in `applyCreditToInvoice` and instead use a separate mechanism to show credit applications on the dashboard/income page.

---

## 🟠 Finding #4 — `recordClientPayment` no server-side allocation sum check

### Verification

✅ **Resolved in Source Code.** In `recordClientPayment` (`billing-payments.ts:193-195`), the server action explicitly validates that allocations do not exceed the payment amount received:

```ts
if (excessAmount < -0.01) {
  return { error: 'Total allocations exceed the payment amount received.' };
}
```

### Status

✅ **Resolved.** Enforced in `billing-payments.ts`.

---

## 🟠 Finding #5 — `applyCreditToInvoices` no client cross-check

### Verification

✅ **Resolved in Source Code.** In `applyCreditToInvoices` (`credit-management.ts:537-540`), the action validates that every allocated invoice belongs to the target client:

```ts
if (invoice.clientId !== clientId) {
  console.warn(
    `applyCreditToInvoices: skipping invoice ${alloc.invoiceId} — belongs to a different client than the credit being spent.`,
  );
  return 0;
}
```

### Status

✅ **Resolved.** Enforced in `credit-management.ts`.

---

## 🟠 Finding #6 — Quote edits silently drop per-line-item discounts

### Verification

✅ **Confirmed.** Compare `createQuotation` vs `updateQuotation` (`billing-quotes.ts`):

**`createQuotation`** line item insert (lines 133-148):

```ts
itemId: item.itemId ?? null,
description: item.description,
quantity: String(item.quantity),
unitPrice: String(item.unitPrice.toFixed(2)),
discountType: item.discountType ?? null,          // ✅ PRESENT
discountValue: item.discountValue != null ? String(item.discountValue) : null,  // ✅
discountAmount: String(itemDiscountAmount.toFixed(2)),  // ✅
vatRate: '0',
lineTotal: String((rawTotal - itemDiscountAmount).toFixed(2)),  // ✅ includes discount
```

**`updateQuotation`** line item insert (lines 279-291):

```ts
itemId: item.itemId ?? null,
description: item.description,
quantity: String(item.quantity),
unitPrice: String(item.unitPrice.toFixed(2)),
vatRate: '0',
lineTotal: String((item.quantity * item.unitPrice).toFixed(2)),  // ❌ NO discount!
```

The `discountType`, `discountValue`, `discountAmount` fields are **completely absent**. The `lineTotal` is computed as raw `quantity × unitPrice` with no discount applied.

The header totals (subtotal, discountAmount, vatAmount, total) are recalculated correctly from the line items by `calcDocumentTotals`, so the header total is right. But the line items no longer sum to the header total. When converted to an invoice, these incorrect line items are carried over verbatim.

### Fix

Update the `updateQuotation` line item map to include the discount fields, matching `createQuotation`'s implementation:

```ts
lineItems.map((item, i) => {
  const rawTotal = item.quantity * item.unitPrice;
  const itemDiscountVal = item.discountValue ?? 0;
  const itemDiscountAmount =
    item.discountType === 'percent'
      ? rawTotal * (itemDiscountVal / 100)
      : item.discountType === 'amount'
        ? Math.min(itemDiscountVal, rawTotal)
        : 0;

  return {
    documentType: 'quote' as const,
    documentId: id,
    sortOrder: i,
    itemId: item.itemId ?? null,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice.toFixed(2)),
    discountType: item.discountType ?? null, // ← ADD
    discountValue: item.discountValue != null ? String(item.discountValue) : null, // ← ADD
    discountAmount: String(itemDiscountAmount.toFixed(2)), // ← ADD
    vatRate: '0',
    lineTotal: String((rawTotal - itemDiscountAmount).toFixed(2)), // ← FIX
  };
});
```

Note: `updateQuotation` preserves line-item discounts for all future edits. Note that `convertQuoteToInvoice` copies line items directly from stored quote line items; quotes whose line-item discounts were omitted in past edits before the `updateQuotation` fix cannot have those lost line-level discount details reconstructed automatically by `convertQuoteToInvoice` without a separate historical backfill script. Remediation in `convertQuoteToInvoice` is explicitly scoped to future conversions where quote line items preserve their discount attributes.

---

## 🟠 Finding #7 — Posting failures silently swallowed

### Verification

✅ **Confirmed for most actions.** Here's the status per action:

| Action              | Journal failure behavior                             | Correct?     |
| ------------------- | ---------------------------------------------------- | ------------ |
| `issueInvoice`      | Throws inside transaction → rollback                 | ✅ Correct   |
| `markInvoicePaid`   | Throws inside transaction → full rollback            | ✅ Correct   |
| `voidInvoice`       | `console.warn()` after status change committed       | ❌ Swallowed |
| `bulkIssueInvoices` | Uses `issueInvoiceInternal` → rolls back per-invoice | ✅ Correct   |
| `bulkVoidInvoices`  | `console.warn()` after status changes committed      | ❌ Swallowed |
| `writeOffInvoice`   | Throws inside transaction → full rollback            | ✅ Correct   |
| `updateInvoice`     | `console.warn()` after line items updated            | ❌ Swallowed |

### Impact

When an accounting period is closed, the journal post silently fails, but the invoice status/amount changes are committed. The invoice appears in reports as issued/paid/void, but with no ledger backing. The trial balance is incomplete.

### Fix Strategy

For each affected action, move the journal posting **inside** the transaction, before the status is committed. For actions where that's architecturally difficult (like `markInvoicePaid` where the income row must exist first), restructure the code.

---

## 🟠 Finding #8 — `updatePaymentJournalEntries` / `updateInvoiceJournalEntry` can orphan

### Verification

✅ **Confirmed.** Both functions follow the same pattern: void old entries, then post new ones. If the repost fails, the void has already committed and nothing rolls it back because the void and repost happen sequentially, not inside a shared transaction.

**`updatePaymentJournalEntries`** (`posting.ts`):

```ts
await voidPaymentJournalEntries(data.incomeId, tx);  // Void committed
const result = await postPaymentJournalEntries({...}); // If fails → orphaned void
```

### Fix

Wrap the entire void+repost in a transaction:

```ts
export async function updatePaymentJournalEntries(data) {
  return await getDb().transaction(async (tx) => {
    await voidPaymentJournalEntries(data.incomeId, tx);
    const result = await postPaymentJournalEntries({ ...data, tx });
    if (result.error) throw new Error(result.error);
    return {};
  });
}
```

Same fix for `updateInvoiceJournalEntry`.

---

## 🟠 Finding #9 — `bulkVoidInvoices` no credit reversal

### Verification

✅ **Confirmed.** In `bulkVoidInvoices` (`billing-invoices.ts:756-800`), the function updates invoice statuses to `void` and then calls `voidInvoiceJournalEntries` for each. There is **no call** to `reverseCreditApplication`. Any credit applied to these invoices is permanently lost.

### Fix

Before updating the status, loop through eligible invoices and call `reverseCreditApplication` for each (like `voidInvoice` does for single invoices).

---

## 🟠 Finding #10 — `applyCreditToInvoices` (bulk) no transaction/locks

### Verification

✅ **Confirmed.** The singular `applyCreditToInvoice` correctly uses `db.transaction()` with `for('update')` row locking. The **bulk** version `applyCreditToInvoices` does **not** — it processes allocations sequentially without any transaction or row-level locks, creating real race condition risks under concurrent use.

### Fix

Wrap the entire allocation processing loop in a `db.transaction()` and use `for('update')` on credit notes and invoices.

---

## 🟡 Finding #11 — `getAllInvoices` pagination total mismatch

### Verification

✅ **Confirmed.** In `getAllInvoices` (`packages/db/src/queries/billing.ts`):

The `countConditions` adds a filter `status NOT IN ('draft', 'void')` only when `!filters?.status`. But the main query (the `query` variable) does **not** have this filter — it returns all statuses. So when no status filter is applied:

- `total` = count of non-draft, non-void invoices
- `data` = all invoices including draft and void

### Fix

Remove the automatic `NOT IN ('draft', 'void')` from `countConditions`, or add it to the main query as well.

---

## 🟡 Finding #12 — Quote expiry never enforced server-side

### Verification

✅ **Confirmed.** `convertQuoteToInvoice` only checks `quote.status !== 'accepted'`. There is no check that the current date is before `quote.expiryDate`. An accepted-but-expired quote can be converted to a full invoice with no warning.

### Fix

Add an expiry check in `convertQuoteToInvoice`:

```ts
if (quote.expiryDate && new Date(quote.expiryDate) < new Date()) {
  return { error: 'This quotation has expired and cannot be converted.' };
}
```

---

## 🟡 Finding #13 — `writeOffInvoice` blocked on `partially_paid`

### Verification

✅ **Confirmed.** `writeOffInvoice` (`billing-invoices.ts:817`) checks:

```ts
if (invoice.status !== 'issued' && invoice.status !== 'overdue') {
  throw new Error('Only issued or overdue invoices can be written off.');
}
```

A `partially_paid` invoice that a client can't fully pay should be a legitimate write-off scenario. The outstanding balance check already handles the math.

### Fix

Add `'partially_paid'` to the allowed statuses:

```ts
if (!['issued', 'overdue', 'partially_paid'].includes(invoice.status)) {
```

---

## 🟡 Finding #14 — Cent-level rounding drift

### Verification

✅ **Confirmed as plausible.** The `calcTotals` helper re-computes line item subtotals from scratch, while the line item insert also computes individual line totals. Due to floating-point arithmetic on discounts/percentages, the sum of `lineTotal` values can drift from the header `subtotal` by ±R0.01.

### Fix

Standardize on a single computation path. Either:

1. Store per-line totals in an array and sum them rather than recomputing, or
2. Round all intermediate values to 2 decimal places using a `round2()` helper.

---

## Implementation Order

### Phase 1 — Critical (active data corruption)

1. **Finding #1** — Fix `markInvoicePaid` to insert `payment_allocations`
2. **Finding #2** — Block void on `partially_paid` and fix `voidInvoiceJournalEntries`
3. **Finding #3** — Fix `getClientStatement` to exclude synthetic credit income

All three are actively corrupting data on routine actions. Deploy these first.

### Phase 2 — High (data integrity, no active corruption)

4. **Finding #7** — Fix swallowed posting failures
5. **Finding #8** — Fix `updatePaymentJournalEntries` / `updateInvoiceJournalEntry` void+repost
6. **Finding #6** — Fix `updateQuotation` line item discounts
7. **Finding #9** — Fix `bulkVoidInvoices` to reverse credit applications
8. **Finding #10** — Add transaction+locks to `applyCreditToInvoices` (bulk)

### Phase 3 — High (guards and validation)

9. **Finding #4** — Add allocation sum check to `recordClientPayment`
10. **Finding #5** — Add client cross-check to `applyCreditToInvoices`

### Phase 4 — Medium (correctness and robustness)

11. **Finding #11** — Fix `getAllInvoices` pagination total
12. **Finding #12** — Enforce quote expiry in `convertQuoteToInvoice`
13. **Finding #13** — Allow write-off on `partially_paid`
14. **Finding #14** — Fix rounding drift

### Data Remediation (run after each phase)

- **After Phase 1 item 1:** Script to find missing `payment_allocations` for existing paid invoices
- **After Phase 1 item 2:** Script to find voided invoices with orphaned payment allocations and restore journal entries
- **After Phase 1 item 3:** Verify client statements are correct; may need to adjust when historical data was impacted

---

## Appendix — File Reference Map

| File                                              | Functions                                                                                                                     | Findings                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `apps/admin/src/app/actions/billing-invoices.ts`  | `markInvoicePaid`, `voidInvoice`, `bulkVoidInvoices`, `writeOffInvoice`, `issueInvoice`, `bulkIssueInvoices`, `updateInvoice` | #1, #2, #7, #9, #13, #14 |
| `apps/admin/src/app/actions/billing-payments.ts`  | `recordClientPayment`, `adjustClientPayment`, `updateClientPayment`, `getClientCreditBalance`, `getClientOutstandingInvoices` | #1, #4                   |
| `apps/admin/src/app/actions/billing-quotes.ts`    | `createQuotation`, `updateQuotation`, `convertQuoteToInvoice`                                                                 | #6, #12                  |
| `apps/admin/src/app/actions/credit-management.ts` | `applyCreditToInvoice`, `applyCreditToInvoices`, `reverseCreditApplication`, `createCreditNote`                               | #3, #5, #9, #10          |
| `apps/admin/src/lib/accounting/posting.ts`        | `voidInvoiceJournalEntries`, `updatePaymentJournalEntries`, `updateInvoiceJournalEntry`                                       | #2, #7, #8               |
| `packages/db/src/queries/billing.ts`              | `getClientStatement`, `getAllInvoices`, `getInvoiceById`                                                                      | #3, #11                  |

---

## Appendix — One-time Data Remediation Scripts

### Script 1: Fix missing `payment_allocations` from `markInvoicePaid`

```sql
-- Find paid invoices with incomeId but no matching payment_allocation
SELECT i.id, i.document_number, i.total, i.income_id
FROM invoices i
LEFT JOIN payment_allocations pa ON pa.income_id = i.income_id AND pa.invoice_id = i.id
WHERE i.status = 'paid'
  AND i.income_id IS NOT NULL
  AND pa.id IS NULL;

-- Fix: Insert missing payment_allocations
INSERT INTO payment_allocations (id, income_id, invoice_id, amount)
SELECT gen_random_uuid(), i.income_id, i.id, i.total
FROM invoices i
WHERE i.status = 'paid'
  AND i.income_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payment_allocations pa
    WHERE pa.income_id = i.income_id AND pa.invoice_id = i.id
  );
```

### Script 2: Find voided invoices with orphaned payment allocations

```sql
SELECT i.id, i.document_number, pa.income_id, pa.amount
FROM invoices i
JOIN payment_allocations pa ON pa.invoice_id = i.id
WHERE i.status = 'void'
  AND pa.income_id IS NOT NULL;
```

(Manual review needed for restoration — journal entries need to be re-posted, not just un-voided.)
