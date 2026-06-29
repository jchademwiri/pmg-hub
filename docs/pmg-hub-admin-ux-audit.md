# PMG Hub — Admin App UI/UX Audit
**Repo:** `jchademwiri/pmg-hub` · **Branch:** `dev`  
**App:** `apps/admin` (Next.js 16, Tailwind CSS, shadcn/ui, Drizzle ORM)  
**Date:** 2026-06-29  
**Auditor:** Claude (Anthropic) — commissioned by Jacob Chademwiri

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

**Location:** `nav-data.ts` — `OVERVIEW` array AND `GROUPS` array  
**Finding:** `OVERVIEW` includes `{ title: 'Scheduling', url: '/scheduling', icon: CalendarClock }` as a static non-collapsible item. `GROUPS` also includes a `key: 'scheduling'` collapsible group with sub-items (Overview, Schedule List, Timeline). This means every user sees two entries for the same module — one that navigates directly, one that expands to sub-items.

This combines with the planned rename: the module is being renamed from **Scheduling → Projects** (routes `/scheduling/**` → `/projects/**`, components `components/scheduling/` → `components/projects/`). Both fixes should land in the same atomic commit.

**Recommendation:** Remove Projects from `OVERVIEW` entirely — it belongs only in `GROUPS` since it has sub-routes. Apply the full rename at the same time.

```ts
// BEFORE (nav-data.ts)
export const OVERVIEW: NavItem[] = [
  { title: 'Dashboard',  url: '/dashboard',  icon: LayoutDashboard },
  { title: 'Scheduling', url: '/scheduling', icon: CalendarClock },  // ← remove
]

export type GroupKey = 'billing' | 'finance' | 'accounting' | 'relationships' | 'insights' | 'system' | 'scheduling'

// AFTER
export const OVERVIEW: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
]

export type GroupKey = 'billing' | 'finance' | 'accounting' | 'relationships' | 'insights' | 'system' | 'projects'

// In GROUPS — update the scheduling group entry:
{
  key: 'projects',
  label: 'Projects',
  icon: FolderKanban,   // was CalendarClock — import from lucide-react
  items: [
    { title: 'Overview',      url: '/projects',          icon: LayoutGrid },
    { title: 'Project List',  url: '/projects/list',     icon: ListTodo },
    { title: 'Timeline',      url: '/projects/timeline', icon: CalendarRange },
  ],
},

// In EXTRA_LABELS:
'/projects/list':     'Project List',
'/projects/timeline': 'Timeline',
```

---

### 1.2 🟡 Sidebar header uses text-only branding — no logo

**Location:** `app-sidebar.tsx` — `<SidebarHeader>`  
**Finding:** The header renders plain text `"PMG"` (tiny, `text-xs uppercase tracking-widest`) above `"Control Center"`. The logo files (`/public/logo/pmg-logo.svg`, `pmg-logo.png`) exist but are unused. Text-only branding feels like a stub rather than a finished product.

**Recommendation:** Replace the text header with the SVG logo at a constrained size. Keep the "Control Center" subtitle.

```tsx
import Image from 'next/image'

// In <SidebarHeader>
<Link href="/dashboard" onClick={handleNavigate}
  className="flex items-center gap-3 px-2 py-3 hover:opacity-80 transition-opacity">
  <Image src="/logo/pmg-logo.svg" alt="PMG" width={28} height={28} />
  <div className="flex flex-col gap-0">
    <span className="text-sidebar-foreground text-sm font-semibold leading-tight">Control Center</span>
    <span className="text-sidebar-foreground/50 text-[10px] tracking-widest uppercase">Playhouse Media Group</span>
  </div>
</Link>
```

---

### 1.3 🟡 TopNav breadcrumb is single-level — no parent context

**Location:** `top-nav.tsx`  
**Finding:** The breadcrumb renders a single `<BreadcrumbPage>` with just the current page label. On nested routes like `/billing/invoices/[id]` or `/settings/users/invite`, users have no visual trail showing where they are in the hierarchy. This is especially confusing in the Billing and Accounting sections which have many sub-pages.

**Recommendation:** Build a two-level breadcrumb using the route label map. The parent group name becomes `BreadcrumbLink`, the current page becomes `BreadcrumbPage`.

```tsx
// In top-nav.tsx getPageLabel → split into getParentLabel + getChildLabel
// Example result for /billing/invoices:
// Billing > Invoices
<BreadcrumbList>
  {parentLabel && (
    <>
      <BreadcrumbItem>
        <BreadcrumbLink href={parentHref} className="text-muted-foreground">
          {parentLabel}
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
    </>
  )}
  <BreadcrumbItem>
    <BreadcrumbPage className="text-base font-semibold">{label}</BreadcrumbPage>
  </BreadcrumbItem>
</BreadcrumbList>
```

---

### 1.4 🟡 Sign-out is buried in the sidebar footer with no user avatar

**Location:** `app-sidebar.tsx` — `<SidebarFooter>`  
**Finding:** The user's name and email are shown as plain text in the footer, followed by a `<SignOutButton>`. There is no avatar, no role indicator visible at a glance, and on mobile the footer can be hidden until the user scrolls inside the sidebar. Sign-out discoverability is low.

**Recommendation:** Add an `<Avatar>` with initials fallback. Move the user block into a `<DropdownMenu>` triggered by the avatar — a standard pattern that exposes Profile, Settings, and Sign Out without cluttering the footer.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent w-full">
      <Avatar className="size-7">
        <AvatarFallback className="text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col text-left min-w-0">
        <span className="text-sm font-medium truncate">{user.name}</span>
        <span className="text-[10px] text-sidebar-foreground/50 truncate">{user.role}</span>
      </div>
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent side="top" align="start">
    <DropdownMenuItem asChild><Link href="/settings/organisation">Settings</Link></DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem><SignOutButton /></DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### 1.5 🟢 No dark/light mode toggle

**Finding:** `globals.css` defines both `:root` (light) and `.dark` (dark) themes, but no UI control exposes a mode switch. Users are locked to system preference.

**Recommendation:** Add a `ThemeToggle` button to the TopNav (right side). A single icon button (`Sun` / `Moon`) using `next-themes` is the standard approach for shadcn apps.

---

### 1.6 🟢 Main content area has no responsive padding scaling

**Location:** `app/(admin)/layout.tsx`  
**Finding:** `<main className="flex-1 p-6 bg-background">` applies uniform `p-6` padding. On mobile this is tight; on very large screens the max-width container constrains content but the side gutters remain at a fixed 24px.

