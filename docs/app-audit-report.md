# PMG Control Center — App Audit Report
**Date:** May 2026  
**Scope:** Full application — usability, code quality, consistency, gaps, and recommendations

---

## Executive Summary

The app is in a solid, production-ready state. All core modules are functional, the codebase is consistent, and there are no critical bugs or security gaps. The audit identified **12 usability improvements**, **6 functional gaps**, **4 consistency issues**, and **3 performance observations** — none of which are blockers, but all are worth addressing in the next iteration.

---

## 1. Usability

### 1.1 No search on list pages
**Affected:** Clients, Leads, Invoices, Quotes, Items, Income, Expenses  
**Issue:** All list pages use filter dropdowns but have no free-text search. Finding a specific client or invoice requires knowing the exact filter value.  
**Recommendation:** Add a search input to the filter bar on Clients, Invoices, Quotes, and Items pages. A simple `ILIKE` query on name/document number is sufficient.

### 1.2 No bulk actions
**Affected:** Invoices, Quotes, Items  
**Issue:** Actions (void, delete, archive) must be done one at a time.  
**Recommendation:** Add checkbox selection + bulk action dropdown for common operations. Low priority but high value for power users.

### 1.3 Statements page — no date range filter
**Affected:** `/billing/statements`  
**Issue:** The statements list shows all-time totals. There's no way to filter by period from the list view.  
**Recommendation:** Add a year filter to the statements list (same pattern as the detail page).

### 1.4 Income page — no "New Invoice" shortcut from client detail
**Affected:** `/relationships/clients/[id]`  
**Issue:** The client detail page shows income history but has no quick link to create an invoice for that client.  
**Recommendation:** Add a "New Invoice" button on the client detail page that pre-fills the client field.

### 1.5 Snapshots page — no page header or description
**Affected:** `/insights/snapshots`  
**Issue:** The page renders a bare table with no heading, description, or context. New users won't understand what a "snapshot" is.  
**Recommendation:** Add a page header with title "Closed Months" and a description explaining what snapshots are and how to create them.

### 1.6 Invoices list — no "Mark As Paid" from the list
**Affected:** `/billing/invoices`  
**Issue:** To mark an invoice paid, you must open the detail page. For users processing multiple payments, this is slow.  
**Recommendation:** Add "Mark As Paid" to the row dropdown for `issued` and `overdue` invoices (same pattern as "Issue Invoice" already in the dropdown).

### 1.7 Quote/Invoice create — no "Save and Send" shortcut
**Affected:** `/billing/quotes/new`, `/billing/invoices/new`  
**Issue:** Creating a document and then marking it sent requires two separate actions.  
**Recommendation:** Add a "Save & Mark Sent" button alongside "Save as Draft". This is a common billing workflow.

### 1.8 Items page — no search or filter
**Affected:** `/billing/items`  
**Issue:** The items catalogue has no search. With a large catalogue, finding an item requires scrolling.  
**Recommendation:** Add a search input that filters by name client-side (no server round-trip needed since all items are loaded).

### 1.9 Document preview — dates show as ISO format (YYYY-MM-DD)
**Affected:** All document previews  
**Issue:** Dates like `2026-05-08` appear on printed documents. Clients expect `08 May 2026`.  
**Recommendation:** Format dates in the `DocumentPreview` component using `toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })`.

