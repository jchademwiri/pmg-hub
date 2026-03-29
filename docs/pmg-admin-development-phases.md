# PMG Control Center — Development Phases

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / pmg_control_center_development_phases.md` · March 2026 · v2.0
>
> This document supersedes the original `pmg_control_center_development_phases.md`.
> All phase plans, folder structures, component lists, and AI prompts have been
> expanded with full implementation detail.

---

## Table of Contents

1. [Monorepo Context](#1-monorepo-context)
2. [Admin App Folder Structure](#2-admin-app-folder-structure)
3. [Phase 0 — Foundation](#3-phase-0--foundation-already-done-)
4. [Phase 1 — Financial Engine](#4-phase-1--financial-engine-mvp-)
5. [Phase 2 — Dashboard UI](#5-phase-2--dashboard-ui)
6. [Phase 3 — Income Management](#6-phase-3--income-management)
7. [Phase 4 — Expense Management](#7-phase-4--expense-management)
8. [Phase 5 — Leads Management](#8-phase-5--leads-management)
9. [Phase 6 — Division Management](#9-phase-6--division-management)
10. [Phase 7 — Financial Snapshots](#10-phase-7--financial-snapshots)
11. [Phase 8 — Reporting & Insights](#11-phase-8--reporting--insights)
12. [Phase 9 — System Hardening](#12-phase-9--system-hardening)
13. [Phase 10 — SaaS Expansion](#13-phase-10--saas-expansion)
14. [Tech Stack Reference](#14-tech-stack-reference)
15. [Key Principles](#15-key-principles)

---

## 1. Monorepo Context

The PMG Control Center lives in `apps/admin` inside the `pmg-hub` Turborepo monorepo.
It is the only app in the monorepo built with Next.js 16 — all other apps (`tes`, `aws`, `pmg`) use Astro 6.

```
pmg-hub/
├── apps/
│   ├── admin/     ← Next.js 16 — PMG Control Center (this document)
│   ├── aws/       ← Astro 6 — Apex Web Solutions public site
│   ├── tes/       ← Astro 6 — Tender Edge Solutions public site
│   └── pmg/       ← Astro 6 — Playhouse Media Group holding site
│
└── packages/
    ├── db/                ← @pmg/db — Drizzle ORM + Neon PostgreSQL
    ├── eslint-config/     ← @pmg/eslint-config
    ├── tailwind-config/   ← @pmg/tailwind-config
    ├── typescript-config/ ← @pmg/typescript-config
    └── ui/                ← @pmg/ui
```

The admin app imports the database directly from `@pmg/db` using Drizzle Server Components
and Server Actions — there is no REST API layer between the UI and the database.

---

## 2. Admin App Folder Structure

> **Next.js 16 breaking change:** `middleware.ts` has been renamed to `proxy.ts`.
> The exported function must be named `proxy` (or use a default export).
> The `matcher` config and `NextRequest` / `NextResponse` API are unchanged.

```
apps/admin/src/
│
├── proxy.ts                          ← Auth guard (Next.js 16 — was middleware.ts)
│
├── app/
│   ├── layout.tsx                    ← Root layout: fonts, noindex meta, globals.css
│   ├── page.tsx                      ← Redirect → /dashboard
│   ├── globals.css                   ← Tailwind + PMG admin theme tokens
│   │
│   ├── (admin)/                      ← Protected route group
│   │   ├── layout.tsx                ← Sidebar shell + top nav (wraps all admin pages)
│   │   ├── dashboard/
│   │   │   └── page.tsx              ← Phase 2 —  Financial Engine
│   │   ├── income/
│   │   │   ├── page.tsx              ← Phase 3 — income list + add form
│   │   │   └── [id]/
│   │   │       └── page.tsx          ← Phase 3 — edit income entry
│   │   ├── expenses/
│   │   │   ├── page.tsx              ← Phase 4 — expense list + add form
│   │   │   └── [id]/
│   │   │       └── page.tsx          ← Phase 4 — edit expense entry
│   │   ├── leads/
│   │   │   ├── page.tsx              ← Phase 5 — leads list + status filter
│   │   │   └── [id]/
│   │   │       └── page.tsx          ← Phase 5 — lead detail + status update
│   │   └── divisions/
│   │       └── page.tsx              ← Phase 6 — manage divisions
│   │
│   ├── (auth)/                       ← Public route group (no auth required)
│   │   └── login/
│   │       └── page.tsx              ← Magic link login form
│   │
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── route.ts          ← Better Auth handler
│
├── components/
│   ├── ui/                           ← Shared primitives (button, card, badge, input…)
│   ├── layout/
│   │   ├── sidebar.tsx               ← Nav sidebar with active route highlight
│   │   ├── top-nav.tsx               ← Page header + user avatar
│   │   └── nav-link.tsx              ← Single nav item with icon + label
│   └── dashboard/
│       ├── kpi-card.tsx              ← Stat card (label, value, sub-label)
│       ├── salary-card.tsx           ← Highlighted owner salary card
│       ├── allocation-bar.tsx        ← Visual breakdown bar (salary/reinvest/reserve/flex)
│       ├── division-revenue.tsx      ← Per-division revenue list/chart
│       └── leads-summary.tsx         ← Lead count by status
│
├── lib/
│   ├── auth.ts                       ← Better Auth server config
│   ├── auth-client.ts                ← Better Auth client config
│   └── financial.ts                  ← Phase 1 — financial engine (core calculations)
│
└── actions/                          ← Server Actions (Phases 3–6)
    ├── income.ts                     ← createIncome, updateIncome, deleteIncome
    ├── expenses.ts                   ← createExpense, updateExpense, deleteExpense
    ├── leads.ts                      ← updateLeadStatus, updateLeadNotes
    └── divisions.ts                  ← createDivision, updateDivision
