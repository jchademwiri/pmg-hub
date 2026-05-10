# PMG Control Center — App Audit Report (Revision 5)
**Date:** May 2026  
**Previous revisions:** Rev 1 (3 fixes) · Rev 2 (10 wins) · Rev 3 (5 wins) · Rev 4 (10 wins)  
**All previous quick wins confirmed applied ✅**

---

## ✅ Rev 4 Quick Wins — All Confirmed Applied

All 10 quick wins from Revision 4 (QW-16 through QW-25) have been verified as applied:

| QW | Description | Status |
|---|---|---|
| QW-16 | Format dates in quotes list table | ✅ `fmtDate()` |
| QW-17 | Format dates in invoices list table | ✅ `fmtDate()` |
| QW-18 | Format "Issued" date in quote/invoice detail headers | ✅ `fmtDate()` |
| QW-19 | Format dates in client detail income history | ✅ `fmtDate()` |
| QW-20 | Format dates in division detail income/expense history | ✅ `fmtDate()` |
| QW-21 | Format dates in accounts detail page | ✅ `fmtDate()` |
| QW-22 | Format dates in statement income records section | ✅ `fmtDate()` |
| QW-23 | Format dates in link-payment-button dropdown | ✅ `fmtDate()` |
| QW-24 | Format `lastActivityDate` in statements list | ✅ `fmtDate()` |
| QW-25 | Add `title="Coming soon"` to Upload Logo button | ✅ Applied |

A shared `fmtDate()` helper in `apps/admin/src/lib/format.ts` now handles all date formatting consistently across the app. A `fmtDateLong()` variant is used for printed documents.

---

## ⚡ Quick Wins — Revision 5 (< 30 min each)

### QW-26 — Add `fmtDateTime()` helper and use it for activity timestamps
**Effort:** 10 min  
**Files:** `apps/admin/src/lib/format.ts`, `billing/quotes/[id]/page.tsx`, `billing/invoices/[id]/page.tsx`  
**Issue:** Activity section timestamps in quote and invoice detail pages use an inline `new Date().toLocaleString('en-ZA', {...})` call instead of the shared format helpers. Inconsistent with the rest of the app.  
**Fix:**
```ts
// lib/format.ts — add:
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
```
Then replace the inline `new Date().toLocaleString(...)` calls in both detail pages with `fmtDateTime(...)`.

### QW-27 — Add `title` to disabled "Confirm Link" button in link-payment-button
**Effort:** 5 min  
**File:** `apps/admin/src/components/billing/link-payment-button.tsx`  
**Issue:** The "Confirm Link" button is disabled when no income record is selected but has no `title` attribute explaining why.  
**Fix:**
```tsx
<Button
  ...
  disabled={!selectedId}
  title={!selectedId ? 'Select an income record to link' : undefined}
>
```

---

## 📅 Complete Date Format Audit

### ✅ All locations now formatted correctly

| Location | Field | Format |
|---|---|---|
| Quotes list table | `quoteDate`, `expiryDate` | ✅ `fmtDate()` |
| Invoices list table | `invoiceDate`, `dueDate` | ✅ `fmtDate()` |
| Quote detail header subtitle | `quoteDate` | ✅ `fmtDate()` |
| Invoice detail header subtitle | `invoiceDate` | ✅ `fmtDate()` |
| Client detail — income history | `entry.date` | ✅ `fmtDate()` |
| Division detail — income/expense history | `e.date` | ✅ `fmtDate()` |
| Accounts detail — statement table | `row.date` | ✅ `fmtDate()` |
| Statement detail — income records | `inc.date` | ✅ `fmtDate()` |
| Link Payment dropdown | `row.date` | ✅ `fmtDate()` |
| Statements list — last activity | `lastActivityDate` | ✅ `fmtDate()` |
| Income table | `date` | ✅ `toLocaleDateString` |
| Expense table | `date` | ✅ `toLocaleDateString` |
| Ledger table | `date` | ✅ `toLocaleDateString` |
| Document preview (all dates) | all | ✅ `fmtDateLong()` |
| Snapshot periods | all | ✅ `toLocaleString` |

### ⚠️ Minor inconsistency (QW-26)

| Location | Field | Issue |
|---|---|---|
| Quote detail — activity section | timestamp | Inline `toLocaleString` instead of shared helper |
| Invoice detail — activity section | timestamp | Inline `toLocaleString` instead of shared helper |

---

## 🟡 Medium Priority

