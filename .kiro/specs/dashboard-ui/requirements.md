# Requirements Document

## Introduction

Phase 2 of the PMG Control Center admin app. This feature builds the real-time financial
overview dashboard - the first page an admin sees after login. All data is fetched at
request time from the live Neon PostgreSQL database via Drizzle ORM. The page is built
entirely with React Server Components; no client-side state, no loading spinners, and no
browser-initiated API calls. A sidebar shell layout wraps all admin pages.

---

## Glossary

- **Dashboard_Page**: The async Server Component at `app/(admin)/dashboard/page.tsx` that fetches all financial data and renders the dashboard UI.
- **Admin_Layout**: The Server Component at `app/(admin)/layout.tsx` that wraps every `/*` page with the Sidebar and TopNav.
- **NavLink**: The `'use client'` component at `components/layout/nav-link.tsx` that uses `usePathname` to highlight the active route.
- **TopNav**: The page header Server Component at `components/layout/top-nav.tsx`.
- **KpiCard**: The stat card component at `components/dashboard/kpi-card.tsx`.
- **SalaryCard**: The chart-1-highlighted owner salary card at `components/dashboard/salary-card.tsx`.
- **AllocationBar**: The stacked bar + legend component at `components/dashboard/allocation-bar.tsx`.
- **AllocationTooltipBar**: The thin `'use client'` boundary component at `components/dashboard/allocation-tooltip-bar.tsx` that wraps the stacked bar segments with Tooltip support.
- **DivisionRevenue**: The per-division horizontal bar chart at `components/dashboard/division-revenue.tsx`.
- **LeadsSummary**: The per-status lead count component at `components/dashboard/leads-summary.tsx`.
- **Financial_Engine**: The server-only module at `lib/financial.ts` (Phase 1 - already complete).
- **FinancialSummary**: The TypeScript type `{ revenue, expenses, pmgShare, profitPool, salary, reinvest, reserve, flex }` returned by `getFinancialSummary()`.
- **DivisionRevenue_Type**: The TypeScript type `{ divisionName: string; total: number }` returned by `getDivisionRevenue()`.
- **LeadStatusCount**: The TypeScript type `{ status: string; count: number }` returned by `getLeadCounts()`.
- **formatZAR**: The `formatZAR(amount: number): string` utility exported from `lib/financial.ts`.
- **Proxy**: The Next.js 16 auth guard at `apps/admin/src/proxy.ts` that protects `/:path*` routes.
- **shadcn**: The component library used for UI primitives in `components/ui/`.
- **AppSidebar**: The customised sidebar-08 block component at `components/layout/app-sidebar.tsx`.
- **SidebarProvider**: The shadcn context provider from the sidebar block that manages collapse state.
- **SidebarInset**: The shadcn companion component used as the right content wrapper in Admin_Layout.
- **SidebarTrigger**: The shadcn client component that toggles sidebar collapse, rendered in TopNav.
- **Toaster**: The shadcn sonner Toaster component rendered at the root of Admin_Layout for toast notifications.

---

## Requirements

### Requirement 1: shadcn Component Installation

**User Story:** As a developer, I want to know which shadcn components to install before
building the dashboard, so that I can set up all dependencies upfront.

#### Acceptance Criteria

1. THE full installation sequence is defined in Requirement 13. No components beyond those
   listed in Requirement 13 shall be installed for Phase 2.
2. Card and Badge are already installed and SHALL be used per Requirements 15–19.

---

### Requirement 2: Admin Layout Shell

**User Story:** As an admin, I want a consistent sidebar and top navigation on every admin
page, so that I can navigate the app without losing context.

#### Acceptance Criteria

1. THE Admin_Layout full structure, SidebarProvider wiring, and SidebarInset usage SHALL
   follow Requirement 21.
2. THE Sidebar (AppSidebar) SHALL be built from the scaffolded sidebar-08 block per Requirement 11.
3. THE TopNav SHALL be built per Requirement 14.
4. THE Admin_Layout SHALL be a Server Component with no `'use client'` directive.
5. THE Sidebar SHALL display a "PMG / Control Center" brand label at the top.
6. THE Sidebar SHALL render a NavLink for each of the five admin routes:
   `/dashboard`, `/income`, `/expenses`, `/leads`, `/divisions`.
7. THE NavLink SHALL use `usePathname` to apply an active style
   (`bg-sidebar-accent text-sidebar-accent-foreground`) when the current pathname matches
   or starts with the link's `href`.
8. THE NavLink SHALL apply a hover style
   (`hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground`) when not active.
9. THE TopNav SHALL render a page header bar at the top of the main content area with
   `className="h-12 flex items-center gap-2 px-4 border-b border-border bg-card"` -
   see Requirement 14 for full TopNav spec.
