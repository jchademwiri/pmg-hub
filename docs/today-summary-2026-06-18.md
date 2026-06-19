# 📋 PMG Hub — Changes Summary (June 18, 2026)

> A complete record of all changes, data corrections, and documentation created today. Review at your leisure.

---

## 1. Data Reconciliation & Audits

### 1.1 Dashboard Figures Verified

All three dashboard values were verified against raw database tables:

| Dashboard Metric | Amount | Status |
|---|---|---|
| Total Revenue (income table) | R20,500 | ✅ Correct |
| Total Invoiced (active invoices) | R19,430 | ✅ Correct (FY 2026 filter) |
| Total Expenses (expenses table) | R2,485 | ✅ Correct |

### 1.2 Income vs Journal Entry Revenue

| Source | Amount | Status |
|---|---|---|
| Legacy `income` table | R20,500 | ✅ All 12 records accounted for |
| Posted Revenue (journal entries, 4010) | R35,080 | ✅ Correct (includes invoices posted) |

### 1.3 R125 Expense Gap Found & Closed

**Root cause:** 2 expense records in the legacy `expenses` table were never posted as journal entries.

#### Before:
| Source | Amount |
|--------|--------|
| Legacy expenses table | R2,485 |
| Posted expense JEs | R2,360 |
| **Gap** | **R125** ⚠️ |

#### After — 2 Journal Entries Created:
| JE | Expense | Amount |
|----|---------|--------|
| **JE-2026-0072** | Document scanning expense (Printing Services) | R65.00 |
| **JE-2026-0073** | Uber transport expense (Transport) | R60.00 |
| **Total** | | **R125.00 ✅ CLOSED** |

**Verified: Legacy expenses (R2,485) = Posted expense JEs (R2,485) ✅**

---

## 2. Invoice Date Corrections

### 2.1 Cross-Period Invoices Moved to FY 2026

4 invoices from Feb 27, 2026 (last FY) were moved to **March 1, 2026** (first day of FY 2026):

| Invoice | Amount | Status | New Date |
|---------|--------|--------|----------|
| PMG-INV-2026-001 | R2,000 | ✅ paid | Mar 1, 2026 |
| PMG-INV-2026-002 | R8,650 | 📋 issued | *See 2.2 below* |
| TES-INV-2026-001 | R2,500 | ✅ paid | Mar 1, 2026 |
| TES-INV-2026-002 | R2,500 | ✅ paid | Mar 1, 2026 |

**Related journal entries** (JE-2026-0028 through JE-2026-0031) were also updated to Mar 1.

### 2.2 PMG-INV-2026-002 Moved Back to FY 2025

Per your instruction:
- **PMG-INV-2026-002 (R8,650)** — moved from Mar 1 back to **Feb 28, 2026** (last month of FY 2025)
- **JE-2026-0029** (its related journal entry) also updated to Feb 28

### 2.3 Current FY Distribution

| FY | Invoices | Total |
|----|----------|-------|
| **FY 2025** | 1 (PMG-INV-2026-002) | R8,650 |
| **FY 2026** | 24 | **R34,780** |
| **FY 2026 Active** (excl draft/void) | 16 | **R26,430** |

---

## 3. Double-Entry Audit Results

### Summary — All Clean ✅

| Check | Result |
|-------|--------|
| Total Journal Entries | 73 |
| Total Journal Lines | 151 |
| All entries balanced (debits = credits) | ✅ Every entry |
| Grand total debits = credits | **R63,190 = R63,190** ✅ |
| Expenses with matching JEs | 17/17 ✅ |
| Income records with matching JEs | 12/12 ✅ |
| Orphaned expense JEs | 0 ✅ |
| Orphaned income JEs | 0 ✅ |
| Orphaned invoice JEs | 0 ✅ |
| Void expense JEs | 0 |
| Void income JEs | 12 (migrated legacy data) |

---

## 4. UI / Code Changes

### 4.1 Overview Pages Created

| Module | Files | Description |
|--------|-------|-------------|
| **Billing Overview** | `billing/page.tsx` + `billing-overview-client.tsx` | Invoice stats, aging report, recent invoices, quick links |
| **Finance Overview** | `finance/page.tsx` + `finance-overview-client.tsx` | Revenue, expenses, division/category breakdowns, profit pool |
| **Relationships Overview** | `relationships/page.tsx` + `relationships-overview-client.tsx` | Client/lead counts, division performance, recent leads |
| **Billing Accounts** | `billing/accounts/page.tsx` | Replaced ComingSoonPage — shows client accounts, aging, balances |

### 4.2 Loading Skeletons Added

| Page | File |
|------|------|
| Billing Overview | `billing/loading.tsx` |
| Finance Overview | `finance/loading.tsx` |
| Relationships Overview | `relationships/loading.tsx` |

