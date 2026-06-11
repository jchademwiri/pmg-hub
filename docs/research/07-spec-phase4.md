# Implementation Spec — Phase 4: Interactive KPI Tiles
*PMG Hub | Client Detail Page Redesign*

> **Prerequisite:** Phase 3 must be complete before starting Phase 4.

---

## Overview

Phase 4 makes the 4 KPI metric tiles functional. Clicking a tile filters the invoice or quote list to show only the relevant documents. The filter applies to whichever document tab is active. Estimated effort: 1–2 days.

---

## Constraints — Read Before Starting

- Filter state only applies to the **Invoices** and **Quotes** tabs. Payments and Statement tabs are not filterable via the metric strip.
- When the user switches tabs, the filter resets to `'all'`.
- The filter is client-side only — no URL state change, no server refetch.
- The existing checkbox selection system must continue to work on filtered results.
- **Do not touch** the bulk PDF, bulk email, or bulk issue/void logic.
- **Do not touch** `ClientMetricStrip` props interface — `onFilterChange` and `activeFilter` are already wired from Phase 2. This phase implements the filtering logic in the workspace.

---

## Filter Behaviour Specification

| Tile clicked | Filter key | Invoices shown | Quotes shown |
|---|---|---|---|
| Total Invoiced | `'all'` | All non-void invoices | All non-void quotes |
| Total Paid | `'paid'` | `status === 'paid'` | `status === 'accepted' \|\| 'converted'` |
| Outstanding | `'outstanding'` | `status === 'issued' \|\| 'partially_paid'` | `status === 'sent'` |
| Overdue | `'overdue'` | `status === 'overdue'` | `status === 'declined'` (expired) |

**Payments tab:** Always shows all payments regardless of filter.
**Statement tab:** Unaffected.
**Analytics tab:** Unaffected.

---

## Change 1 — Derive Filtered Invoice and Quote Lists

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

**Add these derived lists** inside the component, after the `metricFilter` state declaration from Phase 2:

```typescript
// ── Filtered document lists (driven by metric strip tile selection) ────────
const filteredInvoices = (() => {
  switch (metricFilter) {
    case 'paid':
      return invoices.filter((inv) => inv.status === 'paid');
    case 'outstanding':
      return invoices.filter(
        (inv) => inv.status === 'issued' || inv.status === 'partially_paid'
      );
    case 'overdue':
      return invoices.filter((inv) => inv.status === 'overdue');
    case 'all':
    default:
      return invoices;
  }
})();

const filteredQuotes = (() => {
  switch (metricFilter) {
    case 'paid':
      return quotes.filter(
        (q) => q.status === 'accepted' || q.status === 'converted'
      );
    case 'outstanding':
      return quotes.filter((q) => q.status === 'sent');
    case 'overdue':
      return quotes.filter((q) => q.status === 'declined');
    case 'all':
    default:
      return quotes;
  }
})();
```

---

## Change 2 — Apply Filtered Lists to Invoices Tab

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

In the Invoices `TabsContent`, replace every reference to `invoices` in the table rendering with `filteredInvoices`.

**Locate:**
```tsx
{invoices.length === 0 ? (
  <p className="text-xs text-muted-foreground text-center py-8">No invoices for this client.</p>
) : (
  <Table className="text-xs">
    ...
    {invoices.map((inv) => (
```

**Replace with:**
```tsx
{filteredInvoices.length === 0 ? (
  <p className="text-xs text-muted-foreground text-center py-8">
    {metricFilter === 'all'
      ? 'No invoices for this client.'
      : `No ${metricFilter} invoices.`}
  </p>
) : (
  <Table className="text-xs">
    ...
    {filteredInvoices.map((inv) => (
```

**Also update the "select all" checkbox** in the invoice table header. It currently uses `invoices.length` for its checked state:
```tsx
checked={selectedInvoiceIds.size === invoices.length}
```
**Change to:**
```tsx
checked={filteredInvoices.length > 0 && selectedInvoiceIds.size === filteredInvoices.length}
```

