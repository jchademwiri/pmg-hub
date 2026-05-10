# PMG Control Center — App Audit Report (Revision 6)
**Date:** May 2026  
**Previous revisions:** Rev 1–5 (28 quick wins applied)  
**All previous quick wins confirmed applied ✅**

---

## ✅ Rev 5 Changes — Confirmed Applied

| Change | Status |
|---|---|
| `link-payment-button.tsx` deleted | ✅ File gone |
| `linkInvoiceToIncome` action removed from `billing-invoices.ts` | ✅ Removed |
| `getUnlinkedIncomeForClient` removed from invoice detail page | ✅ Removed |
| `LinkPaymentButton` removed from `invoice-detail-actions.tsx` | ✅ Removed |
| `UnlinkedIncomeRow` interface removed | ✅ Removed |
| `linkPaymentAction` / `unlinkedIncome` props removed | ✅ Removed |
| `getIncomeById` dead import removed from `billing-invoices.ts` | ✅ Removed |

**Exported actions in `billing-invoices.ts` (current):**
`createInvoice` · `updateInvoice` · `convertQuoteToInvoice` · `issueInvoice` · `markInvoicePaid` · `voidInvoice`

---

## ⚡ Quick Wins — Revision 6 (< 30 min each)

### QW-26 — Add `fmtDateTime()` helper and use it for activity timestamps
**Effort:** 10 min  
**Files:** `apps/admin/src/lib/format.ts`, `billing/quotes/[id]/page.tsx`, `billing/invoices/[id]/page.tsx`  
**Issue:** Activity card timestamps in both detail pages use inline `new Date(...).toLocaleString('en-ZA', {...})` calls. The options object is duplicated across 3 places. Inconsistent with the rest of the app which uses shared helpers from `lib/format.ts`.  
**Affected lines:**
- `quotes/[id]/page.tsx` line ~148 — `quote.createdAt`
- `invoices/[id]/page.tsx` line ~160 — `invoice.paidAt`
- `invoices/[id]/page.tsx` line ~170 — `invoice.createdAt`

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
Then replace all 3 inline calls with `fmtDateTime(...)`.

---

## 📅 Complete Date Format Audit

### ✅ All UI date fields formatted correctly

| Location | Field(s) | Format |
|---|---|---|
| Quotes list | `quoteDate`, `expiryDate` | ✅ `fmtDate()` |
| Invoices list | `invoiceDate`, `dueDate` | ✅ `fmtDate()` |
| Quote detail header | `quoteDate` | ✅ `fmtDate()` |
| Invoice detail header | `invoiceDate` | ✅ `fmtDate()` |
| Invoice detail — paid state | `paidAt` | ✅ `fmtDate()` |
| Client detail — income history | `entry.date` | ✅ `fmtDate()` |
| Division detail — income/expense history | `e.date` | ✅ `fmtDate()` |
| Accounts detail — statement table | `row.date` | ✅ `fmtDate()` |
| Statement detail — income records | `inc.date` | ✅ `fmtDate()` |
| Statements list — last activity | `lastActivityDate` | ✅ `fmtDate()` |
| Document preview — all dates | all | ✅ `fmtDateLong()` |
| Income/expense filter bars — month labels | `month + '-01'` | ✅ `toLocaleString` (month+year only, correct) |
| Snapshots list — period labels | `period + '-01'` | ✅ `toLocaleString` (month+year only, correct) |

### ⚠️ Minor inconsistency (QW-26)

| Location | Field | Issue |
|---|---|---|
| Quote detail — Activity card | `quote.createdAt` | Inline `toLocaleString` — should use `fmtDateTime()` |
| Invoice detail — Activity card | `invoice.paidAt`, `invoice.createdAt` | Inline `toLocaleString` — should use `fmtDateTime()` |

---

## 🟡 Medium Priority

### M-1 — Overdue invoice auto-flagging ⭐ (still pending)
**Issue:** `getAllInvoices` returns the raw DB `status` column. No computed transform exists. Invoices past their due date stay as `issued` in the DB indefinitely. The "Overdue" stat card on the invoices page counts `status = 'overdue'` rows — which will always be 0 unless someone manually sets that status via a direct DB update.  
**Note:** `invoice-detail-actions.tsx` does compute `isOverdue` client-side from `dueDate` to show the amber banner, but this doesn't affect the stored status or the list page stat.  
**Fix:** Add a computed transform in `getAllInvoices` (and `getInvoiceById`) after the DB fetch:
```ts
const today = new Date().toISOString().slice(0, 10)
data = data.map(inv => ({
  ...inv,
  status: inv.status === 'issued' && inv.dueDate && inv.dueDate < today
    ? 'overdue'
    : inv.status,
}))
```
No DB write needed — purely computed at read time.

### M-2 — Free-text search on Clients and Invoices ⭐ (still pending)
**Issue:** No text search on any list page. Invoices and quotes support `divisionId` + `status` URL filters but no name/number search. Clients page has no filter bar at all.  
**Fix:** Add a search input to the filter bars; pass a `query` param to `getAllInvoices` / `getAllQuotations` / `getClientsWithIncomeCount` and add `ILIKE '%query%'` conditions on client name and document number.

