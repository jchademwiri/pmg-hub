# Design Document - dashboard-ui

## Overview

Phase 2 of the PMG Control Center admin app. This phase builds the admin shell layout
(sidebar + top nav) and the financial overview dashboard - the first page an admin sees
after login. All data is fetched server-side at request time from Neon PostgreSQL via
Drizzle ORM. The page is built entirely with React Server Components; no client-side
state, no loading spinners, no browser-initiated API calls.

The two client component boundaries are:
- `NavLink` - needs `usePathname` for active route highlighting
- `AllocationTooltipBar` - needs shadcn Tooltip (which requires client interactivity)

Everything else is a Server Component.

---

## Architecture

### Tech Stack

- Next.js 16 (App Router), React 19, TypeScript strict mode
- Tailwind CSS v4 with OKLCH CSS variables (no raw palette utilities)
- shadcn/ui (style: radix-vega, baseColor: zinc, cssVariables: true)
- Bun + Turborepo monorepo
- `fast-check` for property-based testing, `vitest` as test runner

### Route Structure

```
apps/admin/src/
├── proxy.ts                          # Next.js 16 auth guard
├── app/
│   ├── layout.tsx                    # Root layout: dark class, Noto Sans, metadata
│   ├── globals.css                   # OKLCH design tokens (already complete)
│   ├── page.tsx                      # Redirect → /dashboard
│   ├── (admin)/
│   │   ├── layout.tsx                # SidebarProvider + AppSidebar + SidebarInset
│   │   └── dashboard/
│   │       └── page.tsx              # Async Server Component, Promise.all fetch
│   └── (auth)/
│       └── login/
│           └── page.tsx              # Placeholder login page
└── components/
    ├── layout/
    │   ├── app-sidebar.tsx           # Customised sidebar-08 block
    │   ├── top-nav.tsx               # SidebarTrigger + Separator + Breadcrumb
    │   └── nav-link.tsx              # 'use client', usePathname active state
    └── dashboard/
        ├── kpi-card.tsx
        ├── salary-card.tsx
        ├── allocation-bar.tsx
        ├── allocation-tooltip-bar.tsx  # 'use client'
        ├── division-revenue.tsx
        └── leads-summary.tsx
```


### Data Flow

```
packages/db (@pmg/db)
  └── getTotalRevenue(), getTotalExpenses(), getRevenueByDivision(), getLeadsByStatus()
        ↓
apps/admin/src/lib/financial.ts  [server-only]
  └── getFinancialSummary() → FinancialSummary
  └── getDivisionRevenue()  → DivisionRevenue[]
  └── getLeadCounts()       → LeadStatusCount[]
  └── formatZAR(n)          → string
        ↓
app/(admin)/dashboard/page.tsx  [async Server Component]
  └── Promise.all([getFinancialSummary(), getDivisionRevenue(), getLeadCounts()])
        ↓
  ├── <KpiCard />           (×4, pure props)
  ├── <SalaryCard />        (pure props)
  ├── <AllocationBar />     (pure props)
  │     └── <AllocationTooltipBar />  ['use client']
  ├── <DivisionRevenue />   (pure props)
  └── <LeadsSummary />      (pure props)
```

All dashboard components are pure presentational - they receive props and render. No
component below `dashboard/page.tsx` performs any data fetching or holds state.

### Client/Server Boundary Map

```
Server Components (no 'use client'):
  app/(admin)/layout.tsx
  app/(admin)/dashboard/page.tsx
  components/layout/app-sidebar.tsx
  components/layout/top-nav.tsx
  components/dashboard/kpi-card.tsx
  components/dashboard/salary-card.tsx
  components/dashboard/allocation-bar.tsx
  components/dashboard/division-revenue.tsx
  components/dashboard/leads-summary.tsx
  app/(auth)/login/page.tsx
  app/layout.tsx
  app/page.tsx
  proxy.ts

Client Components ('use client'):
  components/layout/nav-link.tsx          ← usePathname
  components/dashboard/allocation-tooltip-bar.tsx  ← shadcn Tooltip
```

---

## shadcn Install Sequence

Run these commands before writing any Phase 2 code:

**Step 1 - Sidebar block (auto-installs sidebar + all its dependencies):**
```bash
npx shadcn@latest add sidebar-08 --cwd apps/admin
```
This automatically installs: `sidebar`, `button`, `separator`, `skeleton`, `sheet`,
`tooltip`, `input`, `avatar`. Do NOT install these separately.

