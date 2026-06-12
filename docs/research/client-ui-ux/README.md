# Client Detail Page Research — Index
*PMG Hub Admin | June 2026*

---

## Purpose

Research and recommendations for redesigning the PMG Hub client detail page (`/relationships/clients/[id]`). Goal: a simplified page that answers critical billing questions immediately, while retaining all existing differentiators (bulk PDF, bulk email, health scoring, inline preview).

---

## Documents

| File | Description |
|---|---|
| `01-industry-research.md` | How Xero, QuickBooks, FreshBooks, Zoho, Wave, Stripe, Harvest, Invoice Ninja, and HubSpot design their client pages — layout patterns, information hierarchy, feature matrix |
| `02-current-state-analysis.md` | Full audit of the current PMG Hub implementation — component structure, strengths, bugs, friction points, performance notes |
| `03-recommendations.md` | Redesign recommendations — proposed layout, wireframe, bug fixes, phased plan, competitive positioning |

---

## Key Findings (TL;DR)

### What the industry does
- **Financial summary always above the fold** — Every leading platform (Xero, QBO, FreshBooks, Zoho, Stripe) shows outstanding balance, overdue, and paid at the very top, before any transaction lists.
- **KPI tiles that also act as filters** — QuickBooks' "Money Bar" lets users click a summary tile (e.g., "Overdue") to filter the transaction list below. Summary numbers should be interactive, not decorative.
- **Slide-over drawers for document preview** — Stripe and FreshBooks use right-side drawers so users never lose list context. Full-screen modals feel heavier and break context.
- **Contact info always visible** — Every competitor shows email and phone without requiring the user to open an edit form.
- **Progressive disclosure for analytics** — Advanced data (ageing, health, history) is available but behind a tab or accordion, not blocking the primary workflow.

### What's wrong with our current page
1. The full financial dashboard always renders, pushing the document browser below the fold.
2. The edit form redirects to `/relationships/clients` (list page) after saving — clear bug.
3. Client email and phone are not visible without expanding the edit form.
4. KPI tiles are static — they display numbers but don't filter anything.
5. The preview Dialog blacks out the page, losing list context.
6. The statement requires 3 interactions to preview; industry standard is 1–2.
7. No receipt number column in the payments table.
8. Statement default period is not visually highlighted.

### What we should do
1. **Phase 1 (immediate):** Fix edit form redirect; show contact info in header; add receipt # column; fix statement period highlight.
2. **Phase 2:** Compact metric strip above tabs; full analytics moved to "Analytics" tab; action buttons elevated.
3. **Phase 3:** Split-pane preview on desktop (list + preview side by side); keep Dialog for mobile.
4. **Phase 4:** Clickable KPI tiles that filter the list; statement auto-preview.

### What NOT to change
- Bulk PDF generation and bulk email dispatch — unique; no competitor has this. Keep them.
- Client health score — genuine differentiator. Move to Analytics tab, don't remove.
- URL-driven state (deep links) — well-implemented, preserve it.
- Off-screen canvas PDF system, `DocumentPreview`, `BillingStatusBadge` — all solid.

---

## Priority Order

```
🔴 P0 — Fix Now
  1. Edit form redirect bug (client-edit-form.tsx)
  2. Show contact info (email/phone) in header
  3. Statement default period visual highlight
  4. Receipt # column in payments table

🟡 P1 — Next Sprint
  5. Compact metric strip above tabs
  6. Move ClientFinancialDashboard to "Analytics" tab
  7. Elevate action buttons above fold
  8. Split-pane preview on desktop (Sheet drawer or improved Dialog)
  9. Statement auto-preview in right pane
  10. Clickable KPI tiles → filter active tab list

🟢 P2 — Later Polish
  11. "Days Overdue" column in invoices table with colour coding
  12. Show top 3 activity events by default (not fully collapsed)
  13. Prev/next navigation in mobile preview dialog
  14. Responsive card view for tables on small screens
  15. Bulk selection discovery hint text
  16. Keyboard shortcuts (j/k navigation)
  17. Empty state copy improvements per tab
```