### M-3 — Mark Paid from invoice list dropdown (still pending)
**Issue:** `MarkPaidButton` exists and works on the invoice detail page, but the invoices list row dropdown only has View, Issue Invoice, and Void. Users must navigate into each invoice to mark it paid.  
**Fix:** Add a "Mark Paid" `DropdownMenuItem` in `invoices-client.tsx` for `issued`/`overdue` rows, wired to the existing `markInvoicePaid` server action (already imported in `invoices/page.tsx`).

### M-4 — Client detail → New Invoice shortcut (still pending)
**Issue:** No "New Invoice" button on the client detail page. Users must navigate to `/billing/invoices/new` and manually re-select the client.  
**Fix:** Add a "New Invoice" button linking to `/billing/invoices/new?clientId={id}`. Pre-fill the client field in the invoice form when `clientId` is present in search params.

### M-5 — Dynamic account locking (still pending — 1 TODO comment)
**Issue:** `LOCKED_ACCOUNTS` in `apps/admin/src/lib/accounts.ts` is a hardcoded `const` array. Locking or unlocking an account requires a code change and redeploy. A `// TODO` comment acknowledges this.  
**Fix:** Move locked accounts to a DB settings table; read via a cached query. Remove the TODO.

### M-6 — Unsaved changes warning on settings forms (still pending)
**Issue:** Settings forms have no `isDirty` guard. Navigating away silently discards edits.  
**Fix:** Track `isDirty` state; add a `beforeunload` listener and/or a confirmation dialog on navigation when there are unsaved changes.

### M-7 — Statement list — year filter (still pending)
**Issue:** The statements list (`/billing/statements`) shows all clients with no year filter. The statement detail page already supports `?year=` filtering, but there's no way to reach it from the list with a year pre-selected.  
**Fix:** Add a year dropdown to the statements list page; pass the selected year through to the client statement links.

---

## 🔴 Functional Gaps (v2 backlog — unchanged)

| Gap | Status |
|---|---|
| PDF generation | Shell button (disabled, `title="Coming soon"`) |
| Email delivery | Shell button (disabled, `title="Coming soon"`) |
| Security settings | "Soon" badge |
| Data & Exports | "Soon" badge |
| Notification settings | Not started |
| Logo upload | Disabled button (`title="Coming soon"`) |

---

## 📊 Complete Date Format Reference

### `lib/format.ts` — current helpers

| Function | Output | Use case |
|---|---|---|
| `fmtDate(value)` | `08 May 2026` | All UI date fields |
| `fmtDateLong(value)` | `08 May 2026` (long month) | Printed documents |
| `formatZAR(amount)` | `R 1 234.56` | All currency fields |
| *(missing)* `fmtDateTime(value)` | `08 May 2026, 14:30` | Activity timestamps (QW-26) |

---

## ✅ Confirmed Working — Full Inventory

| Area | Detail |
|---|---|
| All 28 previous quick wins | Applied and verified |
| Date formatting | Consistent `fmtDate()` / `fmtDateLong()` across all UI |
| Disabled buttons | All have `title="Coming soon"` or tooltip |
| Link Payment flow | Fully removed (migration complete) |
| Invoice actions | `createInvoice`, `updateInvoice`, `convertQuoteToInvoice`, `issueInvoice`, `markInvoicePaid`, `voidInvoice` |
| Quote actions | `createQuotation`, `updateQuotation`, `updateQuotationStatus`, `deleteQuotation` |
| Statement year filter | Working via `?year=` param on detail page |
| Overdue banner | Shows client-side on invoice detail when past due date |
| TypeScript | Zero errors |

---

## 📊 Scores

| Area | Rev 5 | Rev 6 | Notes |
|---|---|---|---|
| Functionality | 9/10 | 9/10 | Overdue flagging, search, Mark Paid from list still pending |
| Usability | 8.5/10 | 8.5/10 | QW-26 (fmtDateTime) still pending |
| Code Quality | 9.5/10 | 9.5/10 | 1 TODO remains (LOCKED_ACCOUNTS); link payment dead code fully removed |
| Performance | 8/10 | 8/10 | No change |
| Security | 9.5/10 | 9.5/10 | No change |
| Accessibility | 7/10 | 7/10 | No change |
| **Overall** | **8.6** | **8.6** | Stable — cleanup complete, medium items remain |

---

## 🎯 Recommended Next Actions

**Do now (< 15 min):**
1. QW-26 — Add `fmtDateTime()` to `lib/format.ts` and replace 3 inline `toLocaleString` calls

**Do this week:**
2. M-1 — Overdue invoice auto-flagging (1 hour) ⭐ highest impact — fixes the always-zero stat
3. M-3 — Mark Paid from invoice list dropdown (30 min)

**Do this sprint:**
4. M-2 — Free-text search on Clients and Invoices (2–3 hours)
5. M-4 — Client detail → New Invoice shortcut (1 hour)
6. M-5 — Dynamic account locking (2 hours)
7. M-6 — Unsaved changes warning (1 hour)
8. M-7 — Statement list year filter (1 hour)

---

*Updated: May 2026 — PMG Control Center Audit Revision 6*