**Step 2 - Remaining components:**
```bash
npx shadcn@latest add progress --cwd apps/admin
npx shadcn@latest add scroll-area --cwd apps/admin
npx shadcn@latest add sonner --cwd apps/admin
npx shadcn@latest add breadcrumb --cwd apps/admin
```

**Already installed (verify, do not reinstall):** `card`, `badge`, `button`, `separator`

**Optional reference scaffold (do not use verbatim):**
```bash
npx shadcn@latest add login-01 --cwd apps/admin
```

---

## Components and Interfaces

### proxy.ts

**Location:** `apps/admin/src/proxy.ts`

Next.js 16 breaking change: the auth guard file must be named `proxy.ts` (not
`middleware.ts`) and the exported function must be named `proxy` (not `middleware`).

```typescript
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }
  const session = request.cookies.get('better-auth.session_token')
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/:path*'] }
```

> The `/login` path exclusion is required to prevent an infinite redirect loop.
> Without it, the proxy catches the `/login` request itself (because the matcher
> covers `/:path*`), finds no session cookie, and redirects to `/login` again
> indefinitely. Any path starting with `/login` bypasses the cookie check.

No database calls. Cookie check only.

---

### app/layout.tsx (Root Layout)

**Location:** `apps/admin/src/app/layout.tsx`
**Action:** UPDATE existing file

> The existing `layout.tsx` imports `Geist` and `Geist_Mono` from `next/font/google`.
> These SHALL be removed entirely. The replacement file imports only `Noto_Sans`.
> The Geist CSS variables (`--font-geist-sans`, `--font-geist-mono`) are not
> referenced by `globals.css` or any Phase 2 component - removing them has no
> styling impact. Remove the Geist variable assignments from the `html` className
> as well.

> The existing `body` element has `suppressHydrationWarning={true}`. This SHALL
> be retained in the updated layout as it suppresses hydration warnings caused
> by browser extensions modifying the DOM before React hydrates.

Key changes from current file:
- Add `className="dark"` and `lang="en"` to `<html>`
- Import Noto Sans from `next/font/google`, apply to `<body>`
- Export `metadata` with title template, description, and noindex robots

```typescript
import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: { template: '%s · PMG Admin', default: 'PMG Admin' },
  description: 'PMG Control Center',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${notoSans.className} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
```

---

### app/page.tsx (Root Redirect)

**Location:** `apps/admin/src/app/page.tsx`
**Action:** REPLACE existing file entirely

> This file lives at the root `app/` level, not inside `app/(admin)/`. The root
> redirect sends unauthenticated and authenticated users alike to `/dashboard`,
> which is then handled by the `(admin)` layout. Placing this redirect inside
> `(admin)` would create a circular route - `/dashboard` redirecting to `/dashboard`.

```typescript
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/dashboard')
}
```

---

### app/(admin)/layout.tsx (Admin Shell)

**Location:** `apps/admin/src/app/(admin)/layout.tsx`
**Action:** CREATE new file

Server Component. Wraps all admin pages with sidebar shell and toast provider.

Structure: `Fragment` > `SidebarProvider` > `AppSidebar` + `SidebarInset` > `TopNav` + `<main>`, with `Toaster` as sibling to `SidebarProvider`.

```typescript
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { Toaster } from '@/components/ui/sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <TopNav />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster theme="dark" position="bottom-right" />
    </>
  )
}
```

`Toaster` is a leaf client component - Next.js handles the client boundary automatically
when it is imported into a Server layout.

---

### components/layout/app-sidebar.tsx

**Location:** `apps/admin/src/components/layout/app-sidebar.tsx`
**Action:** Scaffold via `sidebar-08` block, then customise directly

The `sidebar-08` block scaffolds this file. Customise it in place - do not create a
separate sidebar component alongside it.

Nav items:
```typescript
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income',    label: 'Income',    icon: TrendingUp },
  { href: '/expenses',  label: 'Expenses',  icon: TrendingDown },
  { href: '/leads',     label: 'Leads',     icon: Users },
  { href: '/divisions', label: 'Divisions', icon: Layers },
]
```

All icons from `lucide-react`.

Sidebar header brand:
```tsx
<div className="flex flex-col gap-0.5 px-2 py-3">
  <span className="text-sidebar-foreground/50 text-xs uppercase tracking-widest">PMG</span>
  <span className="text-sidebar-foreground text-sm font-semibold">Control Center</span>
</div>
```