**Recommendation:**
```tsx
// Replace p-6 with responsive padding
<main className="flex-1 px-4 py-6 sm:px-6 bg-background">
```

---

## 2. Route Group: `(auth)`

Files: `app/(auth)/login/page.tsx`, `components/login-form.tsx`, `app/(auth)/invite/`

---

### 2.1 🟡 Login form uses a generic placeholder icon instead of PMG branding

**Location:** `components/login-form.tsx`  
**Finding:** The form header uses `<GalleryVerticalEndIcon>` — the default shadcn "new app" placeholder icon — inside a generic rounded square. The company name "PMG" or "Playhouse Media Group" appears nowhere on the login page. Users land on a page that could belong to any product.

**Recommendation:** Replace with the PMG logo SVG (or `<Image>` component) and surface the product name.

```tsx
// Replace the icon block with:
<div className="flex flex-col items-center gap-3">
  <Image src="/logo/pmg-logo.svg" alt="PMG" width={40} height={40} />
  <div>
    <h1 className="text-xl font-bold text-center">PMG Control Center</h1>
    <p className="text-sm text-muted-foreground text-center">Internal operations platform</p>
  </div>
</div>
```

---

### 2.2 🟡 Login page background is plain `bg-muted` — no visual distinction from the app

**Location:** `app/(auth)/login/page.tsx`  
**Finding:** The login page wraps everything in `bg-muted` with no further differentiation. The transition from login → dashboard feels abrupt because the same neutral surface is used everywhere. An unauthenticated page benefits from a stronger brand moment.

**Recommendation:** Add a subtle diagonal gradient or a branded left-panel pattern (common in enterprise admin apps). At minimum, distinguish the card from the page background:

```tsx
// login/page.tsx
<div className="flex min-h-svh">
  {/* Decorative left panel — hidden on mobile */}
  <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
    <div className="flex flex-col gap-4 text-primary-foreground max-w-xs">
      <Image src="/logo/pmg-logo.svg" alt="PMG" width={48} height={48} className="invert" />
      <h2 className="text-2xl font-bold">Playhouse Media Group</h2>
      <p className="text-primary-foreground/70 text-sm">Internal management platform for billing, finance, and project tracking.</p>
    </div>
  </div>
  {/* Form panel */}
  <div className="flex flex-1 items-center justify-center p-8">
    <div className="w-full max-w-sm">
      <LoginForm />
    </div>
  </div>
</div>
```

---

### 2.3 🟢 Terms and Privacy links are `href="#"` stubs

**Location:** `components/login-form.tsx` — bottom `<FieldDescription>`  
**Finding:** `<a href="#">Terms of Service</a>` and `<a href="#">Privacy Policy</a>` point to nowhere. Internal tools may not need public-facing legal docs, but these should either link to real documents or be removed.

**Recommendation:** Remove the legal footer from the login form entirely for an internal tool, or replace with actual document links if required by compliance.

---

### 2.4 🟢 "Login" button label does not match the action description

**Location:** `login-form.tsx`  
**Finding:** The button says **"Login"** but the form description says **"Login to PMG Control Center"** and the action sends a magic link (no password). The word "Login" implies a credential check, not an email dispatch. Loading state correctly says "Sending..." but the idle state is misleading.

**Recommendation:** Change the button label to **"Send sign-in link"** to accurately describe what happens when clicked. This reduces user confusion when they don't see a success state immediately.

---

## 3. Route Group: `(admin)` — Dashboard

Files: `app/(admin)/dashboard/page.tsx`, `components/dashboard/dashboard-shell.tsx`, `components/dashboard/kpi-grid.tsx`, `components/dashboard/kpi-card.tsx`

---

### 3.1 🐛 `kpi-card.tsx` is dead code — replaced by the internal `KpiCard` in `kpi-grid.tsx`

**Location:** `components/dashboard/kpi-card.tsx` vs `components/dashboard/kpi-grid.tsx`  
**Finding:** `kpi-card.tsx` exports a `KpiCard` component with its own `DeltaBadge`. `kpi-grid.tsx` defines a completely separate internal `KpiCard` component (with a `Sparkline` sub-component and different props) that is the one actually rendered. The file `kpi-card.tsx` is imported nowhere and is never used. It also implements delta calculation differently (uses percentage of absolute value) from the grid version.

**Recommendation:** Delete `kpi-card.tsx`. If a standalone card is ever needed outside the grid, extract the version from `kpi-grid.tsx` instead.

```bash
rm apps/admin/src/components/dashboard/kpi-card.tsx
```

---

### 3.2 🐛 `<CloseMonthButton>` is nested inside a `<Tabs>` element

**Location:** `components/dashboard/dashboard-shell.tsx` — Period tabs block  
**Finding:**
```tsx
<Tabs value={activeTab} onValueChange={handleTabChange}>
  <div className="flex items-center justify-between gap-3">
    <TabsList>...</TabsList>
    {hasSnapshot ? <Badge>...</Badge> : showCloseMonthButton && <CloseMonthButton ... />}
  </div>
</Tabs>
```
The `CloseMonthButton` and "period closed" Badge are rendered inside the `<Tabs>` wrapper but are not `<TabsContent>` elements. This is semantically incorrect — the Tabs component should only wrap tab navigation and its content panels. Side-effects and actions placed inside `<Tabs>` without being `<TabsContent>` produce invalid ARIA structure.

**Recommendation:** Lift the action area outside the `<Tabs>` wrapper:

```tsx
{/* Period tabs */}
<div className="flex items-center justify-between gap-3">
  <Tabs value={activeTab} onValueChange={handleTabChange}>
    <TabsList>
      {TABS.map((tab) => <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>)}
    </TabsList>
  </Tabs>
  <span className="text-xs text-muted-foreground/70">{activeLabel}</span>
  {hasSnapshot ? (
    <Badge variant="secondary">{fmtMonthYear(currentPeriod)} closed</Badge>
  ) : (
    showCloseMonthButton && <CloseMonthButton period={currentPeriod} />
  )}
</div>
```

---

### 3.3 🟡 Dashboard rows have no section headings — content is hard to scan

**Location:** `components/dashboard/dashboard-shell.tsx`  
**Finding:** The 6 rows of dashboard content (KPIs, Aging, Budget Chart, Division + Leads, Project Summary, Expense Snapshot) are separated only by gap spacing. There are no section labels, no visual anchors to tell a user what they're looking at when they scroll. The KPI cards are already labelled individually, but the rows themselves are anonymous.