**Update `handleSelectAllInvoices`** — it currently selects all `invoices`. Change to select only `filteredInvoices`:
```typescript
const handleSelectAllInvoices = (checked: boolean) => {
  if (checked) {
    setSelectedInvoiceIds(new Set(filteredInvoices.map((inv) => inv.id)));
  } else {
    setSelectedInvoiceIds(new Set());
  }
};
```

---

## Change 3 — Apply Filtered Lists to Quotes Tab

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

Apply the same pattern to the Quotes `TabsContent`.

**Replace `quotes.length === 0` with `filteredQuotes.length === 0`.**

**Replace `quotes.map((q) =>` with `filteredQuotes.map((q) =>`.**

**Update the "select all" checkbox:**
```tsx
checked={filteredQuotes.length > 0 && selectedQuoteIds.size === filteredQuotes.length}
```

**Update `handleSelectAllQuotes`:**
```typescript
const handleSelectAllQuotes = (checked: boolean) => {
  if (checked) {
    setSelectedQuoteIds(new Set(filteredQuotes.map((q) => q.id)));
  } else {
    setSelectedQuoteIds(new Set());
  }
};
```

---

## Change 4 — Reset Filter on Tab Switch

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

The filter should reset to `'all'` whenever the user switches tabs.

**Locate the `onValueChange` handler on `<Tabs>`** and add `setMetricFilter('all')` at the top of the handler before the tab-specific logic:

```typescript
onValueChange={(val) => {
  setMetricFilter('all');  // ← add this line
  setActiveTab(val);
  setSelectedInvoiceIds(new Set());
  setSelectedQuoteIds(new Set());
  // ... rest of existing logic unchanged ...
}}
```

---

## Change 5 — Add Filter Indicator Below Metric Strip

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

When a filter is active (not `'all'`), show a small dismissible indicator so users know the list is filtered.

**Add this block directly above the `<Tabs>` component**, after the quick action buttons:

```tsx
{metricFilter !== 'all' && (activeTab === 'invoices' || activeTab === 'quotes') && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-1.5 border border-muted-foreground/10 self-start">
    <span>
      Showing <span className="font-semibold text-foreground capitalize">{metricFilter}</span>{' '}
      {activeTab} only
    </span>
    <button
      onClick={() => setMetricFilter('all')}
      className="text-muted-foreground hover:text-foreground transition-colors ml-1 font-medium"
      aria-label="Clear filter"
    >
      ✕
    </button>
  </div>
)}
```

---

## Change 6 — Clear Selection on Filter Change

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

When the metric filter changes, any existing checkbox selection may refer to documents no longer in the filtered list. Clear it.

**Update the `setMetricFilter` call in `ClientMetricStrip`'s `onFilterChange` prop** by wrapping it:

```typescript
// Change the existing onFilterChange handler passed to ClientMetricStrip from:
onFilterChange={setMetricFilter}

// To an inline handler:
onFilterChange={(filter) => {
  setMetricFilter(filter);
  setSelectedInvoiceIds(new Set());
  setSelectedQuoteIds(new Set());
}}
```

---

## Summary Checklist

```
Phase 4 — Complete when all boxes are checked:

[x] client-billing-workspace.tsx — Filtered lists
    - filteredInvoices derived from metricFilter
    - filteredQuotes derived from metricFilter
    - 'all' returns full unfiltered list
    - 'paid' / 'outstanding' / 'overdue' return correct status subsets

[x] client-billing-workspace.tsx — Invoices tab
    - Table renders filteredInvoices (not invoices)
    - Empty state message reflects active filter
    - Select all checkbox uses filteredInvoices.length
    - handleSelectAllInvoices selects only filteredInvoices

[x] client-billing-workspace.tsx — Quotes tab
    - Table renders filteredQuotes (not quotes)
    - Empty state message reflects active filter
    - Select all checkbox uses filteredQuotes.length
    - handleSelectAllQuotes selects only filteredQuotes

[x] client-billing-workspace.tsx — Filter resets
    - metricFilter resets to 'all' on tab switch
    - Checkbox selections clear when filter changes

[x] client-billing-workspace.tsx — Filter indicator
    - Indicator shown when metricFilter !== 'all' and on invoices/quotes tab
    - Shows which filter is active ("Showing overdue invoices only")
    - ✕ button clears filter back to 'all'
    - Indicator not shown on payments, statement, or analytics tabs
```