```

### `src/proxy.ts` — Next.js 16 auth guard

```ts
// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('better-auth.session_token')

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

> **Note:** The proxy performs an *optimistic* cookie presence check only.
> Full session validation happens inside Better Auth via the
> `api/auth/[...all]/route.ts` handler. Do not use the proxy for
> database calls or heavy logic — it runs on every request.

---

## 3. Phase 0 — Foundation (already done ✅)

### What exists

- Monorepo scaffolded with Bun + Turborepo
- `packages/db` with Drizzle ORM + Neon PostgreSQL
- Schema tables: `divisions`, `clients`, `income`, `expenses`, `leads`, `aws_pricing`
- Migrations applied — database is live on Neon
- Seed data: 3 divisions, 3 clients, 5 packages, sample income/expenses/leads
- Query helpers in `packages/db/src/queries.ts`:
  - `getTotalRevenue()`
  - `getTotalExpenses()`
  - `getRevenueByDivision()`
  - `getExpensesByDivision()`
  - `getLeadsByStatus()`
- Vitest unit + property-based tests passing

### Phase 0 cleanup tasks (do before Phase 1)

- [ ] Verify all foreign keys are enforced (`division_id`, `client_id`)
- [ ] Confirm `numeric(12,2)` on all `amount` fields (not plain `integer`)
- [ ] Add `@pmg/db": "*"` to `apps/admin/package.json` if not already present
- [ ] Run `bun install` from root to link workspace packages
- [ ] Confirm `DATABASE_URL` is set in `apps/admin/.env.local`

---

## 4. Phase 1 — Financial Engine (MVP 🔥)

### Goal

Implement the PMG financial model as a pure server-side calculation layer.
This is the brain of the entire system — every dashboard number flows through here.

### Financial model

```
Revenue  =  SUM(income.amount)
Expenses =  SUM(expenses.amount)

PMG Share    =  revenue × 0.20
Profit Pool  =  revenue − expenses − pmgShare

Salary       =  profitPool × 0.35
Reinvest     =  profitPool × 0.30
Reserve      =  profitPool × 0.30
Flex         =  profitPool × 0.05
```

### Allocation meaning

| Allocation | % | Role | Purpose |
|---|---|---|---|
| PMG Share | 20% of revenue | Business backbone | Shared infrastructure, admin, scalability |
| Salary | 35% of profit | Personal stability | Fixed owner income — never guessed |
| Reinvest | 30% of profit | Growth engine | Ads, tools, hiring, product development |
| Reserve | 30% of profit | Risk protection | Emergency fund and stability buffer |
| Flex | 5% of profit | Reward system | Controlled discretionary spending |

### Files to create

**`apps/admin/src/lib/financial.ts`**

```ts
import {
  getTotalRevenue,
  getTotalExpenses,
  getRevenueByDivision,
  getExpensesByDivision,
  getLeadsByStatus,
} from '@pmg/db'

export type FinancialSummary = {
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
  salary: number
  reinvest: number
  reserve: number
  flex: number
}

export type DivisionRevenue = {
  divisionName: string
  total: number
}

export type LeadStatusCount = {
  status: string
  count: number
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const [revenue, expenses] = await Promise.all([
    getTotalRevenue(),
    getTotalExpenses(),
  ])

  const pmgShare = revenue * 0.2
  const profitPool = revenue - expenses - pmgShare

  return {
    revenue,
    expenses,
    pmgShare,
    profitPool,
    salary: profitPool * 0.35,
    reinvest: profitPool * 0.30,
    reserve: profitPool * 0.30,
    flex: profitPool * 0.05,
  }
}

export async function getDivisionRevenue(): Promise<DivisionRevenue[]> {
  return getRevenueByDivision()
}

export async function getLeadCounts(): Promise<LeadStatusCount[]> {
  return getLeadsByStatus()
}

export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount)
}
```

