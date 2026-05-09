# PMG Control Center — App Audit Report (Updated)
**Date:** May 2026 — Revision 2  
**Scope:** Full application — usability, code quality, consistency, gaps, quick wins  
**Previous fixes applied:** Income dead props ✅ · Document date formatting ✅ · BETTER_AUTH_URL ✅

---

## Executive Summary

The app is production-ready. All core billing, finance, relationships, and insights modules are functional. This revision reflects the current state after all Phase 0–7 work and the three quick wins from Revision 1. The overall score has improved from 7.8 to **8.2/10**.

---

## ⚡ Quick Wins (< 30 min each)

These can be applied immediately with minimal risk.

### QW-1 — Delete `src/lib/mock/billing.ts`
**Effort:** 2 min  
**Issue:** The file `apps/admin/src/lib/mock/billing.ts` still exists with a `TODO: remove this file` comment. It's no longer imported anywhere in production code — only in test files.  
**Fix:** Delete the file. Update any test imports to use inline fixtures instead.

### QW-2 — Remove stale `EXTRA_LABELS` from `nav-data.ts`
**Effort:** 5 min  
**Issue:** `EXTRA_LABELS` contains `/finance/income/new`, `/finance/expenses/new`, `/relationships/clients/new`, `/relationships/leads/new`, `/relationships/divisions/new` — none of these routes exist as pages (they use inline forms). These labels are dead.  
**Fix:** Remove the 5 stale entries. Keep only `/settings/users/invite`.

### QW-3 — Add page header to Snapshots page
**Effort:** 10 min  
**Issue:** `/insights/snapshots` renders a bare table with no title, description, or context. New users won't understand what they're looking at.  
**Fix:** Add a standard page header:
```tsx
<div>
  <h2 className="text-lg font-semibold">Closed Months</h2>
  <p className="text-sm text-muted-foreground">
    Monthly financial snapshots. Use the Close Month button on the dashboard to lock a period.
  </p>
</div>
```

### QW-4 — Remove `MoreHorizontal` ghost buttons on quote/invoice detail
**Effort:** 5 min  
**Issue:** Both quote and invoice detail pages have a disabled `MoreHorizontal` ghost button that does nothing and has no tooltip. It creates visual noise and user confusion.  
**Fix:** Remove the `<Button variant="ghost" size="sm" disabled><MoreHorizontal /></Button>` from both detail pages.

### QW-5 — Fix `getAllQuotations()` double call on quotes list
**Effort:** 15 min  
**Issue:** `/billing/quotes/page.tsx` calls `getAllQuotations({ divisionId, status }, pagination)` for the table AND `getAllQuotations()` (unfiltered) for stats. Two full table scans per page load.  
**Fix:** Fetch stats from the filtered result + a single aggregation query, or compute stats from `allResult.data` which is already loaded.

### QW-6 — Fix `getAllInvoices()` double call on invoices list
**Effort:** 15 min  
**Issue:** Same pattern as QW-5 on `/billing/invoices/page.tsx`.  
**Fix:** Same approach — single query with aggregation for stats.

### QW-7 — Add `aria-label` to VAT toggle buttons
**Effort:** 10 min  
**Issue:** The custom VAT toggle `<button>` on quote/invoice forms has `role="switch"` and `aria-checked` but no `aria-label`. Screen readers will announce it as an unlabelled switch.  
**Fix:** Add `aria-label="Toggle VAT (15%)"` to both form VAT toggle buttons.

### QW-8 — Format dates on income/expense tables
**Effort:** 15 min  
**Issue:** Income and expense tables show dates as `2026-05-08`. The document preview was fixed but the finance tables still use raw ISO format.  
**Fix:** Apply the same `fmtDate()` helper (or `toLocaleDateString`) to date columns in `IncomeTable` and `ExpenseTable`.

### QW-9 — Add `title` attribute to disabled Print/Send/Export PDF buttons
**Effort:** 10 min  
**Issue:** Print, Send, and Export PDF buttons are disabled with no tooltip explaining why. Users don't know if it's a permission issue or a missing feature.  
**Fix:** Add `title="Coming soon"` to each disabled shell button on quote, invoice, and statement detail pages.