### M-1 — Overdue invoice auto-flagging ⭐ (still pending)
**Issue:** `getAllInvoices` in `packages/db/src/queries/billing.ts` returns the raw DB status. Invoices past their due date still show `issued` in the DB and in the UI. The "Overdue" stat on the invoices page counts `status = 'overdue'` rows, which will always be 0 unless someone manually sets that status.  
**Fix:** Add a computed status transform after the DB fetch in `getAllInvoices` and `getInvoiceById`:
```ts
// After fetching rows:
const today = new Date().toISOString().slice(0, 10)
data = data.map(inv => ({
  ...inv,
  status: inv.status === 'issued' && inv.dueDate && inv.dueDate < today
    ? 'overdue'
    : inv.status,
}))
```
No DB write needed — purely computed at read time.

### M-2 — Search on Clients and Invoices ⭐ (still pending)
**Issue:** No free-text search on any list page. Clients page has no filter bar at all. Invoices page supports `divisionId` and `status` URL params but no text search.  
**Fix:** Add a search input to the filter bars; pass a `query` param to `getAllInvoices` / `getClientsWithIncomeCount` and add `ILIKE '%query%'` conditions on name/document number.

### M-3 — Mark Paid from invoice list dropdown (still pending)
**Issue:** "Mark Paid" exists on the invoice detail page (`MarkPaidButton`) but is not available from the invoices list row dropdown. The dropdown only has View, Issue Invoice, and Void.  
**Fix:** Add a "Mark Paid" item to the `DropdownMenuContent` in `invoices-client.tsx` for `issued`/`overdue` invoices, wired to the existing `markInvoicePaid` server action.

### M-4 — Client detail → New Invoice shortcut (still pending)
**Issue:** No "New Invoice" button on the client detail page. Users must navigate to `/billing/invoices/new` and re-select the client.  
**Fix:** Add a "New Invoice" button to the client detail header that links to `/billing/invoices/new?clientId={id}`, and pre-fill the client field in the invoice form when `clientId` is present in search params.

### M-5 — Dynamic account locking (still pending — 2 TODO comments)
**Issue:** `LOCKED_ACCOUNTS` in `apps/admin/src/lib/accounts.ts` is a hardcoded `const` array with a `// TODO` comment. Locking/unlocking an account requires a code change and redeploy.  
**Fix:** Move locked accounts to a DB settings table; read via a cached query. Remove the TODO comments.

### M-6 — Unsaved changes warning on settings forms (still pending)
**Issue:** Settings forms (org settings, etc.) have no `isDirty` guard. Navigating away silently discards edits.  
**Fix:** Track `isDirty` state; add a `beforeunload` listener and/or a confirmation dialog on navigation when there are unsaved changes.

### M-7 — Statement list — year filter (still pending)
**Issue:** The statements list shows all clients with billing activity but has no way to filter by year. For clients with multi-year history this makes the "Last Activity" column less useful.  
**Fix:** Add a year dropdown to the statements list page; pass the selected year to `getClientsWithBillingActivity` and filter `lastActivityDate` accordingly.

---

## 🔴 Functional Gaps (v2 backlog — unchanged)

| Gap | Status |
|---|---|
| PDF generation | Shell button (disabled, `title="Coming soon"`) |
| Email delivery | Shell button (disabled, `title="Coming soon"`) |
| Security settings | "Soon" badge |
| Data & Exports | "Soon" badge |
| Notification settings | Not started |

---

## ✅ Confirmed Working (all previous fixes)

All 25 previous quick wins confirmed applied. Zero TypeScript errors. Clean build.

---

## 📊 Scores

| Area | Rev 4 | Rev 5 | Notes |
|---|---|---|---|
| Functionality | 9/10 | 9/10 | Overdue flagging, search, Mark Paid from list still pending |
| Usability | 8/10 | 8.5/10 | All date fixes applied; minor timestamp inconsistency remains |
| Code Quality | 9.5/10 | 9.5/10 | 2 TODO comments remain (LOCKED_ACCOUNTS) |
| Performance | 8/10 | 8/10 | No change |
| Security | 9.5/10 | 9.5/10 | No change |
| Accessibility | 7/10 | 7/10 | No change |
| **Overall** | **8.5** | **8.6** | **↑** |

---

## 🎯 Recommended Next Actions

**Do now (< 30 min total):**
1. QW-26 — Add `fmtDateTime()` helper + use in activity sections
2. QW-27 — Add `title` to disabled Confirm Link button

**Do this week:**
3. M-1 — Overdue invoice auto-flagging (1 hour) ⭐ highest impact
4. M-3 — Mark Paid from invoice list dropdown (30 min)
5. M-2 — Search on Clients and Invoices (2–3 hours)

**Do this sprint:**
6. M-4 — Client detail → New Invoice shortcut (1 hour)
7. M-5 — Dynamic account locking (2 hours)
8. M-6 — Unsaved changes warning (1 hour)
9. M-7 — Statement list year filter (1 hour)

---

*Updated: May 2026 — PMG Control Center Audit Revision 5*