**Note:** The dashboard imports `TenderSummaryCard` — this component should be renamed to `ProjectSummaryCard` (`components/dashboard/project-summary-card.tsx`) as part of the Projects rename.

**Recommendation:** Add lightweight section labels above each major row group. These don't need full `<h2>` headings — a small uppercase tracking label (like the `SidebarGroupLabel` pattern already used) works well:

```tsx
{/* ── Row 2: AR Aging ── */}
<section className="flex flex-col gap-2">
  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
    Accounts Receivable Ageing
  </h2>
  <AgingReportGrid data={agingReport} />
</section>
```

---

### 3.4 🟡 `previousValue` on KPI delta badge always says "last month" regardless of active tab

**Location:** `components/dashboard/kpi-grid.tsx` — `DeltaBadge`  
**Finding:** The delta label prop (`deltaLabel`) is passed correctly from `dashboard-shell.tsx` as `"vs prev month"`, `"vs current month"`, or `"vs prev year"` — but the `DeltaBadge` in `kpi-card.tsx` (the dead code version) hardcodes "last month". The active `kpi-grid.tsx` version correctly uses `label` prop. However, the sub-text below the KPI value in the old card was hardcoded as `"vs {formatZAR(previousValue)} last month"` — confirm this text is gone if removing the dead card file.

**Status:** Verify after deleting `kpi-card.tsx`. No action needed in `kpi-grid.tsx`.

---

### 3.5 🟢 Dashboard has no loading skeleton for individual sections

**Location:** `app/(admin)/loading.tsx`  
**Finding:** The global `loading.tsx` file exists but its contents were not fetched. If it renders a full-page spinner, the entire dashboard blanks out during data fetch. Given the dashboard fetches 13 parallel queries, partial rendering with per-section skeletons would feel faster.

**Recommendation:** Use React Suspense boundaries around each major dashboard section with skeleton placeholders matching the component shapes (4-column KPI grid skeleton, table skeleton, etc.).

---

## 4. Route Group: `(admin)` — Billing

Files: `app/(admin)/billing/**`, `components/billing/**`

---

### 4.1 🟡 Module quick-link cards use letter initials instead of proper icons

**Location:** `billing-overview-client.tsx` — "Modules" section  
**Finding:**
```tsx
<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${link.color}`}>
  <span className="text-sm font-bold">{link.label.charAt(0)}</span>
</div>
```
Every quick-link card shows a single capital letter (A, I, Q, etc.) instead of an icon. This pattern is unambiguous proof the icons haven't been wired up. The same issue exists in the Finance overview. Lucide icons are already imported for other parts of these components.

**Recommendation:** Map each quick link to its Lucide icon directly (most are already defined in `nav-data.ts`):

```tsx
import { PiggyBank, Calendar, FileText, Receipt, Banknote, Wallet, ScrollText, Package } from 'lucide-react'

const BILLING_MODULES = [
  { href: '/billing/accounts',    label: 'Accounts',      description: 'Client billing accounts',       icon: PiggyBank,   color: 'bg-blue-500/10 text-blue-600' },
  { href: '/billing/aging',       label: 'Aging Report',  description: 'AR aging analysis',             icon: Calendar,    color: 'bg-indigo-500/10 text-indigo-600' },
  { href: '/billing/quotes',      label: 'Quotes',        description: 'Create and manage quotations',  icon: FileText,    color: 'bg-violet-500/10 text-violet-600' },
  { href: '/billing/invoices',    label: 'Invoices',      description: 'Issue and track invoices',      icon: Receipt,     color: 'bg-emerald-500/10 text-emerald-600' },
  { href: '/billing/payments',    label: 'Payments',      description: 'Record incoming payments',      icon: Banknote,    color: 'bg-cyan-500/10 text-cyan-600' },
  { href: '/billing/credits',     label: 'Credits',       description: 'Credit notes and refunds',      icon: Wallet,      color: 'bg-amber-500/10 text-amber-600' },
  { href: '/billing/statements',  label: 'Statements',    description: 'Client account statements',     icon: ScrollText,  color: 'bg-rose-500/10 text-rose-600' },
  { href: '/billing/items',       label: 'Items',         description: 'Catalogue of billable items',   icon: Package,     color: 'bg-zinc-500/10 text-zinc-600' },
]

// In the render:
<link.icon className="h-4 w-4" />
```

---

### 4.2 🐛 Duplicate `STATUS_STYLES` / `STATUS_TEXT_COLORS` maps in billing

**Location:** `billing-overview-client.tsx` (lines ~30–45) and `invoices-client.tsx` (lines ~20–30)  
**Finding:** Both files define identical status-to-class maps. The `BillingStatusBadge` component in `components/billing/billing-status-badge.tsx` already centralises status styling, but the overview and invoices list bypass it with their own inline copies. Any status added to the badge component must be duplicated in both files manually.

**Recommendation:** Delete the local maps from both client files and import from a single source. Either extend `billing-status-badge.tsx` to export the maps, or create a `lib/billing-status.ts` utility:

```ts
// lib/billing-status.ts
export const STATUS_TEXT_COLORS: Record<string, string> = {
  paid:           'text-emerald-600',
  partially_paid: 'text-amber-600',
  issued:         'text-blue-600',
  overdue:        'text-red-600',
  draft:          'text-zinc-600',
  void:           'text-zinc-600 line-through',
  sent:           'text-blue-600',
  accepted:       'text-green-600',
  declined:       'text-red-600',
  expired:        'text-orange-600',
  converted:      'text-purple-600',
  cancelled:      'text-zinc-600',
}
```

---

### 4.3 🔴 Invoice table row is click-to-navigate but not keyboard accessible

**Location:** `billing/invoices/invoices-client.tsx` — `<TableRow>`  
**Finding:**
```tsx
<TableRow
  className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
  onClick={() => router.push(`/billing/invoices/${inv.id}`)}
>
```
The row looks clickable and works with mouse, but it is not a focusable element. Keyboard users cannot tab to it or press Enter to navigate. Screen readers do not announce it as a link. The inner `<Link href>` in `<DropdownMenuItem>` is the only accessible navigation anchor.

**Recommendation:** Wrap the row content in a semantically correct pattern. The cleanest approach is to make the row itself navigate via an overlapping absolute `<Link>`:

```tsx
<TableRow className="relative hover:bg-muted/40 transition-colors border-b border-border">
  <TableCell className="font-medium">
    {/* Overlay link covers the whole row */}
    <Link href={`/billing/invoices/${inv.id}`}
      className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
      aria-label={`View invoice ${inv.documentNumber}`}
    />
    {inv.documentNumber}
  </TableCell>
  {/* ... rest of cells ... */}
  <TableCell onClick={(e) => e.stopPropagation()}>
    {/* Dropdown sits above the overlay with z-index via positioning */}
    <DropdownMenu>...</DropdownMenu>
  </TableCell>
