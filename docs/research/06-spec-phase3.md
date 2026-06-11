# Implementation Spec — Phase 3: Interactive Preview
*PMG Hub | Client Detail Page Redesign*

> **Prerequisite:** Phase 2 must be complete before starting Phase 3.

---

## Overview

Phase 3 replaces the full-screen Dialog preview with a split-pane layout on desktop (≥ lg / 1024px). The document list occupies 40% of the width; the preview renders inline in the remaining 60%. On mobile the Dialog is kept but gains Prev/Next navigation. The Statement tab auto-renders its preview in the right pane without requiring a button click. Estimated effort: 2–3 days.

---

## Constraints — Read Before Starting

- **Do not change** `DocumentPreview`, `PaymentReceiptPreview`, `EmailDocumentDialog`, `EmailReceiptDialog`, `PrintButton`, or `ExportPdfButton` components.
- **Do not change** the bulk PDF generation or bulk email systems.
- The Dialog **must remain** for mobile (screens < 1024px / `lg` breakpoint) — do not remove it.
- The off-screen render container for PDF generation must remain — do not move or restructure it.
- URL-driven state must continue to work: navigating to `?tab=invoices&invoiceId=xxx` must still select the correct document and show it in the preview pane.
- The `isPreviewOpen` Dialog state is repurposed for mobile — keep the state variable.

---

## Architecture

The core change is wrapping the tab content in a two-column grid on `lg:` screens. The left column contains the existing `<Card>` with the document list. The right column is a new sticky preview panel that renders whatever document is currently `selectedDocId / selectedDocType`.

On mobile (< lg), the list occupies full width and the Dialog continues to open on row click exactly as before.

```
lg+ screens:
┌─────────────────────────────────────────────────────────┐
│  Tabs navigation bar (full width)                       │
├───────────────────────────────┬─────────────────────────┤
│  Card: Document list (40%)    │  Preview panel (60%)    │
│  ─────────────────────────    │  ─────────────────────  │
│  Table rows + checkboxes      │  Action bar             │
│                               │  DocumentPreview        │
│                               │  (scrollable)           │
└───────────────────────────────┴─────────────────────────┘

< lg screens:
┌─────────────────────────────────────────────────────────┐
│  Card: Document list (full width)                       │
│  → row click opens Dialog (existing behaviour)          │
└─────────────────────────────────────────────────────────┘
```

---

## Change 1 — Restructure the Tab Content Area

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

### 1a — Add `useRef` for scroll reset

Add to imports:
```typescript
import React, { useState, useEffect, useTransition, useRef } from 'react';
```

Add near other state declarations:
```typescript
const previewPanelRef = useRef<HTMLDivElement>(null);
```

### 1b — Replace the tab content wrapper

**Locate this block** (currently wraps the document list Card):
```tsx
{/* Tab content wrappers */}
<div className="w-full">
  {/* Left Pane (Document lists) */}
  <Card className="w-full shadow-sm border-muted-foreground/10 bg-card overflow-hidden">
    ...
  </Card>
</div>
```

**Replace the outer `<div className="w-full">` wrapper** with a two-column grid that activates at `lg`:

```tsx
{/* Split pane: list (left) + preview (right on lg+) */}
<div className="flex flex-col lg:flex-row gap-4 items-start">

  {/* Document list — 40% on lg+, full width on mobile */}
  <div className="w-full lg:w-[40%] shrink-0">
    <Card className="w-full shadow-sm border-muted-foreground/10 bg-card overflow-hidden">
      {/* ... existing CardHeader and CardContent unchanged ... */}
    </Card>
  </div>

  {/* Preview panel — 60% on lg+, hidden on mobile (uses Dialog instead) */}
  <div
    ref={previewPanelRef}
    className="hidden lg:flex lg:flex-col lg:w-[60%] sticky top-[3.25rem] max-h-[calc(100vh-4rem)] overflow-y-auto"
  >
    {/* Preview content — see Change 2 */}
  </div>

</div>
```

### 1c — Auto-scroll preview panel on selection change

Add a `useEffect` that scrolls the preview panel to the top whenever `selectedDocId` changes:
```typescript
useEffect(() => {
  if (previewPanelRef.current) {
    previewPanelRef.current.scrollTop = 0;
  }
}, [selectedDocId]);
```

---

## Change 2 — Build the Inline Preview Panel

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

This is the content of the `hidden lg:flex` preview div introduced in Change 1. It reuses all existing preview logic that was previously inside the Dialog.