Sidebar footer (replace user section):
```tsx
<div className="px-2 py-3">
  <span className="text-sidebar-foreground/50 text-xs">PMG Admin</span>
</div>
```

Nav items use `NavLink` as the link renderer inside the sidebar block's nav item slots.
The sidebar is collapsible on mobile (sheet/drawer from block) and fixed `w-56` on `lg+`.
Sidebar background: `bg-sidebar`, border: `border-sidebar-border` - set by `.dark` CSS
variables, no additional className overrides needed.

---

### components/layout/top-nav.tsx

**Location:** `apps/admin/src/components/layout/top-nav.tsx`
**Action:** CREATE new file

Server Component. Renders the page header bar.

```typescript
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage
} from '@/components/ui/breadcrumb'

export function TopNav() {
  return (
    <header className="h-12 flex items-center gap-2 px-4 border-b border-border bg-card">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
```

`SidebarTrigger` is a client component from the sidebar block. Importing it into a Server
Component is valid - Next.js handles the boundary at the leaf level.

Dynamic breadcrumbs (Phase 9) will replace the static "Dashboard" text.

---

### components/layout/nav-link.tsx

**Location:** `apps/admin/src/components/layout/nav-link.tsx`
**Action:** CREATE new file

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavLinkProps = {
  href: string
  label: string
  icon?: React.ReactNode
}

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={
        isActive
          ? 'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-sidebar-accent text-sidebar-accent-foreground'
          : 'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      }
    >
      {icon}
      {label}
    </Link>
  )
}
```

Active condition: `pathname === href || pathname.startsWith(href + '/')` - exact match or
sub-route match. This prevents `/dashboard` matching `/dashboard-settings`.


---

### app/(admin)/dashboard/page.tsx

**Location:** `apps/admin/src/app/(admin)/dashboard/page.tsx`
**Action:** CREATE new file

Async Server Component. Fetches all data in parallel, passes to presentational components.

```typescript
import type { Metadata } from 'next'
import { getFinancialSummary, getDivisionRevenue, getLeadCounts } from '@/lib/financial'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { SalaryCard } from '@/components/dashboard/salary-card'
import { AllocationBar } from '@/components/dashboard/allocation-bar'
import { DivisionRevenue } from '@/components/dashboard/division-revenue'
import { LeadsSummary } from '@/components/dashboard/leads-summary'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const [summary, divisions, leads] = await Promise.all([
    getFinancialSummary(),
    getDivisionRevenue(),
    getLeadCounts(),
  ])

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue"   value={summary.revenue}  />
        <KpiCard label="Total Expenses"  value={summary.expenses} />
        <KpiCard label="PMG Share (20%)" value={summary.pmgShare} />
        <KpiCard label="Profit Pool"     value={summary.profitPool} />
      </div>

      {/* Salary + Allocation row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalaryCard salary={summary.salary} />
        <div className="lg:col-span-2">
          <AllocationBar summary={summary} />
        </div>
      </div>

      {/* Division revenue + Leads row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DivisionRevenue divisions={divisions} />
        <LeadsSummary leads={leads} />
      </div>
    </div>
  )
}
```

Error propagation: any throw from `getFinancialSummary`, `getDivisionRevenue`, or
`getLeadCounts` propagates naturally to the Next.js error boundary. No try/catch in the
page component itself - that is handled by `error.tsx` in Phase 9.

---

### components/dashboard/kpi-card.tsx

**Location:** `apps/admin/src/components/dashboard/kpi-card.tsx`

```typescript
type KpiCardProps = {
  label: string
  value: number
  sub?: string
  icon?: React.ReactNode
}
```

Rendering:
```tsx
<Card className="rounded-xl border border-border bg-card shadow-none">
  <CardHeader className="pb-2">
    <CardDescription className="text-muted-foreground text-sm flex items-center gap-2">
      {icon}
      {label}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-foreground text-2xl font-semibold">{formatZAR(value)}</p>
    {sub && <p className="text-muted-foreground/70 text-xs mt-1">{sub}</p>}
  </CardContent>
</Card>
```

Imports `formatZAR` from `@/lib/financial`. No `'use client'`.

---

### components/dashboard/salary-card.tsx

**Location:** `apps/admin/src/components/dashboard/salary-card.tsx`

```typescript
type SalaryCardProps = { salary: number }
```

Rendering:
```tsx
<Card className="rounded-xl border border-chart-1/40 bg-chart-1/10 shadow-none">
  <CardHeader className="pb-2">
    <CardTitle className="text-chart-1 text-sm font-normal">
      Recommended Owner Salary
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-chart-1 text-3xl font-bold">{formatZAR(salary)}</p>
    <CardDescription className="text-chart-1/70 text-xs mt-1">
      35% of profit pool · calculated, not guessed
    </CardDescription>
  </CardContent>
</Card>
```

No `'use client'`.

---

### components/dashboard/allocation-bar.tsx

**Location:** `apps/admin/src/components/dashboard/allocation-bar.tsx`

```typescript
import type { FinancialSummary } from '@/lib/financial'

type AllocationBarProps = { summary: FinancialSummary }
```

The `ALLOCATIONS` constant is defined in this file:

```typescript
const ALLOCATIONS = [
  { key: 'salary',   label: 'Salary',   pct: 35, color: 'bg-chart-1' },
  { key: 'reinvest', label: 'Reinvest', pct: 30, color: 'bg-chart-2' },
  { key: 'reserve',  label: 'Reserve',  pct: 30, color: 'bg-chart-3' },
  { key: 'flex',     label: 'Flex',     pct: 5,  color: 'bg-chart-4' },
] as const
```

At render time, `amount` is added from `summary[item.key]`:
```typescript
const allocations = ALLOCATIONS.map(item => ({
  ...item,
  amount: summary[item.key as keyof FinancialSummary] as number,
}))
```

Rendering:
```tsx
<Card className="rounded-xl border border-border bg-card shadow-none">
  <CardHeader className="pb-2">
    <CardTitle className="text-muted-foreground text-sm font-normal">
      Profit Pool Allocation
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <AllocationTooltipBar allocations={allocations} />
    <div className="grid grid-cols-2 gap-3">
      {allocations.map(item => (
        <div key={item.key} className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${item.color}`} />
            <span className="text-muted-foreground text-xs">{item.label} {item.pct}%</span>
          </div>
          <span className="text-foreground text-xs font-medium">{formatZAR(item.amount)}</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

No `'use client'`. `AllocationTooltipBar` carries the client boundary.

---

### components/dashboard/allocation-tooltip-bar.tsx

**Location:** `apps/admin/src/components/dashboard/allocation-tooltip-bar.tsx`

```typescript
'use client'

type AllocationItem = {
  key: string
  label: string
  pct: number
  color: string
  amount: number
}

type AllocationTooltipBarProps = { allocations: AllocationItem[] }
```

Rendering - outer container is a flex row, each segment is a raw `div` (not `Progress`)
to avoid flush-gap issues in stacked layout:

```tsx
<div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
  {allocations.map(item => (
    <TooltipProvider key={item.key}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={item.color}
            style={{ width: `${item.pct}%` }}
          />
        </TooltipTrigger>
        <TooltipContent>
          {item.label}: {formatZAR(item.amount)} ({item.pct}%)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ))}
</div>
```

Imports `formatZAR` from `@/lib/financial`. Imports `TooltipProvider`, `Tooltip`,
`TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip`.

Design rationale for raw `div` segments: `Progress` renders an inner `div` with
`transform: translateX(...)` which creates sub-pixel gaps between adjacent segments in a
flex row. Raw `div`s with `width` percentages compose flush without gaps.

---

### components/dashboard/division-revenue.tsx

**Location:** `apps/admin/src/components/dashboard/division-revenue.tsx`

```typescript
import type { DivisionRevenue } from '@/lib/financial'

type DivisionRevenueProps = { divisions: DivisionRevenue[] }
```

Bar width calculation: `Math.round((division.total / max) * 100)` where
`max = Math.max(...divisions.map(d => d.total), 1)`.

> `max` is computed before the empty array guard, with a fallback of `1` to prevent
> division by zero if the guard is bypassed or the array contains all-zero totals:
> ```typescript
> const max = Math.max(...divisions.map(d => d.total), 1)
> ```
> The `, 1` argument ensures `max` is never `0`, which would produce `Infinity` or `NaN`
> in the bar width calculation.

Rendering:
```tsx
<Card className="rounded-xl border border-border bg-card shadow-none">
  <CardHeader className="pb-2">
    <CardTitle className="text-card-foreground text-sm font-medium">
      Revenue by Division
    </CardTitle>
  </CardHeader>
  <CardContent>
    {divisions.length === 0 ? (
      <p className="text-muted-foreground/50 text-xs">No income recorded yet.</p>
    ) : (
      <ScrollArea className="max-h-64">
        <div className="space-y-3">
          {divisions.map(div => (
            <div key={div.divisionName} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-card-foreground text-sm">{div.divisionName}</span>
                <span className="text-muted-foreground text-xs">{formatZAR(div.total)}</span>
              </div>
              <Progress
                value={Math.round((div.total / max) * 100)}
                className="[&>div]:bg-chart-2 bg-muted h-1.5"
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    )}
  </CardContent>
</Card>
```

No `'use client'`.

---

### components/dashboard/leads-summary.tsx

**Location:** `apps/admin/src/components/dashboard/leads-summary.tsx`

```typescript
import type { LeadStatusCount } from '@/lib/financial'

type LeadsSummaryProps = { leads: LeadStatusCount[] }
```

Status color maps (defined as constants in the component file):

```typescript
const BADGE_CLASS: Record<string, string> = {
  new:       'bg-chart-2/20 text-chart-2 border-chart-2/30',
  contacted: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
  converted: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  lost:      'bg-muted text-muted-foreground border-border',
}

const PROGRESS_CLASS: Record<string, string> = {
  new:       '[&>div]:bg-chart-2 bg-muted h-1.5',
  contacted: '[&>div]:bg-chart-1 bg-muted h-1.5',
  converted: '[&>div]:bg-chart-3 bg-muted h-1.5',
  lost:      '[&>div]:bg-muted-foreground/30 bg-muted h-1.5',
}
```

Bar width: `Math.round((lead.count / total) * 100)` where
`total = leads.reduce((sum, l) => sum + l.count, 0)`.

Rendering:
```tsx
<Card className="rounded-xl border border-border bg-card shadow-none">
  <CardHeader className="pb-2">
    <CardTitle className="text-card-foreground text-sm font-medium">
      Leads by Status
    </CardTitle>
  </CardHeader>
  <CardContent>
    {leads.length === 0 ? (
      <p className="text-muted-foreground/50 text-xs">No leads yet.</p>
    ) : (
      <ScrollArea className="max-h-64">
        <div className="space-y-3">
          {leads.map(lead => (
            <div key={lead.status} className="space-y-1">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className={BADGE_CLASS[lead.status] ?? BADGE_CLASS.lost}
                >
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </Badge>
                <span className="text-muted-foreground text-xs">{lead.count}</span>
              </div>
              <Progress
                value={Math.round((lead.count / total) * 100)}
                className={PROGRESS_CLASS[lead.status] ?? PROGRESS_CLASS.lost}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    )}
  </CardContent>
</Card>
```

No `'use client'`. Unknown statuses fall back to `lost` styling via `?? BADGE_CLASS.lost`.

---

### app/(auth)/login/page.tsx

**Location:** `apps/admin/src/app/(auth)/login/page.tsx`
**Action:** CREATE new file

Placeholder only. No auth form. Sole purpose: prevent 404 when proxy redirects.

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="rounded-xl border border-border bg-card p-8 shadow-none w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <p className="text-foreground/50 text-xs uppercase tracking-widest">PMG</p>
          <p className="text-foreground text-sm font-semibold">Control Center</p>
        </div>
        <p className="text-muted-foreground text-sm">
          Authentication coming in a future phase.
        </p>
      </div>
    </div>
  )
}
```

No `'use client'`. No layout file in `(auth)` - inherits root layout only.


---

## Data Models

All types are defined in `apps/admin/src/lib/financial.ts` (Phase 1 - already complete).
Phase 2 components consume these types as read-only props.

```typescript
// Already exported from lib/financial.ts
type FinancialSummary = {
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
  salary: number
  reinvest: number
  reserve: number
  flex: number
}

type DivisionRevenue = { divisionName: string; total: number }

type LeadStatusCount = { status: string; count: number }
```

### Allocation Constant

Defined in `allocation-bar.tsx`. Static - percentages never change at runtime.

```typescript
const ALLOCATIONS = [
  { key: 'salary',   label: 'Salary',   pct: 35, color: 'bg-chart-1' },
  { key: 'reinvest', label: 'Reinvest', pct: 30, color: 'bg-chart-2' },
  { key: 'reserve',  label: 'Reserve',  pct: 30, color: 'bg-chart-3' },
  { key: 'flex',     label: 'Flex',     pct: 5,  color: 'bg-chart-4' },
] as const
// 35 + 30 + 30 + 5 === 100 ✓
```

The `amount` field is computed at render time:
```typescript
const allocations = ALLOCATIONS.map(item => ({
  ...item,
  amount: summary[item.key as keyof FinancialSummary] as number,
}))
```

### Component Prop Interfaces Summary

```typescript
// kpi-card.tsx
type KpiCardProps = { label: string; value: number; sub?: string; icon?: React.ReactNode }

// salary-card.tsx
type SalaryCardProps = { salary: number }

// allocation-bar.tsx
type AllocationBarProps = { summary: FinancialSummary }

// allocation-tooltip-bar.tsx
type AllocationItem = { key: string; label: string; pct: number; color: string; amount: number }
type AllocationTooltipBarProps = { allocations: AllocationItem[] }

// division-revenue.tsx
type DivisionRevenueProps = { divisions: DivisionRevenue[] }

// leads-summary.tsx
type LeadsSummaryProps = { leads: LeadStatusCount[] }

// nav-link.tsx
type NavLinkProps = { href: string; label: string; icon?: React.ReactNode }
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system - essentially, a formal statement about what the system should do.
Properties serve as the bridge between human-readable specifications and machine-verifiable
correctness guarantees.*

### Property 1: formatZAR output correctness

*For any* finite number passed to `formatZAR`, the returned string is non-empty and
contains the character "R".

**Validates: Requirements 4.3, 5.1, 15.5**

### Property 2: Proportional bar width invariant

*For any* non-negative value `v` and positive maximum `max`, the expression
`(v / max) * 100` is always in the range `[0, 100]`.

This property covers both `DivisionRevenue` (bar width = `total / max * 100`) and
`LeadsSummary` (bar width = `count / total * 100`).

**Validates: Requirements 7.2, 8.3**

### Property 3: Array length preservation

*For any* non-empty array of `DivisionRevenue` entries, the number of `Progress` bar
elements rendered by `DivisionRevenue` equals the length of the input array. Likewise,
*for any* non-empty array of `LeadStatusCount` entries, the number of rows rendered by
`LeadsSummary` equals the length of the input array.

**Validates: Requirements 7.1, 8.1**

### Property 4: Empty state rendering

*For any* component that accepts an array prop (`DivisionRevenue`, `LeadsSummary`), when
the array is empty the component renders its designated empty state string and does not
throw.

**Validates: Requirements 7.5, 8.4**

### Property 5: Allocation percentages sum to 100

The `ALLOCATIONS` constant has exactly four entries whose `pct` values sum to 100.
This is a static invariant - the constant never changes at runtime.

**Validates: Requirements 6.1, 17.6**

### Property 6: Proxy cookie check

*For any* incoming request whose pathname does **not** start with `/login` and that has
no `better-auth.session_token` cookie, the proxy returns a redirect to `/login`. For any
request that has the cookie, or whose pathname starts with `/login`, the proxy returns
`NextResponse.next()`.

**Validates: Requirements 22.3, 22.4, 27.3, 27.4, 27.6**

### Property 7: AllocationTooltipBar tooltip content

*For any* `AllocationItem`, the tooltip content rendered for that segment equals the
string `"{label}: {formatZAR(amount)} ({pct}%)"`.

**Validates: Requirements 17.4, 28.7**

---

## Error Handling

### Data Fetch Errors

`dashboard/page.tsx` uses `Promise.all` with no try/catch. Any rejection from
`getFinancialSummary`, `getDivisionRevenue`, or `getLeadCounts` propagates to the
nearest Next.js error boundary. In Phase 2 there is no `error.tsx` - the default Next.js
error page is shown. Phase 9 adds `error.tsx` with `toast()` from sonner.

### Empty Arrays

`DivisionRevenue` and `LeadsSummary` handle empty arrays with a guard before the
`ScrollArea`:
```typescript
if (divisions.length === 0) return <p>No income recorded yet.</p>
```
No crash, no division-by-zero in bar width calculation.

### Unknown Lead Statuses

`LeadsSummary` uses `?? BADGE_CLASS.lost` and `?? PROGRESS_CLASS.lost` as fallbacks for
any status string not in the known map. This prevents undefined className errors for
future statuses added to the database.

### Proxy Redirect Loop

The proxy matcher `['/:path*']` covers `/login` itself. To prevent an infinite redirect
loop, the proxy must exclude `/login` from the redirect target check. Implementation:

```typescript
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/login')) return NextResponse.next()
  const session = request.cookies.get('better-auth.session_token')
  if (!session) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}
```

### Bar Width Edge Cases

`DivisionRevenue` computes `max` only when `divisions.length > 0` (guarded by the empty
check). `LeadsSummary` computes `total` as `leads.reduce(...)` - if all counts are 0,
`total` is 0 and bar widths are 0 (no division-by-zero since `Progress value={0}` is
valid).

---

## Testing Strategy

### Test File Location

```
apps/admin/src/__tests__/
  financial.test.ts     ← Phase 1 (complete)
  dashboard-ui.test.ts  ← Phase 2 (new)
```

### Testing Tools

- **Test runner:** Vitest
- **Property-based testing:** `fast-check` (already installed as devDependency)
- **Minimum iterations per property test:** 100 (fast-check default)

### Dual Testing Approach

Unit tests and property tests are complementary. Unit tests cover specific examples and
edge cases. Property tests verify universal correctness across generated inputs.

**Unit tests focus on:**
- Specific rendering examples (correct text, correct className)
- Edge cases (empty arrays, unknown status strings)
- Integration between components (AllocationBar passes correct amounts to AllocationTooltipBar)

**Property tests focus on:**
- Universal mathematical invariants (bar width always in [0,100])
- Output format guarantees (formatZAR always returns string with "R")
- Behavioral contracts (proxy redirects iff cookie absent)

### Property Test Implementations

#### Test Prerequisites

The component render tests (Properties 3, 4, 7 and the unit tests) require
`@testing-library/react` and `@testing-library/jest-dom`. These are **not** currently
installed in `apps/admin`. Before writing component render tests, run:

```bash
bun add -d @testing-library/react @testing-library/jest-dom --cwd apps/admin
```

And update `apps/admin/vitest.config.ts`:
```typescript
environment: 'jsdom'  // replace 'node'
setupFiles: ['./src/__tests__/setup.ts']
```

Create `apps/admin/src/__tests__/setup.ts` containing:
```typescript
import '@testing-library/jest-dom'
```

> If installing `@testing-library` is out of scope for Phase 2, the component render
> tests (Properties 3, 4, 7) SHALL be deferred to Phase 9 and replaced with pure
> function tests for the bar width calculation logic only.

Each property test must include a comment referencing the design property:

**Property 1 - formatZAR output correctness**
```typescript
// Feature: dashboard-ui, Property 1: formatZAR output correctness
fc.assert(fc.property(
  fc.double({ noNaN: true, noDefaultInfinity: true }),
  (amount) => {
    const result = formatZAR(amount)
    expect(result.length).toBeGreaterThan(0)
    expect(result).toMatch(/R/)
  }
))
```

**Property 2 - Proportional bar width invariant**
```typescript
// Feature: dashboard-ui, Property 2: Proportional bar width invariant
fc.assert(fc.property(
  fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: 0.001, noNaN: true, noDefaultInfinity: true }),
  (value, max) => {
    const width = (value / max) * 100
    expect(width).toBeGreaterThanOrEqual(0)
    expect(width).toBeLessThanOrEqual(100 + Number.EPSILON)
  }
))
```

**Property 3 - Array length preservation**
```typescript
// Feature: dashboard-ui, Property 3: Array length preservation
fc.assert(fc.property(
  fc.array(fc.record({ divisionName: fc.string(), total: fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }) }), { minLength: 1 }),
  (divisions) => {
    const { container } = render(<DivisionRevenue divisions={divisions} />)
    const bars = container.querySelectorAll('[role="progressbar"]')
    expect(bars.length).toBe(divisions.length)
  }
))
```

**Property 4 - Empty state rendering**
```typescript
// Feature: dashboard-ui, Property 4: Empty state rendering
it('DivisionRevenue renders empty state for empty array', () => {
  const { getByText } = render(<DivisionRevenue divisions={[]} />)
  expect(getByText('No income recorded yet.')).toBeTruthy()
})
it('LeadsSummary renders empty state for empty array', () => {
  const { getByText } = render(<LeadsSummary leads={[]} />)
  expect(getByText('No leads yet.')).toBeTruthy()
})
```

**Property 5 - Allocation percentages sum to 100**
```typescript
// Feature: dashboard-ui, Property 5: Allocation percentages sum to 100
it('ALLOCATIONS pct values sum to 100', () => {
  const sum = ALLOCATIONS.reduce((acc, item) => acc + item.pct, 0)
  expect(sum).toBe(100)
})
```

**Property 6 - Proxy cookie check**
```typescript
// Feature: dashboard-ui, Property 6: Proxy cookie check
fc.assert(fc.property(
  fc.string(), // random path
  (path) => {
    const req = new NextRequest(new URL(`http://localhost${path}`))
    // no cookie set
    const res = proxy(req)
    if (!path.startsWith('/login')) {
      expect(res.status).toBe(307) // redirect
    } else {
      expect(res.status).not.toBe(307) // login path bypasses cookie check
    }
  }
))
```

**Property 7 - AllocationTooltipBar tooltip content**
```typescript
// Feature: dashboard-ui, Property 7: AllocationTooltipBar tooltip content
fc.assert(fc.property(
  fc.record({
    key: fc.string(),
    label: fc.string(),
    pct: fc.integer({ min: 1, max: 100 }),
    color: fc.constant('bg-chart-1'),
    amount: fc.double({ noNaN: true, noDefaultInfinity: true }),
  }),
  (item) => {
    const expected = `${item.label}: ${formatZAR(item.amount)} (${item.pct}%)`
    const { getByText } = render(<AllocationTooltipBar allocations={[item]} />)
    // trigger tooltip
    expect(getByText(expected)).toBeTruthy()
  }
))
```

### Unit Test Coverage

Beyond property tests, unit tests should cover:

- `KpiCard` renders `formatZAR(value)` in the output
- `SalaryCard` renders the sub-label text exactly
- `AllocationBar` renders all four legend items with correct labels
- `TopNav` renders `SidebarTrigger`, `Separator`, and `Breadcrumb`
- `NavLink` applies active class when pathname matches href
- `NavLink` applies hover class when pathname does not match href
- `DivisionRevenue` renders division names and formatted totals
- `LeadsSummary` capitalises status strings in Badge

---

## Implementation Notes and Constraints

### Color Token Enforcement

All `className` values must use semantic CSS variable utilities from `globals.css`. No
raw Tailwind palette utilities (`zinc-*`, `amber-*`, `blue-*`, `teal-*`, `purple-*`,
`gray-*`, `slate-*`). Verify after implementation:

```bash
grep -r "zinc-\|amber-\|blue-\|teal-\|purple-\|gray-\|slate-" apps/admin/src/components
```

Any matches must be replaced with the correct token from Requirement 24.

### Tailwind v4 CSS Variable Utilities

In Tailwind v4, CSS variable-based color utilities are generated from the `@theme inline`
block in `globals.css`. The pattern `bg-chart-1/20` (opacity modifier) is valid and
composes with the OKLCH value. All chart tokens, sidebar tokens, and semantic tokens are
available as Tailwind utilities.

### Progress Component className Override

shadcn's `Progress` component uses a nested `div` for the filled bar. To override its
color, use the Tailwind arbitrary variant:
```
className="[&>div]:bg-chart-2 bg-muted h-1.5"
```
The `[&>div]` selector targets the inner fill div. `bg-muted` sets the track color.

### sidebar-08 Scaffold Customisation

After running `npx shadcn@latest add sidebar-08 --cwd apps/admin`, the scaffolded file
at `components/layout/app-sidebar.tsx` will contain placeholder nav items and a user
footer. Customise this file directly - do not create a parallel component. The scaffolded
`AppSidebar` export name must be preserved as it is referenced in `Admin_Layout`.

### Next.js 16 proxy.ts vs middleware.ts

Next.js 16 renamed the auth guard convention. The file must be `proxy.ts` at
`src/proxy.ts` and the export must be named `proxy`. Using `middleware.ts` or `middleware`
will cause the guard to be silently ignored.

### Toaster in Server Layout

`Toaster` from `sonner` is a client component. Importing it directly into a Server
Component layout is valid in Next.js App Router - the framework handles the client
boundary at the leaf level. No wrapper component is needed.

### `(admin)` and `(auth)` Route Groups

Parenthesised route groups do not appear in the URL. `(admin)/dashboard/page.tsx` is
accessible at `/dashboard`. `(auth)/login/page.tsx` is accessible at `/login`. The
`(auth)` group has no `layout.tsx` - it inherits the root layout only.

### Title Template

The root layout exports `title: { template: '%s · PMG Admin', default: 'PMG Admin' }`.
Dashboard page exports `title: 'Dashboard'` → browser tab shows "Dashboard · PMG Admin".
Login page exports `title: 'Login'` → browser tab shows "Login · PMG Admin".