</TableRow>
```

---

### 4.4 🟡 Invoice/Quote list pages have no status filter in the UI

**Location:** `billing/invoices/invoices-client.tsx`, `billing/quotes/quotes-client.tsx`  
**Finding:** `InvoicesClient` accepts a `status` prop that controls which invoices are shown, and `buildHref()` correctly includes it in URL params. However there is no filter control in the UI to let users switch between statuses. The same issue exists for Quotes. Users can't filter to "all overdue" or "all drafts" without constructing the URL manually.

**Recommendation:** Add a status filter alongside the existing division filter. This can reuse the `FilterBar` component or be an inline `Select`:

```tsx
// Add to invoices page header area
<Select value={status ?? 'all'} onValueChange={(v) => router.push(buildHref(1, v === 'all' ? undefined : v))}>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="All statuses" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All statuses</SelectItem>
    <SelectItem value="draft">Draft</SelectItem>
    <SelectItem value="issued">Issued</SelectItem>
    <SelectItem value="overdue">Overdue</SelectItem>
    <SelectItem value="paid">Paid</SelectItem>
    <SelectItem value="void">Void</SelectItem>
  </SelectContent>
</Select>
```

---

### 4.5 🟡 Pagination uses text links with no page count or jump control

**Location:** `billing/invoices/invoices-client.tsx` — pagination block  
**Finding:** Pagination renders minimal "Previous" / "Next" anchor links with a count like "Showing 1–20 of 73". There is no page number indicator, no "first/last" shortcut, and no ability to jump to a specific page. For billing with potentially hundreds of invoices, this creates a poor experience for users reviewing older records.

**Recommendation:** Replace with a reusable `Pagination` component using shadcn's `<Pagination>` primitives, which include `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious`, and `PaginationEllipsis`. Also add page size control.

---

### 4.6 🟢 "Partially paid" status label is underscore-separated in badge output

**Location:** `billing-status-badge.tsx`  
**Finding:** The `label` calculation is `status.charAt(0).toUpperCase() + status.slice(1)`, which produces `"Partially_paid"` for the `partially_paid` status (capital P but underscore preserved). The overview client file uses `inv.status.replace('_', ' ')` inconsistently.

**Recommendation:** Centralise label formatting in `billing-status-badge.tsx`:
```ts
const label = status === 'converted'
  ? 'Invoiced'
  : status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
