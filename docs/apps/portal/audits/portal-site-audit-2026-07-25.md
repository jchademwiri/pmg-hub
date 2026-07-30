# Client Portal Site Audit Report (`apps/portal`)

**Date**: July 25, 2026  
**Target Application**: `apps/portal` (PMG Hub Client Self-Service Portal)  
**Framework**: Next.js 16.2.1 (Turbopack, App Router)  
**Audit Result**: **PASS (0 Build Errors, 0 TypeScript Errors)**

---

## 1. Executive Summary & Build Verification

An in-depth code, architecture, build, and user experience audit was conducted on the **PMG Client Portal** application (`apps/portal`).

### Build Benchmark
- **Build Status**: ✅ **PASS** (`bun --filter portal build`)
- **Compilation Time**: 28.0s (Turbopack)
- **TypeScript Verification**: Passed in 19.1s (0 type errors)
- **Compiled Routes**: 14 static & dynamic route endpoints

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/[...all]
├ ƒ /api/billing/pdf/[type]/[id]
├ ƒ /apple-icon
├ ƒ /compliance
├ ƒ /credits
├ ƒ /dashboard
├ ƒ /icon
├ ƒ /impersonate
├ ƒ /invoices
├ ƒ /invoices/[id]
├ ○ /login
├ ƒ /profile
├ ƒ /projects
├ ƒ /projects/[id]
├ ƒ /quotes
├ ƒ /quotes/[id]
└ ƒ /statements
```

---

## 2. Architectural Overview & Security Scoping

### 2.1 Multi-Tenant Data Isolation
Every data fetching page and server action invokes `getPortalSessionOrRedirect()` from `src/lib/portal-session.ts`.
- All database queries strictly enforce `eq(table.clientId, client.id)`.
- Prevents cross-tenant data leakage or unauthorized access to other clients' invoices, quotes, or project milestones.

### 2.2 Impersonation & Dev Safety
- Admin impersonation is handled via `isImpersonating` check and `(auth)/impersonate`.
- The `DevImpersonationBar` and `PortalShell` impersonation banner provide a clear visual indicator (`Preview — Viewing as [Client Name]`) with a 1-click **Exit Preview** action that revokes cookies cleanly.

---

## 3. Module-by-Module Audit Findings

### 3.1 Dashboard (`/dashboard`)
- **Strengths**:
  - Displays 4 key KPI cards: *Outstanding Balance*, *Paid to Date*, *Total Invoiced*, and *Pending Quotes*.
  - Includes dynamic alert banners for **Compliance Action Required** (expiring docs within 30 days) and **Payment Reminders** (outstanding balances).
  - Features real-time visual progress bars for active projects and overall account payment ratios.
- **Audit Recommendation**:
  - Currently fetches all invoices and payment allocations separately in JavaScript to calculate remaining balances. Can be optimized into a single aggregated SQL view or Drizzle subquery for large invoice histories.

### 3.2 Invoices Module (`/invoices`, `/invoices/[id]`)
- **Strengths**:
  - Full status filtering (*All*, *Issued*, *Paid*, *Overdue*).
  - Detailed document view (`BillingDocumentView`) rendering company logo, division branding, itemized table, VAT totals, and banking EFT details.
  - PDF export and print button integrations.
- **Audit Recommendation**:
  - Ensure loading skeleton `loading.tsx` is present for `/invoices/[id]` to provide smooth page transitions when loading large line items.

### 3.3 Quotations Module (`/quotes`, `/quotes/[id]`)
- **Strengths**:
  - Interactive quote response flow allowing clients to **Accept** or **Decline** (with optional reason text) directly inside the portal.
  - State machine safety: Quote response actions only render when status is `sent`.
  - Automatic timestamp logging (`acceptedAt`, `declinedAt`).

### 3.4 Account Statements (`/statements`)
- **Strengths**:
  - Complete chronological ledger combining invoices (debits) and payments (credits) to compute running account balances.
  - **Ageing Summary**: Calculates *Current*, *30 Days*, *60 Days*, and *90 Days+* overdue buckets in real-time.
  - **Print Resilience**: Uses custom CSS `@media print` rules (`print:bg-white`, `print:text-black`) ensuring clean, high-resolution A4 prints and PDF saves.

### 3.5 Projects & Milestone Tracking (`/projects`, `/projects/[id]`)
- **Strengths**:
  - Real-time progress bar calculated from project start date to target completion date.
  - Filters out cancelled projects automatically.

### 3.6 Compliance Documents (`/compliance`)
- **Strengths**:
  - Full document upload workflow with expiry date warnings and status tracking (*Valid*, *Expiring Soon*, *Expired*).

### 3.7 Credit Notes (`/credits`)
- **Strengths**:
  - Dedicated ledger showing issued credit notes, original amounts, and remaining credit balances available for future invoice allocation.

---

## 4. Summary Matrix & Actionable Checklist

| Audit Category | Status | Notes / Recommended Enhancements |
|---|---|---|
| **Build & Type Check** | ✅ PASS | 0 build errors; Next.js 16 + Turbopack build succeeded. |
| **Authentication & Auth Scoping** | ✅ PASS | Better Auth + `getPortalSessionOrRedirect()` enforces tenant isolation. |
| **Mobile Responsiveness** | ✅ PASS | Desktop sidebar + Mobile drawer + Fixed mobile bottom tab navigation bar. |
| **Print & PDF Styling** | ✅ PASS | Full `@media print` rules for invoices and statements. |
| **Database Performance** | ⚠️ OPTIMIZE | Consider SQL aggregation for dashboard payment allocation sums on high-volume accounts. |
| **Error Handling** | ⚠️ OPTIMIZE | Add explicit `error.tsx` boundaries to dynamic routes (`/invoices/[id]`, `/projects/[id]`). |

---

## 5. Next Steps

1. **Error Boundaries**: Create `error.tsx` loading and fallback components for dynamic routes.
2. **Aggregated Dashboard Query**: Refactor `allocationMap` computation in `/dashboard` to an optimized SQL join query.
3. **Deployment**: Site is production-ready for deployment on Vercel (`apps/portal`).