10. WHEN a route is protected by the Proxy, THE Admin_Layout SHALL be rendered only for
    authenticated sessions.

---

### Requirement 3: Dashboard Page Data Fetching

**User Story:** As an admin, I want the dashboard to show live financial data on every page
load, so that I always see the current state of the business.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL call `getFinancialSummary()`, `getDivisionRevenue()`, and
   `getLeadCounts()` from `@/lib/financial` using `Promise.all` in a single `await`.
2. THE Dashboard_Page SHALL be an `async` Server Component with no `'use client'` directive.
3. THE Dashboard_Page SHALL pass the resolved data directly as props to child components
   without storing it in any client-side state.
4. IF the Financial_Engine throws an error, THEN THE Dashboard_Page SHALL propagate the
   error to the Next.js error boundary.
5. THE Dashboard_Page SHALL be accessible at the route `/dashboard` and SHALL be protected
   by the Proxy matcher.
6. THE Dashboard_Page SHALL export:
   `export const metadata: Metadata = { title: 'Dashboard' }` - the root layout's title
   template handles the full string "Dashboard · PMG Admin".

---

### Requirement 4: KPI Cards

**User Story:** As an admin, I want to see the four top-level financial figures at a glance,
so that I can assess business health immediately.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL render four KpiCard instances in a responsive grid
   (`grid-cols-2` on mobile, `grid-cols-4` on `lg` breakpoint).
2. THE KpiCard instances SHALL display: Total Revenue, Total Expenses, PMG Share (20%),
   and Profit Pool - sourced from the FinancialSummary.
3. THE KpiCard SHALL format all monetary values using `formatZAR`.
4. THE KpiCard SHALL render a label in `text-muted-foreground`, the formatted value in
   `text-foreground text-2xl font-semibold`, and an optional sub-label in
   `text-muted-foreground/70 text-xs`.
5. THE KpiCard SHALL use shadcn Card, CardHeader, CardContent, and CardDescription
   primitives per Requirement 15 rather than raw divs.
6. THE KpiCard SHALL NOT use `'use client'`.

---

### Requirement 5: Salary Card

**User Story:** As an admin, I want the recommended owner salary to be visually distinct
from other KPIs, so that I immediately recognise my take-home figure.

#### Acceptance Criteria

1. THE SalaryCard SHALL display the `salary` field from FinancialSummary formatted with
   `formatZAR`.
2. THE SalaryCard SHALL use the chart-1 color token for its highlight scheme:
   `border-chart-1/40 bg-chart-1/10` container, `text-chart-1` label,
   `text-chart-1 text-3xl font-bold` value.
3. THE SalaryCard SHALL display the sub-label "35% of profit pool · calculated, not guessed"
   in `text-chart-1/70 text-xs`.
4. THE SalaryCard SHALL use shadcn Card, CardHeader, CardTitle, CardContent per
   Requirement 16.
5. THE SalaryCard SHALL NOT use `'use client'`.

---

### Requirement 6: Allocation Bar

**User Story:** As an admin, I want to see how the profit pool is split across the four
allocations, so that I understand where the money goes.

#### Acceptance Criteria

1. THE AllocationBar SHALL render a stacked horizontal bar divided into four segments:
   Salary (35%), Reinvest (30%), Reserve (30%), Flex (5%).
2. THE AllocationBar SHALL colour the segments using chart tokens: Salary → `bg-chart-1`,
   Reinvest → `bg-chart-2`, Reserve → `bg-chart-3`, Flex → `bg-chart-4`.
3. THE AllocationBar SHALL render a legend grid below the bar showing each allocation's
   label, percentage, and formatted ZAR amount from FinancialSummary, with coloured dots
   using the same chart tokens.
4. THE AllocationBar SHALL use shadcn Card per Requirement 17. The tooltip bar section
   SHALL be extracted to AllocationTooltipBar (`'use client'`) per Requirement 17.
5. THE AllocationBar SHALL NOT use `'use client'`.
6. THE AllocationBar SHALL be rendered alongside SalaryCard in a
   `grid-cols-1 lg:grid-cols-3` grid, with AllocationBar spanning `lg:col-span-2`.

---

### Requirement 7: Division Revenue Chart

**User Story:** As an admin, I want to see revenue broken down by division, so that I can
identify which divisions are performing best.

#### Acceptance Criteria

1. THE DivisionRevenue component SHALL render one horizontal bar per entry in the
   `DivisionRevenue_Type[]` array.
2. THE DivisionRevenue component SHALL scale each bar proportionally to the maximum
   division total in the dataset (bar width = `(total / max) * 100`).
3. THE DivisionRevenue component SHALL colour bars `bg-chart-2`.
4. THE DivisionRevenue component SHALL display the division name in `text-card-foreground`
   and the formatted ZAR total in `text-muted-foreground` above each bar.