### QW-10 — Remove `Convert to Invoice` header button on quote detail (duplicate)
**Effort:** 5 min  
**Issue:** The quote detail page has a "Convert to Invoice" button in the header AND the same action in the sidebar action bar. The header one is always disabled (it doesn't call the real action). The sidebar one is the real one.  
**Fix:** Remove the duplicate header button. The sidebar action bar is the correct location.

---

## 🟡 Medium Priority (1–4 hours each)

### M-1 — Overdue invoice auto-flagging
**Issue:** Invoices past their due date still show `status = 'issued'` in the DB. The overdue banner on the detail page checks the date client-side only.  
**Impact:** The invoices list "Overdue" stat card always shows 0. Clients on statements don't see overdue status.  
**Fix:** In `getAllInvoices` and `getInvoiceById`, add a computed `effectiveStatus` field:
```ts
status: sql<string>`
  CASE 
    WHEN ${invoices.status} = 'issued' AND ${invoices.dueDate} < CURRENT_DATE 
    THEN 'overdue' 
    ELSE ${invoices.status} 
  END
`
```
This avoids a DB write and keeps the source of truth clean.

### M-2 — Search on Clients, Invoices, Quotes
**Issue:** No free-text search on any list page. Finding a specific record requires knowing the exact filter value.  
**Fix:** Add a search input to the filter bar. Use `ILIKE '%query%'` on name/document number. Clients and Invoices are the highest priority.

### M-3 — Mark Paid from invoice list dropdown
**Issue:** Marking an invoice paid requires opening the detail page. For batch processing, this is slow.  
**Fix:** Add "Mark Paid" to the row dropdown for `issued` and `overdue` invoices (same pattern as "Issue Invoice" already in the dropdown).

### M-4 — Client detail → New Invoice shortcut
**Issue:** The client detail page shows income history but has no quick link to create an invoice for that client.  
**Fix:** Add a "New Invoice" button that links to `/billing/invoices/new?clientId={id}` and pre-fills the client field.

### M-5 — Unsaved changes warning on settings forms
**Issue:** Editing settings and navigating away silently discards changes.  
**Fix:** Track `isDirty` state and show a browser `beforeunload` warning or an in-page amber banner.

### M-6 — Statement list — year filter
**Issue:** The statements list shows all-time totals with no period filter.  
**Fix:** Add a year filter dropdown (same pattern as the statement detail page).

---

## 🔴 Functional Gaps (v2 backlog)

| Gap | Status | Notes |
|---|---|---|
| PDF generation | Shell button exists | Needs `@react-pdf/renderer` or `window.print()` |
| Email delivery | Shell button exists | Resend already a dependency |
| Security settings | "Soon" badge | Session list is the minimum viable feature |
| Data & Exports settings | "Soon" badge | Wire up existing `exportFinancialsCsv` action |
| Locked accounts config | TODO comment in code | `LOCKED_ACCOUNTS` is hardcoded — should be DB-driven |
| Notification settings | Not started | Low priority until email delivery is live |

---

## ✅ What's Working Well

| Area | Status |
|---|---|
| All billing flows (quote → invoice → paid → statement) | ✅ Complete |
| Document preview (A4, formatted dates, banking, notes) | ✅ Complete |
| Division-specific billing settings | ✅ Complete |
| Organisation settings | ✅ Complete |
| Period lock on all financial mutations | ✅ Complete |
| Auth + role-based access | ✅ Complete |
| Group-scoped 404 pages with back button | ✅ Complete |
| Route grouping (Finance/Billing/Relationships/Insights/System) | ✅ Complete |
| Backward-compatible redirects for old URLs | ✅ Complete |
| Zero TypeScript errors | ✅ Clean build |
| No mock data in production pages | ✅ Clean |
| All server actions guarded with `getSessionOrRedirect()` | ✅ Complete |
| Zod validation on all mutations | ✅ Complete |

---

## 📊 Scores

| Area | Rev 1 | Rev 2 | Change |
|---|---|---|---|
| Functionality | 9/10 | 9/10 | → |
| Usability | 7/10 | 7.5/10 | ↑ (date formatting fixed) |
| Code Quality | 9/10 | 9/10 | → |
| Performance | 7/10 | 7.5/10 | ↑ (income dead props removed) |
| Security | 9/10 | 9.5/10 | ↑ (BETTER_AUTH_URL set) |
| Accessibility | 6/10 | 6/10 | → (QW-7 pending) |
| **Overall** | **7.8/10** | **8.2/10** | **↑** |

---

## 🎯 Recommended Next Actions

**Do now (< 1 hour total):**
1. QW-1 — Delete `mock/billing.ts`
2. QW-2 — Clean up `EXTRA_LABELS`
3. QW-3 — Add Snapshots page header
4. QW-4 — Remove duplicate MoreHorizontal buttons
5. QW-9 — Add `title="Coming soon"` to disabled buttons
6. QW-10 — Remove duplicate Convert to Invoice header button

**Do this week:**
7. QW-5 + QW-6 — Fix double query on list pages
8. QW-8 — Format dates in finance tables
9. M-1 — Overdue invoice auto-flagging (computed in query, no DB write)
10. M-3 — Mark Paid from invoice list

---

*Updated: May 2026 — PMG Control Center Audit Revision 2*