```

---

### 4.7 🟢 `billing/accounts/page.tsx` has no overview — it is a near-empty stub

**Finding:** The accounts page exists as a route but appears to have minimal content beyond what was visible. Billing "Accounts" as a concept (client billing accounts with balances) could surface a balance summary per client. If it's incomplete, add an `EmptyState` or "Coming Soon" indicator rather than rendering a blank route.

---

## 5. Route Group: `(admin)` — Finance

Files: `app/(admin)/finance/**`, `components/expenses/**`, `components/ledger/**`

---

### 5.1 🟡 Finance overview is a structural copy-paste of Billing overview

**Location:** `finance-overview-client.tsx` vs `billing-overview-client.tsx`  
**Finding:** Both files follow an identical composition: 4 KPI cards (same `rounded-xl border bg-card p-5` pattern), two `lg:grid-cols-2` panels, and a Modules quick-link grid. While the data is different, the component code is almost character-for-character duplicated, including the `STATUS_TEXT_COLORS`-style inline styles and the `ArrowUpRight` "View all" link pattern.

**Recommendation:** Extract a reusable `OverviewKpiCard`, `OverviewPanel`, and `OverviewModuleGrid` components into `components/ui/` that both Finance and Billing overview clients consume. This will make the design consistent and future changes propagate to both sections.

---

### 5.2 🟡 Finance module quick links also use letter initials

Same as [4.1](#41-module-quick-link-cards-use-letter-initials-instead-of-proper-icons). The Finance overview "Modules" section uses `link.label.charAt(0)`. Specific fix:

```ts
import { ArrowDownLeft, TrendingDown, Tags, PieChart } from 'lucide-react'

const FINANCE_MODULES = [
  { href: '/finance/income',        label: 'Income',       icon: ArrowDownLeft, color: 'bg-emerald-500/10 text-emerald-600' },
  { href: '/finance/expenses',      label: 'Expenses',     icon: TrendingDown,  color: 'bg-red-500/10 text-red-600' },
  { href: '/finance/categories',    label: 'Categories',   icon: Tags,          color: 'bg-amber-500/10 text-amber-600' },
  { href: '/finance/distributions', label: 'Distributions',icon: PieChart,      color: 'bg-blue-500/10 text-blue-600' },
]
```

---

### 5.3 🟡 Inline "no data" states in Finance panels bypass the `EmptyState` component

**Location:** `finance-overview-client.tsx` — Recent Income, Recent Expenses, Revenue by Division, Expenses by Category panels  
**Finding:**
```tsx
// Used in finance panels:
<div className="px-5 py-8 text-center text-sm text-muted-foreground">
  No income recorded yet.
</div>
```
The `EmptyState` component in `components/ui/empty-state.tsx` exists and handles the same case with icon, title, message, and optional CTA. The finance overview bypasses it entirely. Similarly, the billing overview uses raw `<div>` for its empty panels (`"No invoices yet."`, `"No outstanding invoices. All caught up!"`).

**Recommendation:** Use the shared `EmptyState` component uniformly across all panel empty states:

```tsx
{recentIncome.length === 0 ? (
  <div className="px-4 py-6">
    <EmptyState
      message="No income recorded yet. Add your first income entry to get started."
      ctaLabel="Add Income"
      ctaHref="/finance/income"
    />
  </div>
) : (
  // ... table rows
)}
```

---

### 5.4 🟢 Finance `income-client.tsx` and `expenses-client.tsx` table patterns likely inconsistent

**Finding:** Not all finance sub-page client files were fetched, but based on the component structure pattern, the income and expense tables likely follow slightly different conventions (some with filter bars, some without; some with inline add-forms, others with separate routes). A consistency pass is recommended to align all finance sub-pages to the same table + filter + empty-state pattern.

---

## 6. Route Group: `(admin)` — Accounting

Files: `app/(admin)/accounting/**`

---

### 6.1 🟡 Accounting overview mixes period selection and full ledger data on one page — no staged disclosure

**Location:** `app/(admin)/accounting/page.tsx`  
**Finding:** The page loads trial balance, profit & loss, AND the general ledger simultaneously, then passes all data to `AccountingOverviewClient`. The page also handles a `?period=` search param for period filtering. This is a lot of data on one page — for a business with many journal entries, this will be slow without pagination or lazy loading.

**Recommendation:** Keep the overview as a summary (trial balance totals + P&L summary + recent journal entries). Move the full ledger to `/accounting/general-ledger` where it already has its own page. The overview should link down, not embed the full ledger.

---

### 6.2 🟡 Accounting sub-pages have inconsistent loading/error boundary coverage

**Finding:** `accounting/loading.tsx` and `accounting/error.tsx` exist for the group, but not every sub-route has its own loading/error file. Routes like `/accounting/chart-of-accounts`, `/accounting/trial-balance`, and `/accounting/profit-and-loss` fetch significant data and would benefit from per-route loading states.

**Recommendation:** Add `loading.tsx` files for each sub-route that performs data fetching, matching the skeleton structure of the final component.

---

### 6.3 🟢 `accounting/exports/page.tsx` does not surface what export formats are available before action

**Finding:** The exports page exists but was not fully reviewed. Export pages that show a list of available export types without any explanation of what each contains create friction. Users should see format, period range, and expected file output before clicking.

**Recommendation:** Each export option should show: format badge (CSV / XLSX / PDF), description of contents, and date range control if applicable.

---

### 6.4 🟢 Journal new-entry form (`/accounting/journals/new`) lacks a breadcrumb "Back" button in TopNav

**Finding:** The TopNav will show "New Journal Entry" (via `EXTRA_LABELS`) but there is no explicit "Back to Journals" link in the page header. Users must rely on the browser back button or the sidebar to navigate away after submitting.

**Recommendation:** Add a back link to the page header of all new/edit forms:

```tsx
<div className="flex items-center gap-3 mb-6">
  <Button variant="ghost" size="sm" asChild>
    <Link href="/accounting/journals"><ChevronLeft className="size-4 mr-1" />Journals</Link>
  </Button>
</div>
```

---

## 7. Route Group: `(admin)` — Relationships

Files: `app/(admin)/relationships/**`, `components/clients/**`, `components/leads/**`

---

### 7.1 🟡 Client "Add" uses an inline expanding form — Leads "Add" likely uses a different pattern

**Location:** `relationships/clients/clients-client.tsx`  
**Finding:** The Clients page uses a collapsible inline card that expands on "Add Client" click. Looking at the leads module, it has a `<LeadAddForm>` component, likely implemented differently (possibly via a Sheet/Dialog). This inconsistency means users learn two different interaction patterns for adding records within the same "Relationships" group.

**Recommendation:** Standardise to a **Sheet (slide-over)** pattern for all add/edit forms in the Relationships group. Sheet is already used elsewhere in the app (`financial-drilldown-sheet.tsx`) and provides consistent behaviour — the list stays visible behind the form.

---

### 7.2 🟡 Client detail page has three separate client components with no visual unification

**Location:** `relationships/clients/[id]/`  
**Finding:** The client detail page imports three separate client components: `client-billing-workspace.tsx`, `client-financial-dashboard.tsx`, and `client-metric-strip.tsx`. Without reviewing the final rendering, this pattern risks the page feeling like three disconnected panels rather than a unified client record.

**Recommendation:** Wrap the detail view in a consistent page header (client name, business name, status badge, action buttons) and use a `<Tabs>` control to switch between "Overview", "Billing", and "Financials" sections. This reduces cognitive load and makes the client record feel like a single document.

---

### 7.3 🟡 Leads filter bar likely doesn't persist filter state in the URL

**Location:** `components/leads/leads-filter-bar.tsx`  
**Finding:** The leads module has a separate `<LeadsFilterBar>` component. Based on the billing filter bar pattern (which pushes URL params via `router.push`), this may or may not persist filters in the URL. If it uses local state, filters are lost on page refresh or when navigating away and back.

**Recommendation:** Confirm the leads filter bar writes status and search to URL search params — the same pattern used in billing's `FilterBar`. URL-persisted filters are critical for workflows where users need to share a filtered view or return to a filtered list after opening a record.

---

### 7.4 🟢 Divisions page likely has no quick-edit capability

**Finding:** The divisions page (`relationships/divisions/`) shows a table. Division names, codes, and logos are important configuration data. If editing requires navigating to a separate edit route, a quick inline-edit or Sheet would significantly reduce friction for configuration changes.

---

### 7.5 🟢 "Convert to Client" button on a lead creates no confirmation of what will be transferred

**Location:** `components/leads/convert-to-client-button.tsx`  
**Finding:** This is a destructive-adjacent action that changes the lead's status and creates a client record. Without a confirmation dialog explaining what data will be transferred (name, email, contact info) and what the lead status will become after conversion, users may accidentally convert leads.

**Recommendation:** Wrap in a `confirm()` dialog (the `ConfirmProvider` is already in the admin layout) with a clear summary: "This will create a client record for [Lead Name] and mark this lead as converted."

---

## 8. Route Group: `(admin)` — Projects

Files: `app/(admin)/projects/**`, `components/projects/**`

> **Rename in progress:** This module is being renamed from `scheduling` → `projects` across all routes, components, and actions. The DB schema (`tender_schedule` table and `@pmg/db` queries) retains its existing names until a coordinated migration. All findings below use the target `projects` naming. See [1.1](#11-bug-projects-appears-twice-in-the-sidebar-and-must-be-renamed-from-scheduling) for the full rename scope.

---

### 8.1 🐛 (Covered in 1.1) Projects appears in both `OVERVIEW` and `GROUPS` in the sidebar

Already documented in [1.1](#11-bug-projects-appears-twice-in-the-sidebar-and-must-be-renamed-from-scheduling). The core fix — removing the entry from `OVERVIEW` and renaming the group — should land as one atomic commit alongside all route and component renames.

---

### 8.2 🟡 Projects overview "New Project" button is positioned below the page header

**Location:** `components/projects/project-overview-shell.tsx` (renamed from `scheduling-overview-shell.tsx`)  
**Finding:**
```tsx
{/* Add Project button — currently labelled "New Tender" */}
<div className="flex items-center justify-end">
  <Button size="sm" onClick={() => setFormOpen(true)}>
    <Plus className="size-4" /> New Tender
  </Button>