5. WHEN the divisions array is empty, THE DivisionRevenue component SHALL display
   "No income recorded yet." in `text-muted-foreground/50 text-xs`.
6. THE DivisionRevenue component SHALL use shadcn Card, Progress, and ScrollArea per
   Requirement 18.
7. THE DivisionRevenue component SHALL NOT use `'use client'`.

---

### Requirement 8: Leads Summary

**User Story:** As an admin, I want to see lead counts by status, so that I can track the
sales pipeline at a glance.

#### Acceptance Criteria

1. THE LeadsSummary component SHALL render one row per entry in the `LeadStatusCount[]`
   array, showing a coloured Badge, the status label (capitalised), an inline proportional
   Progress bar, and the count.
2. THE LeadsSummary component SHALL apply status colors using chart tokens and semantic
   variables only: `new` → `bg-chart-2`, `contacted` → `bg-chart-1`,
   `converted` → `bg-chart-3`, `lost` → `bg-muted`.
3. THE LeadsSummary component SHALL scale each inline bar proportionally to the total
   lead count across all statuses.
4. WHEN the leads array is empty, THE LeadsSummary component SHALL display
   "No leads yet." in `text-muted-foreground/50 text-xs`.
5. THE LeadsSummary component SHALL use shadcn Card, Progress, Badge, and ScrollArea per
   Requirement 19.
6. THE LeadsSummary component SHALL NOT use `'use client'`.

---

### Requirement 9: Server Component Constraint

**User Story:** As a developer, I want all dashboard components to be Server Components
except NavLink and AllocationTooltipBar, so that the page renders with zero client-side
JavaScript for data fetching.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL contain no `'use client'` directive.
2. THE Admin_Layout SHALL contain no `'use client'` directive.
3. THE Sidebar SHALL contain no `'use client'` directive.
4. THE TopNav SHALL contain no `'use client'` directive.
5. THE KpiCard SHALL contain no `'use client'` directive.
6. THE SalaryCard SHALL contain no `'use client'` directive.
7. THE AllocationBar SHALL contain no `'use client'` directive.
8. THE DivisionRevenue component SHALL contain no `'use client'` directive.
9. THE LeadsSummary component SHALL contain no `'use client'` directive.
10. THE NavLink SHALL contain a `'use client'` directive and SHALL be the primary client
    component in the dashboard feature.
11. THE AllocationTooltipBar component (`components/dashboard/allocation-tooltip-bar.tsx`)
    SHALL contain a `'use client'` directive and SHALL be the only additional client
    component beyond NavLink in Phase 2.

---

### Requirement 10: Dark Theme Styling

**User Story:** As an admin, I want a consistent dark theme across the dashboard, so that
the UI is easy to read in low-light environments.

#### Acceptance Criteria

1. THE Admin_Layout SHALL apply `bg-background` as the root background colour.
2. THE Dashboard_Page SHALL apply `bg-card` to all card containers.
3. THE Dashboard_Page SHALL apply `border-border` to all card borders.
4. THE Dashboard_Page SHALL use `text-foreground` for primary values and
   `text-muted-foreground` for labels and secondary text.
5. THE SalaryCard SHALL use the chart-1 token (`bg-chart-1`, `text-chart-1`) exclusively
   for its colour scheme.
6. THE DivisionRevenue component SHALL use `bg-chart-2` for revenue bars.
7. THE LeadsSummary component SHALL use `bg-chart-3` for converted lead bars.
8. ALL components SHALL use only semantic CSS variable utilities as defined in
   `apps/admin/src/app/globals.css`. No raw Tailwind palette utilities are permitted.
9. THE `dark` class SHALL be applied to the `<html>` element in
   `apps/admin/src/app/layout.tsx` to activate all `.dark` CSS variable overrides. If not
   already present, it SHALL be added.

---

### Requirement 11: shadcn Block - Sidebar Shell

**User Story:** As a developer, I want to use a shadcn sidebar block as the structural
foundation for the admin layout shell so that navigation, responsiveness, and accessibility
are handled by a proven composition.

#### Acceptance Criteria

1. THE developer SHALL run `npx shadcn@latest add sidebar-08 --cwd apps/admin` to scaffold
   the sidebar block as the foundation for the Admin_Layout shell. sidebar-08 is the inset
   sidebar variant ("An inset sidebar with secondary navigation") that scaffolds
   `SidebarInset`, `SidebarTrigger`, and the breadcrumb header structure that
   Requirement 21 depends on.
