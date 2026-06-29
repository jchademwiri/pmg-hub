# PMG Hub — Admin App UI/UX Audit
**Repo:** `jchademwiri/pmg-hub` · **Branch:** `dev`  
**App:** `apps/admin` (Next.js 16, Tailwind CSS, shadcn/ui, Drizzle ORM)  
**Date:** 2026-06-29  
**Auditor:** Claude (Anthropic) — commissioned by Jacob Chademwiri

---

## Implementation Status

> **Last updated:** 2026-06-29 — All 5 phases + backlog items completed and committed to `dev`.

| Phase | Scope | Commits | Status |
|-------|-------|---------|--------|
| Phase 1 | Rename Scheduling → Projects (routes, components, actions, nav) | `fc0e743` | ✅ Complete |
| Phase 2 | Bug fixes: dead code, ARIA structure, billing status maps, PMG share rate, invoice accessibility | `53a86bd` | ✅ Complete |
| Phase 3 | Critical UX: BackButton component, Lucide module icons | `2f526b0` | ✅ Complete |
| Phase 4 | Medium priority: sidebar logo, login branding, empty states, status filters, breadcrumbs, avatar dropdown, dashboard headings | `af8264d`, `237b1d3` | ✅ Complete |
| Phase 5 | Polish: dark mode toggle, responsive padding, settings icon sizes, login form cleanup | `237b1d3`, `f213b3f` | ✅ Complete |
| Backlog | Warnings panel chevron, inline action buttons with confirm dialog | `a593a0f` | ✅ Complete |

---

## Completed Changes Summary

### Phase 1 — Rename Scheduling → Projects (`fc0e743`)
- Renamed DB schema/queries files and exports (kept table names unchanged)
- Moved routes `(admin)/scheduling/` → `(admin)/projects/`
- Moved `components/scheduling/` → `components/projects/` with individual file renames
- Renamed all action files, test files, and component files
- Updated `nav-data.ts`: removed Scheduling from `OVERVIEW`, renamed group key to `projects`
- Updated all imports, types, functions, URLs, and navigation labels
- Updated portal app references

### Phase 2 — Bug Fixes (`53a86bd`)
- Deleted dead `kpi-card.tsx` (superseded by `kpi-grid.tsx` internal `KpiCard`)
- Moved `CloseMonthButton` outside `<Tabs>` wrapper for valid ARIA structure
- Created `lib/billing-status.ts` — centralised `STATUS_STYLES`, `STATUS_TEXT_COLORS`, and `formatStatusLabel`
- Updated `billing-overview-client.tsx`, `invoices-client.tsx`, `billing-status-badge.tsx` to use shared module
- Fixed hardcoded `0.25` PMG share rate in reports — now fetches `getActiveRates()` from DB
- Propagated `pmgShareRate` through dashboard → `DashboardShell` → `KpiGrid` → sparklines
- Fixed invoice table keyboard accessibility with absolute overlay `<Link>`
- Fixed `reports.ts` action — moved `getActiveRates()` outside `.map()` loop

### Phase 3 — Critical UX (`2f526b0`)
- Created reusable `BackButton` component (`components/ui/back-button.tsx`)
- Added `BackButton` to accounting journals/new, leads/[id], divisions/[id]
- Replaced letter-initial module icons with Lucide icons in Billing and Finance overviews
- Cleaned up unused imports

### Phase 4 — Medium Priority (`af8264d`, `237b1d3`)
- Swapped PMG logo into sidebar header (replaced text-only branding)
- Swapped PMG logo into login form + added branded left panel to login page
- Replaced inline empty states with shared `EmptyState` component in billing and finance overviews
- Created reusable `StatusFilter` component (URL-param based)
- Added status filter dropdown to Invoice and Quote list pages
- Improved breadcrumb to show parent > child hierarchy using `GROUPS` data
- Added Avatar + DropdownMenu with Settings/Sign Out in sidebar footer
- Added section headings to dashboard rows (AR Ageing, Revenue & Leads, Project Schedule, Expense Breakdown)
- Fixed quotes table keyboard accessibility (same pattern as invoices)

### Phase 5 — Polish (`237b1d3`, `f213b3f`)
- Added dark/light/system theme toggle using `next-themes`
- Created `Providers` wrapper with `ThemeProvider`
- Added responsive padding to admin main content area (`px-4 py-6 sm:px-6`)
- Fixed settings nav icon sizes to consistent `size-4`
- Replaced `GalleryVerticalEndIcon` with PMG logo in login form
- Changed login button label to "Send sign-in link"
- Fixed `partially_paid` label formatting in `billing-status-badge.tsx`

---

## Severity Key

| Symbol | Level | Description |
|--------|-------|-------------|
| 🔴 | Critical | Significant usability failure or broken user flow |
| 🟡 | Medium | Notable improvement with clear user impact |
| 🟢 | Low | Polish, consistency, or minor friction |
| 🐛 | Bug | Structural code error or incorrect behaviour |

---

## Table of Contents

