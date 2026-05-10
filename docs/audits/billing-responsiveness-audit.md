# Billing Documents — Responsiveness Audit

**Date:** 2026-05-10  
**Scope:** Quote, Invoice, and Statement document pages and shared billing components  
**Files audited:**
- `apps/admin/src/components/billing/document-preview.tsx`
- `apps/admin/src/components/billing/billing-line-items-table.tsx`
- `apps/admin/src/components/billing/billing-totals-block.tsx`
- `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx`
- `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`
- `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx`
- `apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`
- `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`

---

## Issues Found

### 1. `DocumentPreview` — Hard-coded A4 width

**File:** `components/billing/document-preview.tsx`  
**Severity:** Medium

The component root uses `w-[794px]` (A4 at 96dpi) with no responsive override. On screens narrower than ~850px the document overflows its container. The detail pages wrap it in `overflow-x-auto` which makes it scrollable, but this is not a great mobile experience — the user has to pan horizontally to read the document.

**Current behaviour:** Horizontal scroll on mobile via `overflow-x-auto` wrapper.  
**Suggested fix:** Add a `scale-down` CSS transform at small breakpoints, or wrap the shell in a `min-w-0 overflow-x-auto` container with a visible scroll hint. The fixed width should be preserved for print.

```tsx
// Example: scale the preview down on small screens
<div className="w-[794px] origin-top-left scale-[0.45] sm:scale-75 lg:scale-100 ...">
```

---

### 2. `DocumentPreview` — Statement 6-column table, no responsive strategy

**File:** `components/billing/document-preview.tsx`  
**Severity:** Medium

The statement transactions table renders 6 columns (Date, Reference, Description, Debit, Credit, Balance) inside the fixed 794px shell. Each column uses `px-4` padding. At the fixed width this is already tight, and there is no column hiding or stacking at any breakpoint.

**Suggested fix:** On print/small-shell widths, consider hiding the Reference column (it duplicates Description context) or collapsing Debit/Credit into a single signed Amount column.

---

### 3. Invoice detail page — Action buttons don't wrap

**File:** `app/(admin)/billing/invoices/[id]/page.tsx`  
**Severity:** Medium

The page header uses `flex items-center justify-between` with the action buttons in a `flex items-center gap-2` row. At medium viewport widths (768–1024px) — before the sidebar collapses — the Print, Send, Export PDF, and Edit buttons can overflow or be clipped against the title.

```tsx
// Current — no wrapping
<div className="flex items-center gap-2">
  <Button>Print</Button>
  <Button>Send</Button>
  <Button>Export PDF</Button>
  <Button>Edit</Button>
</div>
```

**Suggested fix:** Add `flex-wrap justify-end` to the button container.

```tsx
<div className="flex items-center gap-2 flex-wrap justify-end">
```

---

### 4. Quote detail page — Same action button overflow

**File:** `app/(admin)/billing/quotes/[id]/page.tsx`  
**Severity:** Medium

Identical issue to #3. The quote detail page header has the same `flex items-center gap-2` button row with no wrapping. The title row inside the header also lacks `flex-wrap` for the status badge on narrow widths.

**Suggested fix:** Same as #3 — add `flex-wrap justify-end` to the button container.

---

### 5. Statement page — Income records table has no overflow wrapper

**File:** `app/(admin)/billing/statements/[clientId]/page.tsx`  
**Severity:** High

The income records table at the bottom of the statement page is a raw `<table>` inside a `<CardContent className="p-0">` with no `overflow-x-auto` wrapper. On small screens this table will overflow the card boundary with no scroll affordance — content is clipped or causes page-level horizontal scroll.

```tsx
// Current — no overflow protection
<CardContent className="p-0">
  <table className="w-full text-sm">
    ...
  </table>
</CardContent>
```

**Suggested fix:** Wrap the table in an overflow container.

```tsx
<CardContent className="p-0 overflow-x-auto">
  <table className="w-full min-w-[480px] text-sm">
```

---

### 6. Invoice form — Sidebar missing `self-start`

**File:** `app/(admin)/billing/invoices/new/invoice-form-client.tsx`  
**Severity:** Low

The sticky sidebar in the invoice form is missing `self-start`, which the quote form (`quote-form-client.tsx`) correctly includes. Without it, the sidebar div stretches to the full column height on `lg` screens, and `lg:sticky` doesn't behave as expected because the sticky element fills the entire grid row.

```tsx
// Invoice form — missing self-start
<div className="flex flex-col gap-4 lg:sticky lg:top-16">

// Quote form — correct
<div className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
```

**Suggested fix:** Add `self-start` to the invoice form sidebar wrapper to match the quote form.

---

## Summary Table

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | `document-preview.tsx` | Fixed `w-[794px]` — no mobile-friendly fallback beyond `overflow-x-auto` | Medium |
| 2 | `document-preview.tsx` | Statement 6-column table has no responsive column strategy | Medium |
| 3 | `invoices/[id]/page.tsx` | Action button row doesn't wrap on medium screens | Medium |
| 4 | `quotes/[id]/page.tsx` | Action button row doesn't wrap on medium screens | Medium |
| 5 | `statements/[clientId]/page.tsx` | Income records table has no `overflow-x-auto` wrapper | **High** |
| 6 | `invoice-form-client.tsx` | Sidebar missing `self-start` (inconsistent with quote form) | Low |

---

## What's Working Well

- Two-column detail layout (`grid-cols-1` → `lg:grid-cols-3`) stacks correctly on all breakpoints.
- Form field grids use `sm:grid-cols-2` appropriately.
- Summary strip on the statement page uses `grid-cols-2 sm:grid-cols-5` — good.
- `DocumentPreview` wrapper divs on detail pages all include `overflow-x-auto` as a fallback.
- Quote form sidebar correctly uses `self-start` for sticky behaviour.