2. THE scaffolded sidebar block SHALL be customised to:
   (a) replace placeholder nav items with the five PMG admin routes:
       `/dashboard` (LayoutDashboard icon), `/income` (TrendingUp),
       `/expenses` (TrendingDown), `/leads` (Users), `/divisions` (Layers)
       - all from `lucide-react`
   (b) replace the brand label with "PMG / Control Center" in the sidebar header, with
       "PMG" in `text-sidebar-foreground/50 text-xs uppercase tracking-widest` and
       "Control Center" in `text-sidebar-foreground text-sm font-semibold`
   (c) remove or replace the user footer section with a minimal
       `text-sidebar-foreground/50 text-xs` "PMG Admin" label
   (d) sidebar background uses `bg-sidebar` and border uses `border-sidebar-border` -
       these are already correctly set by the `.dark` CSS variables in `globals.css` and
       require no additional `className` overrides
3. THE sidebar block installs the following shadcn primitives automatically - the developer
   SHALL NOT install these separately: `sidebar`, `button`, `separator`, `skeleton`,
   `sheet`, `tooltip`, `input`, `avatar`.
4. THE sidebar SHALL remain collapsible on mobile (sheet/drawer behaviour from the block)
   and fixed-width `w-56` on `lg+` breakpoints.
5. THE NavLink active state SHALL be applied via the sidebar block's `data-active` mechanism
   OR the existing NavLink component (`'use client'`, `usePathname`) SHALL be used as the
   link renderer inside the sidebar block's nav item slots.
6. THE sidebar block's SidebarProvider SHALL be rendered in Admin_Layout and SHALL be the
   only provider needed for sidebar state.
7. THE scaffolded sidebar block SHALL produce a file at `components/layout/app-sidebar.tsx`
   (exported as `AppSidebar`). This is the component referenced as `AppSidebar` in
   Requirement 21. The developer SHALL customise this file directly - not create a separate
   sidebar component alongside it.

---

### Requirement 12: shadcn Block - Dashboard Layout Reference

**User Story:** As a developer, I want to use a shadcn dashboard block as the structural
grid reference for the dashboard page so that the KPI card layout, spacing, and responsive
grid are consistent with shadcn conventions.

#### Acceptance Criteria

1. THE developer SHALL run `npx shadcn@latest add dashboard-01 --cwd apps/admin` to inspect
   the block's grid and card structure, then use it as a reference for the dashboard page
   layout - NOT necessarily scaffold it verbatim, since the PMG data model differs from the
   block's placeholder data.
2. THE dashboard page grid SHALL follow the block's responsive pattern: single column on
   mobile, 2-column on `md`, 4-column on `lg` for KPI cards.
3. THE dashboard SHALL use shadcn `Card`, `CardHeader`, `CardTitle`, `CardContent`, and
   `CardDescription` as the container for every panel on the page rather than raw divs.
4. THE Card component SHALL have its background set to `bg-card` and border to
   `border-border` via `className` props on each card instance.

---

### Requirement 13: shadcn Components - Full Installation List

**User Story:** As a developer, I want a single definitive list of every shadcn component
to install for Phase 2 so that I can run all installs upfront and avoid mid-build
interruptions.

#### Acceptance Criteria

1. THE developer SHALL install the following shadcn components before writing any Phase 2
   code, in this order:

   **Step 1 - Sidebar block (installs sidebar + its dependencies automatically):**
   ```
   npx shadcn@latest add sidebar-08 --cwd apps/admin
   ```

   **Step 2 - Remaining components not covered by the sidebar block:**
   ```
   npx shadcn@latest add progress --cwd apps/admin
   npx shadcn@latest add scroll-area --cwd apps/admin
   npx shadcn@latest add sonner --cwd apps/admin
   npx shadcn@latest add breadcrumb --cwd apps/admin
   ```

   **Already installed (verify, do not reinstall):** `card`, `badge`, `button`, `separator`

2. THE following shadcn components SHALL NOT be installed for Phase 2 as they are not
   needed until later phases: `table`, `dialog`, `alert-dialog`, `form`, `input`, `label`,
   `textarea`, `select`, `tabs`, `date-picker`, `calendar`, `popover`, `command`,
   `dropdown-menu`.

---

### Requirement 14: TopNav Component using shadcn Primitives

**User Story:** As an admin, I want a page header bar at the top of the main content area
that uses shadcn primitives for consistency with the rest of the UI.

#### Acceptance Criteria

1. THE TopNav SHALL use the shadcn `SidebarTrigger` (from the sidebar block) as its
   leftmost element, allowing the admin to collapse/expand the sidebar.
2. THE TopNav SHALL render a `Separator` with `orientation="vertical"` and
   `className="h-4"` between the SidebarTrigger and the breadcrumb.
3. THE TopNav SHALL display a `Breadcrumb` component (using `BreadcrumbList`,
   `BreadcrumbItem`, `BreadcrumbPage`) showing the current section as static text in
   Phase 2 - e.g. "Dashboard" for `/dashboard`. Dynamic breadcrumbs come in Phase 9.