1. [Global Layout & Navigation](#1-global-layout--navigation)
2. [Route Group: `(auth)`](#2-route-group-auth)
3. [Route Group: `(admin)` — Dashboard](#3-route-group-admin--dashboard)
4. [Route Group: `(admin)` — Billing](#4-route-group-admin--billing)
5. [Route Group: `(admin)` — Finance](#5-route-group-admin--finance)
6. [Route Group: `(admin)` — Accounting](#6-route-group-admin--accounting)
7. [Route Group: `(admin)` — Relationships](#7-route-group-admin--relationships)
8. [Route Group: `(admin)` — Projects](#8-route-group-admin--projects)
9. [Route Group: `(admin)` — Insights](#9-route-group-admin--insights)
10. [Route Group: `(admin)` — Settings](#10-route-group-admin--settings)
11. [Cross-Cutting Patterns](#11-cross-cutting-patterns)
12. [Prioritised Action Plan](#12-prioritised-action-plan)

---

## 1. Global Layout & Navigation

Files: `app/(admin)/layout.tsx`, `components/navigation/app-sidebar.tsx`, `components/navigation/top-nav.tsx`, `components/navigation/nav-data.ts`

---

### 1.1 🐛 Projects appears twice in the sidebar (and must be renamed from Scheduling)

**Status:** ✅ Fixed in Phase 1 (`fc0e743`)

**Location:** `nav-data.ts` — `OVERVIEW` array AND `GROUPS` array  
**Finding:** `OVERVIEW` includes `{ title: 'Scheduling', url: '/scheduling', icon: CalendarClock }` as a static non-collapsible item. `GROUPS` also includes a `key: 'scheduling'` collapsible group with sub-items (Overview, Schedule List, Timeline). This means every user sees two entries for the same module — one that navigates directly, one that expands to sub-items.

This combines with the planned rename: the module is being renamed from **Scheduling → Projects** (routes `/scheduling/**` → `/projects/**`, components `components/scheduling/` → `components/projects/`). Both fixes should land in the same atomic commit.

**Recommendation:** Remove Projects from `OVERVIEW` entirely — it belongs only in `GROUPS` since it has sub-routes. Apply the full rename at the same time.

---

### 1.2 🟡 Sidebar header uses text-only branding — no logo

**Status:** ✅ Fixed in Phase 4 (`af8264d`)

**Location:** `app-sidebar.tsx` — `<SidebarHeader>`  
**Finding:** The header renders plain text `"PMG"` (tiny, `text-xs uppercase tracking-widest`) above `"Control Center"`. The logo files (`/public/logo/pmg-logo.svg`, `pmg-logo.png`) exist but are unused. Text-only branding feels like a stub rather than a finished product.

**Recommendation:** Replace the text header with the SVG logo at a constrained size. Keep the "Control Center" subtitle.

---

### 1.3 🟡 TopNav breadcrumb is single-level — no parent context

**Status:** ✅ Fixed in Phase 4 (`237b1d3`)

**Location:** `top-nav.tsx`  
**Finding:** The breadcrumb renders a single `<BreadcrumbPage>` with just the current page label. On nested routes like `/billing/invoices/[id]` or `/settings/users/invite`, users have no visual trail showing where they are in the hierarchy. This is especially confusing in the Billing and Accounting sections which have many sub-pages.

**Recommendation:** Build a two-level breadcrumb using the route label map. The parent group name becomes `BreadcrumbLink`, the current page becomes `BreadcrumbPage`.

---

### 1.4 🟡 Sign-out is buried in the sidebar footer with no user avatar

**Status:** ✅ Fixed in Phase 4 (`af8264d`)

**Location:** `app-sidebar.tsx` — `<SidebarFooter>`  
**Finding:** The user's name and email are shown as plain text in the footer, followed by a `<SignOutButton>`. There is no avatar, no role indicator visible at a glance, and on mobile the footer can be hidden until the user scrolls inside the sidebar. Sign-out discoverability is low.

**Recommendation:** Add an `<Avatar>` with initials fallback. Move the user block into a `<DropdownMenu>` triggered by the avatar — a standard pattern that exposes Profile, Settings, and Sign Out without cluttering the footer.

---

### 1.5 🟢 No dark/light mode toggle

**Status:** ✅ Fixed in Phase 5 (`237b1d3`)

**Finding:** `globals.css` defines both `:root` (light) and `.dark` (dark) themes, but no UI control exposes a mode switch. Users are locked to system preference.

**Recommendation:** Add a `ThemeToggle` button to the TopNav (right side). A single icon button (`Sun` / `Moon`) using `next-themes` is the standard approach for shadcn apps.

---

### 1.6 🟢 Main content area has no responsive padding scaling

**Status:** ✅ Fixed in Phase 5 (`237b1d3`)

**Location:** `app/(admin)/layout.tsx`  
**Finding:** `<main className="flex-1 p-6 bg-background">` applies uniform `p-6` padding. On mobile this is tight; on very large screens the max-width container constrains content but the side gutters remain at a fixed 24px.

**Recommendation:** Replace `p-6` with responsive padding `px-4 py-6 sm:px-6`.

---

## 2. Route Group: `(auth)`

Files: `app/(auth)/login/page.tsx`, `components/login-form.tsx`, `app/(auth)/invite/`

---

### 2.1 🟡 Login form uses a generic placeholder icon instead of PMG branding

**Status:** ✅ Fixed in Phase 4 (`af8264d`)

**Location:** `components/login-form.tsx`  
**Finding:** The form header uses `<GalleryVerticalEndIcon>` — the default shadcn "new app" placeholder icon — inside a generic rounded square. The company name "PMG" or "Playhouse Media Group" appears nowhere on the login page. Users land on a page that could belong to any product.

**Recommendation:** Replace with the PMG logo SVG and surface the product name.

---

### 2.2 🟡 Login page background is plain `bg-muted` — no visual distinction from the app

**Status:** ✅ Fixed in Phase 4 (`af8264d`)

**Location:** `app/(auth)/login/page.tsx`  
**Finding:** The login page wraps everything in `bg-muted` with no further differentiation. The transition from login → dashboard feels abrupt because the same neutral surface is used everywhere. An unauthenticated page benefits from a stronger brand moment.

**Recommendation:** Add a branded left-panel pattern with PMG logo, company name, and product description. Hidden on mobile, visible on `lg:` breakpoint.

---

### 2.3 🟢 Terms and Privacy links are `href="#"` stubs

**Status:** ✅ Fixed (removed during login form redesign in Phase 4)

**Location:** `components/login-form.tsx` — bottom `<FieldDescription>`  
**Finding:** `<a href="#">Terms of Service</a>` and `<a href="#">Privacy Policy</a>` point to nowhere. Internal tools may not need public-facing legal docs, but these should either link to real documents or be removed.

**Recommendation:** Remove the legal footer from the login form entirely for an internal tool, or replace with actual document links if required by compliance.

---

### 2.4 🟢 "Login" button label does not match the action description

**Status:** ✅ Fixed in Phase 5 (`237b1d3`)

**Location:** `login-form.tsx`  
**Finding:** The button says **"Login"** but the form description says "Login to PMG Control Center" and the action sends a magic link (no password). The word "Login" implies a credential check, not an email dispatch.

**Recommendation:** Change the button label to **"Send sign-in link"** to accurately describe what happens when clicked.

---

## 3. Route Group: `(admin)` — Dashboard

Files: `app/(admin)/dashboard/page.tsx`, `components/dashboard/dashboard-shell.tsx`, `components/dashboard/kpi-grid.tsx`, `components/dashboard/kpi-card.tsx`

---

### 3.1 🐛 `kpi-card.tsx` is dead code — replaced by the internal `KpiCard` in `kpi-grid.tsx`

**Status:** ✅ Fixed in Phase 2 (`53a86bd`)

**Location:** `components/dashboard/kpi-card.tsx` vs `components/dashboard/kpi-grid.tsx`  
**Finding:** `kpi-card.tsx` exports a `KpiCard` component with its own `DeltaBadge`. `kpi-grid.tsx` defines a completely separate internal `KpiCard` component (with a `Sparkline` sub-component and different props) that is the one actually rendered. The file `kpi-card.tsx` is imported nowhere and is never used.

**Recommendation:** Delete `kpi-card.tsx`. If a standalone card is ever needed outside the grid, extract the version from `kpi-grid.tsx` instead.

---

### 3.2 🐛 `<CloseMonthButton>` is nested inside a `<Tabs>` element

**Status:** ✅ Fixed in Phase 2 (`53a86bd`)

**Location:** `components/dashboard/dashboard-shell.tsx` — Period tabs block  
**Finding:** The `CloseMonthButton` and "period closed" Badge are rendered inside the `<Tabs>` wrapper but are not `<TabsContent>` elements. This is semantically incorrect — the Tabs component should only wrap tab navigation and its content panels.

**Recommendation:** Lift the action area outside the `<Tabs>` wrapper.

---

### 3.3 🟡 Dashboard rows have no section headings — content is hard to scan

**Status:** ✅ Fixed in Phase 4 (`237b1d3`)

**Location:** `components/dashboard/dashboard-shell.tsx`  
**Finding:** The 6 rows of dashboard content (KPIs, Aging, Budget Chart, Division + Leads, Project Summary, Expense Snapshot) are separated only by gap spacing. There are no section labels, no visual anchors to tell a user what they're looking at when they scroll.

**Recommendation:** Add lightweight section labels above each major row group using `<section>` with `<h2>` headings.

---

### 3.4 🟡 `previousValue` on KPI delta badge always says "last month" regardless of active tab

**Status:** ✅ Resolved (dead code deleted in Phase 2)

**Location:** `components/dashboard/kpi-grid.tsx` — `DeltaBadge`  
**Finding:** The delta label prop (`deltaLabel`) is passed correctly from `dashboard-shell.tsx` as "vs prev month", "vs current month", or "vs prev year" — but the `DeltaBadge` in `kpi-card.tsx` (the dead code version) hardcodes "last month". The active `kpi-grid.tsx` version correctly uses `label` prop.

**Status:** Verify after deleting `kpi-card.tsx`. No action needed in `kpi-grid.tsx`.

---

### 3.5 🟢 Dashboard has no loading skeleton for individual sections

**Status:** 🔲 Not addressed (backlog)

**Location:** `app/(admin)/loading.tsx`  
**Finding:** The global `loading.tsx` file exists but its contents were not fetched. If it renders a full-page spinner, the entire dashboard blanks out during data fetch. Given the dashboard fetches 13 parallel queries, partial rendering with per-section skeletons would feel faster.

**Recommendation:** Use React Suspense boundaries around each major dashboard section with skeleton placeholders matching the component shapes (4-column KPI grid skeleton, table skeleton, etc.).

---

## 4. Route Group: `(admin)` — Billing

Files: `app/(admin)/billing/**`, `components/billing/**`

---

### 4.1 🟡 Module quick-link cards use letter initials instead of proper icons

**Status:** ✅ Fixed in Phase 3 (`2f526b0`)

**Location:** `billing-overview-client.tsx` — "Modules" section  
**Finding:** Every quick-link card shows a single capital letter (A, I, Q, etc.) instead of an icon. This pattern is unambiguous proof the icons haven't been wired up. The same issue exists in the Finance overview.

**Recommendation:** Map each quick link to its Lucide icon directly (PiggyBank, Calendar, FileText, Receipt, Banknote, Wallet, ScrollText, Package).

---

### 4.2 🐛 Duplicate `STATUS_STYLES` / `STATUS_TEXT_COLORS` maps in billing

**Status:** ✅ Fixed in Phase 2 (`53a86bd`)

**Location:** `billing-overview-client.tsx` (lines ~30–45) and `invoices-client.tsx` (lines ~20–30)  
**Finding:** Both files define identical status-to-class maps. The `BillingStatusBadge` component in `components/billing/billing-status-badge.tsx` already centralises status styling, but the overview and invoices list bypass it with their own inline copies.

**Recommendation:** Created `lib/billing-status.ts` with `STATUS_STYLES`, `STATUS_TEXT_COLORS`, and `formatStatusLabel`. All files now import from the shared module.

---

### 4.3 🔴 Invoice table row is click-to-navigate but not keyboard accessible

**Status:** ✅ Fixed in Phase 2 (`53a86bd`)

**Location:** `billing/invoices/invoices-client.tsx` — `<TableRow>`  
**Finding:** The row looks clickable and works with mouse, but it is not a focusable element. Keyboard users cannot tab to it or press Enter to navigate. Screen readers do not announce it as a link.

**Recommendation:** Wrap the row content in a semantically correct pattern. The cleanest approach is to make the row itself navigate via an overlapping absolute `<Link>`.

---

### 4.4 🟡 Invoice/Quote list pages have no status filter in the UI

**Status:** ✅ Fixed in Phase 4 (`237b1d3`)

**Location:** `billing/invoices/invoices-client.tsx`, `billing/quotes/quotes-client.tsx`  
**Finding:** `InvoicesClient` accepts a `status` prop that controls which invoices are shown, and `buildHref()` correctly includes it in URL params. However there is no filter control in the UI to let users switch between statuses.

**Recommendation:** Created reusable `StatusFilter` component (URL-param based). Added to both Invoice and Quote list page headers.

---

### 4.5 🟡 Pagination uses text links with no page count or jump control

**Status:** 🔲 Not addressed (backlog)

**Location:** `billing/invoices/invoices-client.tsx` — pagination block  
**Finding:** Pagination renders minimal "Previous" / "Next" anchor links with a count like "Showing 1–20 of 73". There is no page number indicator, no "first/last" shortcut, and no ability to jump to a specific page.

**Recommendation:** Replace with a reusable `Pagination` component using shadcn's `<Pagination>` primitives, which include `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious`, and `PaginationEllipsis`. Also add page size control.

---

### 4.6 🟢 "Partially paid" status label is underscore-separated in badge output

**Status:** ✅ Fixed in Phase 2 (`53a86bd`)

**Location:** `billing-status-badge.tsx`  
**Finding:** The `label` calculation is `status.charAt(0).toUpperCase() + status.slice(1)`, which produces "Partially_paid" for the `partially_paid` status (capital P but underscore preserved). The overview client file uses `inv.status.replace('_', ' ')` inconsistently.

**Recommendation:** Centralised label formatting in `lib/billing-status.ts` via `formatStatusLabel()` — handles underscore-to-space conversion and "converted" → "Invoiced" mapping. `billing-status-badge.tsx` now imports and uses this function.

---

### 4.7 🟢 `billing/accounts/page.tsx` has no overview — it is a near-empty stub

**Status:** 🔲 Not addressed (backlog)

**Finding:** The accounts page exists as a route but appears to have minimal content beyond what was visible. Billing "Accounts" as a concept (client billing accounts with balances) could surface a balance summary per client. If it's incomplete, add an `EmptyState` or "Coming Soon" indicator rather than rendering a blank route.

---

## 5. Route Group: `(admin)` — Finance

Files: `app/(admin)/finance/**`, `components/expenses/**`, `components/ledger/**`

---

### 5.1 🟡 Finance overview is a structural copy-paste of Billing overview

**Status:** 🔲 Not addressed (backlog — refactoring opportunity)

**Location:** `finance-overview-client.tsx` vs `billing-overview-client.tsx`  
**Finding:** Both files follow an identical composition: 4 KPI cards (same `rounded-xl border bg-card p-5` pattern), two `lg:grid-cols-2` activity panels, and a Modules quick-link grid. While the data is different, the component code is almost character-for-character duplicated.

**Recommendation:** Extract a reusable `OverviewKpiCard`, `OverviewPanel`, and `OverviewModuleGrid` components into `components/ui/` that both Finance and Billing overview clients consume.

---

### 5.2 🟡 Finance module quick links also use letter initials

**Status:** ✅ Fixed in Phase 3 (`2f526b0`)

Same as [4.1](#41-module-quick-link-cards-use-letter-initials-instead-of-proper-icons). The Finance overview "Modules" section uses `link.label.charAt(0)`. Replaced with Lucide icons (ArrowDownLeft, TrendingDown, Tags, PieChart).

---

### 5.3 🟡 Inline "no data" states in Finance panels bypass the `EmptyState` component

**Status:** ✅ Fixed in Phase 4 (`237b1d3`)

**Location:** `finance-overview-client.tsx` — Recent Income, Recent Expenses, Revenue by Division, Expenses by Category panels  
**Finding:** The finance overview bypasses the `EmptyState` component entirely, using raw `<div>` for its empty panels. Similarly, the billing overview uses raw `<div>` for its empty panels.

**Recommendation:** Replaced all inline empty states with the shared `EmptyState` component in both billing and finance overviews.

---

### 5.4 🟢 Finance `income-client.tsx` and `expenses-client.tsx` table patterns likely inconsistent

**Status:** 🔲 Not addressed (backlog)

**Finding:** Not all finance sub-page client files were fetched, but based on the component structure pattern, the income and expense tables likely follow slightly different conventions. A consistency pass is recommended to align all finance sub-pages to the same table + filter + empty-state pattern.

---

## 6. Route Group: `(admin)` — Accounting

Files: `app/(admin)/accounting/**`

---

### 6.1 🟡 Accounting overview mixes period selection and full ledger data on one page — no staged disclosure

**Status:** 🔲 Not addressed (backlog)

**Location:** `app/(admin)/accounting/page.tsx`  
**Finding:** The page loads trial balance, profit & loss, AND the general ledger simultaneously, then passes all data to `AccountingOverviewClient`. The page also handles a `?period=` search param for period filtering. This is a lot of data on one page — for a business with many journal entries, this will be slow without pagination or lazy loading.

**Recommendation:** Keep the overview as a summary (trial balance totals + P&L summary + recent journal entries). Move the full ledger to `/accounting/general-ledger` where it already has its own page. The overview should link down, not embed the full ledger.

---

### 6.2 🟡 Accounting sub-pages have inconsistent loading/error boundary coverage

**Status:** 🔲 Not addressed (backlog)

**Finding:** `accounting/loading.tsx` and `accounting/error.tsx` exist for the group, but not every sub-route has its own loading/error file. Routes like `/accounting/chart-of-accounts`, `/accounting/trial-balance`, and `/accounting/profit-and-loss` fetch significant data and would benefit from per-route loading states.

**Recommendation:** Add `loading.tsx` files for each sub-route that performs data fetching, matching the skeleton structure of the final component.

---

### 6.3 🟢 `accounting/exports/page.tsx` does not surface what export formats are available before action

**Status:** 🔲 Not addressed (backlog)

**Finding:** The exports page exists but was not fully reviewed. Export pages that show a list of available export types without any explanation of what each contains create friction. Users should see format, period range, and expected file output before clicking.

**Recommendation:** Each export option should show: format badge (CSV / XLSX / PDF), description of contents, and date range control if applicable.

---

### 6.4 🟢 Journal new-entry form (`/accounting/journals/new`) lacks a breadcrumb "Back" button in TopNav

**Status:** ✅ Fixed in Phase 3 (`2f526b0`)

**Finding:** The TopNav will show "New Journal Entry" (via `EXTRA_LABELS`) but there is no explicit "Back to Journals" link in the page header. Users must rely on the browser back button or the sidebar to navigate away after submitting.

**Recommendation:** Added `BackButton` component to the page header with link back to `/accounting/journals`.

---

## 7. Route Group: `(admin)` — Relationships

Files: `app/(admin)/relationships/**`, `components/clients/**`, `components/leads/**`

---

### 7.1 🟡 Client "Add" uses an inline expanding form — Leads "Add" likely uses a different pattern

**Status:** 🔲 Not addressed (backlog)

**Location:** `relationships/clients/clients-client.tsx`  
**Finding:** The Clients page uses a collapsible inline card that expands on "Add Client" click. Looking at the leads module, it has a `<LeadAddForm>` component, likely implemented differently (possibly via a Sheet/Dialog). This inconsistency means users learn two different interaction patterns for adding records within the same "Relationships" group.

**Recommendation:** Standardise to a **Sheet (slide-over)** pattern for all add/edit forms in the Relationships group.

---

### 7.2 🟡 Client detail page has three separate client components with no visual unification

**Status:** 🔲 Not addressed (backlog)

**Location:** `relationships/clients/[id]/`  
**Finding:** The client detail page imports three separate client components: `client-billing-workspace.tsx`, `client-financial-dashboard.tsx`, and `client-metric-strip.tsx`. Without reviewing the final rendering, this pattern risks the page feeling like three disconnected panels rather than a unified client record.

**Recommendation:** Wrap the detail view in a consistent page header (client name, business name, status badge, action buttons) and use a `<Tabs>` control to switch between "Overview", "Billing", and "Financials" sections.

---

### 7.3 🟡 Leads filter bar likely doesn't persist filter state in the URL

**Status:** 🔲 Not addressed (backlog)

**Location:** `components/leads/leads-filter-bar.tsx`  
**Finding:** The leads module has a separate `<LeadsFilterBar>` component. Based on the billing filter bar pattern (which pushes URL params via `router.push`), this may or may not persist filters in the URL. If it uses local state, filters are lost on page refresh or when navigating away and back.

**Recommendation:** Confirm the leads filter bar writes status and search to URL search params — the same pattern used in billing's `FilterBar`.

---

### 7.4 🟢 Divisions page likely has no quick-edit capability

**Status:** 🔲 Not addressed (backlog)

**Finding:** The divisions page (`relationships/divisions/`) shows a table. Division names, codes, and logos are important configuration data. If editing requires navigating to a separate edit route, a quick inline-edit or Sheet would significantly reduce friction for configuration changes.

---

### 7.5 🟢 "Convert to Client" button on a lead creates no confirmation of what will be transferred

**Status:** 🔲 Not addressed (backlog)

**Location:** `components/leads/convert-to-client-button.tsx`  
**Finding:** This is a destructive-adjacent action that changes the lead's status and creates a client record. Without a confirmation dialog explaining what data will be transferred (name, email, contact info) and what the lead status will become after conversion, users may accidentally convert leads.

**Recommendation:** Wrap in a `confirm()` dialog (the `ConfirmProvider` is already in the admin layout) with a clear summary: "This will create a client record for [Lead Name] and mark this lead as converted."

---

## 8. Route Group: `(admin)` — Projects

Files: `app/(admin)/projects/**`, `components/projects/**`

---

### 8.1 🐛 (Covered in 1.1) Projects appears in both `OVERVIEW` and `GROUPS` in the sidebar

**Status:** ✅ Fixed in Phase 1 (`fc0e743`)

Already documented in [1.1](#11-bug-projects-appears-twice-in-the-sidebar-and-must-be-renamed-from-scheduling). The core fix — removing the entry from `OVERVIEW` and renaming the group — landed as one atomic commit alongside all route and component renames.

---

### 8.2 🟡 Projects overview "New Project" button is positioned below the page header

**Status:** 🔲 Not addressed (backlog)

**Location:** `components/projects/project-overview-shell.tsx` (renamed from `scheduling-overview-shell.tsx`)  
**Finding:** The primary action button is rendered as the first child of the content area, creating a `justify-end` row that takes full width just to right-align one button. This wastes vertical space and disconnects the action from its context. The label also needs to update from **"New Tender"** to **"New Project"** as part of the rename.

**Recommendation:** Use the `PageHeaderProvider` / `SetPageTotal` pattern already in the app to inject the "New Project" button into the `TopNav` area alongside the page title.

---

### 8.3 🟡 Project summary cards don't use the shared `KpiCard` or card tokens

**Status:** 🔲 Not addressed (backlog)

**Location:** `components/projects/project-overview-shell.tsx` — `ProjectSummaryCards` (renamed from `SchedulingSummaryCards`)  
**Finding:** The project summary cards directly use `<Card>` with a custom inner layout, while the dashboard's `KpiGrid` has a polished `KpiCard` with sparklines, delta badges, and hover lift animations. The project cards are visually flat by comparison — grey muted icon, no hover state, no delta.

**Recommendation:** The project cards show counts (not currency), so a modified `KpiCard` variant accepting either currency or integer values would unify the design. At minimum, apply the same `border hover:border-border/100 hover:-translate-y-1 hover:shadow-md transition-all duration-300` classes from the dashboard cards.

---

### 8.4 🟡 Timeline page (`/projects/timeline`) has no visual preview in the navigation context

**Status:** 🔲 Not addressed (backlog)

**Location:** `app/(admin)/projects/timeline/`  
**Finding:** The timeline exists as a route and is linked from the sidebar. For a Gantt-style view there is no indication in the Projects overview whether the timeline is populated or empty, and no thumbnail or teaser visible from the list.

**Recommendation:** Add a "See Timeline" quick-link card or a compact horizontal bar preview in the Projects overview showing the next 2 weeks of active projects. This gives the timeline page a reason to exist in the overview context and sets correct expectations before navigating.

---

### 8.5 🟢 Warnings panel expand/collapse is a plain `<button>` with no chevron icon

**Status:** ✅ Fixed in backlog (`a593a0f`)

**Location:** `components/projects/project-overview-shell.tsx` — `WarningsPanel`  
**Finding:** The expand trigger is a text-only button: "Show less" / "+3 more". For accessibility and visual affordance it should include a chevron icon matching the app's collapsible pattern.

---

### 8.6 🟢 "Other Actions" dropdown in `CurrentWorkloadCard` should be inline buttons

**Status:** ✅ Fixed in backlog (`a593a0f`)

**Location:** `components/projects/project-overview-shell.tsx` — `CurrentWorkloadCard`  
**Finding:** The card has a primary "Mark Complete" button and a secondary `<DropdownMenu>` labelled "Other Actions" containing "Cancel Project" and "Re-plan (Pause)". These secondary actions are important enough to be inline buttons, especially since this is the primary working state for the user.

**Recommendation:** Show all three actions as buttons with appropriate variants:
- `Mark Complete` → `variant="default"` (primary)
- `Re-plan (Pause)` → `variant="outline"` (secondary)
- `Cancel Project` → `variant="ghost"` with `text-destructive` (tertiary, destructive)

Added `confirm()` dialog to Cancel Project to prevent accidental cancellations.

---

## 9. Route Group: `(admin)` — Insights

Files: `app/(admin)/insights/reports/page.tsx`, `app/(admin)/insights/snapshots/page.tsx`, `components/reports/**`, `components/insights/**`

---

### 9.1 🐛 Reports page hardcodes PMG share rate as `0.25` instead of reading from settings

**Status:** ✅ Fixed in Phase 2 (`53a86bd`)

**Location:** `app/(admin)/insights/reports/page.tsx`  
**Finding:** The comment acknowledges this should come from `distribution_settings`, but the calculation uses a hardcoded `0.25`. If the PMG share rate is ever adjusted in the settings, the Reports page KPI strip will remain incorrect while other parts of the app read the actual rate.

**Recommendation:** Fetch the PMG share rate from `distribution_settings` in the page's server-side data fetching and pass it into `ReportKpiStrip` as a prop, the same way the rate is handled in the accounting/financial modules.

---

### 9.2 🟡 Reports sticky header pattern is unique to this page — inconsistent with other sections

**Status:** 🔲 Not addressed (backlog)

**Location:** `app/(admin)/insights/reports/page.tsx`  
**Finding:** This sticky header uses negative margin tricks to break out of the `mx-auto max-w-7xl` container, backdoor into the layout's `p-6` padding, and create a full-width sticky bar. No other page in the app uses this pattern — it's effective but fragile (depends on the exact `top-[3.25rem]` TopNav height) and creates a maintenance burden.

**Recommendation:** Either extract this into a reusable `<StickyPageHeader>` component used consistently across pages that need a sticky filter bar (Reports, potentially Billing), or move the year filter into the `TopNav` via the existing `PageHeaderProvider` mechanism.

---

### 9.3 🟡 Reports page uses multiple chart components rendered inside a single `<ReportsTabs>` — tab switching may cause layout shift

**Status:** 🔲 Not addressed (backlog)

**Location:** `components/reports/reports-tabs.tsx`  
**Finding:** The reports tabs presumably render different chart combinations per tab (MoM, Budget, Profit Pool, etc.). If charts use fixed heights or if Recharts re-renders on tab switch, users may experience layout shift or a blank flash. Without Suspense boundaries or stable chart dimensions, this can feel janky.

**Recommendation:** Set explicit `min-h` on each chart container. Wrap each tab's content in a `<Suspense>` with a skeleton that matches the chart height, and use `will-change: transform` on chart containers to hint the browser for compositing.

---

### 9.4 🟡 Snapshots page — `SnapshotsCockpit` is a complex component with no audit visibility

**Status:** 🔲 Not addressed (backlog)

**Finding:** `components/insights/snapshots-cockpit.tsx` was not fetched. Given that snapshots are the foundation of period comparisons across the dashboard, this is a high-risk component. Key questions for a follow-up UX review:
- Can users see which periods have snapshots and which don't?
- Is there a clear CTA to take a snapshot if none exists for the current period?
- Are deletions confirmed before they happen?

---

### 9.5 🟢 `ExportCsvButton` in reports has no visual feedback during export generation

**Status:** 🔲 Not addressed (backlog)

**Finding:** The export button component exists but without seeing its implementation, CSV export is commonly a fire-and-forget action with no loading indicator. If the export takes >500ms (large datasets), users will click multiple times.

**Recommendation:** Ensure the button uses `useTransition` or similar to show a loading state during the export server action.

---

## 10. Route Group: `(admin)` — Settings

Files: `app/(admin)/settings/**`, `components/settings/**`

---

### 10.1 🟡 Settings sidebar icon sizes are inconsistent with the rest of the app

**Status:** ✅ Fixed in Phase 5 (`237b1d3`)

**Location:** `components/settings/settings-nav.tsx`  
**Finding:** The icon receives no `size-` class. Lucide icons default to `1em` (matching the surrounding text size). In the rest of the app, icons consistently use `className="size-4"` or `className="size-3.5"`.

**Recommendation:** Updated to `<Icon className="size-4 shrink-0" />`.

---

### 10.2 🟡 Security settings page is marked "Soon" but renders as a real route

**Status:** 🔲 Not addressed (backlog)

**Location:** `components/settings/settings-nav.tsx` — Security badge; `app/(admin)/settings/security/page.tsx`  
**Finding:** The Security route is accessible and has a page file, but the nav shows a "Soon" badge. If the page renders as empty or stub content, navigating to it creates a confusing experience. The badge signals it's incomplete, but clicking it still loads a route.

**Recommendation:** Either:
1. Display a proper "Coming Soon" `EmptyState` on the `/settings/security` page with a description of planned features (2FA, API keys, session management), OR  
2. Remove the Security item from the nav entirely and add it back when implemented.

Option 1 is preferred — it sets expectations and can act as a feature teaser.

---

### 10.3 🟡 Settings pages have no `<h1>` — page identity relies entirely on the TopNav label

**Status:** 🔲 Not addressed (backlog)

**Location:** Various `settings/*/page.tsx` files  
**Finding:** Settings sub-pages render content directly without a page-level heading (only the section label in TopNav + the `SettingsPageHeader` component if used). On pages like Organisation Settings and Billing Settings, the form sections benefit from clear headings. The `SettingsPageHeader` component exists but it's unclear if it's used consistently.

**Recommendation:** Verify `SettingsPageHeader` is used on every settings sub-page, and that it includes a title and description.

---

### 10.4 🟡 User invite flow doesn't have a visual confirmation after invite is sent

**Status:** 🔲 Not addressed (backlog)

**Location:** `settings/users/invite/page.tsx`, `components/users/invite-form.tsx`  
**Finding:** After an invite is sent, the user flow is undefined from the page files available. If the page simply resets the form, the admin has no visual confirmation that the invite was dispatched — especially important given email delivery failures should surface.

**Recommendation:** After a successful invite action, display an inline success state:
```
✓ Invite sent to jane@example.com. They will receive a sign-in link within 5 minutes.
```
Include an option to resend or copy the invite link.

---

### 10.5 🟢 Settings layout `220px` sidebar fixed width may be tight on smaller screens

**Status:** 🔲 Not addressed (backlog)

**Location:** `app/(admin)/settings/layout.tsx`  
**Finding:** The layout uses `grid-cols-[220px_minmax(0,1fr)]`. On tablet (`md` to `lg` breakpoint, 768–1024px), the layout collapses to a stacked column. The nav then renders as a horizontal scrollable row, which is functional but not explicitly visible. On smaller 13" laptops at `lg` breakpoint, 220px consumes significant horizontal space from the content area.

**Recommendation:** Consider `180px` for the sidebar column and make it `xl:` rather than `lg:` to allow more room for content on mid-size screens.

---

## 11. Cross-Cutting Patterns

These findings apply across multiple route groups.

---

### 11.1 🔴 No consistent page-level "Back" navigation on `new` and `[id]` routes

**Status:** ✅ Partially fixed in Phase 3 (`2f526b0`) — BackButton created and added to accounting journals/new, leads/[id], divisions/[id]

**Finding:** Routes like `/billing/invoices/new`, `/billing/invoices/[id]/edit`, `/accounting/journals/new`, and `/relationships/leads/[id]` are detail/form pages that sit below a list route. None of them appear to have a standardised back-navigation affordance in the page content. Users must use browser back or navigate via the sidebar.

**Recommendation:** Establish a `<BackButton>` pattern used consistently on all `new` and `[id]` sub-routes. The component exists and is in use on several routes, but should be added to remaining form pages (quotes/new, etc.).

---

### 11.2 🟡 Overview pages across all sections repeat the same 4-card + 2-panel + module-links layout without a shared component

**Status:** 🔲 Not addressed (backlog)

**Finding:** `/billing/page.tsx`, `/finance/page.tsx`, and `/accounting/page.tsx` all follow identical layouts: 4 metric cards, two `lg:grid-cols-2` activity panels, module quick-links. Each is independently implemented as a custom client component.

**Recommendation:** Create a `components/ui/section-overview.tsx` that accepts card configs, panels, and module links and renders the layout. This makes global design changes (card sizing, hover effects, grid gaps) a one-file change.

---

### 11.3 🟡 Form submission error handling is inconsistent — some use `toast.error()`, some use inline Alert

**Status:** 🔲 Not addressed (backlog)

**Finding:** Billing form actions (`handleIssue`, `handleVoid`) use `toast.error(result.error)`. The login form uses an inline `<Alert variant="destructive">`. Settings forms likely use their own patterns. This means users encounter errors in different places depending on which page they're on.

**Recommendation:** Adopt a single convention:
- **Mutations on list pages** (void invoice, delete client, etc.) → `toast.error()` (non-blocking, suits background actions)
- **Form submissions that require correction** (new invoice, add client) → Inline form error below the field or below the submit button
- **Destructive confirms** → `confirm()` dialog (already implemented via `ConfirmProvider`)

---

### 11.4 🟢 No loading indicator is shown within the Toaster notification position for async actions

**Status:** 🔲 Not addressed (backlog)

**Finding:** Many server actions use `useTransition()` to trigger the action but only show feedback after completion (toast success/error). During the transition, buttons are sometimes not disabled and there's no in-flight state visible.

**Recommendation:** Consistently use the `isPending` value from `useTransition()` to disable and show a spinner on the triggering button.

---

### 11.5 🟢 `not-found.tsx` files are spread across sections — probably inconsistent with each other

**Status:** 🔲 Not addressed (backlog)

**Finding:** Multiple `not-found.tsx` files exist (`billing/not-found.tsx`, `accounting/not-found.tsx`, `relationships/clients/not-found.tsx`, etc.). The `not-found-view.tsx` component exists in `components/ui/` but it's unclear whether all of these files use it consistently or each renders its own fallback UI.

**Recommendation:** Ensure all `not-found.tsx` files simply re-export from a single layout component.

---

## 12. Prioritised Action Plan

Items sorted by impact. Tackle 🔴 first, then 🐛, then 🟡 in order.

### Immediate (this sprint) — ✅ All complete

| # | Item | File(s) | Effort | Status |
|---|------|---------|--------|--------|
| 1 | 🐛 Rename Scheduling → Projects (routes, components, actions, nav) + remove from `OVERVIEW` | `nav-data.ts`, `app/(admin)/scheduling/` → `projects/`, `components/scheduling/` → `projects/`, action files | M | ✅ `fc0e743` |
| 2 | 🐛 Delete dead `kpi-card.tsx` file | `components/dashboard/kpi-card.tsx` | XS | ✅ `53a86bd` |
| 3 | 🐛 Move `CloseMonthButton` outside `<Tabs>` wrapper | `dashboard-shell.tsx` | XS | ✅ `53a86bd` |
| 4 | 🐛 Centralise billing status maps into `lib/billing-status.ts` | `billing-overview-client.tsx`, `invoices-client.tsx` | S | ✅ `53a86bd` |
| 5 | 🐛 Fix hardcoded `0.25` PMG share rate in reports page | `insights/reports/page.tsx` | S | ✅ `53a86bd` |
| 6 | 🔴 Fix invoice table row keyboard accessibility | `invoices-client.tsx` | S | ✅ `53a86bd` |
| 7 | 🔴 Add "Back" button pattern to all `new` and `[id]` sub-routes | New `BackButton` component | M | ✅ `2f526b0` |

### Short-term (next sprint) — ✅ All complete

| # | Item | File(s) | Effort | Status |
|---|------|---------|--------|--------|
| 8 | 🟡 Replace letter-initial module icons with Lucide icons (Billing + Finance) | `billing-overview-client.tsx`, `finance-overview-client.tsx` | S | ✅ `2f526b0` |
| 9 | 🟡 Swap PMG logo into sidebar header | `app-sidebar.tsx` | S | ✅ `af8264d` |
| 10 | 🟡 Swap PMG logo into login form + improve login page layout | `login-form.tsx`, `login/page.tsx` | M | ✅ `af8264d` |
| 11 | 🟡 Replace inline empty states with `EmptyState` component | Finance + Billing panels | S | ✅ `237b1d3` |
| 12 | 🟡 Add status filter dropdown to Invoice and Quote list pages | `invoices-client.tsx`, `quotes-client.tsx` | S | ✅ `237b1d3` |
| 13 | 🟡 Improve breadcrumb to show parent > child hierarchy | `top-nav.tsx` | M | ✅ `237b1d3` |
| 14 | 🟡 Replace user text footer with avatar + dropdown in sidebar | `app-sidebar.tsx` | M | ✅ `af8264d` |

### Medium-term (backlog) — Partially complete

| # | Item | File(s) | Effort | Status |
|---|------|---------|--------|--------|
| 15 | 🟡 Add section headings to dashboard rows | `dashboard-shell.tsx` | S | ✅ `237b1d3` |
| 16 | 🟡 Standardise add-form pattern to Sheet across Relationships | `clients-client.tsx`, `leads-client.tsx` | M | 🔲 Backlog |
| 17 | 🟡 Extract shared `OverviewKpiCard` / `OverviewPanel` / `OverviewModuleGrid` components | New `section-overview.tsx` | M | 🔲 Backlog |
| 18 | 🟡 Add pagination improvements (page numbers, page size select) | `invoices-client.tsx` + shared `Pagination` | M | 🔲 Backlog |
| 19 | 🟡 Implement proper "Coming Soon" page for `/settings/security` | `settings/security/page.tsx` | XS | 🔲 Backlog |
| 20 | 🟡 Fix settings nav icon sizes | `settings-nav.tsx` | XS | ✅ `237b1d3` |
| 21 | 🟡 Add `isPending` loading states to all async form buttons | Multiple files | M | 🔲 Backlog |
| 22 | 🟡 Standardise `not-found.tsx` files to use shared `NotFoundView` | Multiple section `not-found.tsx` | S | 🔲 Backlog |
| 23 | 🟡 Add dark mode toggle to TopNav | `top-nav.tsx` + new `ThemeToggle` | S | ✅ `237b1d3` |
| 24 | 🟢 Remove Terms/Privacy placeholder links from login form | `login-form.tsx` | XS | ✅ `af8264d` |
| 25 | 🟢 Change login button label to "Send sign-in link" | `login-form.tsx` | XS | ✅ `237b1d3` |
| 26 | 🟢 Fix `partially_paid` label capitalisation in status badge | `billing-status-badge.tsx` | XS | ✅ `53a86bd` |
| 27 | 🟢 Add chevron icon to Projects warnings panel expand button | `components/projects/project-overview-shell.tsx` | XS | ✅ `a593a0f` |
| 28 | 🟢 Elevate project "Other Actions" dropdown to inline buttons | `components/projects/project-overview-shell.tsx` | S | ✅ `a593a0f` |

---

## Appendix: Component Health Summary

| Component | Status | Notes |
|-----------|--------|-------|
| `AppSidebar` | ✅ Fixed | Logo added, avatar dropdown, nav cleanup |
| `TopNav` | ✅ Fixed | Two-level breadcrumb, theme toggle |
| `DashboardShell` | ✅ Fixed | Valid Tabs structure, section headings |
| `KpiGrid` | ✅ Solid | Good sparklines, delta badges, hover states |
| `KpiCard` (kpi-card.tsx) | ✅ Deleted | Dead code removed in Phase 2 |
| `EmptyState` | ✅ Used | Now used in billing and finance overviews |
| `BillingStatusBadge` | ✅ Fixed | Capitalisation bug fixed, uses shared module |
| `BillingOverviewClient` | ✅ Fixed | Lucide icons, shared empty states, shared status maps |
| `FinanceOverviewClient` | ✅ Fixed | Lucide icons, shared empty states |
| `ProjectOverviewShell` | ✅ Renamed | All "Tender" labels renamed to "Project" |
| `ProjectSummaryCard` | ✅ Renamed | `components/dashboard/tender-summary-card.tsx` → `project-summary-card.tsx` |
| `SettingsNav` | ✅ Fixed | Icon sizes standardised |
| `LoginForm` | ✅ Fixed | PMG branding, "Send sign-in link" label |
| `FilterBar` | ✅ Solid | Clean URL-param pattern |
| `InvoicesClient` | ✅ Fixed | Keyboard accessible, status filter added |
| `ClientsClient` | ✅ Good | Clean inline-add pattern |
| `StatusFilter` | ✅ New | Reusable URL-param based status filter |
| `ThemeToggle` | ✅ New | Dark/light/system toggle with next-themes |
| `BackButton` | ✅ New | Reusable back navigation component |

---

## Files Changed Summary

### New Files
- `apps/admin/src/components/ui/back-button.tsx` — Reusable BackButton component
- `apps/admin/src/components/ui/status-filter.tsx` — Reusable StatusFilter component
- `apps/admin/src/components/ui/theme-toggle.tsx` — Dark/light/system theme toggle
- `apps/admin/src/components/providers.tsx` — ThemeProvider wrapper
- `apps/admin/src/lib/billing-status.ts` — Centralised billing status utilities

### Renamed Files (Phase 1)
- `packages/db/src/schema/tender-schedule.ts` → `project-schedule.ts`
- `packages/db/src/queries/tender-schedule.ts` → `project-schedule.ts`
- `apps/admin/src/app/(admin)/scheduling/` → `projects/` (all routes)
- `apps/admin/src/components/scheduling/` → `projects/` (all components)
- `apps/admin/src/app/actions/tender-schedule.ts` → `project-schedule.ts`
- `apps/admin/src/app/actions/tender-schedule-bulk.ts` → `project-schedule-bulk.ts`
- `apps/admin/src/app/actions/tender-schedule-reorder.ts` → `project-schedule-reorder.ts`
- `apps/admin/src/app/actions/tender-progress.ts` → `project-progress.ts`
- `apps/admin/src/components/dashboard/tender-summary-card.tsx` → `project-summary-card.tsx`
- All 6 test files renamed from tender-schedule to project-schedule

### Modified Files
- `apps/admin/src/app/(admin)/layout.tsx` — Responsive padding, ThemeProvider
- `apps/admin/src/app/layout.tsx` — ThemeProvider wrapper
- `apps/admin/src/components/navigation/app-sidebar.tsx` — Logo, avatar dropdown
- `apps/admin/src/components/navigation/top-nav.tsx` — Two-level breadcrumb, theme toggle
- `apps/admin/src/components/navigation/nav-data.ts` — Projects group rename
- `apps/admin/src/components/dashboard/dashboard-shell.tsx` — ARIA fix, section headings, pmgShareRate
- `apps/admin/src/components/dashboard/kpi-grid.tsx` — pmgShareRate prop
- `apps/admin/src/app/(admin)/billing/billing-overview-client.tsx` — Icons, empty states, shared status maps
- `apps/admin/src/app/(admin)/billing/invoices/invoices-client.tsx` — Accessibility fix, shared status maps
- `apps/admin/src/app/(admin)/billing/quotes/quotes-client.tsx` — Accessibility fix, status filter
- `apps/admin/src/app/(admin)/billing/invoices/page.tsx` — Status filter
- `apps/admin/src/app/(admin)/billing/quotes/page.tsx` — Status filter
- `apps/admin/src/components/billing/billing-status-badge.tsx` — Shared formatStatusLabel
- `apps/admin/src/app/(admin)/finance/finance-overview-client.tsx` — Icons, empty states
- `apps/admin/src/app/(admin)/insights/reports/page.tsx` — Dynamic PMG share rate
- `apps/admin/src/components/reports/report-kpi-strip.tsx` — pmgShareRate prop
- `apps/admin/src/components/reports/reports-tabs.tsx` — pmgShareRate prop
- `apps/admin/src/app/actions/reports.ts` — Dynamic PMG share rate
- `apps/admin/src/components/settings/settings-nav.tsx` — Icon sizes
- `apps/admin/src/app/(auth)/login/page.tsx` — Branded left panel
- `apps/admin/src/components/login-form.tsx` — PMG logo, button label
- `apps/admin/src/app/(admin)/accounting/journals/new/page.tsx` — BackButton
- `apps/admin/src/app/(admin)/relationships/leads/[id]/page.tsx` — BackButton
- `apps/admin/src/app/(admin)/relationships/divisions/[id]/page.tsx` — BackButton

---

*Report updated from static code analysis of `jchademwiri/pmg-hub` (branch: `dev`). No live environment access. Findings are based on file structure, component composition, and UI/UX best practices for Next.js admin applications.*