### 1.10 No confirmation on status changes
**Affected:** Quote/Invoice status transitions (Mark Sent, Mark Accepted, etc.)  
**Issue:** Status changes are irreversible (e.g., once accepted, a quote can't go back to draft). There's no confirmation step.  
**Recommendation:** Add a `window.confirm` or use the existing `ConfirmProvider` for destructive/irreversible status transitions.

### 1.11 Settings — no unsaved changes warning
**Affected:** `/settings/organisation`, `/settings/billing`  
**Issue:** If a user edits settings and navigates away without saving, changes are silently lost.  
**Recommendation:** Track `isDirty` state and show a browser `beforeunload` warning or an in-page banner.

### 1.12 Empty states — inconsistent CTA presence
**Affected:** Various list pages  
**Issue:** Some empty states have a CTA button (e.g., Items → "New Item"), others don't (e.g., Statements → no CTA).  
**Recommendation:** Audit all empty states and ensure every one has a relevant CTA where an action is possible.

---

## 2. Functional Gaps

### 2.1 Security settings — not implemented
**Affected:** `/settings/security`  
**Status:** Marked "Soon"  
**Impact:** No session management, 2FA, or audit log available.  
**Recommendation:** At minimum, implement session list (show active sessions, allow revocation). 2FA can remain v2.

### 2.2 Data & Exports settings — not implemented
**Affected:** `/settings/data`  
**Status:** Marked "Soon"  
**Impact:** No data export from settings. (CSV export exists in Reports but not as a general data export.)  
**Recommendation:** Wire up the existing `exportFinancialsCsv` action to a button on this page.

### 2.3 Overdue invoice auto-flagging — not implemented
**Affected:** Invoices with `status = 'issued'` past their due date  
**Issue:** Invoices past due date still show as "Issued", not "Overdue". The overdue banner on the detail page checks the date client-side, but the DB status never changes.  
**Recommendation:** Add an on-read check in `getInvoiceById` and `getAllInvoices`: if `status = 'issued'` and `due_date < today`, return `status = 'overdue'` without writing to DB. Or add a cron job to update status.

### 2.4 PDF generation — not implemented
**Affected:** All document detail pages  
**Status:** Export PDF button exists (disabled shell)  
**Impact:** Users cannot save or print documents as PDF from the app.  
**Recommendation:** Implement using `@react-pdf/renderer` or browser `window.print()` with print-specific CSS. The A4 layout is already in place.

### 2.5 Email delivery — not implemented
**Affected:** Quote and Invoice "Send" buttons (disabled)  
**Impact:** Users must manually email documents outside the app.  
**Recommendation:** Wire up Resend (already a dependency) to send quote/invoice PDFs on "Send" button click.

### 2.6 Notification settings — not implemented
**Affected:** No notifications page exists  
**Impact:** No in-app or email notification preferences.  
**Recommendation:** Add to v2 backlog. Low priority until email delivery is implemented.

---

## 3. Consistency Issues

### 3.1 Income page passes unused props
**Affected:** `/finance/income/page.tsx` → `income-client.tsx`  
**Issue:** `clients`, `minDate`, and `getAllClients()` are still fetched and passed to the client component even though the "Add Income" form was removed. These are dead props.  
**Recommendation:** Remove `getAllClients()` fetch, `clients` prop, and `minDate` prop from the income page. Reduces one unnecessary DB query per page load.

### 3.2 `getAllInvoices()` called twice on invoices list page
**Affected:** `/billing/invoices/page.tsx`  
**Issue:** `getAllInvoices({ divisionId, status }, pagination)` and `getAllInvoices()` (unfiltered) are both called to compute stats. This is two full table scans per page load.  
**Recommendation:** Compute stats from a single aggregation query, or cache the unfiltered result.

### 3.3 `getAllQuotations()` called twice on quotes list page
**Affected:** `/billing/quotes/page.tsx`  
**Issue:** Same pattern as invoices — filtered result + unfiltered result for stats.  
**Recommendation:** Same fix as above.

### 3.4 `nav-data.ts` has extra labels for routes that don't exist
**Affected:** `EXTRA_LABELS` in `nav-data.ts`  
**Issue:** Labels for `/finance/income/new`, `/finance/expenses/new`, `/relationships/clients/new`, etc. are defined but these routes don't exist as pages (income is now invoice-only, and clients/leads/divisions use inline forms).  
**Recommendation:** Remove stale entries from `EXTRA_LABELS` to keep the file accurate.

---

## 4. Performance Observations

### 4.1 All pages use `force-dynamic`
**Observation:** Every page has `export const dynamic = 'force-dynamic'`. This disables all caching and static generation.  
**Impact:** Every navigation triggers a full server render + DB query. For low-traffic internal tools this is fine, but it means no ISR or static benefits.  
**Recommendation:** Keep `force-dynamic` for financial data (income, expenses, dashboard). Consider removing it from static-ish pages like Settings hub, Items catalogue, and Snapshots.

### 4.2 Dashboard makes 12+ parallel DB queries
**Observation:** `DashboardPage` fires 12 `Promise.all` queries on every load.  
**Impact:** Dashboard load time is bounded by the slowest query. On Neon serverless, cold starts can add 200-500ms per query.  
**Recommendation:** Consider caching dashboard aggregations with a short TTL (e.g., 60 seconds) using Next.js `unstable_cache` or a Redis layer.

### 4.3 Document preview is 794px fixed width
**Observation:** The A4 preview is `w-[794px]` which overflows on screens narrower than ~900px.  
**Impact:** On tablets and small laptops, the document preview requires horizontal scrolling.  
**Recommendation:** The `overflow-x-auto` wrapper is already in place on detail pages. Consider adding a zoom/scale option for smaller screens in v2.

---

## 5. Code Quality

### 5.1 No TypeScript errors ✅
Build passes with zero TypeScript errors across all files.

### 5.2 No TODO/FIXME in production code ✅
All TODO comments are in test files only.

### 5.3 No mock data in production pages ✅
All mock data has been removed. All pages use real DB data.

### 5.4 Server actions all guard with `getSessionOrRedirect()` ✅
Every mutation is protected.

### 5.5 Period lock enforced on all financial mutations ✅
`isPeriodClosed()` called before every income/expense/invoice write.

### 5.6 Zod validation on all server actions ✅
All inputs validated before DB writes.

---

## 6. Accessibility

### 6.1 VAT toggle buttons lack visible focus ring
**Affected:** Quote/Invoice form VAT toggle, Item form VAT toggle  
**Issue:** Custom `<button>` toggles don't have a visible focus indicator.  
**Recommendation:** Add `focus-visible:ring-2 focus-visible:ring-ring` to toggle button classes.

### 6.2 Form labels not associated with inputs via `htmlFor`
**Affected:** Multiple forms use `<label className="...">` without `htmlFor` pointing to an input `id`.  
**Recommendation:** Add `htmlFor` + `id` pairs to all form fields for screen reader compatibility.

### 6.3 Document preview images lack alt text fallback
**Affected:** `DocumentPreview` logo `<img>` tag  
**Issue:** `alt={org.name}` is set but the fallback initials div has no `aria-label`.  
**Recommendation:** Add `aria-label={org.name}` to the initials fallback div.

---

## 7. Security

### 7.1 Authentication ✅
All admin routes protected by session check in layout. Magic link auth via Better Auth.

### 7.2 Role-based access ✅
`requireRole()` helper exists and is used in user management actions.

### 7.3 Input validation ✅
Zod schemas on all server actions. No raw SQL injection vectors.

### 7.4 Period lock prevents backdating ✅
Financial mutations blocked for closed periods.

### 7.5 BETTER_AUTH_URL not set in dev
**Observation:** Build logs show `[better-auth] Base URL could not be determined` on every build.  
**Impact:** Magic link emails may have incorrect callback URLs in development.  
**Recommendation:** Set `BETTER_AUTH_URL=http://localhost:3000` in `.env.local`.

---

## 8. Priority Action List

| Priority | Item | Effort |
|---|---|---|
| 🔴 High | Fix dead props on income page (3.1) | 10 min |
| 🔴 High | Format dates on document preview (1.9) | 15 min |
| 🔴 High | Overdue invoice auto-flagging (2.3) | 1 hour |
| 🟡 Medium | Add search to Clients, Invoices, Quotes (1.1) | 2 hours |
| 🟡 Medium | Mark As Paid from invoice list dropdown (1.6) | 30 min |
| 🟡 Medium | Remove double `getAllInvoices`/`getAllQuotations` calls (3.2, 3.3) | 1 hour |
| 🟡 Medium | Set `BETTER_AUTH_URL` in dev env (7.5) | 5 min |
| 🟡 Medium | Snapshots page header (1.5) | 15 min |
| 🟢 Low | PDF generation (2.4) | v2 |
| 🟢 Low | Email delivery (2.5) | v2 |
| 🟢 Low | Security settings (2.1) | v2 |
| 🟢 Low | Accessibility improvements (6.1–6.3) | 1 hour |
| 🟢 Low | Unsaved changes warning (1.11) | 1 hour |
| 🟢 Low | Clean up `EXTRA_LABELS` in nav-data (3.4) | 5 min |

---

## 9. Overall Assessment

| Area | Score | Notes |
|---|---|---|
| Functionality | 9/10 | All core flows work. Minor gaps in overdue flagging and PDF. |
| Usability | 7/10 | Solid foundation. Search and bulk actions would significantly improve daily use. |
| Code Quality | 9/10 | Clean, consistent, well-typed. Minor dead code. |
| Performance | 7/10 | Double queries on list pages. Dashboard heavy but acceptable for internal tool. |
| Security | 9/10 | Auth, validation, period locks all solid. Dev env URL warning. |
| Accessibility | 6/10 | Functional but not screen-reader optimised. Focus rings missing on custom controls. |

**Overall: 7.8/10 — Production ready. Recommended improvements are quality-of-life, not blockers.**

---

*Generated: May 2026 — PMG Control Center Audit*