4. THE TopNav root element SHALL have
   `className="h-12 flex items-center gap-2 px-4 border-b border-border bg-card"`.
5. THE TopNav SHALL be a Server Component with no `'use client'` directive. SidebarTrigger
   is a client component from the sidebar block and renders inside TopNav without making
   TopNav itself a client component.

---

### Requirement 15: KpiCard using shadcn Card

**User Story:** As an admin, I want KPI cards to use the shadcn Card primitive so that
their structure is consistent with the rest of the admin UI.

#### Acceptance Criteria

1. THE KpiCard SHALL use `Card` as its root container with
   `className="rounded-xl border border-border bg-card shadow-none"`.
2. THE KpiCard SHALL use `CardHeader` containing `CardDescription` with
   `className="text-muted-foreground text-sm"` displaying the `label` prop, and an
   optional icon slot.
3. THE KpiCard SHALL use `CardContent` containing the `formatZAR(value)` result with
   `className="text-foreground text-2xl font-semibold"` and an optional `sub` prop in
   `className="text-muted-foreground/70 text-xs mt-1"`.
4. THE KpiCard SHALL accept props: `label: string`, `value: number`, `sub?: string`,
   `icon?: React.ReactNode`.
5. THE KpiCard SHALL format `value` using `formatZAR` from `@/lib/financial`.
6. THE KpiCard SHALL NOT use `'use client'`.

---

### Requirement 16: SalaryCard using shadcn Card

**User Story:** As an admin, I want the salary card to use the shadcn Card primitive with
chart-1 token overrides so that it is structurally consistent with KpiCard but visually
distinct.

#### Acceptance Criteria

1. THE SalaryCard SHALL use `Card` as its root with
   `className="rounded-xl border border-chart-1/40 bg-chart-1/10 shadow-none"`.
2. THE SalaryCard SHALL use `CardHeader` with `CardTitle` having
   `className="text-chart-1 text-sm font-normal"` displaying "Recommended Owner Salary".
3. THE SalaryCard SHALL use `CardContent` containing the formatted salary with
   `className="text-chart-1 text-3xl font-bold"` and a `CardDescription` with
   `className="text-chart-1/70 text-xs"` displaying
   "35% of profit pool · calculated, not guessed".
4. THE SalaryCard SHALL NOT use `'use client'`.

---

### Requirement 17: AllocationBar using shadcn Card and Tooltip

**User Story:** As an admin, I want the allocation breakdown to use shadcn Card and Tooltip
primitives so that the bar segments are accessible and show detail on hover.

#### Acceptance Criteria

1. THE AllocationBar SHALL use `Card` as its container with
   `className="rounded-xl border border-border bg-card shadow-none"`.
2. THE AllocationBar SHALL use `CardHeader` with `CardTitle` having
   `className="text-muted-foreground text-sm font-normal"` displaying
   "Profit Pool Allocation".
3. THE AllocationBar SHALL use `CardContent` for the bar and legend.
4. THE stacked bar segments SHALL be rendered as raw `div`s (NOT Progress components)
   inside AllocationTooltipBar, because Progress components cannot be composed flush
   without gaps in a stacked layout. Each segment SHALL be a `div` with
   `style={{ width: '${pct}%' }}` and the chart token `className`
   (`bg-chart-1`, `bg-chart-2`, `bg-chart-3`, `bg-chart-4`). The outer container SHALL
   have `className="flex h-3 w-full overflow-hidden rounded-full bg-muted"`. Each segment
   `div` SHALL be wrapped in `TooltipProvider` > `Tooltip` > `TooltipTrigger` >
   `TooltipContent` showing `"{label}: {formatZAR(amount)} ({pct}%)"` on hover.
5. THE legend SHALL be a `grid-cols-2 gap-3` grid below the bar showing for each
   allocation: a coloured dot `span` using the chart token `className`, label and
   percentage in `text-muted-foreground text-xs`, and `formatZAR(amount)` in
   `text-foreground text-xs font-medium` right-aligned.
6. THE allocations SHALL be defined as:
   `{ key: 'salary',   label: 'Salary',   pct: 35, color: 'bg-chart-1' }`,
   `{ key: 'reinvest', label: 'Reinvest', pct: 30, color: 'bg-chart-2' }`,
   `{ key: 'reserve',  label: 'Reserve',  pct: 30, color: 'bg-chart-3' }`,
   `{ key: 'flex',     label: 'Flex',     pct: 5,  color: 'bg-chart-4' }`.
7. THE AllocationBar SHALL NOT use `'use client'`. The AllocationTooltipBar child
   component carries the `'use client'` directive for Tooltip support.

---

