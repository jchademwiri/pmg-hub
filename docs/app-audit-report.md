# PMG Control Center — App Audit Report (Revision 4)
**Date:** May 2026  
**Previous revisions:** Rev 1 (3 fixes) · Rev 2 (10 wins) · Rev 3 (5 wins)  
**All previous quick wins confirmed applied ✅**

---

## ⚡ Quick Wins — Revision 4 (< 30 min each)

### QW-16 — Format dates in quotes list table
**Effort:** 10 min  
**File:** `apps/admin/src/app/(admin)/billing/quotes/quotes-client.tsx`  
**Issue:** `quote.quoteDate` and `quote.expiryDate` display as `2026-05-08`.  
**Fix:**
```tsx
// Line ~132
{new Date(quote.quoteDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
// Line ~135
{quote.expiryDate ? new Date(quote.expiryDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
```

### QW-17 — Format dates in invoices list table
**Effort:** 10 min  
**File:** `apps/admin/src/app/(admin)/billing/invoices/invoices-client.tsx`  
**Issue:** `inv.invoiceDate` and `inv.dueDate` display as `2026-05-08`.  
**Fix:** Same pattern as QW-16.

### QW-18 — Format "Issued" date in quote/invoice detail page headers
**Effort:** 5 min  
**Files:** `billing/quotes/[id]/page.tsx`, `billing/invoices/[id]/page.tsx`  
**Issue:** `Issued {quote.quoteDate}` and `Issued {invoice.invoiceDate}` show ISO format in the page header subtitle.  
**Fix:**
```tsx
<p className="text-sm text-muted-foreground">
  Issued {new Date(quote.quoteDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
</p>
```