```tsx
{/* ── Inline Preview Panel (lg+ only) ─────────────────────── */}
<Card className="shadow-sm border-muted-foreground/10 bg-card overflow-hidden">
  {/* Panel header with action buttons */}
  <div className="p-4 border-b flex flex-row items-center justify-between shrink-0">
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold">
        {selectedDocType === 'invoice' && activeInvoice?.documentNumber}
        {selectedDocType === 'quote' && activeQuote?.documentNumber}
        {selectedDocType === 'payment' && activePayment && `REC-${activePayment.id.slice(0, 8).toUpperCase()}`}
        {selectedDocType === 'statement' && 'Statement'}
        {!selectedDocId && selectedDocType !== 'statement' && 'No document selected'}
      </span>
      <span className="text-xs text-muted-foreground capitalize">
        {selectedDocType === 'statement' ? statementPeriodLabel : selectedDocType}
      </span>
    </div>

    {/* Action buttons — same as Dialog header */}
    <div className="flex items-center gap-2 print:hidden">
      {selectedDocType !== 'statement' && selectedDocId && (
        <>
          <PrintButton label="Print" documentTitle={documentTitle} />
          <ExportPdfButton fileName={documentTitle} />
        </>
      )}
      {selectedDocType === 'statement' && (
        <>
          <PrintButton
            label="Print"
            documentTitle={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`}
          />
          <ExportPdfButton
            fileName={`Statement-${client.businessName?.replace(/\s+/g, '-') ?? client.name.replace(/\s+/g, '-')}`}
          />
        </>
      )}
      {selectedDocType === 'invoice' && activeInvoice && (
        <>
          <EmailDocumentDialog
            documentId={activeInvoice.id}
            documentNumber={activeInvoice.documentNumber}
            documentType="invoice"
            defaultRecipientEmail={client.email ?? ''}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/billing/invoices/${activeInvoice.id}/edit`}>Edit</Link>
          </Button>
        </>
      )}
      {selectedDocType === 'quote' && activeQuote && (
        <>
          <EmailDocumentDialog
            documentId={activeQuote.id}
            documentNumber={activeQuote.documentNumber}
            documentType="quote"
            defaultRecipientEmail={client.email ?? ''}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/billing/quotes/${activeQuote.id}/edit`}>Edit</Link>
          </Button>
        </>
      )}
      {selectedDocType === 'payment' && activePayment && (
        <>
          <EmailReceiptDialog
            incomeId={activePayment.id}
            receiptNumber={`REC-${activePayment.id.slice(0, 8).toUpperCase()}`}
            defaultRecipientEmail={client.email ?? ''}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/billing/payments/${activePayment.id}`}>View Page</Link>
          </Button>
        </>
      )}
    </div>
  </div>

  {/* Document render area */}
  <div className="p-4 bg-muted/5">
    {selectedDocType === 'statement' ? (
      <DocumentPreview type="statement" {...statementPreviewProps} />
    ) : selectedDocId ? (
      <>
        {selectedDocType === 'invoice' && activeInvoice && (
          <DocumentPreview type="invoice" {...getInvoicePreviewProps(activeInvoice)} />
        )}
        {selectedDocType === 'quote' && activeQuote && (
          <DocumentPreview type="quote" {...getQuotePreviewProps(activeQuote)} />
        )}
        {selectedDocType === 'payment' && activePayment && (
          <PaymentReceiptPreview
            payment={activePayment}
            client={client}
            divSettings={divSettings}
          />
        )}
      </>
    ) : (
      <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
        <span className="text-sm text-muted-foreground">Select a document to preview</span>
      </div>
    )}
  </div>
</Card>
```

---

## Change 3 — Update Row Click Behaviour

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

On desktop, clicking a row should update `selectedDocId` and `selectedDocType` but NOT open the Dialog. On mobile, it should open the Dialog as before.

The cleanest approach is to conditionally call `setIsPreviewOpen` based on screen width. Use a custom hook or a simple window check. Since this is a client component, we can use a state variable that tracks whether we're on a large screen.

**Add this state** with the other state declarations:
```typescript
const [isLargeScreen, setIsLargeScreen] = useState(false);
```

**Add this effect** to track screen size:
```typescript
useEffect(() => {
  const mq = window.matchMedia('(min-width: 1024px)');
  setIsLargeScreen(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

**Update every `TableRow` `onClick` handler** in the Invoices, Quotes, and Payments tabs. Currently each looks like:
```tsx
onClick={() => {
  setSelectedDocId(inv.id);
  setSelectedDocType('invoice');
  setIsPreviewOpen(true);
}}
```

**Change to:**
```tsx
onClick={() => {
  setSelectedDocId(inv.id);
  setSelectedDocType('invoice');
  if (!isLargeScreen) setIsPreviewOpen(true);
}}
```

Apply the same pattern to the Quotes tab rows (`setSelectedDocType('quote')`) and Payments tab rows (`setSelectedDocType('payment')`).

**The Statement "Preview Statement PDF" button** should also respect this:
```tsx
onClick={() => {
  setSelectedDocType('statement');
  setSelectedDocId(null);
  if (!isLargeScreen) setIsPreviewOpen(true);
}}
```

---

## Change 4 — Statement Auto-Preview in Right Pane

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

When the user is on the Statement tab, the right pane should always show the statement — no button needed on desktop.

This is already handled by the inline preview panel in Change 2 because `selectedDocType === 'statement'` always renders `<DocumentPreview type="statement" .../>`. The only required change is to ensure `selectedDocType` is set to `'statement'` when the Statement tab is active.

**In the `onValueChange` handler on `<Tabs>`**, the existing `else if (val === 'statement')` block already does:
```typescript
} else if (val === 'statement') {
  setActiveTab('statement');
  setSelectedDocType('statement');
  setSelectedDocId(null);
}
```

This is correct — no changes needed.

**Remove the "Preview Statement PDF" button from the Statement tab filter panel** on desktop (keep it for mobile). Wrap it in a conditional:
```tsx
{!isLargeScreen && (
  <div className="flex items-end mt-4 md:mt-0">
    <Button
      variant="default"
      size="sm"
      className="flex items-center gap-1.5 shadow-sm h-8"
      onClick={() => setIsPreviewOpen(true)}
    >
      <Eye className="size-4" /> Preview Statement PDF
    </Button>
  </div>
)}
```

---

## Change 5 — Add Prev/Next Navigation to Mobile Dialog

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

On mobile, add Prev/Next navigation to the Dialog so users can step through documents without closing and reopening.

**Add a computed list** of navigable document IDs based on the active tab:
```typescript
const navigableIds = (() => {
  if (selectedDocType === 'invoice') return invoices.map(i => i.id);
  if (selectedDocType === 'quote') return quotes.map(q => q.id);
  if (selectedDocType === 'payment') return (payments?.data ?? []).map((p: any) => p.id);
  return [];
})();
const currentNavIndex = selectedDocId ? navigableIds.indexOf(selectedDocId) : -1;
```

**In the Dialog footer area** (add inside `DialogContent` after the preview render area, before the closing tag):
```tsx
{navigableIds.length > 1 && currentNavIndex >= 0 && (
  <div className="flex items-center justify-between pt-3 border-t mt-2">
    <Button
      variant="ghost"
      size="sm"
      disabled={currentNavIndex === 0}
      onClick={() => {
        const prevId = navigableIds[currentNavIndex - 1];
        if (prevId) setSelectedDocId(prevId);
      }}
    >
      ← Previous
    </Button>
    <span className="text-xs text-muted-foreground">
      {currentNavIndex + 1} of {navigableIds.length}
    </span>
    <Button
      variant="ghost"
      size="sm"
      disabled={currentNavIndex === navigableIds.length - 1}
      onClick={() => {
        const nextId = navigableIds[currentNavIndex + 1];
        if (nextId) setSelectedDocId(nextId);
      }}
    >
      Next →
    </Button>
  </div>
)}
```

---

## Summary Checklist

```
Phase 3 — Complete when all boxes are checked:

[x] client-billing-workspace.tsx — Layout
    - Two-column flex layout: list (40%) + preview panel (60%) at lg+
    - Mobile: list full width, Dialog unchanged
    - Preview panel is sticky and scrollable
    - previewPanelRef scrolls to top on selectedDocId change

[x] client-billing-workspace.tsx — Inline preview panel
    - Panel header shows document number + type
    - All action buttons (Print, PDF, Email, Edit) present
    - DocumentPreview renders inline for invoice/quote/statement
    - PaymentReceiptPreview renders inline for payments
    - Empty state shows "Select a document to preview"

[x] client-billing-workspace.tsx — Row click behaviour
    - isLargeScreen state tracks window.matchMedia('(min-width: 1024px)')
    - On lg+ screens, row click updates selection only (no dialog)
    - On < lg screens, row click still opens Dialog
    - Invoices, Quotes, and Payments rows all updated

[x] client-billing-workspace.tsx — Statement
    - Statement tab auto-shows in right pane on desktop (no button needed)
    - "Preview Statement PDF" button hidden on lg+ screens
    - Period filter changes update the right pane immediately

[x] client-billing-workspace.tsx — Mobile Dialog
    - Prev/Next buttons in Dialog footer
    - Correct document count label (N of M)
    - Prev disabled at index 0, Next disabled at last index
    - Works for invoices, quotes, and payments
```