### AI prompt

```
In apps/admin/src/lib/financial.ts, create a financial engine that:

1. Imports getTotalRevenue, getTotalExpenses, getRevenueByDivision,
   getLeadsByStatus from '@pmg/db'

2. Exports getFinancialSummary() → returns:
   { revenue, expenses, pmgShare, profitPool, salary, reinvest, reserve, flex }
   using the PMG model:
     pmgShare = revenue * 0.20
     profitPool = revenue - expenses - pmgShare
     salary = profitPool * 0.35
     reinvest = profitPool * 0.30
     reserve = profitPool * 0.30
     flex = profitPool * 0.05

3. Exports getDivisionRevenue() and getLeadCounts() as thin wrappers

4. Exports formatZAR(amount: number) using Intl.NumberFormat en-ZA ZAR

Export TypeScript types for FinancialSummary, DivisionRevenue, LeadStatusCount.
No 'use client'. This file is server-only.
```

---

## 5. Phase 2 — Dashboard UI

### Goal

Build the real-time financial overview — the first page an admin sees on login.
Every number on this page is calculated at request time from live database data.
No client state, no loading spinners, no API calls from the browser — pure Server Components.

### Data flow

```
packages/db (Drizzle + Neon)
        ↓
lib/financial.ts  (getFinancialSummary, getDivisionRevenue, getLeadCounts)
        ↓
app/(admin)/dashboard/page.tsx  [Server Component — awaits all data]
        ↓
components/dashboard/*  [pure presentational components]
```

### Route

`/admin/dashboard` — protected by `src/proxy.ts` matcher

### Files to create

#### `app/(admin)/layout.tsx` — sidebar shell

```ts
// This layout wraps every /admin/* page with the sidebar and top nav.
// It is a Server Component — no 'use client'.
import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

#### `app/(admin)/dashboard/page.tsx` — dashboard page

```ts
import { getFinancialSummary, getDivisionRevenue, getLeadCounts } from '@/lib/financial'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { SalaryCard } from '@/components/dashboard/salary-card'
import { AllocationBar } from '@/components/dashboard/allocation-bar'
import { DivisionRevenue } from '@/components/dashboard/division-revenue'
import { LeadsSummary } from '@/components/dashboard/leads-summary'