</div>
```
The primary action button is rendered as the first child of the content area, creating a `justify-end` row that takes full width just to right-align one button. This wastes vertical space and disconnects the action from its context. The label also needs to update from **"New Tender"** to **"New Project"** as part of the rename.

**Recommendation:** Use the `PageHeaderProvider` / `SetPageTotal` pattern already in the app to inject the "New Project" button into the `TopNav` area alongside the page title. The button should feel like part of the page header, not floating inline.

```tsx
// In the Projects overview page (server component):
<SetPageTotal value="New Project" />  // or use a dedicated SetPageAction slot

// Or — simplest — move it into the ProjectSummaryCards header row:
<div className="flex items-center justify-between">
  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</h2>
  <Button size="sm" onClick={() => setFormOpen(true)}>
    <Plus className="size-4" /> New Project
  </Button>
</div>
```

---

### 8.3 🟡 Project summary cards don't use the shared `KpiCard` or card tokens

**Location:** `components/projects/project-overview-shell.tsx` — `ProjectSummaryCards` (renamed from `SchedulingSummaryCards`)  
**Finding:** The project summary cards directly use `<Card>` with a custom inner layout, while the dashboard's `KpiGrid` has a polished `KpiCard` with sparklines, delta badges, and hover lift animations. The project cards are visually flat by comparison — grey muted icon, no hover state, no delta.

**Recommendation:** The project cards show counts (not currency), so a modified `KpiCard` variant accepting either currency or integer values would unify the design. At minimum, apply the same `border hover:border-border/100 hover:-translate-y-1 hover:shadow-md transition-all duration-300` classes from the dashboard cards.

---

### 8.4 🟡 Timeline page (`/projects/timeline`) has no visual preview in the navigation context

**Location:** `app/(admin)/projects/timeline/`  
**Finding:** The timeline exists as a route and is linked from the sidebar. For a Gantt-style view there is no indication in the Projects overview whether the timeline is populated or empty, and no thumbnail or teaser visible from the list.

**Recommendation:** Add a "See Timeline" quick-link card or a compact horizontal bar preview in the Projects overview showing the next 2 weeks of active projects. This gives the timeline page a reason to exist in the overview context and sets correct expectations before navigating.

---

### 8.5 🟢 Warnings panel expand/collapse is a plain `<button>` with no chevron icon

**Location:** `components/projects/project-overview-shell.tsx` — `WarningsPanel`  
**Finding:** The expand trigger is a text-only button: `"Show less"` / `"+3 more"`. For accessibility and visual affordance it should include a chevron icon matching the app's collapsible pattern.

```tsx
<button onClick={() => setExpanded((p) => !p)} className="flex items-center gap-1 text-xs ...">
  {expanded ? (
    <><ChevronUp className="size-3" /> Show less</>
  ) : (
    <><ChevronDown className="size-3" /> +{hidden} more</>
  )}
</button>
```

---

### 8.6 🟢 "Other Actions" dropdown in `CurrentWorkloadCard` should be inline buttons

**Location:** `components/projects/project-overview-shell.tsx` — `CurrentWorkloadCard`  
**Finding:** The card has a primary "Mark Complete" button and a secondary `<DropdownMenu>` labelled "Other Actions" containing "Cancel Project" and "Re-plan (Pause)". These secondary actions are important enough to be inline buttons, especially since this is the primary working state for the user.

**Recommendation:** Show all three actions as buttons with appropriate variants:
- `Mark Complete` → `variant="default"` (primary)
- `Re-plan (Pause)` → `variant="outline"` (secondary)
- `Cancel Project` → `variant="ghost"` with `text-destructive` (tertiary, destructive)

---

## 9. Route Group: `(admin)` — Insights

Files: `app/(admin)/insights/reports/page.tsx`, `app/(admin)/insights/snapshots/page.tsx`, `components/reports/**`, `components/insights/**`

---

### 9.1 🐛 Reports page hardcodes PMG share rate as `0.25` instead of reading from settings

**Location:** `app/(admin)/insights/reports/page.tsx`  
**Finding:**
```tsx
pmgShare: monthlyFinancials.reduce((s, m) => s + m.revenue, 0) * 0.25, // PMG Share rate from distribution_settings
```
The comment acknowledges this should come from `distribution_settings`, but the calculation uses a hardcoded `0.25`. If the PMG share rate is ever adjusted in the settings, the Reports page KPI strip will remain incorrect while other parts of the app read the actual rate.

**Recommendation:** Fetch the PMG share rate from `distribution_settings` in the page's server-side data fetching and pass it into `ReportKpiStrip` as a prop, the same way the rate is handled in the accounting/financial modules.

---

### 9.2 🟡 Reports sticky header pattern is unique to this page — inconsistent with other sections

**Location:** `app/(admin)/insights/reports/page.tsx`  
**Finding:**
```tsx
<div className="sticky top-[3.25rem] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 -mx-6 px-6 py-4 -mt-6">
```
This sticky header uses negative margin tricks to break out of the `mx-auto max-w-7xl` container, backdoor into the layout's `p-6` padding, and create a full-width sticky bar. No other page in the app uses this pattern — it's effective but fragile (depends on the exact `top-[3.25rem]` TopNav height) and creates a maintenance burden.

**Recommendation:** Either extract this into a reusable `<StickyPageHeader>` component used consistently across pages that need a sticky filter bar (Reports, potentially Billing), or move the year filter into the `TopNav` via the existing `PageHeaderProvider` mechanism.

---

### 9.3 🟡 Reports page uses multiple chart components rendered inside a single `<ReportsTabs>` — tab switching may cause layout shift

**Location:** `components/reports/reports-tabs.tsx`  
**Finding:** The reports tabs presumably render different chart combinations per tab (MoM, Budget, Profit Pool, etc.). If charts use fixed heights or if Recharts re-renders on tab switch, users may experience layout shift or a blank flash. Without Suspense boundaries or stable chart dimensions, this can feel janky.

**Recommendation:** Set explicit `min-h` on each chart container. Wrap each tab's content in a `<Suspense>` with a skeleton that matches the chart height, and use `will-change: transform` on chart containers to hint the browser for compositing.

---

### 9.4 🟡 Snapshots page — `SnapshotsCockpit` is a complex component with no audit visibility

**Finding:** `components/insights/snapshots-cockpit.tsx` was not fetched. Given that snapshots are the foundation of period comparisons across the dashboard, this is a high-risk component. Key questions for a follow-up UX review:
- Can users see which periods have snapshots and which don't?
- Is there a clear CTA to take a snapshot if none exists for the current period?
- Are deletions confirmed before they happen?

---

### 9.5 🟢 `ExportCsvButton` in reports has no visual feedback during export generation

**Finding:** The export button component exists but without seeing its implementation, CSV export is commonly a fire-and-forget action with no loading indicator. If the export takes >500ms (large datasets), users will click multiple times.

**Recommendation:** Ensure the button uses `useTransition` or similar to show a loading state during the export server action.

---

## 10. Route Group: `(admin)` — Settings

Files: `app/(admin)/settings/**`, `components/settings/**`

---

### 10.1 🟡 Settings sidebar icon sizes are inconsistent with the rest of the app

**Location:** `components/settings/settings-nav.tsx`  
**Finding:**
```tsx
<Icon className="shrink-0" />
```
The icon receives no `size-` class. Lucide icons default to `1em` (matching the surrounding text size). In the rest of the app, icons consistently use `className="size-4"` or `className="size-3.5"`. The settings nav icons will render at an unpredictable size that inherits from the link's `text-sm` class.

**Recommendation:**
```tsx
<Icon className="size-4 shrink-0" />
```

---

### 10.2 🟡 Security settings page is marked "Soon" but renders as a real route

**Location:** `components/settings/settings-nav.tsx` — Security badge; `app/(admin)/settings/security/page.tsx`  
**Finding:** The Security route is accessible and has a page file, but the nav shows a "Soon" badge. If the page renders as empty or stub content, navigating to it creates a confusing experience. The badge signals it's incomplete, but clicking it still loads a route.

**Recommendation:** Either:
1. Display a proper "Coming Soon" `EmptyState` on the `/settings/security` page with a description of planned features (2FA, API keys, session management), OR  
2. Remove the Security item from the nav entirely and add it back when implemented.

Option 1 is preferred — it sets expectations and can act as a feature teaser.

---

### 10.3 🟡 Settings pages have no `<h1>` — page identity relies entirely on the TopNav label

**Location:** Various `settings/*/page.tsx` files  
**Finding:** Settings sub-pages render content directly without a page-level heading (only the section label in TopNav + the `SettingsPageHeader` component if used). On pages like Organisation Settings and Billing Settings, the form sections benefit from clear headings. The `SettingsPageHeader` component exists but it's unclear if it's used consistently.

**Recommendation:** Verify `SettingsPageHeader` is used on every settings sub-page, and that it includes a title and description. The pattern should match the billing and finance overview headings:

```tsx
// settings/organisation/page.tsx pattern
<div>
  <h2 className="text-lg font-semibold">Organisation</h2>
  <p className="text-sm text-muted-foreground">Manage your organisation name, address, and branding.</p>