### Requirement 18: DivisionRevenue using shadcn Card, Progress, and ScrollArea

**User Story:** As an admin, I want the division revenue panel to use shadcn primitives so
that long lists scroll correctly and bars are accessible.

#### Acceptance Criteria

1. THE DivisionRevenue component SHALL use `Card` as its container with
   `className="rounded-xl border border-border bg-card shadow-none"`.
2. THE DivisionRevenue component SHALL use `CardHeader` with `CardTitle`
   "Revenue by Division".
3. THE DivisionRevenue component SHALL use `CardContent` wrapping a `ScrollArea` with
   `className="max-h-64"` to prevent the panel overflowing the dashboard grid when there
   are many divisions.
4. EACH division row SHALL use a `Progress` component with `value` calculated as
   `(total / max) * 100` and `className="[&>div]:bg-chart-2 bg-muted h-1.5"`.
5. THE division name SHALL render in `text-card-foreground text-sm` and the formatted
   total in `text-muted-foreground text-xs`, displayed in a `flex justify-between` row
   above each Progress bar.
6. WHEN the divisions array is empty, THE component SHALL render "No income recorded yet."
   in `text-muted-foreground/50 text-xs` inside `CardContent`.
7. THE DivisionRevenue component SHALL NOT use `'use client'`.

---

### Requirement 19: LeadsSummary using shadcn Card, Progress, Badge, and ScrollArea

**User Story:** As an admin, I want the leads summary panel to use shadcn primitives so
that status labels are styled as badges and bars are accessible.

#### Acceptance Criteria

1. THE LeadsSummary component SHALL use `Card` as its container with
   `className="rounded-xl border border-border bg-card shadow-none"`.
2. THE LeadsSummary component SHALL use `CardHeader` with `CardTitle` "Leads by Status".
3. THE LeadsSummary component SHALL use `CardContent` wrapping a `ScrollArea` with
   `className="max-h-64"`.
4. EACH status row SHALL render:
   (a) A `Badge` component with `variant="secondary"` and `className` overridden per
       status: `new` → `"bg-chart-2/20 text-chart-2 border-chart-2/30"`,
       `contacted` → `"bg-chart-1/20 text-chart-1 border-chart-1/30"`,
       `converted` → `"bg-chart-3/20 text-chart-3 border-chart-3/30"`,
       `lost` → `"bg-muted text-muted-foreground border-border"`,
       displaying the capitalised status string.
   (b) A `Progress` component with `value = (count / total) * 100` and `className` per
       status: `new` → `"[&>div]:bg-chart-2 bg-muted h-1.5"`,
       `contacted` → `"[&>div]:bg-chart-1 bg-muted h-1.5"`,
       `converted` → `"[&>div]:bg-chart-3 bg-muted h-1.5"`,
       `lost` → `"[&>div]:bg-muted-foreground/30 bg-muted h-1.5"`.
   (c) The count as a `text-muted-foreground text-xs` string, right-aligned.
5. WHEN the leads array is empty, THE component SHALL render "No leads yet." in
   `text-muted-foreground/50 text-xs` inside `CardContent`.
6. THE LeadsSummary component SHALL NOT use `'use client'`.

---

### Requirement 20: Sonner Toast for Error States

**User Story:** As an admin, I want toast notifications for any data-fetch errors on the
dashboard so that I am informed without a full page crash.

#### Acceptance Criteria

1. THE Admin_Layout SHALL render the shadcn `Toaster` component (from sonner) at the root
   level so toasts are available on all admin pages.
2. THE `Toaster` SHALL use `theme="dark"` and `position="bottom-right"`.
3. THE Dashboard_Page error boundary (`error.tsx` - Phase 9) SHALL use `toast()` from
   sonner to surface errors. In Phase 2, this is setup-only - no active error triggering
   is required yet.
4. THE `Toaster` component requires `'use client'` internally - it SHALL be imported
   directly into Admin_Layout without a wrapper since Next.js handles this boundary
   automatically for leaf client components inside Server layouts.

---

### Requirement 21: Admin Layout Full Structure with shadcn SidebarProvider

**User Story:** As a developer, I want the Admin_Layout to wire the shadcn SidebarProvider,
Toaster, and main content area correctly so that all admin pages have a consistent,
functional shell.

#### Acceptance Criteria

1. THE Admin_Layout SHALL wrap its entire output in `SidebarProvider` (from the sidebar
   block) to enable sidebar collapse state management.
2. THE Admin_Layout SHALL render:
   `SidebarProvider` > `AppSidebar` (the customised sidebar-08 component) +
   `SidebarInset` > `TopNav` + `<main>`.
3. `SidebarInset` SHALL be used as the right content wrapper - it is the correct companion
   component from the sidebar block, not a plain `div`.
