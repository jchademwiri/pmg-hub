# PMG Control Center — Client Billing Workspace UI/UX Improvements
## Redesign Options for the Two-Column Document Browser

This document outlines design alternatives and options for improving the user interface and user experience of the **Client Billing Workspace** (specifically the split-pane layout on `/relationships/clients/[id]`). 

---

## The Core Problem
The current split-pane layout features a **Left Pane** (containing tabs for Invoices, Quotes, Payments, and Statements) and a **Right Pane** (which displays a live, full-page `DocumentPreview` of the selected document).

While functional, this approach introduces several UX challenges:
1. **Cramped Previews:** A simulated A4 paper document (like an invoice or statement) has a fixed-width hierarchy. Squeezing it into a 7-column desktop card leads to very small text or horizontal scrolling.
2. **Visual Clutter & Nested Scrolling:** The page has main scroll bars, the left pane has its own scroll, and the document preview has another. This "scroll-in-scroll" feel is clunky.
3. **Duplicate Visual Styles:** The paper-styled preview (white background with margins, organization headers, and footer notes) inside a dashboard card feels like an iframe rather than a native dashboard element.

---

## Redesign Options

Below are four modern design patterns to solve these issues, ranked by user experience quality and suitability.

---

### Option 1: Slide-Over Sheet / Drawer (Recommended ✨)

Instead of keeping the preview permanently on the page, the document list takes up the **full width of the screen**, allowing all columns (such as Division, Due Date, Sent Status, and Payments Allocated) to breathe. Clicking a row slides a beautiful drawer from the right side of the screen using a Radix/Shadcn `<Sheet>` component.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Quotations]  [Invoices]  [Payments]  [Statement]                      │
├────────────────────────────────────────────────────────────────────────┤
│ ☑  Invoice #  │ Date       │ Due Date   │ Total     │ Status   │ Sent  │
│ ──┼───────────┼────────────┼────────────┼───────────┼──────────┼───────│
│ ☑  INV-0001   │ 10 May '26 │ 24 May '26 │ R 5,000   │ Issued   │ Yes   │ ────┐
│ ☐  INV-0002   │ 12 May '26 │ 26 May '26 │ R 2,500   │ Paid     │ Yes   │     │
│ ☐  INV-0003   │ 15 May '26 │ 29 May '26 │ R 8,000   │ Draft    │ No    │     │ Taps Row
└────────────────────────────────────────────────────────────────────────┘     │
                                                                               ▼
┌───────────────────────────────────────────────────────────────┬──────────────┐
│ [Quotations]  [Invoices]  [Payments]  [Statement]             │  INV-0001    │
├───────────────────────────────────────────────────────────────│  [Print] [X] │
│ ☑  Invoice #  │ Date       │ Due Date   │ Total     │ Status  │ ──────────── │
│ ──┼───────────┼────────────┼────────────┼───────────┼─────────│  Issued      │
│ ☑  INV-0001   │ 10 May '26 │ 24 May '26 │ R 5,000   │ Issued  │  R 5,000.00  │
│ ☐  INV-0002   │ 12 May '26 │ 26 May '26 │ R 2,500   │ Paid    │  ─────────── │
│ ☐  INV-0003   │ 15 May '26 │ 29 May '26 │ R 8,000   │ Draft   │  [Preview]   │
└───────────────────────────────────────────────────────────────┴──────────────┘
                                                                ▲ Slide-Over Sheet
                                                                  (Width: 50% screen)