### QW-19 — Format dates in client detail income history
**Effort:** 5 min  
**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/page.tsx`  
**Issue:** `entry.date` in the income history table shows ISO format.  
**Fix:** Apply `toLocaleDateString` pattern.

### QW-20 — Format dates in division detail income/expense history
**Effort:** 5 min  
**File:** `apps/admin/src/app/(admin)/relationships/divisions/[id]/page.tsx`  
**Issue:** `e.date` in both income and expense history tables shows ISO format.  
**Fix:** Apply `toLocaleDateString` pattern to both tables.

### QW-21 — Format dates in accounts detail page
**Effort:** 5 min  
**File:** `apps/admin/src/app/(admin)/finance/accounts/[account]/page.tsx`  
**Issue:** `row.date` in the account statement table shows ISO format.  
**Fix:** Apply `toLocaleDateString` pattern.

### QW-22 — Format dates in statement income records section
**Effort:** 5 min  
**File:** `apps/admin/src/app/(admin)/billing/statements/[clientId]/page.tsx`  
**Issue:** `inc.date` in the Income Records section at the bottom shows ISO format.  
**Fix:** Apply `toLocaleDateString` pattern.

### QW-23 — Format dates in link-payment-button dropdown
**Effort:** 5 min  
**File:** `apps/admin/src/components/billing/link-payment-button.tsx`  
**Issue:** `row.date` in the unlinked income dropdown shows ISO format.  
**Fix:** Apply `toLocaleDateString` pattern.

### QW-24 — Format `lastActivityDate` in statements list
**Effort:** 5 min  
**File:** `apps/admin/src/app/(admin)/billing/statements/page.tsx`  
**Issue:** `client.lastActivityDate` shows ISO format in the statements list table.  
**Fix:** Apply `toLocaleDateString` pattern (with null check).

### QW-25 — Add `title="Coming soon"` to Upload Logo button
**Effort:** 2 min  
**File:** `apps/admin/src/app/(admin)/settings/organisation/org-settings-form.tsx`  
**Issue:** The Upload Logo button is disabled but has no tooltip. The text below says "coming soon" but the button itself has no `title`.  
**Fix:** Add `title="Coming soon"` to the Upload Logo button.

---

## 📅 Complete Date Format Audit

### ✅ Already formatted correctly
| Location | Status |
|---|---|
| Income table (`income-table.tsx`) | ✅ `toLocaleDateString` |
| Expense table (`expense-table.tsx`) | ✅ `toLocaleDateString` |
| Ledger table (`ledger-table.tsx`) | ✅ `toLocaleDateString` |
| Document preview (all dates) | ✅ `fmtDate()` helper |
| Activity timestamps (quote/invoice detail) | ✅ `toLocaleString` |
| Snapshot periods | ✅ `toLocaleString` |

### ❌ Still showing ISO format (YYYY-MM-DD)
| Location | Field | Fix |
|---|---|---|
| Quotes list table | `quoteDate`, `expiryDate` | QW-16 |
| Invoices list table | `invoiceDate`, `dueDate` | QW-17 |
| Quote detail header subtitle | `quoteDate` | QW-18 |
| Invoice detail header subtitle | `invoiceDate` | QW-18 |
| Client detail — income history | `entry.date` | QW-19 |
| Division detail — income history | `e.date` | QW-20 |
| Division detail — expense history | `e.date` | QW-20 |
| Accounts detail — statement table | `row.date` | QW-21 |
| Statement detail — income records | `inc.date` | QW-22 |
| Link Payment dropdown | `row.date` | QW-23 |
| Statements list — last activity | `lastActivityDate` | QW-24 |

---

## 🟡 Medium Priority (unchanged from Rev 3)

### M-1 — Overdue invoice auto-flagging ⭐
**Issue:** Invoices past due date still show `issued` in DB. "Overdue" stat always 0.  
**Fix:** Computed status in `getAllInvoices`/`getInvoiceById` — no DB write needed.

### M-2 — Search on Clients and Invoices ⭐
**Issue:** No free-text search on any list page.  
**Fix:** `ILIKE '%query%'` search input on filter bars.

### M-3 — Mark Paid from invoice list dropdown
**Fix:** Add to row dropdown for `issued`/`overdue` invoices.

### M-4 — Client detail → New Invoice shortcut
**Fix:** "New Invoice" button pre-filling client field.

### M-5 — Dynamic account locking (2 TODO comments)
**Fix:** DB-driven `LOCKED_ACCOUNTS` via settings.

### M-6 — Unsaved changes warning on settings forms
**Fix:** `isDirty` state + `beforeunload` warning.

### M-7 — Statement list — year filter
**Fix:** Year dropdown on statements list page.

---

## 🔴 Functional Gaps (v2 backlog)

| Gap | Status |
|---|---|
| PDF generation | Shell button (disabled) |
| Email delivery | Shell button (disabled) |
| Security settings | "Soon" badge |
| Data & Exports | "Soon" badge |
| Notification settings | Not started |

---

## ✅ Confirmed Working (all previous fixes)

All 18 previous quick wins confirmed applied. Zero TypeScript errors. Clean build.

---

## 📊 Scores

| Area | Rev 3 | Rev 4 | Notes |
|---|---|---|---|
| Functionality | 9/10 | 9/10 | Overdue flagging still pending |
| Usability | 8/10 | 8/10 | Date fixes pending (QW-16–24) |
| Code Quality | 9.5/10 | 9.5/10 | 2 TODO comments remain |
| Performance | 8/10 | 8/10 | No change |
| Security | 9.5/10 | 9.5/10 | No change |
| Accessibility | 6.5/10 | 7/10 | htmlFor added to item form |
| **Overall** | **8.4** | **8.5** | **↑** |

---

## 🎯 Recommended Next Actions

**Do now (< 1 hour total — all date fixes):**
1. QW-16 — Quotes list dates
2. QW-17 — Invoices list dates
3. QW-18 — Quote/Invoice detail header dates
4. QW-19 — Client detail income dates
5. QW-20 — Division detail income/expense dates
6. QW-21 — Accounts detail dates
7. QW-22 — Statement income records dates
8. QW-23 — Link Payment dropdown dates
9. QW-24 — Statements list last activity date
10. QW-25 — Upload Logo button title

**Do this week:**
11. M-1 — Overdue invoice auto-flagging (1 hour)
12. M-3 — Mark Paid from invoice list (30 min)

---

*Updated: May 2026 — PMG Control Center Audit Revision 4*