4. THE `<main>` element inside `SidebarInset` SHALL have
   `className="flex-1 overflow-y-auto p-6 bg-background"`.
5. THE `Toaster` SHALL be rendered as a sibling to `SidebarProvider` inside a React
   Fragment or wrapping `div`.
6. THE Admin_Layout SHALL be located at `app/(admin)/layout.tsx` with no `'use client'`
   directive.

---

### Requirement 22: Next.js 16 Proxy Constraint

**User Story:** As a developer, I want the auth guard to follow Next.js 16 conventions so
that the app builds and protects routes correctly.

#### Acceptance Criteria

1. THE auth guard file SHALL be named `proxy.ts` at `apps/admin/src/proxy.ts` - NOT
   `middleware.ts`.
2. THE exported function SHALL be named `proxy` - NOT `middleware`.
3. THE proxy SHALL check for `'better-auth.session_token'` cookie only - no DB calls.
4. IF cookie absent → redirect to `/login`. IF present → `NextResponse.next()`.
5. THE matcher SHALL cover `'/:path*'` only.

---

### Requirement 23: Dashboard Page Metadata and Root Redirect

**User Story:** As a developer, I want the dashboard to export correct metadata and the
admin root to redirect automatically.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL export:
   `export const metadata: Metadata = { title: 'Dashboard' }`.
2. THE file `app/(admin)/page.tsx` SHALL contain only:
   `import { redirect } from 'next/navigation'` and
   `export default function AdminPage() { redirect('/dashboard') }`.
3. Both files SHALL have no `'use client'` directive.
4. THE existing `apps/admin/src/app/page.tsx` is currently a full navigation landing page
   and SHALL be replaced entirely. The replacement SHALL contain only the redirect import
   and function as specified in criterion 2. All existing content (Card, Badge, nav
   sections) SHALL be removed from this file.

---

### Requirement 24: Color Token Reference

**User Story:** As a developer, I want a single reference for every color token used in
Phase 2 so that I never reach for a raw Tailwind palette utility.

#### Acceptance Criteria

1. ALL color usage in Phase 2 SHALL come exclusively from the following tokens defined in
   `apps/admin/src/app/globals.css`:

   **Layout tokens:**
   `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-primary`, `bg-secondary`,
   `bg-accent`, `bg-sidebar`, `bg-sidebar-accent`, `bg-sidebar-primary`,
   `text-foreground`, `text-card-foreground`, `text-muted-foreground`, `text-primary`,
   `text-primary-foreground`, `text-sidebar-foreground`, `text-sidebar-accent-foreground`,
   `text-sidebar-primary`, `text-sidebar-primary-foreground`,
   `border-border`, `border-input`, `border-sidebar-border`,
   `ring-ring`, `ring-sidebar-ring`

   **Data-visualisation tokens:**
   - `bg-chart-1` / `text-chart-1` - salary card highlight, contacted leads, salary allocation segment
   - `bg-chart-2` / `text-chart-2` - reinvest allocation, new leads, division revenue bars
   - `bg-chart-3` / `text-chart-3` - reserve allocation, converted leads
   - `bg-chart-4` / `text-chart-4` - flex allocation
   - `bg-chart-5` / `text-chart-5` - reserved for Phase 8 charts

   **State tokens:**
   `bg-destructive`, `text-destructive` - errors only

2. Opacity modifiers on tokens (e.g. `bg-chart-1/20`, `text-chart-1/70`,
   `border-chart-1/30`) ARE permitted as they compose with the CSS variable value.
3. No raw palette utilities (`zinc-*`, `amber-*`, `blue-*`, `teal-*`, `purple-*`,
   `gray-*`, `slate-*`) SHALL appear in any Phase 2 component `className`.
4. THE developer SHALL verify this by searching the completed codebase for any `className`
   containing `"zinc-"`, `"amber-"`, `"blue-"`, `"teal-"`, `"purple-"` and replacing any
   found instances with the correct token from criterion 1.

---

### Requirement 25: Root Layout

**User Story:** As a developer, I want the root layout to configure fonts, dark mode,
metadata, and the title template so that every admin page inherits the correct shell.

#### Acceptance Criteria

1. THE root layout SHALL be located at `apps/admin/src/app/layout.tsx` and SHALL be a
   Server Component with no `'use client'` directive.
2. THE `<html>` element SHALL have `className="dark"` and `lang="en"` to activate all
   `.dark` CSS variable overrides from `globals.css`.
3. THE root layout SHALL import and apply the Noto Sans font from `next/font/google`,
   assigning it to the `<body>` via the font's `className` - this wires the
   `--font-sans` CSS variable used throughout the design system.
4. THE root layout SHALL export a `metadata` object of type `Metadata` with:
   - `title: { template: '%s · PMG Admin', default: 'PMG Admin' }`
   - `description: 'PMG Control Center'`
   - `robots: { index: false, follow: false }` - the admin app is not public-facing
