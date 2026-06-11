# Implementation Spec — Phase 1: Bug Fixes & Quick Wins
*PMG Hub | Client Detail Page Redesign*

---

## Overview

Phase 1 contains no layout changes. It fixes two confirmed bugs and adds two small visible improvements. All changes are isolated to existing files — no new files are created in this phase. Total estimated effort: 1–2 days.

---

## Constraints — Read Before Starting

- **Do not touch** `DocumentPreview`, `PaymentReceiptPreview`, `BillingStatusBadge`, or any component inside `/components/billing/`.
- **Do not touch** `page.tsx` — server data fetching is not in scope for any phase.
- **Do not touch** the off-screen PDF render container, `generateCombinedPDF`, or `handleBulkEmail` functions.
- **Do not touch** the `ClientFinancialDashboard` component — it will be moved in Phase 2, not modified.
- All changes must be TypeScript-valid with no `any` regressions introduced.
- Existing URL-driven state (`useSearchParams`, `router.push` for statement filters) must continue to work exactly as before.

---

## Change 1 — Fix Edit Form Redirect

**File:** `apps/admin/src/components/clients/client-edit-form.tsx`

**Problem:** After a successful save, the form navigates to `/relationships/clients` (the list), removing the user from the client detail page they were editing.

**Fix:** Replace the `router.push` call with `router.refresh()` so the page re-fetches its server data and stays on the current URL.

**Locate this block** (inside the `startTransition` callback in `handleSubmit`):
```typescript
const result = await updateAction(fd)
if (result.error) {
  setErrorMessage(result.error)
} else {
  router.push('/relationships/clients')
}
```

**Replace with:**
```typescript
const result = await updateAction(fd)
if (result.error) {
  setErrorMessage(result.error)
} else {
  router.refresh()
}
```

**Acceptance criteria:**
- Clicking "Save Changes" on a valid form stays on `/relationships/clients/[id]`.
- The page data visibly refreshes (client name / email updates are reflected without manual reload).
- Clicking "Save Changes" on an invalid form still shows the error message inline.

---

## Change 2 — Show Contact Info in Header

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

**Problem:** Client email and phone are not visible anywhere on the page without expanding the edit form. Every competitor shows this at the top of the client page.

**Locate the header panel block** — the `div` that contains the breadcrumb, client name, and active badge:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
  <div className="flex items-center gap-4">
    <Link
      href="/relationships/clients"
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      ← Back to Clients
    </Link>
    <h1 className="text-2xl font-bold tracking-tight">
      {client.businessName ?? client.name}
    </h1>
    <Badge variant={client.isActive ? 'default' : 'secondary'}>
      {client.isActive ? 'Active' : 'Disabled'}
    </Badge>
  </div>
  <Button ...>
```

**Replace the inner `<div className="flex items-center gap-4">` with:**
```tsx
<div className="flex flex-col gap-1">
  <div className="flex items-center gap-3">
    <Link
      href="/relationships/clients"
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      ← Back to Clients
    </Link>
    <h1 className="text-2xl font-bold tracking-tight">
      {client.businessName ?? client.name}
    </h1>
    <Badge variant={client.isActive ? 'default' : 'secondary'}>
      {client.isActive ? 'Active' : 'Disabled'}
    </Badge>
  </div>
  {(client.email || client.phone) && (
    <div className="flex items-center gap-4 pl-0 text-sm text-muted-foreground">
      {client.email && (
        <span className="flex items-center gap-1">
          <span className="text-xs">✉</span>
          {client.email}
        </span>
      )}
      {client.phone && (
        <span className="flex items-center gap-1">
          <span className="text-xs">📞</span>
          {client.phone}
        </span>
      )}
    </div>
  )}
</div>
```

**Notes:**
- The `client` prop is typed as `any` in the current workspace — access `.email` and `.phone` directly as strings (they may be `null`).
- The contact row only renders if at least one of email or phone is present.
- No icons library needed — using plain unicode characters to avoid import changes in this phase.

**Acceptance criteria:**
- Client email and phone appear on a second line below the client name in the header.
- If both email and phone are null/undefined, the second line does not render (no empty space).
- The layout does not break on mobile — the contact row wraps naturally.
- The "Edit Details" button remains top-right and is not displaced.

---

## Change 3 — Add Receipt # Column to Payments Table

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

**Problem:** The payments table shows Date, Invoice Number, and Amount but has no receipt reference visible. Users must click into a payment to find the receipt ID.

**Locate the Payments `TabsContent` block** — specifically the `<Table>` inside it. Find the `<TableHeader>`:
```tsx
<TableHeader>
  <TableRow>
    <TableHead>Date</TableHead>
    <TableHead>Invoice Number</TableHead>
    <TableHead className="text-right">Amount</TableHead>
  </TableRow>