### 4.3 Performance Optimisation

- **Billing Overview query**: `getAllInvoices()` paginated to fetch only 5 recent rows (was fetching all)
- **Quotes query**: `getAllQuotations()` paginated to `pageSize: 1` (only count needed)

### 4.4 Cleanup

- **Deleted:** `apps/admin/src/components/coming-soon-page.tsx` (no longer used anywhere)
- **Deleted:** `apps/admin/src/components/insights/snapshot-comparison-panel.tsx` (orphaned after simplification)
- **Deleted:** `apps/admin/src/components/insights/snapshot-delta-badge.tsx` (orphaned after simplification)

### 4.5 Snapshots Page Simplified

Removed from `snapshots-cockpit.tsx`:
- Compare mode (2-period side-by-side comparison)
- FinancialDrilldownSheet integration
- Level 2 allocation details (salary, reinvest, reserve, flex breakdown)
- Delta badges (vs previous period)

Kept:
- Month selector sidebar with profit badges
- All-Time Overview toggle
- 3 KPI cards (Revenue, Expenses, Net Profit)
- Revenue breakdown bar chart (single month view)
- Monthly performance trend chart (all-time view)

---

## 5. Documentation Created

### Tutorial Guides for Non-Accountants

New files created to match the existing accounting docs:

| Module | File | What It Covers |
|--------|------|----------------|
| **Billing** | `docs/billing/README.md` | Invoices, quotes, payments, credit notes, billing accounts, items, statements, aging |
| **Finance** | `docs/finance/README.md` | Income, expenses, categories, distributions, auto-posting |
| **Relationships** | `docs/relationships/README.md` | Clients, leads, divisions, pipeline stages |
| **Insights** | `docs/insights/README.md` | Snapshots, reports, trends, close month process |

Each guide follows the same format: plain language, tables, workflow diagrams, quick reference, and troubleshooting.

---

## 6. Test Results

- **packages/db tests**: 71 tests, 11 pre-existing failures (same as before) ✅
- **apps/admin tests**: 299 tests, 15 pre-existing failures (same as before) ✅
- **No new regressions introduced** ✅

---

## 7. Total Changes by File

```
NEW FILES:
  docs/billing/README.md                          — Billing tutorial guide
  docs/finance/README.md                          — Finance tutorial guide
  docs/relationships/README.md                    — Relationships tutorial guide
  docs/insights/README.md                         — Insights tutorial guide
  docs/today-summary-2026-06-18.md                — This document
  apps/admin/src/app/(admin)/billing/billing-overview-client.tsx
  apps/admin/src/app/(admin)/finance/finance-overview-client.tsx
  apps/admin/src/app/(admin)/relationships/relationships-overview-client.tsx
  apps/admin/src/app/(admin)/billing/loading.tsx
  apps/admin/src/app/(admin)/finance/loading.tsx
  apps/admin/src/app/(admin)/relationships/loading.tsx

EDITED FILES:
  apps/admin/src/app/(admin)/billing/page.tsx     — Pagination + real data
  apps/admin/src/app/(admin)/finance/page.tsx     — Real data fetch
  apps/admin/src/app/(admin)/relationships/page.tsx — Real data fetch
  apps/admin/src/app/(admin)/billing/accounts/page.tsx — Replaced ComingSoonPage
  apps/admin/src/components/insights/snapshots-cockpit.tsx — Simplified

DELETED FILES:
  apps/admin/src/components/coming-soon-page.tsx
  apps/admin/src/components/insights/snapshot-comparison-panel.tsx
  apps/admin/src/components/insights/snapshot-delta-badge.tsx

DATA CHANGES (Database):
  — 4 invoices: date Feb 27 → Mar 1, 2026
  — PMG-INV-2026-002: date Mar 1 → Feb 28, 2026
  — 4 journal entries: date Feb 27 → Mar 1, 2026
  — JE-2026-0029: date Mar 1 → Feb 28, 2026
  — 2 new journal entries created: JE-2026-0072 (R65), JE-2026-0073 (R60)
```

---

## Related Files You May Want to Reference

| File | Description |
|------|-------------|
| `docs/accounting/README.md` | Accounting tutorial (created earlier) |
| `docs/accounting/08-how-to-use-daily.md` | Daily accounting workflow |
| `apps/admin/src/app/(admin)/billing/page.tsx` | Billing overview page |
| `apps/admin/src/app/(admin)/finance/page.tsx` | Finance overview page |
| `apps/admin/src/app/(admin)/relationships/page.tsx` | Relationships overview page |
| `apps/admin/src/app/(admin)/insights/snapshots/page.tsx` | Snapshots page |
| `apps/admin/src/components/insights/snapshots-cockpit.tsx` | Simplified snapshot cockpit |