export default async function DashboardPage() {
  const [summary, divisions, leads] = await Promise.all([
    getFinancialSummary(),
    getDivisionRevenue(),
    getLeadCounts(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={summary.revenue} />
        <KpiCard label="Total Expenses" value={summary.expenses} />
        <KpiCard label="PMG Share (20%)" value={summary.pmgShare} />
        <KpiCard label="Profit Pool" value={summary.profitPool} />
      </div>

      {/* Salary highlight + allocation breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalaryCard salary={summary.salary} />
        <div className="lg:col-span-2">
          <AllocationBar summary={summary} />
        </div>
      </div>

      {/* Division + leads row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DivisionRevenue divisions={divisions} />
        <LeadsSummary leads={leads} />
      </div>
    </div>
  )
}
```

### Components to create

#### `components/dashboard/kpi-card.tsx`

```ts
import { formatZAR } from '@/lib/financial'

type Props = { label: string; value: number; sub?: string }

export function KpiCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{formatZAR(value)}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}
```

#### `components/dashboard/salary-card.tsx`

Highlighted card — visually distinct from `KpiCard` to signal it is the owner's take-home.

```ts
import { formatZAR } from '@/lib/financial'

export function SalaryCard({ salary }: { salary: number }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
      <p className="text-sm text-amber-400">Recommended Owner Salary</p>
      <p className="mt-1 text-3xl font-bold text-amber-300">{formatZAR(salary)}</p>
      <p className="mt-1 text-xs text-amber-500/70">35% of profit pool · calculated, not guessed</p>
    </div>
  )
}
```

#### `components/dashboard/allocation-bar.tsx`

Visual percentage breakdown bar showing all four allocations.

```ts
import type { FinancialSummary } from '@/lib/financial'
import { formatZAR } from '@/lib/financial'

const ALLOCATIONS = [
  { key: 'salary',   label: 'Salary',    pct: 35, color: 'bg-amber-400' },
  { key: 'reinvest', label: 'Reinvest',  pct: 30, color: 'bg-blue-500'  },
  { key: 'reserve',  label: 'Reserve',   pct: 30, color: 'bg-teal-500'  },
  { key: 'flex',     label: 'Flex',      pct: 5,  color: 'bg-purple-500' },
] as const

export function AllocationBar({ summary }: { summary: FinancialSummary }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="mb-3 text-sm text-zinc-400">Profit Pool Allocation</p>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {ALLOCATIONS.map((a) => (
          <div key={a.key} className={`${a.color}`} style={{ width: `${a.pct}%` }} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ALLOCATIONS.map((a) => (
          <div key={a.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${a.color}`} />
              <span className="text-xs text-zinc-400">{a.label} ({a.pct}%)</span>
            </div>
            <span className="text-xs font-medium text-white">
              {formatZAR(summary[a.key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### `components/dashboard/division-revenue.tsx`

```ts
import type { DivisionRevenue as DRType } from '@/lib/financial'
import { formatZAR } from '@/lib/financial'

export function DivisionRevenue({ divisions }: { divisions: DRType[] }) {
  const max = Math.max(...divisions.map((d) => d.total), 1)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="mb-4 text-sm text-zinc-400">Revenue by Division</p>
      <div className="space-y-3">
        {divisions.map((d) => (
          <div key={d.divisionName}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-zinc-300">{d.divisionName}</span>
              <span className="text-zinc-400">{formatZAR(d.total)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${(d.total / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {divisions.length === 0 && (
          <p className="text-xs text-zinc-600">No income recorded yet.</p>
        )}
      </div>
    </div>
  )
}
```

#### `components/dashboard/leads-summary.tsx`

```ts
import type { LeadStatusCount } from '@/lib/financial'

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-500',
  contacted: 'bg-amber-500',
  converted: 'bg-teal-500',
  lost:      'bg-zinc-600',
}

export function LeadsSummary({ leads }: { leads: LeadStatusCount[] }) {
  const total = leads.reduce((sum, l) => sum + l.count, 0)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="mb-4 text-sm text-zinc-400">Leads by Status</p>
      <div className="space-y-3">
        {leads.map((l) => (
          <div key={l.status} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[l.status] ?? 'bg-zinc-500'}`} />
              <span className="text-sm capitalize text-zinc-300">{l.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${STATUS_COLORS[l.status] ?? 'bg-zinc-500'}`}
                  style={{ width: `${total > 0 ? (l.count / total) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right text-xs text-zinc-400">{l.count}</span>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <p className="text-xs text-zinc-600">No leads yet.</p>
        )}
      </div>
    </div>
  )
}
```

### Layout components to create

#### `components/layout/sidebar.tsx`

```ts
import Link from 'next/link'
import { NavLink } from './nav-link'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: 'grid'     },
  { href: '/admin/income',    label: 'Income',      icon: 'trending-up' },
  { href: '/admin/expenses',  label: 'Expenses',    icon: 'trending-down' },
  { href: '/admin/leads',     label: 'Leads',       icon: 'users'    },
  { href: '/admin/divisions', label: 'Divisions',   icon: 'layers'   },
]

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-950 px-3 py-6">
      <div className="mb-8 px-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">PMG</p>
        <p className="text-sm font-semibold text-white">Control Center</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>
    </aside>
  )
}
```

#### `components/layout/nav-link.tsx`

```ts
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = { href: string; label: string }

export function NavLink({ href, label }: Props) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
    >
      {label}
    </Link>
  )
}
```

### AI prompt

```
In apps/admin, build Phase 2 — the dashboard UI. All components are Server Components
unless they need usePathname (NavLink only).

1. Create app/(admin)/layout.tsx with a fixed sidebar (Sidebar component, w-56)
   and a main content area with TopNav at the top and a scrollable <main>.

2. Create app/(admin)/dashboard/page.tsx as an async Server Component that:
   - Calls getFinancialSummary(), getDivisionRevenue(), getLeadCounts()
     from '@/lib/financial' using Promise.all
   - Renders a 4-column KPI grid (revenue, expenses, pmgShare, profitPool)
   - Renders SalaryCard (amber highlight) + AllocationBar side by side
   - Renders DivisionRevenue + LeadsSummary in a 2-column grid

3. Create these components in components/dashboard/:
   - kpi-card.tsx — rounded-xl zinc-900 card, label + formatZAR value
   - salary-card.tsx — amber border/bg highlight, formatZAR, "calculated not guessed" sub-label
   - allocation-bar.tsx — stacked bar (35/30/30/5%) + legend grid with amounts
   - division-revenue.tsx — horizontal bar per division, proportional to max
   - leads-summary.tsx — per-status count with coloured dot + inline bar

4. Create components/layout/sidebar.tsx (Server) and nav-link.tsx ('use client',
   usePathname for active state).

Use Tailwind only. No shadcn yet. Dark theme: zinc-950 bg, zinc-900 cards,
zinc-800 borders. Amber for salary, blue for income/revenue, teal for converted leads.
No 'use client' except NavLink.
```

---

## 6. Phase 3 — Income Management

### Goal

Allow the admin to add, edit, and delete income entries.
Every entry must have a division. Client is optional.

### Route

`/admin/income` — list + inline add form
`/admin/income/[id]` — edit entry

### Database tables used

`income`, `divisions`, `clients`

### Features

- Sortable list: date descending by default
- Filter by division (select dropdown)
- Filter by date range (month picker)
- Inline "Add Income" form (no modal — stays on the same page via Server Action)
- Edit entry → `/admin/income/[id]`
- Delete entry (with confirm)
- Running total visible at top of list

### Server Actions — `actions/income.ts`

```ts
'use server'

import { db, income } from '@pmg/db'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const IncomeSchema = z.object({
  date:        z.string().min(1),
  divisionId:  z.string().uuid(),
  clientId:    z.string().uuid().optional(),
  description: z.string().optional(),
  amount:      z.coerce.number().positive(),
})

export async function createIncome(formData: FormData) {
  const parsed = IncomeSchema.parse(Object.fromEntries(formData))
  await db.insert(income).values({
    ...parsed,
    amount: String(parsed.amount),
  })
  revalidatePath('/admin/income')
  revalidatePath('/admin/dashboard')
}

export async function updateIncome(id: string, formData: FormData) {
  const parsed = IncomeSchema.parse(Object.fromEntries(formData))
  await db.update(income).set({
    ...parsed,
    amount: String(parsed.amount),
  }).where(eq(income.id, id))
  revalidatePath('/admin/income')
  revalidatePath('/admin/dashboard')
}

export async function deleteIncome(id: string) {
  await db.delete(income).where(eq(income.id, id))
  revalidatePath('/admin/income')
  revalidatePath('/admin/dashboard')
}
```

### AI prompt

```
Build Phase 3 — Income Management in apps/admin.

1. Create app/(admin)/income/page.tsx (Server Component):
   - Fetches all income with division name and client name via Drizzle join
   - Shows running total at top using formatZAR
   - Renders an inline "Add Income" form (date, division select, client select,
     description, amount) — form action calls createIncome Server Action
   - Renders a table: date | division | client | description | amount | edit | delete
   - Delete calls deleteIncome; edit links to /admin/income/[id]
   - Accepts ?division= and ?month= search params for filtering (use searchParams prop)

2. Create app/(admin)/income/[id]/page.tsx (Server Component):
   - Fetches the income entry by id
   - Renders a pre-filled edit form, submit calls updateIncome Server Action
   - Cancel button links back to /admin/income

3. Create actions/income.ts with createIncome, updateIncome, deleteIncome
   as shown above. Each action revalidates /admin/income and /admin/dashboard.

4. Division and client selects are populated from the database (Server Component
   fetches divisions and clients and passes them as props to the form component).

Use Zod for validation. Use 'use server' on every action file.
No client-side state — form submissions drive everything.
```

---

## 7. Phase 4 — Expense Management

### Goal

Track every business expense. Every expense must have a division and a category.
Categories are freeform text (not an enum) so they can evolve without migrations.

### Route

`/admin/expenses` — list + inline add form
`/admin/expenses/[id]` — edit entry

### Database tables used

`expenses`, `divisions`

### Features

- Sortable list: date descending by default
- Filter by division, category, and month
- Category autocomplete (derived from existing expense categories — no hardcoded list)
- Running total and breakdown by category visible at top
- Inline add form
- Edit + delete

### Server Actions — `actions/expenses.ts`

```ts
'use server'

import { db, expenses } from '@pmg/db'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const ExpenseSchema = z.object({
  date:        z.string().min(1),
  divisionId:  z.string().uuid(),
  category:    z.string().min(1),
  description: z.string().optional(),
  amount:      z.coerce.number().positive(),
})

export async function createExpense(formData: FormData) {
  const parsed = ExpenseSchema.parse(Object.fromEntries(formData))
  await db.insert(expenses).values({
    ...parsed,
    amount: String(parsed.amount),
  })
  revalidatePath('/admin/expenses')
  revalidatePath('/admin/dashboard')
}

export async function updateExpense(id: string, formData: FormData) {
  const parsed = ExpenseSchema.parse(Object.fromEntries(formData))
  await db.update(expenses).set({
    ...parsed,
    amount: String(parsed.amount),
  }).where(eq(expenses.id, id))
  revalidatePath('/admin/expenses')
  revalidatePath('/admin/dashboard')
}

export async function deleteExpense(id: string) {
  await db.delete(expenses).where(eq(expenses.id, id))
  revalidatePath('/admin/expenses')
  revalidatePath('/admin/dashboard')
}
```

### AI prompt

```
Build Phase 4 — Expense Management in apps/admin.
Mirror the structure of Phase 3 (Income Management) exactly, but for expenses.

1. app/(admin)/expenses/page.tsx — list with running total, category breakdown
   summary at top, inline add form (date, division, category, description, amount).
   Accept ?division=, ?category=, ?month= search params.

2. app/(admin)/expenses/[id]/page.tsx — edit form.

3. actions/expenses.ts — createExpense, updateExpense, deleteExpense.
   Each revalidates /admin/expenses and /admin/dashboard.

4. The category field is a text input with a datalist element populated from
   distinct categories already in the database (query via Drizzle SELECT DISTINCT).

No client state. Zod validation. 'use server' on action file.
```

---

## 8. Phase 5 — Leads Management

### Goal

Centralise all incoming business leads from all sources.
Leads arrive from TES, AWS, and PMG contact forms (inserted by those Astro apps).
The admin can update status, add notes, and filter by source/division/status.

### Route

`/admin/leads` — list with filter tabs
`/admin/leads/[id]` — lead detail with status update and notes

### Database tables used

`leads`, `divisions`

### Lead status flow

```
new → contacted → converted
               ↘ lost
```

### Features

- Tab filter: All | New | Contacted | Converted | Lost (with counts per tab)
- Filter by division and source
- Sortable: newest first by default
- Lead detail page: full info + status update dropdown + internal notes textarea
- Read/unread tracking (optional, Phase 5+)

### Server Actions — `actions/leads.ts`

```ts
'use server'

import { db, leads } from '@pmg/db'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const StatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost']),
})

export async function updateLeadStatus(id: string, formData: FormData) {
  const { status } = StatusSchema.parse(Object.fromEntries(formData))
  await db.update(leads)
    .set({ status, updatedAt: new Date() })
    .where(eq(leads.id, id))
  revalidatePath('/admin/leads')
  revalidatePath(`/admin/leads/${id}`)
  revalidatePath('/admin/dashboard')
}

export async function updateLeadNotes(id: string, formData: FormData) {
  const notes = String(formData.get('notes') ?? '')
  // notes field requires a schema migration if not already on the leads table
  // Add: notes text nullable to leads in packages/db/src/schema/leads.ts
  revalidatePath(`/admin/leads/${id}`)
}
```

### AI prompt

```
Build Phase 5 — Leads Management in apps/admin.

1. app/(admin)/leads/page.tsx (Server Component):
   - Accepts ?status=, ?division=, ?source= search params
   - Fetches leads with division name via Drizzle join
   - Renders tab bar: All | New | Contacted | Converted | Lost
     Each tab shows count in a badge. Active tab matches ?status= param.
   - Table columns: date | name | email/phone | source | division | service interest | status | view
   - Status shown as a coloured badge (new=blue, contacted=amber, converted=teal, lost=zinc)
   - "View" links to /admin/leads/[id]

2. app/(admin)/leads/[id]/page.tsx (Server Component):
   - Full lead detail card (all fields)
   - Status update form (select dropdown + submit = updateLeadStatus Server Action)
   - Notes textarea (updateLeadNotes Server Action)
   - Back link to /admin/leads

3. actions/leads.ts with updateLeadStatus and updateLeadNotes.

No inline add form — leads are created by the public-facing Astro apps, not manually.
```

---

## 9. Phase 6 — Division Management

### Goal

Allow the admin to create and rename divisions.
Divisions cannot be deleted if income or expenses reference them (FK restrict enforced by DB).

### Route

`/admin/divisions` — list + inline add form

### Database tables used

`divisions`, `income`, `expenses`, `leads`

### Features

- List of all divisions with their total income, total expenses, and lead count
- Inline "Add Division" form (name only)
- Rename division (inline edit)
- Delete button — disabled (with tooltip) if division has any income or expenses

### Server Actions — `actions/divisions.ts`

```ts
'use server'

import { db, divisions } from '@pmg/db'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const DivisionSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function createDivision(formData: FormData) {
  const { name } = DivisionSchema.parse(Object.fromEntries(formData))
  await db.insert(divisions).values({ name })
  revalidatePath('/admin/divisions')
}

export async function updateDivision(id: string, formData: FormData) {
  const { name } = DivisionSchema.parse(Object.fromEntries(formData))
  await db.update(divisions).set({ name, updatedAt: new Date() }).where(eq(divisions.id, id))
  revalidatePath('/admin/divisions')
}
```

### AI prompt

```
Build Phase 6 — Division Management in apps/admin.

1. app/(admin)/divisions/page.tsx (Server Component):
   - Fetches all divisions with aggregated totals:
     total income (SUM), total expenses (SUM), lead count (COUNT)
     using Drizzle left joins + groupBy
   - Renders a table: name | total income | total expenses | net | leads | edit | delete
   - "Net" = income − expenses per division, colour green if positive / red if negative
   - Inline add form (name field + submit) → createDivision Server Action
   - Delete button disabled if division has income or expenses (check totals from query)
   - Inline rename: click name → text input, submit → updateDivision Server Action

2. actions/divisions.ts with createDivision, updateDivision.

Note: No deleteDiv action — the database FK (onDelete: restrict) prevents it anyway.
```

---

## 10. Phase 7 — Financial Snapshots

### Goal

> **⚠️ Critical.** Without snapshots, adding or editing past income entries changes
> every historical dashboard number retroactively. Snapshots lock the numbers for a
> closed month so historical reports are stable.

A snapshot is a point-in-time record of all financial figures for a given month.
Once a month is "closed", its snapshot is used for reporting instead of live queries.

### New database table

Add to `packages/db/src/schema/snapshots.ts`:

```ts
import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const snapshots = pgTable('snapshots', {
  id:         uuid('id').primaryKey().defaultRandom(),
  period:     text('period').notNull().unique(),    // 'YYYY-MM'
  revenue:    numeric('revenue',    { precision: 12, scale: 2 }).notNull(),
  expenses:   numeric('expenses',   { precision: 12, scale: 2 }).notNull(),
  pmgShare:   numeric('pmg_share',  { precision: 12, scale: 2 }).notNull(),
  profitPool: numeric('profit_pool',{ precision: 12, scale: 2 }).notNull(),
  salary:     numeric('salary',     { precision: 12, scale: 2 }).notNull(),
  reinvest:   numeric('reinvest',   { precision: 12, scale: 2 }).notNull(),
  reserve:    numeric('reserve',    { precision: 12, scale: 2 }).notNull(),
  flex:       numeric('flex',       { precision: 12, scale: 2 }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Snapshot = typeof snapshots.$inferSelect
export type NewSnapshot = typeof snapshots.$inferInsert
```

### Features

- "Close Month" button on dashboard — visible only when current month has no snapshot
- Generates snapshot from live query results for the selected month
- Monthly view page: list all snapshots in a table
- Dashboard optionally shows prior month snapshot vs current month live figures

### AI prompt

```
Build Phase 7 — Financial Snapshots in apps/admin.

1. Add snapshots table to packages/db/src/schema/snapshots.ts as above.
   Export from packages/db/src/schema/index.ts.
   Run bun db:generate && bun db:migrate.

2. Create actions/snapshots.ts with closeMonth(period: string):
   - period format: 'YYYY-MM'
   - Calls getFinancialSummary() with a date filter for that month
   - Inserts into snapshots table (upsert: if snapshot exists for period, do nothing)
   - Revalidates /admin/dashboard

3. On the dashboard page, show a "Close Month" button below the KPI cards.
   The button is a form with action=closeMonth and a hidden period input.
   Only show the button if no snapshot exists for the current month.

4. Create app/(admin)/snapshots/page.tsx:
   - Fetches all snapshots ordered by period desc
   - Table: period | revenue | expenses | profit pool | salary | closed at
```

---

## 11. Phase 8 — Reporting & Insights

### Goal

Turn the accumulated data into trends and decision-making tools.
This phase adds charts and multi-period comparisons. It is the first phase that
introduces client components beyond `NavLink`.

### Features

- Monthly revenue vs expenses line chart (last 12 months)
- Expense breakdown by category (donut or bar chart)
- Division profitability comparison over time
- Year-to-date summary card
- Export to CSV (income, expenses, leads)

### Tech choices

- Charts: `recharts` (already available in React ecosystem, no extra install needed
  if you add it) or native SVG for simple bar charts
- CSV export: Server Action that streams a `text/csv` response

### AI prompt

```
Build Phase 8 — Reporting in apps/admin.

1. Create app/(admin)/reports/page.tsx (Server Component):
   - Fetches monthly revenue and expense totals for last 12 months via Drizzle
     (GROUP BY month using date_trunc('month', date))
   - Passes data to a 'use client' MonthlyChart component

2. Create components/reports/monthly-chart.tsx ('use client'):
   - Recharts LineChart with two lines: revenue (blue) and expenses (red)
   - X axis: month labels (Jan, Feb…)
   - Responsive container, minimal grid, clean dark theme

3. Create components/reports/category-breakdown.tsx ('use client'):
   - Bar chart of expenses grouped by category
   - Top 8 categories, "Other" for the rest

4. Add CSV export: a Server Action that queries income or expenses for a
   given period and returns a Response with Content-Type: text/csv.
   Link it from the reports page as a plain <a> download link.
```

---

## 12. Phase 9 — System Hardening

### Goal

Prepare the system for real daily use before any SaaS expansion.

### Tasks

- [ ] **Validation layer**: Every Server Action uses Zod. Errors surface as
      `{ error: string }` return values and display inline next to the form.
- [ ] **Error boundaries**: Add `error.tsx` to `(admin)/` route group to catch
      render errors gracefully.
- [ ] **Loading states**: Add `loading.tsx` to each route (Next.js streaming
      suspense boundary) — shows skeleton cards while data loads.
- [ ] **Empty states**: Every list page handles the zero-data case with a
      helpful prompt ("No income yet — add your first entry above.").
- [ ] **Optimistic updates**: Phase 9+ only — use `useOptimistic` for status
      changes on leads to avoid full-page reload feel.
- [ ] **Rate limiting**: Add basic rate limiting on the auth endpoints via proxy.
- [ ] **Audit log** (optional): A simple `audit_logs` table recording which user
      performed which action and when.

### File additions

```
apps/admin/src/app/(admin)/
├── error.tsx       ← catches render errors in admin layout
├── loading.tsx     ← skeleton while pages load
├── dashboard/
│   └── loading.tsx ← skeleton for KPI cards
├── income/
│   └── loading.tsx
└── expenses/
    └── loading.tsx
```

---

## 13. Phase 10 — SaaS Expansion

### Goal

Turn the PMG Control Center into a multi-tenant product that other businesses can use.

> This is a future phase. Do not architect for it now — over-engineering for
> multi-tenancy before the single-tenant system is proven is a common trap.

### What changes

- **Organizations table**: Each business gets an `organization_id`. All tables
  (`income`, `expenses`, `leads`, `divisions`) gain an `organization_id` FK.
- **Row-level security**: Neon Postgres RLS policies enforce data isolation.
- **User roles**: `admin`, `owner`, `viewer` per organization.
- **Billing**: Stripe integration for subscription management.
- **Onboarding flow**: Sign up → create org → invite team → first income entry.

### Migration path from single-tenant

1. Add `organizations` table and seed with a single "PMG" org
2. Add `organization_id` to all tables with a migration
3. Backfill `organization_id` on all existing rows
4. Add Better Auth organization plugin
5. Update all queries to filter by `organization_id` from session

---

## 14. Tech Stack Reference

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `apps/admin` only |
| Language | TypeScript 5.9 | strict mode |
| Database | PostgreSQL via Neon | serverless, pooled |
| ORM | Drizzle ORM | `@pmg/db` workspace package |
| Auth | Better Auth + magic link | Resend for email delivery |
| Styling | Tailwind CSS v4 | dark theme, zinc palette |
| Validation | Zod | on every Server Action |
| Monorepo | Bun + Turborepo | `bun --filter admin` |
| Deployment | Vercel | `admin.playhousemedia.co.za` |
| Proxy (auth guard) | `src/proxy.ts` | Next.js 16 rename of `middleware.ts` |

### Next.js 16 — breaking changes relevant to this project

| Old (Next.js 15) | New (Next.js 16) | Impact |
|---|---|---|
| `middleware.ts` | `proxy.ts` | Rename file, rename export to `proxy` |
| `export function middleware` | `export function proxy` (or default) | Same API otherwise |
| — | `matcher` config unchanged | No change |

---

## 15. Key Principles

> **Every rand has a job.**

1. **Income first, salary second.** The system cannot tell you what to pay yourself
   until it knows what came in and what went out. Enter income before checking the dashboard.

2. **Every income entry must have a division.** The division breakdown is how you
   know which part of the business is carrying its weight.

3. **Every expense must have a division and a category.** Categories are freeform —
   don't over-engineer them. Use what feels natural ("Hosting", "Printing", "Transport").

4. **Salary is calculated, never guessed.** The system shows you what you can safely
   withdraw. Withdrawing more than the salary figure erodes the reserve and reinvestment
   allocations — the system does not prevent this, but it makes it visible.

5. **PMG always takes 20% of gross revenue.** This happens before expenses.
   It is the business entity's share — the cost of operating under the PMG umbrella.

6. **Build phases in order.** Phase 1 (engine) → Phase 2 (dashboard) → Phase 3+4
   (data entry) → Phase 5 (leads) → Phase 7 (snapshots). Skipping snapshots means
   historical numbers become unstable the moment you edit past data.

7. **No client state for data.** Server Components fetch data. Server Actions mutate
   data. `revalidatePath` refreshes the page. The database is the single source of truth.

8. **Keep the proxy fast.** `src/proxy.ts` runs on every request to `/admin/*`.
   It checks a cookie — nothing else. No database calls, no heavy logic.

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