</TableHeader>
```

**Replace with:**
```tsx
<TableHeader>
  <TableRow>
    <TableHead>Date</TableHead>
    <TableHead>Receipt #</TableHead>
    <TableHead>Invoice Number</TableHead>
    <TableHead className="text-right">Amount</TableHead>
  </TableRow>
</TableHeader>
```

**Find the `<TableBody>` rows** — each `<TableRow>` inside `{payments.data.map((entry: any) => (`:
```tsx
<TableCell className="tabular-nums">{fmtDate(entry.date)}</TableCell>
<TableCell className="font-semibold">{extractInvoiceNumber(entry.description)}</TableCell>
<TableCell className="text-right tabular-nums font-semibold text-emerald-500">
  +{formatZAR(Number(entry.amount))}
</TableCell>
```

**Replace with:**
```tsx
<TableCell className="tabular-nums">{fmtDate(entry.date)}</TableCell>
<TableCell className="font-mono text-xs text-muted-foreground">
  REC-{entry.id.slice(0, 8).toUpperCase()}
</TableCell>
<TableCell className="font-semibold">{extractInvoiceNumber(entry.description)}</TableCell>
<TableCell className="text-right tabular-nums font-semibold text-emerald-500">
  +{formatZAR(Number(entry.amount))}
</TableCell>
```

**Acceptance criteria:**
- Payments table has 4 columns: Date, Receipt #, Invoice Number, Amount.
- Receipt # is formatted as `REC-` followed by the first 8 characters of the ID in uppercase.
- Receipt # uses monospace font (`font-mono`) and muted colour to visually distinguish it as a reference code.
- Clicking a payment row still opens the preview dialog showing the receipt.

---

## Change 4 — Fix Statement Default Period Highlight

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

**Problem:** When the page loads with no URL params, the statement defaults to "current month" but no filter button appears highlighted/active.

**Locate this block** near the top of the component (after the `useSearchParams` calls):
```typescript
const statementPeriodParam = searchParams.get('monthPeriod');
const statementYearParam = searchParams.get('year');
```

**Immediately after those two lines, add:**
```typescript
// Derived effective period — used for filter button active state.
// If no URL params are set, the page defaults to 'current' month.
const effectivePeriod = statementPeriodParam ?? (!statementYearParam ? 'current' : null);
```

**Locate the Statement tab filter buttons** inside the Statement `TabsContent`. There are four period buttons. Each currently uses `statementPeriodParam` for its `variant` comparison:
```tsx
variant={statementPeriodParam === 'current' || (!statementPeriodParam && !statementYearParam) ? 'default' : 'outline'}
```
and
```tsx
variant={statementPeriodParam === 'previous' ? 'default' : 'outline'}
```
and
```tsx
variant={statementPeriodParam === 'past3' ? 'default' : 'outline'}
```
and
```tsx
variant={statementPeriodParam === 'past6' ? 'default' : 'outline'}
```

**Replace all four `variant` expressions** to use `effectivePeriod`:
```tsx
variant={effectivePeriod === 'current' ? 'default' : 'outline'}
variant={effectivePeriod === 'previous' ? 'default' : 'outline'}
variant={effectivePeriod === 'past3' ? 'default' : 'outline'}
variant={effectivePeriod === 'past6' ? 'default' : 'outline'}
```

The FY Select dropdown does not need changes — when a year param is present, `effectivePeriod` is null so no month button is highlighted, which is correct.

**Acceptance criteria:**
- On first load (no URL params), the "Current Month" button appears in its `default` (filled/active) variant.
- Clicking "Previous Month" highlights that button and de-highlights "Current Month".
- Clicking a FY year from the dropdown de-highlights all month period buttons.
- Navigating directly to `?year=2025` shows no highlighted month button.
- The `statementPeriodLabel` string used in the preview dialog title is unaffected.

---

## Summary Checklist

```
Phase 1 — Complete when all boxes are checked:

[ ] client-edit-form.tsx
    - router.push('/relationships/clients') replaced with router.refresh()
    - Saving valid form stays on client detail page
    - Error handling unchanged

[ ] client-billing-workspace.tsx — Header
    - Email displayed below client name (if present)
    - Phone displayed below client name (if present)
    - Neither renders if both are null
    - No layout regression on mobile

[ ] client-billing-workspace.tsx — Payments table
    - 4 columns: Date, Receipt #, Invoice Number, Amount
    - Receipt # = REC- + first 8 chars of entry.id uppercased
    - font-mono, text-muted-foreground styling
    - Clicking row still opens preview

[ ] client-billing-workspace.tsx — Statement period
    - effectivePeriod derived immediately after searchParams.get calls
    - All 4 month period buttons use effectivePeriod for variant
    - Current Month highlighted on first load (no params)
    - FY year selection clears all month highlights
```