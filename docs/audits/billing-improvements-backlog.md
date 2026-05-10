# Billing — Improvements Backlog

**Date:** 2026-05-10  
**Status:** Pending implementation

---

## Financial Year Convention

> **Important:** The financial cycle runs from **1 March → 28/29 February**.
>
> Any feature that references "year to date", year filters, period defaults, or date range calculations must use this convention — not the calendar year (Jan–Dec).
>
> Examples of affected areas:
> - Statement period defaults (`periodFrom`, `periodTo`)
> - Statement year filter links (currently shows calendar years)
> - `getAllIncome` and `getClientStatement` year filters
> - Dashboard KPIs and any "current year" aggregations
> - The period lock warning on the invoice form (`minDate`)
> - Snapshot/report period labels

---

## Quick Wins

### 1. Statement `incomeResult` not filtered by year
**File:** `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`

`getAllIncome({ clientId })` fetches all-time payments regardless of the selected year filter. Invoices are correctly filtered by year via `getClientStatement`, but the income/payment rows in the transaction list and the Income Records table at the bottom include payments from all years. When switching to a prior year, payments from other years bleed in.

**Fix:** Pass the year filter to `getAllIncome` as well, using the financial year date range (1 Mar → 28 Feb).

---

### 2. Statement status is hardcoded `'Current'`
**File:** `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`

The `status` prop passed to `DocumentPreview` is always `'Current'`. It should reflect the actual account state:
- `'Paid'` — balance is zero, all invoices settled
- `'Outstanding'` — balance > 0, no overdue invoices
- `'Overdue'` — one or more issued invoices past their due date

---

### 3. Invoice sidebar missing `self-start`
**File:** `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx`

The sticky sidebar wrapper is missing `self-start`. The quote detail page has it correctly. Without it, `lg:sticky` doesn't behave as expected because the element stretches to full column height.

```tsx
// Fix: add self-start
<div className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
```

---

### 4. Action buttons don't wrap on medium screens
**Files:**
- `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx`
- `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx`

The header button row (Print, Send, Export PDF, Edit) uses `flex items-center gap-2` with no wrapping. Between `md` and `lg` breakpoints the buttons can overflow or be clipped against the document title.

```tsx
// Fix: add flex-wrap justify-end
<div className="flex items-center gap-2 flex-wrap justify-end">
```

---

### 5. Income records table missing `overflow-x-auto`
**File:** `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`

The raw `<table>` at the bottom of the statement page has no scroll wrapper. On smaller screens it overflows the card boundary with no scroll affordance.

```tsx
// Fix:
<CardContent className="p-0 overflow-x-auto">
  <table className="w-full min-w-[480px] text-sm">
```

---

## Medium Effort

### 6. Statement org info missing on document
**File:** `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`

The statement passes `org: { name: 'PMG' }` with no address, email, phone, or logo. Invoice and quote pages call `getDivisionBillingSettings` to populate this. A client receiving a statement has no contact details to reach the business.

**Fix:** Call `getDivisionBillingSettings` on the statement page and pass the full org info to `DocumentPreview`, same as invoices/quotes do.

---

### 7. Per-row running balance is unreliable
**File:** `apps/admin/src/components/billing/document-preview.tsx`

The Balance column on each statement row is computed from the running balance array, which is then reversed for display (newest first). When payments predate their invoices, the per-row balance shows negative mid-statement before recovering. The summary totals (Total Invoiced / Total Paid / Balance Due) are now correct, but the individual row balance column can still look confusing.

**Options:**
- Hide the Balance column entirely and rely on the summary block
- Recompute balances from the ASC-sorted data and attach them before reversing (already done for the summary — just needs to be preserved per-row)

---

### 8. Empty state when no transactions exist
**File:** `apps/admin/src/components/billing/document-preview.tsx`

When `transactions.length === 0` the statement table is silently hidden with no message. A client with no invoices in the selected period sees a blank document body.

**Fix:** Add an empty state message inside the statement section:
```tsx
{transactions.length === 0 && (
  <p className="text-sm text-zinc-400 py-6 text-center">
    No transactions for this period.
  </p>
)}
```

---

## Larger Items

### 9. Print / Export PDF are disabled
**Files:**
- `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx`
- `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx`
- `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`

All three document pages have Print and Export PDF buttons that are permanently disabled with "Coming soon". The `DocumentPreview` component already has `print:shadow-none print:ring-0` styles applied, so `window.print()` would work immediately as a baseline.

**Suggested approach:**
1. Wire Print button to `window.print()` — works today with no backend changes
2. Export PDF via a headless browser (Puppeteer/Playwright) or a service like `@react-pdf/renderer` as a follow-up

---

### 10. Statement year filter only shows 3 years
**File:** `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`

The year filter links are hardcoded to the current year and two prior years. Clients with older history can't access it from the UI.

**Fix:** Derive the available years from the actual invoice/income data — find the earliest transaction date and generate year options from there. Also needs to use financial year labels (e.g. "2025/26") rather than calendar years once the financial year convention is applied.

---

## Summary Table

| # | Area | Description | Effort |
|---|------|-------------|--------|
| 1 | Statement | Income not filtered by year | Quick |
| 2 | Statement | Status hardcoded to 'Current' | Quick |
| 3 | Invoice detail | Sidebar missing `self-start` | Quick |
| 4 | Invoice + Quote detail | Action buttons don't wrap | Quick |
| 5 | Statement | Income table missing overflow wrapper | Quick |
| 6 | Statement | Org info not passed to document | Medium |
| 7 | Statement | Per-row balance unreliable when payments predate invoices | Medium |
| 8 | Statement | No empty state when no transactions | Medium |
| 9 | All documents | Print / Export PDF disabled | Large |
| 10 | Statement | Year filter limited to 3 years | Large |