```

* **UX Flow:**
  1. User views the full-width, clean table.
  2. Clicking a row opens a right-side drawer covering 50% of the viewport (or 90% on mobile).
  3. The drawer displays action buttons (Download, Email, Issue, Void, Edit) in a sticky header, and renders the high-fidelity `DocumentPreview` inside a scrollable viewport.
* **Why it's better:**
  - **No layout squishing:** The drawer has plenty of width to display the document legibly.
  - **Context preservation:** The user never leaves the client page or loses their scroll position.
  - **Unified responsiveness:** Works beautifully on both mobile and desktop (drawer becomes full-screen on mobile).
* **Implementation:** Low to Moderate. Reuses existing `DocumentPreview` inside a standard Shadcn `<Sheet>` component.

---

### Option 2: High-Density Digital Summary Panel (Keep Split-Pane, Remove Paper Preview)

If we want to keep the two-column split pane, we should **remove the paper replica preview** (with margins, header logos, address blocks) and replace it with a **native dashboard summary card**.

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ LEFT — Document List                 │ RIGHT — Invoice Summary (Digital)    │
│                                      │                                      │
│ INV-0001   10 May    R 5,000   [x]   │ ┌──────────────────────────────────┐ │
│ INV-0002   12 May    R 2,500         │ │ INV-0001   [Issued]   [Send Email] │ │
│ INV-0003   15 May    R 8,000         │ │ Total: R 5,000.00  | Due: 24 May   │ │
│                                      │ │ ────────────────────────────────── │ │
│                                      │ │  Status History:                   │ │
│                                      │ │  ● Created: 10 May by Jacob        │ │
│                                      │ │  ● Emailed: 10 May to client       │ │
│                                      │ │                                    │ │
│                                      │ │  Line Items:                       │ │
│                                      │ │  - 1x Tender Prep ..... R 5,000.00 │ │
│                                      │ │                                    │ │
│                                      │ │  [View PDF / Print] [Edit] [Void]  │ │
│                                      │ └──────────────────────────────────┘ │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

* **UX Flow:**
  1. The Left Pane remains a document list.
  2. The Right Pane renders a clean digital card summarizing the document metadata, line items (in a standard table), status history (stepper), and action buttons.
  3. Includes a clear, primary button for "View/Print PDF" which opens the high-fidelity printout in a modal or a new tab.
* **Why it's better:**
  - **Visual fit:** It looks and feels like a software interface instead of a squeezed piece of paper.
  - **Steppers and Logs:** We can show audit histories (e.g. "Sent to client@email.com at 14:32") and payment allocation details which are difficult to fit on a standard invoice page.
  - **Cleaner aesthetics:** No nested scrolls or tiny text.
* **Implementation:** Moderate. Requires building a new summary card layout, but improves readability.

---

### Option 3: Expandable Accordion Rows (Inline Details)

Remove the right column entirely. The workspace becomes a single, clean table card. Clicking any invoice or quotation row expands it downwards (accordion style) to display quick details and buttons.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Quotations]  [Invoices]  [Payments]  [Statement]                      │
├────────────────────────────────────────────────────────────────────────┤
│ ▼  INV-0001   │ 10 May '26 │ 24 May '26 │ R 5,000   │ Issued   │ Yes   │
├────────────────────────────────────────────────────────────────────────┤
│   Line Items:                                                          │
│   - Tender Preparation Support (R 5,000.00)                            │
│                                                                        │
│   [Print PDF]  [Email Copy]  [Record Payment]  [Edit Invoice]  [Void]  │
├────────────────────────────────────────────────────────────────────────┤
│ ▶  INV-0002   │ 12 May '26 │ 26 May '26 │ R 2,500   │ Paid     │ Yes   │
│ ▶  INV-0003   │ 15 May '26 │ 29 May '26 │ R 8,000   │ Draft    │ No    │
└────────────────────────────────────────────────────────────────────────┘
```

* **UX Flow:**
  1. Clicking a table row triggers an accordion slide-down.
  2. The expanded area displays the invoice items, totals, and primary billing operations directly inline.
  3. Clicking "Print PDF" triggers an off-screen print preview or opens the PDF in a new tab.
* **Why it's better:**
  - **Highly compact:** Shows a lot of rows without taking up side space.
  - **Mobile first:** Perfect for phones and tablets.
  - **Reduced cognitive load:** The user focuses on one row's actions at a time.