5. THE root layout SHALL import `globals.css` to apply the Tailwind base styles and CSS
   variable declarations.
6. THE `<body>` element SHALL have `className` including `font-sans antialiased
   bg-background text-foreground` to apply the base theme.
7. THE existing `apps/admin/src/app/layout.tsx` SHALL be updated to add `"dark"` to the
   `<html>` element's `className`. The current file does NOT include the `dark` class.
   This is a change to an existing file, not a new file. The resulting `<html>` element
   SHALL have both `className="dark"` and `lang="en"` as per criterion 2.

---

### Requirement 26: Login Page Placeholder

**User Story:** As an admin, I want a login page at `/login` so that the proxy redirect
target resolves to a valid page rather than a 404.

#### Acceptance Criteria

1. THE login page SHALL be located at `app/(auth)/login/page.tsx` and SHALL be a Server
   Component with no `'use client'` directive.
2. THE `(auth)` route group SHALL have no layout file in Phase 2 - it inherits the root
   layout only.
3. THE login page SHALL render a centred card with:
   - The "PMG / Control Center" brand label using `text-foreground` and
     `text-muted-foreground` tokens
   - A placeholder paragraph: "Authentication coming in a future phase." in
     `text-muted-foreground text-sm`
   - The page container SHALL use `className="min-h-screen flex items-center
     justify-center bg-background"`
4. THE login page SHALL export `metadata: Metadata = { title: 'Login' }`.
5. THE login page SHALL NOT implement any auth form, magic link input, or Better Auth
   integration in Phase 2 - that is Phase 2.5 / auth setup. Its sole purpose is to
   prevent a 404 when the proxy redirects unauthenticated users.
6. THE login page SHALL NOT use `'use client'`.
7. THE developer MAY scaffold the login page using
   `npx shadcn@latest add login-01 --cwd apps/admin` as the structural foundation, then
   strip out the form fields and replace the content with the placeholder text per
   criterion 3. The login-01 block provides the correct centred card layout and
   `bg-muted` background. If scaffolded, the `LoginForm` component SHALL NOT be used -
   only the page layout shell.

---

### Requirement 27: proxy.ts Auth Guard

**User Story:** As a developer, I want the Next.js 16 auth guard created in Phase 2 so
that all admin routes are protected before the dashboard goes live.

#### Acceptance Criteria

1. THE file `apps/admin/src/proxy.ts` SHALL be created in Phase 2 if it does not already
   exist.
2. THE exported function SHALL be named `proxy` - NOT `middleware`. The file SHALL NOT be
   named `middleware.ts`.
3. THE proxy SHALL check for the `better-auth.session_token` cookie only. No database
   calls, no heavy logic.
4. IF the cookie is absent, THE proxy SHALL redirect to `/login` using
   `NextResponse.redirect(new URL('/login', request.url))`.
5. IF the cookie is present, THE proxy SHALL return `NextResponse.next()`.
6. THE matcher config SHALL be `['/:path*']` - covering all routes.
7. THE proxy SHALL import `NextResponse` from `'next/server'` and type the parameter as
   `NextRequest` from `'next/server'`.

---

### Requirement 28: AllocationTooltipBar Component

**User Story:** As a developer, I want AllocationTooltipBar fully specified as its own
component so I know exactly what to build.

#### Acceptance Criteria

1. THE file SHALL be located at `components/dashboard/allocation-tooltip-bar.tsx`.
2. THE component SHALL have `'use client'` as its first line.
3. THE component SHALL accept props:
   `allocations: Array<{ key: string; label: string; pct: number; color: string; amount: number }>`.
4. THE component SHALL render the outer bar container with
   `className="flex h-3 w-full overflow-hidden rounded-full bg-muted"`.
5. EACH allocation segment SHALL be rendered as a `div` with `style={{ width: '${pct}%' }}`
   and `className` set to the allocation's `color` value (e.g. `bg-chart-1`).
6. EACH segment `div` SHALL be wrapped in the shadcn Tooltip composition:
   `TooltipProvider` > `Tooltip` > `TooltipTrigger asChild` > `TooltipContent`.
7. THE `TooltipContent` SHALL display the string `"{label}: {formatZAR(amount)} ({pct}%)"`
   - importing `formatZAR` from `@/lib/financial`.
8. THE `AllocationBar` Server Component SHALL import and render `AllocationTooltipBar`,
   passing the four allocation objects defined in Requirement 17 criterion 6, with the
   `amount` field sourced from the `FinancialSummary` prop using the matching `key`.
9. THE component SHALL NOT import or use any other client-side state or hooks beyond what
   shadcn Tooltip requires internally.
