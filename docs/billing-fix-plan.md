# Billing fix plan — due date defaults & aging report

**Scope:** PMG Control Center · `packages/db` + `apps/admin`  
**Date:** 19 May 2026  
**Priority:** High — affects all new quotes and invoices going forward

---

## Problem summary

1. `expiryDate` on quotations and `dueDate` on invoices are never auto-set. They are left `null` until manually edited, which means the aging report has nothing to calculate against and the statement shows blank due dates.
2. The aging report has a `120+` bucket that is not needed, and is missing a `1–14 days` bucket between Current and 15–30 days.

---

## Fix 1 — Auto-set expiry and due dates

### 1.1 Shared utility

Create a small date helper that every route can import. Add it to the shared package so both the admin and tracker apps can use it.

**File to create:** `packages/db/src/lib/date-utils.ts`

```ts
/**
 * Adds N calendar days to an ISO date string (YYYY-MM-DD)
 * and returns the result as an ISO date string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Returns today as an ISO date string (YYYY-MM-DD) */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}
```

Export it from `packages/db/src/index.ts`:

```ts
export { addDays, today } from './lib/date-utils';
```

---

### 1.2 Quote creation route

**File:** `apps/admin/src/app/api/billing/quotations/route.ts` (or the matching server action)

**Rule:** `expiryDate` = `quoteDate + 30` unless the user explicitly provided one.

Find the `db.insert(quotations)` call and apply this before the insert:

```ts
import { addDays } from '@pmg/db';

// Before insert:
const quoteDate = data.quoteDate ?? today();
const expiryDate = data.expiryDate ?? addDays(quoteDate, 30);

await db.insert(quotations).values({
  ...rest,
  quoteDate,
  expiryDate,   // ← always written, never null on a new quote
});
```

---

### 1.3 Invoice creation route (standalone)

**File:** `apps/admin/src/app/api/billing/invoices/route.ts` (or the matching server action)

**Rule:** `dueDate` = `invoiceDate + 7` unless the user explicitly provided one.

```ts
import { addDays } from '@pmg/db';

// Before insert:
const invoiceDate = data.invoiceDate ?? today();
const dueDate = data.dueDate ?? addDays(invoiceDate, 7);

await db.insert(invoices).values({
  ...rest,
  invoiceDate,
  dueDate,      // ← always written, never null on a new invoice
});
```

---

### 1.4 Quote → Invoice conversion route

**File:** `apps/admin/src/app/api/billing/quotations/[id]/convert/route.ts` (or the matching server action)

This is the most likely root cause. When converting, `dueDate` is probably not included in the insert at all. Add it:

```ts
import { addDays, today } from '@pmg/db';

const invoiceDate = today();
const dueDate = addDays(invoiceDate, 7);  // ← was missing

await db.insert(invoices).values({
  divisionId:     quote.divisionId,
  clientId:       quote.clientId,
  documentNumber: await getNextDocumentNumber(quote.divisionId, 'invoice', new Date().getFullYear()),
  status:         'draft',
  invoiceDate,
  dueDate,        // ← add this line
  quotationId:    quote.id,
  subtotal:       quote.subtotal,
  discountType:   quote.discountType,
  discountValue:  quote.discountValue,
  discountAmount: quote.discountAmount,
  vatEnabled:     quote.vatEnabled,
  vatAmount:      quote.vatAmount,
  total:          quote.total,
  notes:          quote.notes,
  terms:          quote.terms,
  createdBy:      session.user.id,
});
```

Also update the quote status to `converted` after the insert:

```ts
await db.update(quotations)
  .set({ status: 'converted', updatedAt: new Date() })
  .where(eq(quotations.id, quote.id));
```

---

### 1.5 Backfill existing null records (one-time SQL)

Run this directly against your Neon database via the Neon console or a migration script to fix historical records.

**Backfill quotations — set expiry to quoteDate + 30 where null:**

```sql
UPDATE quotations
SET expiry_date = quote_date + INTERVAL '30 days'
WHERE expiry_date IS NULL;
```

**Backfill invoices — set due date to invoiceDate + 7 where null:**

```sql
UPDATE invoices
SET due_date = invoice_date + INTERVAL '7 days'
WHERE due_date IS NULL;
```

Run these once. Verify row counts before committing.

---

## Fix 2 — Aging report buckets

### 2.1 Updated bucket definition