* **Implementation:** Low. Uses standard Shadcn Table or Accordion components.

---

### Option 4: Full-Width List Workspace + Overlay Modals

The document list takes up the entire container. When you need to inspect a document, clicking it opens a full-screen or centered overlay dialog (`<Dialog>`) rendering the high-fidelity preview.

* **UX Flow:**
  1. Full-screen tables for invoices and quotes with search, filters, and batch actions.
  2. Clicking "Inspect" or the document row launches a standard lightbox/modal.
  3. The modal is large (Max-width: 5xl or 6xl), letting the invoice preview render in full scale with actions at the top.
* **Why it's better:**
  - **Clean division:** Separates navigation/management from reading/printing.
  - **Performance:** Previews are only rendered on-demand, speeding up initial page load.
* **Implementation:** Low. Simply move the existing preview card contents inside a Shadcn `<Dialog>`.

---

## Comparison Matrix

| Criteria | Option 1: Slide Drawer | Option 2: Digital Card | Option 3: Accordion | Option 4: Modals |
|---|---|---|---|---|
| **Readability** | ⭐⭐⭐⭐⭐ (Excellent) | ⭐⭐⭐⭐ (Good) | ⭐⭐⭐ (Fair) | ⭐⭐⭐⭐⭐ (Excellent) |
| **Mobile Experience**| ⭐⭐⭐⭐⭐ (Excellent) | ⭐⭐⭐ (Fair) | ⭐⭐⭐⭐⭐ (Excellent) | ⭐⭐⭐⭐ (Good) |
| **Workspace Space** | ⭐⭐⭐⭐⭐ (Full-width) | ⭐⭐⭐ (Half-width) | ⭐⭐⭐⭐⭐ (Full-width) | ⭐⭐⭐⭐⭐ (Full-width) |
| **Ease of Build** | ⭐⭐⭐⭐ (Quick) | ⭐⭐⭐ (Medium) | ⭐⭐⭐⭐ (Quick) | ⭐⭐⭐⭐⭐ (Very Quick) |
| **Visual "Wow" Factor**| ⭐⭐⭐⭐⭐ (Premium) | ⭐⭐⭐⭐ (Modern) | ⭐⭐⭐ (Standard) | ⭐⭐⭐⭐ (Standard) |

---

## Recommended Path: **Option 1 (Slide-Over Drawer)**

We recommend **Option 1 (Slide-Over Drawer)**. It delivers a premium, modern dashboard feel (like Stripe or HubSpot). 

### How it would look and behave:
1. The document tables (Invoices, Quotations, Payments) expand to fill the entire horizontal section. This makes room for important columns (e.g., *Division*, *Email Delivery Status*, *Balance*, *Created By*) that are currently hidden.
2. Clicking a row slides in a `<Sheet>` drawer from the right. The drawer header stays sticky at the top, housing actions like **Email**, **Print**, **Edit**, and **Void**.
3. Inside the drawer, the `DocumentPreview` renders in A4 layout, filling the scrollable drawer body. It's clean, legible, and doesn't squeeze any content.
4. Tapping outside the drawer or hitting `ESC` closes it instantly, leaving the user exactly where they were in the list.

---

## Next Steps

When you are ready to implement:
1. **To go with Option 1 (Drawer):** We will replace the right `<div className="lg:col-span-7">` in `client-billing-workspace.tsx` with a `<Sheet>` component, and change the left `<Card className="lg:col-span-5">` into a full-width container (`w-full`).
2. **To go with Option 2 (Digital Card):** We will create a `ClientDocumentSummary` component to show stats, status logs, and line items, using standard Tailwind styling rather than the paper layout.
3. **To go with Option 4 (Modal):** We will wrap the right-pane's contents in a Dialog trigger attached to clicking rows.

Let us know which direction feels best for your workflow!