</div>
```

---

### 10.4 🟡 User invite flow doesn't have a visual confirmation after invite is sent

**Location:** `settings/users/invite/page.tsx`, `components/users/invite-form.tsx`  
**Finding:** After an invite is sent, the user flow is undefined from the page files available. If the page simply resets the form, the admin has no visual confirmation that the invite was dispatched — especially important given email delivery failures should surface.

**Recommendation:** After a successful invite action, display an inline success state:
```
✓ Invite sent to jane@example.com. They will receive a sign-in link within 5 minutes.
```
Include an option to resend or copy the invite link.

---

### 10.5 🟢 Settings layout `220px` sidebar fixed width may be tight on smaller screens

**Location:** `app/(admin)/settings/layout.tsx`  
**Finding:**
```tsx
<div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
```
On tablet (`md` to `lg` breakpoint, 768–1024px), the layout collapses to a stacked column. The nav then renders as a horizontal scrollable row, which is functional but not explicitly visible. On smaller 13" laptops at `lg` breakpoint, 220px consumes significant horizontal space from the content area.

**Recommendation:** Consider `180px` for the sidebar column and make it `xl:` rather than `lg:` to allow more room for content on mid-size screens.

---

## 11. Cross-Cutting Patterns

These findings apply across multiple route groups.

---

### 11.1 🔴 No consistent page-level "Back" navigation on `new` and `[id]` routes

**Finding:** Routes like `/billing/invoices/new`, `/billing/invoices/[id]/edit`, `/accounting/journals/new`, and `/relationships/leads/[id]` are detail/form pages that sit below a list route. None of them appear to have a standardised back-navigation affordance in the page content. Users must use browser back or navigate via the sidebar.

**Recommendation:** Establish a `<BackButton>` pattern used consistently on all `new` and `[id]` sub-routes:
```tsx
// components/ui/back-button.tsx
'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from './button'

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={href}><ChevronLeft className="size-4 mr-1" />{label}</Link>
    </Button>
  )
}
```

---

### 11.2 🟡 Overview pages across all sections repeat the same 4-card + 2-panel + module-links layout without a shared component

**Finding:** `/billing/page.tsx`, `/finance/page.tsx`, and `/accounting/page.tsx` all follow identical layouts: 4 metric cards, two `lg:grid-cols-2` activity panels, module quick-links. Each is independently implemented as a custom client component.

**Recommendation:** Create a `components/ui/section-overview.tsx` that accepts card configs, panels, and module links and renders the layout. This makes global design changes (card sizing, hover effects, grid gaps) a one-file change.

---

### 11.3 🟡 Form submission error handling is inconsistent — some use `toast.error()`, some use inline Alert

**Finding:** Billing form actions (`handleIssue`, `handleVoid`) use `toast.error(result.error)`. The login form uses an inline `<Alert variant="destructive">`. Settings forms likely use their own patterns. This means users encounter errors in different places depending on which page they're on.

**Recommendation:** Adopt a single convention:
- **Mutations on list pages** (void invoice, delete client, etc.) → `toast.error()` (non-blocking, suits background actions)
- **Form submissions that require correction** (new invoice, add client) → Inline form error below the field or below the submit button
- **Destructive confirms** → `confirm()` dialog (already implemented via `ConfirmProvider`)

---

### 11.4 🟢 No loading indicator is shown within the Toaster notification position for async actions

**Finding:** Many server actions use `useTransition()` to trigger the action but only show feedback after completion (toast success/error). During the transition, buttons are sometimes not disabled and there's no in-flight state visible.

**Recommendation:** Consistently use the `isPending` value from `useTransition()` to disable and show a spinner on the triggering button:
```tsx
const [isPending, startTransition] = useTransition()
<Button disabled={isPending}>
  {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
  Save
</Button>
```

---

### 11.5 🟢 `not-found.tsx` files are spread across sections — probably inconsistent with each other

**Finding:** Multiple `not-found.tsx` files exist (`billing/not-found.tsx`, `accounting/not-found.tsx`, `relationships/clients/not-found.tsx`, etc.). The `not-found-view.tsx` component exists in `components/ui/` but it's unclear whether all of these files use it consistently or each renders its own fallback UI.

**Recommendation:** Ensure all `not-found.tsx` files simply re-export from a single layout component:
```tsx
// billing/not-found.tsx
import { NotFoundView } from '@/components/ui/not-found-view'
export default function BillingNotFound() {
  return <NotFoundView section="Billing" href="/billing" />
}
```

---

## 12. Prioritised Action Plan

Items sorted by impact. Tackle 🔴 first, then 🐛, then 🟡 in order.

### Immediate (this sprint)

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 1 | 🐛 Rename Scheduling → Projects (routes, components, actions, nav) + remove from `OVERVIEW` | `nav-data.ts`, `app/(admin)/scheduling/` → `projects/`, `components/scheduling/` → `projects/`, action files | M |
| 2 | 🐛 Delete dead `kpi-card.tsx` file | `components/dashboard/kpi-card.tsx` | XS |
| 3 | 🐛 Move `CloseMonthButton` outside `<Tabs>` wrapper | `dashboard-shell.tsx` | XS |
| 4 | 🐛 Centralise billing status maps into `lib/billing-status.ts` | `billing-overview-client.tsx`, `invoices-client.tsx` | S |
| 5 | 🐛 Fix hardcoded `0.25` PMG share rate in reports page | `insights/reports/page.tsx` | S |
| 6 | 🔴 Fix invoice table row keyboard accessibility | `invoices-client.tsx` | S |
| 7 | 🔴 Add "Back" button pattern to all `new` and `[id]` sub-routes | New `BackButton` component | M |

### Short-term (next sprint)

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 8 | 🟡 Replace letter-initial module icons with Lucide icons (Billing + Finance) | `billing-overview-client.tsx`, `finance-overview-client.tsx` | S |
| 9 | 🟡 Swap PMG logo into sidebar header | `app-sidebar.tsx` | S |
| 10 | 🟡 Swap PMG logo into login form + improve login page layout | `login-form.tsx`, `login/page.tsx` | M |
| 11 | 🟡 Replace inline empty states with `EmptyState` component | Finance + Billing panels | S |
| 12 | 🟡 Add status filter dropdown to Invoice and Quote list pages | `invoices-client.tsx`, `quotes-client.tsx` | S |
| 13 | 🟡 Improve breadcrumb to show parent > child hierarchy | `top-nav.tsx` | M |
| 14 | 🟡 Replace user text footer with avatar + dropdown in sidebar | `app-sidebar.tsx` | M |

### Medium-term (backlog)

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 15 | 🟡 Add section headings to dashboard rows | `dashboard-shell.tsx` | S |
| 16 | 🟡 Standardise add-form pattern to Sheet across Relationships | `clients-client.tsx`, `leads-client.tsx` | M |
| 17 | 🟡 Extract shared `OverviewKpiCard` / `OverviewPanel` / `OverviewModuleGrid` components | New `section-overview.tsx` | M |
| 18 | 🟡 Add pagination improvements (page numbers, page size select) | `invoices-client.tsx` + shared `Pagination` | M |
| 19 | 🟡 Implement proper "Coming Soon" page for `/settings/security` | `settings/security/page.tsx` | XS |
| 20 | 🟡 Fix settings nav icon sizes | `settings-nav.tsx` | XS |
| 21 | 🟡 Add `isPending` loading states to all async form buttons | Multiple files | M |
| 22 | 🟡 Standardise `not-found.tsx` files to use shared `NotFoundView` | Multiple section `not-found.tsx` | S |
| 23 | 🟡 Add dark mode toggle to TopNav | `top-nav.tsx` + new `ThemeToggle` | S |
| 24 | 🟢 Remove Terms/Privacy placeholder links from login form | `login-form.tsx` | XS |
| 25 | 🟢 Change login button label to "Send sign-in link" | `login-form.tsx` | XS |
| 26 | 🟢 Fix `partially_paid` label capitalisation in status badge | `billing-status-badge.tsx` | XS |
| 27 | 🟢 Add chevron icon to Projects warnings panel expand button | `components/projects/project-overview-shell.tsx` | XS |
| 28 | 🟢 Elevate project "Other Actions" dropdown to inline buttons | `components/projects/project-overview-shell.tsx` | S |

---

## Appendix: Component Health Summary

| Component | Status | Notes |
|-----------|--------|-------|
| `AppSidebar` | ⚠️ Needs work | Duplicate nav entry, no logo, buried sign-out |
| `TopNav` | ⚠️ Needs work | Single-level breadcrumb, no action area |
| `DashboardShell` | ⚠️ Needs work | Bad Tabs structure, no section headings |
| `KpiGrid` | ✅ Solid | Good sparklines, delta badges, hover states |
| `KpiCard` (kpi-card.tsx) | 🗑️ Delete | Dead code, superseded by KpiGrid's internal KpiCard |
| `EmptyState` | ✅ Solid | Well-built, underutilised |
| `BillingStatusBadge` | ⚠️ Needs fix | Capitalisation bug, duplicated elsewhere |
| `BillingOverviewClient` | ⚠️ Needs work | Letter initials, raw empty states, duplicate status maps |
| `FinanceOverviewClient` | ⚠️ Needs work | Copy-paste structure, same issues as billing |
| `ProjectOverviewShell` (renamed from `SchedulingOverviewShell`) | ✅ Good | Good warning panel, workload card. Fix button placement + rename all "Tender" labels to "Project" |
| `ProjectSummaryCard` (rename from `TenderSummaryCard`) | 🟡 Rename | `components/dashboard/tender-summary-card.tsx` → `project-summary-card.tsx`; update import in `dashboard-shell.tsx` |
| `SettingsNav` | ⚠️ Minor fixes | Icon size, Security route stub |
| `LoginForm` | ⚠️ Needs work | Generic branding, placeholder links, button label |
| `FilterBar` | ✅ Solid | Clean URL-param pattern |
| `InvoicesClient` | ⚠️ Needs work | Accessibility, no status filter, basic pagination |
| `ClientsClient` | ✅ Good | Clean inline-add pattern (standardise across group) |

---

*Report generated from static code analysis of `jchademwiri/pmg-hub` (branch: `dev`). No live environment access. Findings are based on file structure, component composition, and UI/UX best practices for Next.js admin applications.*