| Bucket key | Label | Rule |
|---|---|---|
| `current` | Current | `dueDate >= today` |
| `1_14` | 1–14 days | `1–14 days past due` |
| `15_30` | 15–30 days | `15–30 days past due` |
| `31_60` | 31–60 days | `31–60 days past due` |
| `61_90` | 61–90 days | `61–90 days past due` |
| `91_120` | 91–120 days | `91+ days past due` |

`120+` is removed. `1–14` is added between Current and 15–30.

---

### 2.2 Update the aging query

**File:** wherever your aging report query lives — likely `packages/db/src/queries/billing.ts` or a dedicated `apps/admin/src/app/api/billing/aging/route.ts`.

Replace the `CASE WHEN` bucket logic with:

```ts
export type AgingBucket = 'current' | '1_14' | '15_30' | '31_60' | '61_90' | '91_120';

export type AgingRow = {
  bucket: AgingBucket;
  label: string;
  total: number;
  count: number;
};
```

```ts
const result = await db.execute(sql`
  SELECT
    CASE
      WHEN due_date >= CURRENT_DATE                                    THEN 'current'
      WHEN CURRENT_DATE - due_date BETWEEN 1  AND 14                  THEN '1_14'
      WHEN CURRENT_DATE - due_date BETWEEN 15 AND 30                  THEN '15_30'
      WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60                  THEN '31_60'
      WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90                  THEN '61_90'
      ELSE '91_120'
    END                                                 AS bucket,
    COUNT(*)::int                                       AS count,
    COALESCE(SUM(total - COALESCE(amount_paid, 0)), 0)  AS total
  FROM invoices
  LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS amount_paid
    FROM income
    WHERE invoice_id IS NOT NULL
    GROUP BY invoice_id
  ) payments ON payments.invoice_id = invoices.id
  WHERE status IN ('issued', 'overdue')
    AND due_date IS NOT NULL
  GROUP BY bucket
`);
```

Map the result to the full 6-bucket output (fill missing buckets with zero):

```ts
const BUCKETS: AgingBucket[] = ['current', '1_14', '15_30', '31_60', '61_90', '91_120'];
const LABELS: Record<AgingBucket, string> = {
  current: 'Current',
  '1_14':  '1–14 days',
  '15_30': '15–30 days',
  '31_60': '31–60 days',
  '61_90': '61–90 days',
  '91_120':'91–120 days',
};

const map = Object.fromEntries(
  (result.rows as any[]).map(r => [r.bucket, { total: Number(r.total), count: Number(r.count) }])
);

const aging: AgingRow[] = BUCKETS.map(bucket => ({
  bucket,
  label: LABELS[bucket],
  total: map[bucket]?.total ?? 0,
  count: map[bucket]?.count ?? 0,
}));
```

---

### 2.3 Update the aging UI component

**File:** the aging table/card component in your admin app.

- Remove the `120+` column.
- Add the `1–14 days` column between Current and 15–30 days.
- Map `bucket` keys to column headers using `LABELS` above.
- Highlight buckets where `total > 0` and `bucket !== 'current'` in danger color.

---

### 2.4 Update the client statement aging grid

The statement preview (as shown) uses a 6-column grid. Update the column order and keys to match:

```ts
const STATEMENT_BUCKETS: AgingBucket[] = [
  'current', '1_14', '15_30', '31_60', '61_90', '91_120'
];
```

The `getClientStatement` query in `packages/db/src/queries/billing.ts` does not currently return aging breakdown per client. If you want per-client aging on the statement, add a sub-query there using the same `CASE WHEN` logic filtered to `invoices.client_id = ${clientId}`.

---

## Checklist

- [ ] Create `packages/db/src/lib/date-utils.ts`
- [ ] Export `addDays` and `today` from `packages/db/src/index.ts`
- [ ] Update quote create route — auto-set `expiryDate`
- [ ] Update invoice create route — auto-set `dueDate`
- [ ] Update quote → invoice convert route — add `dueDate`
- [ ] Run backfill SQL on Neon (quotations + invoices)
- [ ] Update aging query — replace `120+` with `1_14` bucket
- [ ] Update `AgingBucket` type and `LABELS` map
- [ ] Update aging report UI — 6 columns, new order
- [ ] Update client statement aging grid — match new bucket keys
- [ ] Smoke test: create a quote → convert → confirm `expiryDate` and `dueDate` are set
- [ ] Smoke test: age an invoice by updating `due_date` directly in Neon → confirm it lands in correct bucket
