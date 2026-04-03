# PMG Control Center — Development Phases

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / pmg_control_center_development_phases.md` · March 2026 · v3.0
>
> This document supersedes v2.0. Phases 0–3 are complete. Phase 2 has been fully rewritten to reflect
> the actual dashboard build. Phase 3 has been added to reflect the completed income management feature.
> All other phase plans remain as the implementation target.

---

## Table of Contents

1. [Monorepo Context](#1-monorepo-context)
2. [Admin App Folder Structure](#2-admin-app-folder-structure)
3. ✅ [Phase 0 — Foundation](#3-phase-0--foundation-complete-)
4. ✅ [Phase 1 — Financial Engine](#4-phase-1--financial-engine-complete-)
5. ✅ [Phase 2 — Dashboard UI](#5-phase-2--dashboard-ui-complete-)
6. ✅ [Phase 3 — Income Management](#6-phase-3--income-management-complete-)
7. ✅ [Phase 4 — Expense Management](#7-phase-4--expense-management)
8. ✅ [Phase 5 — Leads Management](#8-phase-5--leads-management)
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
It is the only app in the monorepo built with Next.js 16.

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

The admin app imports the database directly from `@pmg/db` using Drizzle Server
Components and Server Actions — there is no REST API layer between the UI and the
database.

---

## 2. Admin App Folder Structure

> **Next.js 16 breaking change:** `middleware.ts` has been renamed to `proxy.ts`.
> The exported function must be named `proxy`. The `matcher` config and
> `NextRequest` / `NextResponse` API are unchanged.

```
apps/admin/src/
│
├── proxy.ts                              ← Auth guard (Next.js 16 — was middleware.ts)
│
├── app/
│   ├── layout.tsx                        ← Root layout: Noto Sans font, dark class, globals.css
│   ├── page.tsx                          ← Redirect → /dashboard
│   ├── globals.css                       ← Tailwind v4 + PMG admin theme (OKLCH tokens)
│   ├── not-found.tsx                     ← 404 page with quick-link buttons
│   │
│   ├── (admin)/                          ← Protected route group
│   │   ├── layout.tsx                    ← TooltipProvider + SidebarProvider + AppSidebar
│   │   │                                    + SidebarInset + TopNav + Toaster
│   │   ├── dashboard/
│   │   │   └── page.tsx                  ← BUILT — fetches all data, renders DashboardShell
│   │   ├── income/
│   │   │   ├── page.tsx                  ← BUILT — list + filter + add form + running total
│   │   │   └── [id]/page.tsx             ← BUILT — edit form with notFound() guard
│   │   ├── expenses/
│   │   │   ├── page.tsx                  ← Phase 4 stub
│   │   │   └── [id]/page.tsx             ← Phase 4 stub
│   │   ├── leads/
│   │   │   ├── page.tsx                  ← Phase 5 stub
│   │   │   └── [id]/page.tsx             ← Phase 5 stub
│   │   ├── divisions/
│   │   │   └── page.tsx                  ← Phase 6 stub (returns null)
│   │   └── reports/
│   │       └── page.tsx                  ← Phase 8 stub (returns null)
│   │
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                  ← Static placeholder — auth not yet wired
│   │
│   └── actions/
│       ├── withdraw.ts                   ← BUILT — recordWithdrawal Server Action
│       └── income.ts                     ← BUILT — createIncome, updateIncome, deleteIncome
│
├── components/
│   ├── ui/                               ← shadcn/ui primitives (button, card, badge,
│   │                                        input, dialog, sidebar, tooltip, progress,
│   │                                        scroll-area, select, separator, skeleton,
│   │                                        sonner, sheet, collapsible, dropdown-menu,
│   │                                        breadcrumb, avatar, chart)
│   │
│   ├── layout/
│   │   ├── app-sidebar.tsx               ← BUILT — nav items: Dashboard, Income, Expenses,
│   │   │                                    Leads, Divisions, Reports
│   │   ├── top-nav.tsx                   ← BUILT — SidebarTrigger + breadcrumb
│   │   └── nav-link.tsx                  ← BUILT — active route highlight via usePathname
│   │
│   ├── dashboard/
│   │   ├── dashboard-shell.tsx           ← BUILT — client component, manages period tab state
│   │   ├── kpi-grid.tsx                  ← BUILT — 4-card grid with MoM delta badges
│   │   ├── kpi-card.tsx                  ← BUILT — individual KPI card (used elsewhere)
│   │   ├── salary-card.tsx               ← BUILT — salary + withdrawal tracking + modal trigger
│   │   ├── withdraw-modal.tsx            ← BUILT — dialog for recording withdrawals
│   │   ├── revenue-sparkline.tsx         ← BUILT — 6-month revenue vs expenses area chart
│   │   ├── division-area-chart.tsx       ← BUILT — interactive stacked area chart (5 ranges)
│   │   ├── division-revenue.tsx          ← BUILT — per-division bar with revenue + expense
│   │   ├── leads-summary.tsx             ← BUILT — status breakdown with progress bars
│   │   ├── expense-snapshot.tsx          ← BUILT — stacked bar + division breakdown cards
│   │   ├── allocation-bar.tsx            ← BUILT — profit pool allocation breakdown
│   │   └── allocation-tooltip-bar.tsx    ← BUILT — interactive tooltip bar (client component)
│   │
│   ├── income/
│   │   ├── filter-bar.tsx                ← BUILT — division + month selects, router.push on change
│   │   ├── income-add-form.tsx           ← BUILT — useTransition + useRef, inline error display
│   │   ├── income-table.tsx              ← BUILT — shadcn Table, inline delete confirm, sonner toast
│   │   └── income-edit-form.tsx          ← BUILT — pre-populated form, router.push on success
│   │
│   └── reports/
│       ├── mom-comparison-chart.tsx      ← Phase 8 — MoM bar chart (built, not yet wired)
│       ├── revenue-by-division-chart.tsx ← Phase 8 — stacked area chart (built, not yet wired)
│       └── revenue-vs-expenses-chart.tsx ← Phase 8 — line chart (built, not yet wired)
│
├── lib/
│   ├── financial.ts                      ← BUILT — data fetching layer, type re-exports
│   └── format.ts                         ← BUILT — formatZAR utility
│
└── hooks/
    └── use-mobile.ts                     ← BUILT — mobile breakpoint hook for sidebar
```

### `src/proxy.ts` — Next.js 16 auth guard

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(_request: NextRequest) {
  // Auth disabled — re-enable by restoring cookie check (Phase 9)
  return NextResponse.next()
}

export const config = { matcher: ['/:path*'] }
```

> Auth will be wired in Phase 9. When active, the proxy checks for
> `better-auth.session_token` and redirects to `/login` if absent.

---

## 3. Phase 0 — Foundation ✅ COMPLETE

### What exists

- Monorepo scaffolded with Bun + Turborepo
- `packages/db` with Drizzle ORM + Neon PostgreSQL
- Schema tables: `divisions`, `clients`, `income`, `expenses`, `leads`,
  `withdrawals`, `aws_pricing`
- Migrations applied — database is live on Neon
- Seed data: 3 divisions, 9 clients, 5 packages, 12 months of income/expenses
  (Apr 2025 – Mar 2026), 21 leads
- Query helpers in `packages/db/src/queries.ts` — see Phase 1 and Phase 2 for full list
- Vitest unit + property-based tests passing

---

## 4. Phase 1 — Financial Engine ✅ COMPLETE

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

### What was delivered

**`packages/db/src/queries.ts`** — all query helpers:
- `getTotalRevenue()` / `getTotalExpenses()` — all-time aggregates
- `getRevenueByDivision()` / `getExpensesByDivision()` — division breakdowns
- `getMonthlyRevenueByDivision(months)` — stacked chart data
- `getMonthlyFinancials()` — current year revenue vs expenses by month
- `getLeadsByStatus()` — lead count per status
- `getMoMSnapshot()` — current vs previous month revenue and expenses
- `getFinancialSummaryForPeriod(startExpr, endExpr)` — period-based P&L
- `getCurrentMonthSummary()` — current calendar month `PeriodSummary`
- `getPreviousMonthSummary()` — previous calendar month `PeriodSummary`
- `getYTDSummary()` — year-to-date `PeriodSummary`
- `getWithdrawalsCurrentMonth()` — withdrawal total + entries for current month
- `insertWithdrawal(amount, date)` — insert new withdrawal record
- `getDivisionRevenueSeries(months)` — N-month series for area chart
- `getDivisionRevenueCurrentMonth()` — current month series
- `getDivisionRevenuePreviousMonth()` — previous month series
- `getDivisionRevenueYTD()` — YTD series

**`apps/admin/src/lib/financial.ts`** — server-only data orchestration layer:
- `getFinancialSummary()` — all-time summary (kept for tests)
- `getCurrentMonthSummary()` / `getPreviousMonthSummary()` / `getYTDSummary()` — re-exported from `@pmg/db`
- `getDivisionRevenue()` / `getLeadCounts()` — thin wrappers
- `getMonthlyFinancialsSeries()` — monthly chart data
- `getMoMChartData()` — MoM snapshot shaped for the report chart
- `getWithdrawals()` — current month withdrawal summary
- `getAllDivisionSeriesData()` — all five range variants fetched in one `Promise.all`
- `getCurrentMonthLabel()` / `getPreviousMonthLabel()` / `getYTDLabel()` — period label strings
- `getExpensesByDivision()` — re-exported from `@pmg/db`

**`apps/admin/src/lib/format.ts`**:
- `formatZAR(amount)` — `Intl.NumberFormat` en-ZA ZAR formatting

**`apps/admin/src/__tests__/financial.test.ts`** — full Vitest suite with unit and
property-based tests (fast-check), all passing.

### Exported types

```ts
export type PeriodSummary = {
  revenue: number; expenses: number; pmgShare: number; profitPool: number;
  salary: number; reinvest: number; reserve: number; flex: number;
}
export type FinancialSummary   // same shape as PeriodSummary, kept for compat
export type DivisionRevenue    // { divisionName: string; total: number }
export type LeadStatusCount    // { status: string; count: number }
export type MonthlyFinancials  // { month: string; revenue: number; expenses: number }
export type MoMSnapshot        // { metric: string; current: number; previous: number }
export type WithdrawalSummary  // { total: number; entries: [...] }
export type DivisionSeriesRow  // { month: string; divisionName: string; total: number }
export type DivisionSeriesChart // { series: MonthlyRevenueByDivision[]; divisions: string[] }
```

---

## 5. Phase 2 — Dashboard UI ✅ COMPLETE

### What was built

The dashboard significantly exceeds the original Phase 2 spec. It includes
interactive period switching, MoM comparisons, recharts-powered charts, salary
withdrawal tracking, and a five-range division area chart.

### Architecture

```
packages/db (Drizzle + Neon)
         ↓
lib/financial.ts  (all data fetching functions)
         ↓
app/(admin)/dashboard/page.tsx  [Server Component — 10 parallel fetches]
         ↓
DashboardShell  [Client Component — owns period tab state]
         ↓
KpiGrid · SalaryCard · RevenueSparkline · DivisionAreaChart
DivisionRevenue · LeadsSummary · ExpenseSnapshot
```

### Route

`/dashboard` — default landing page (redirected from `/`)

### `app/(admin)/dashboard/page.tsx`

An async Server Component that fires all data fetches in a single `Promise.all`:

```ts
const [
  ytdSummary,
  currentMonthSummary,
  previousMonthSummary,
  divisions,
  leads,
  monthlySeries,
  withdrawals,
  divisionSeriesData,
  momData,
  expensesByDivision,
] = await Promise.all([...])
```

It then computes labels, MoM deltas, and the division expense map before
passing everything down to `DashboardShell` as props.

### `DashboardShell` (client component)

Manages `activeTab` state (`'current' | 'previous' | 'ytd'`). Renders the
period tab switcher and passes the correct `PeriodSummary` to each child.
MoM delta badges are only shown on the `'current'` tab.

### Period tab switcher

Three pill tabs with an active label showing the human-readable period
(e.g. "March 2026", "February 2026", "Jan – Mar 2026"). Tab switching is
instant — no refetch, all data is already in memory.

### KPI grid

Four cards in a 2×2 (mobile) / 1×4 (desktop) grid:

| Card | Value | Delta |
|---|---|---|
| Total Revenue | `summary.revenue` | MoM vs previous month revenue |
| Total Expenses | `summary.expenses` | MoM inverted (up = bad) |
| PMG Share (20%) | `summary.pmgShare` | MoM |
| Profit Pool | `summary.profitPool` | MoM — red border when negative |

`DeltaBadge` shows TrendingUp/TrendingDown icon + percentage vs previous month.
The percentage is always shown as positive with a direction indicator.

### Salary card

Teal-bordered card showing:
- **Recommended salary** — `salary` from the active `PeriodSummary`
- **YTD salary** — sub-label from `ytdSummary.salary` (always shown)
- **Withdraw button** — only visible on Current Month tab when `profitPool >= 0`
- **Withdrawal tracking** — current month only:
  - Withdrawn amount (amber if > 0)
  - Balance remaining (green) or Overdrawn (red)
  - "Nothing yet" hint if no withdrawals recorded
- **Warning state** — red border, red text, and explanatory copy when
  `profitPool < 0`. The withdraw button is hidden.

**Withdrawal flow:**
1. User clicks "Withdraw" button
2. `WithdrawModal` opens (shadcn `Dialog`)
3. User enters amount → calls `recordWithdrawal(amount)` Server Action
4. On success: modal closes, `router.refresh()` reloads the page data

### Revenue sparkline

`RevenueSparkline` — recharts `AreaChart` showing last 6 months of revenue vs
expenses as overlapping areas. Revenue uses `--chart-1` (teal family), expenses
use `--chart-expense` (warm orange). Custom tooltip shows revenue, expenses,
and net for the hovered month. Trend label compares first to last data point.

### Interactive division area chart

`DivisionAreaChart` — recharts stacked `AreaChart` with five range selectors.

| Range | Data source |
|---|---|
| This Month | `divisionSeriesData.current` |
| Prev Month | `divisionSeriesData.prev` |
| Last 3 Months | `divisionSeriesData.last3` |
| Last 6 Months | `divisionSeriesData.last6` |
| Year to Date | `divisionSeriesData.ytd` |

Range switching is purely client-side — all five datasets were fetched
server-side and are already in memory. Division colours cycle through
`--chart-1` to `--chart-5`. Custom tooltip shows all division values plus
a grand total. Summary pills below the chart show each division's total and
percentage for the selected range.

### Division revenue card

`DivisionRevenue` — scrollable list of divisions. Each division shows:
- Division name + net profit label (green / red)
- Revenue bar (proportional to max division revenue)
- Expense bar (same scale) in a different colour
- Revenue and expense amounts as labels

Expense data comes from `divisionExpenseMap` built in the page from
`getExpensesByDivision()`.

### Leads summary

`LeadsSummary` — three headline metrics (New count, Converted count, Win Rate)
plus a per-status breakdown with `Progress` bars. Status order: new →
contacted → converted → lost. Win rate = converted / (converted + lost).

### Expense snapshot

`ExpenseSnapshot` — only renders when `expensesByDivision.length > 0 && totalExpenses > 0`.
Shows a stacked proportion bar across the top, then a three-column card grid
with each division's expense total and percentage of the overall total.

### Allocation bar

`AllocationBar` — horizontal stacked bar divided into four segments (35/30/30/5%
of profit pool) with a 2×2 legend grid showing label, percentage, and ZAR amount.
`AllocationTooltipBar` is a client component that wraps each segment in a Radix
`Tooltip` showing the exact amount on hover.

---

## 6. Phase 3 — Income Management ✅ COMPLETE

### What was delivered

Full CRUD income management following the established PMG admin pattern:
DB query helpers → Server Actions → Client Components → Server Component pages.

### Routes

`/income` — list + filter bar + inline add form
`/income/[id]` — edit entry (calls `notFound()` if id doesn't exist)

### New DB query helpers — `packages/db/src/queries.ts`

- `getAllIncome(filters?)` — INNER JOIN divisions, LEFT JOIN clients, optional `divisionId` / `month` WHERE clauses, ORDER BY date DESC. Returns `IncomeRow[]`.
- `getIncomeById(id)` — same joins, WHERE `income.id = id`, returns single `IncomeRow | null`
- `getDistinctIncomeMonths()` — `SELECT DISTINCT TO_CHAR(date, 'YYYY-MM')` ORDER BY 1 DESC, returns `string[]`
- `getAllClients()` — `SELECT id, name, business_name FROM clients ORDER BY name ASC`
- `getAllDivisions()` — already existed; confirmed present before adding

All five exported from `packages/db/src/index.ts` via `export * from './queries'`.

### Server Actions — `apps/admin/src/app/actions/income.ts`

```ts
'use server'

const IncomeSchema = z.object({
  date:        z.string().min(1),
  divisionId:  z.string().uuid(),
  clientId:    z.string().uuid().optional(),   // '' → deleted before parse
  description: z.string().optional(),
  amount:      z.coerce.number().positive(),
})

createIncome(formData: FormData): Promise<{ error?: string }>
updateIncome(id: string, formData: FormData): Promise<{ error?: string }>
deleteIncome(id: string): Promise<{ error?: string }>
```

Key constraints:
- `clientId = ''` is normalised to `undefined` before Zod parse
- `amount` stored as `String(parsed.amount)` — never a raw JS number
- `revalidatePath('/income')` + `revalidatePath('/dashboard')` called inside `try` on success only, never in `catch`
- All three return `Promise<{ error?: string }>` — never throw

### Client Components

| File | Description |
|---|---|
| `components/income/filter-bar.tsx` | `'use client'` — two shadcn `<Select>` controls (division + month). Month labels formatted via `toLocaleString('en-ZA', { month: 'long', year: 'numeric' })`. On change: `router.push('/income?' + params)` |
| `components/income/income-add-form.tsx` | `'use client'` — `useTransition` + `useRef`. Fields: date, divisionId, clientId ("No client" option), description, amount. On success: `formRef.current.reset()`. On error: inline error display. |
| `components/income/income-table.tsx` | `'use client'` — shadcn `<Table>`. Edit: `<Link href={'/income/' + id}>`. Delete: inline confirm/cancel with `pendingDeleteId` state. Error feedback via sonner `toast.error`. |
| `components/income/income-edit-form.tsx` | `'use client'` — same fields as add form, pre-populated. `entry.clientId === null` → pre-selects "No client". On success: `router.push('/income')`. |

### Server Component Pages

**`app/(admin)/income/page.tsx`**
- Props: `{ searchParams: Promise<{ divisionId?: string; month?: string }> }`
- Awaits `searchParams`, fires `Promise.all([getAllIncome, getAllDivisions, getAllClients, getDistinctIncomeMonths])`
- Computes `runningTotal = entries.reduce((sum, e) => sum + Number(e.amount), 0)`
- Renders: header + `formatZAR(runningTotal)`, `<FilterBar>`, `<IncomeAddForm>`, `<IncomeTable>` or empty-state message

**`app/(admin)/income/[id]/page.tsx`**
- Props: `{ params: Promise<{ id: string }> }`
- Calls `getIncomeById(id)` → `notFound()` if null
- Fires `Promise.all([getAllDivisions, getAllClients])`
- Renders: back link + `<IncomeEditForm updateAction={updateIncome.bind(null, id)}>`

### Tests — `apps/admin/src/__tests__/income.test.ts`

Full Vitest suite (44 tests, all passing via `bun run test --cwd apps/admin`):

**Property-based tests (fast-check, 100 iterations each):**
- P1: `getAllIncome` shape + sort order (date DESC)
- P2: Division filter excludes entries from other divisions
- P3: Month filter excludes entries outside the calendar month
- P4: Running total equals sum of amounts in result set
- P5: `createIncome` round-trip — valid input succeeds, entry retrievable
- P6: `updateIncome` round-trip — changes reflected in `getAllIncome`
- P7: `deleteIncome` round-trip — entry no longer retrievable
- P8: `getIncomeById` returns correct entry or null
- P9: `getDistinctIncomeMonths` returns distinct YYYY-MM strings sorted DESC
- P10: Invalid input to `createIncome`/`updateIncome` always returns `{ error }`
- P11: Amount precision preserved on `String(amount)` → `Number()` round-trip
- P12: `getAllDivisions` sorted by name ASC
- P13: `getAllClients` sorted by name ASC

**Unit tests:**
- `FilterBar` renders "All divisions" and "All months" defaults; month labels are human-readable
- `IncomeTable` renders edit links with correct `/income/<id>` hrefs; empty array renders no rows
- `IncomeSchema` rejects empty date, rejects `clientId = ''`, accepts `clientId = undefined`
- `createIncome` with `amount = 0` or `amount = -1` returns `{ error }`
- `deleteIncome` returns `{ error }` on DB throw; returns `{}` and calls `revalidatePath` on success
- Empty-state condition (`entries.length === 0`) renders message instead of table

---

## 7. Phase 4 — Expense Management ✅ COMPLETE

### Goal

Track every business expense. Division and category are required.
Categories are freeform text.

### Route

`/expenses` — list + inline add form
`/expenses/[id]` — edit entry

### Features

- Filter by division, category, and month
- Category autocomplete via datalist from existing categories
- Running total and category breakdown at top
- Inline add form
- Edit + delete

### Server Actions — `actions/expenses.ts`

Mirror the structure of `actions/income.ts` with `ExpenseSchema`:
```ts
const ExpenseSchema = z.object({
  date:        z.string().min(1),
  divisionId:  z.string().uuid(),
  category:    z.string().min(1),
  description: z.string().optional(),
  amount:      z.coerce.number().positive(),
})
```

Revalidate `/expenses` and `/dashboard` on every mutation.

---

## 8. Phase 5 — Leads Management ✅ COMPLETE

### Goal

Centralise all incoming business leads. Update status, add notes, filter
by source/division/status.

### Route

`/leads` — list with filter tabs
`/leads/[id]` — lead detail with status update and notes

### Lead status flow

```
new → contacted → converted
               ↘ lost
```

### Features

- Tab filter: All | New | Contacted | Converted | Lost (with counts)
- Filter by division and source
- Sorted: newest first by default
- Lead detail: full info + status update + internal notes

> Leads are created by the public Astro apps — no manual lead creation in admin.

### Server Actions — `actions/leads.ts`

```ts
'use server'

export async function updateLeadStatus(id: string, formData: FormData) {
  const { status } = z.object({
    status: z.enum(['new', 'contacted', 'converted', 'lost'])
  }).parse(Object.fromEntries(formData))

  await db.update(leads).set({ status, updatedAt: new Date() })
    .where(eq(leads.id, id))

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/dashboard')
}
```

---

## 9. Phase 6 — Division Management

### Goal

Create and rename divisions. Deletion blocked by FK if income or expenses exist.

### Route

`/divisions` — list + inline add form

### Features

- Table: name, total income, total expenses, net profit, lead count
- Net coloured green (positive) / red (negative)
- Inline add form (name only)
- Rename via inline edit
- Delete disabled when income or expenses reference the division

### Server Actions — `actions/divisions.ts`

```ts
'use server'

export async function createDivision(formData: FormData) {
  const { name } = z.object({ name: z.string().min(1).max(100) })
    .parse(Object.fromEntries(formData))
  await db.insert(divisions).values({ name })
  revalidatePath('/divisions')
}

export async function updateDivision(id: string, formData: FormData) {
  const { name } = z.object({ name: z.string().min(1).max(100) })
    .parse(Object.fromEntries(formData))
  await db.update(divisions).set({ name, updatedAt: new Date() })
    .where(eq(divisions.id, id))
  revalidatePath('/divisions')
}
```

---

## 10. Phase 7 — Financial Snapshots

### Goal

> **⚠️ Critical.** Without snapshots, editing past income retroactively changes
> every historical dashboard number. Snapshots lock a closed month's figures.

### New database table

Add to `packages/db/src/schema/snapshots.ts`:

```ts
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
```

### Features

- "Close Month" button on dashboard — visible when current month has no snapshot
- Snapshot generated from live query results for the period
- Snapshot page: all closed months in a table

### Database Seed
update our seed data file to include the current updated schema 

---

## 11. Phase 8 — Reporting & Insights

### Goal

Turn accumulated data into trends and decision tools. Chart components already
exist in `components/reports/` but are not wired to a route yet.

### Existing components (built, not yet wired)

| Component | Chart type | Data |
|---|---|---|
| `MoMComparisonChart` | Grouped bar (recharts) | `getMoMChartData()` |
| `RevenueByDivisionChart` | Stacked area (recharts) | `getRevenueByDivisionSeries()` |
| `RevenueVsExpensesChart` | Line chart (recharts) | `getMonthlyFinancialsSeries()` |

### Work remaining

- Wire all three charts to `/reports/page.tsx`
- Add date range selector / year filter
- Add expense breakdown by category (donut or bar)
- CSV export via Server Action streaming `text/csv`

### Database Seed
update our seed data file to include the current updated schema 

---

## 12. Phase 9 — System Hardening

### Goal

Prepare the system for real daily use.

### Tasks

- [ ] **Auth** — wire Better Auth + magic link. Update `src/proxy.ts` to check
      `better-auth.session_token`. Add `lib/auth.ts`, `lib/auth-client.ts`,
      and `app/api/auth/[...all]/route.ts`.
- [ ] **Validation feedback** — all Server Actions return `{ error: string }` on
      failure. Errors display inline next to the form field.
- [ ] **Error boundaries** — add `error.tsx` to `(admin)/` route group.
- [ ] **Loading states** — add `loading.tsx` to each route (Suspense boundary).
- [ ] **Empty states** — every list page handles zero-data gracefully.
- [ ] **Rate limiting** — basic rate limiting on auth endpoints via proxy.
- [ ] **Optimistic updates** — `useOptimistic` for lead status changes.

### Database Seed
update our seed data file to include the current updated schema 

---

## 13. Tech Stack Reference

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (Turbopack) | `apps/admin` only |
| Language | TypeScript 5.9 | strict mode, React Compiler enabled |
| Database | PostgreSQL via Neon | serverless, pooled |
| ORM | Drizzle ORM | `@pmg/db` workspace package |
| UI | shadcn/ui (radix-vega) | `components/ui/` |
| Charts | recharts 3.8.0 | used in dashboard + reports |
| Auth | Better Auth + magic link | not yet wired — Phase 9 |
| Styling | Tailwind CSS v4 | OKLCH colour tokens |
| Toasts | sonner | dark theme, bottom-right |
| Validation | Zod | on every Server Action |
| Monorepo | Bun + Turborepo | `bun --filter admin` |
| Deployment | Vercel | `admin.playhousemedia.co.za` |
| Proxy | `src/proxy.ts` | Next.js 16 rename of `middleware.ts` |

### Next.js 16 — breaking changes relevant to this project

| Old (Next.js 15) | New (Next.js 16) |
|---|---|
| `middleware.ts` | `proxy.ts` |
| `export function middleware` | `export function proxy` |
| Same API otherwise | — |

---

## 14. Key Principles

> **Every rand has a job.**

1. **Income first, salary second.** The system cannot tell you what to pay yourself
   until it knows what came in and what went out.

2. **Every income entry must have a division.** The division breakdown is how you
   know which part of the business is carrying its weight.

3. **Every expense must have a division and a category.** Categories are freeform —
   don't over-engineer them.

4. **Salary is calculated, never guessed.** The system shows you what you can safely
   withdraw. Withdrawing more than the salary figure erodes the reserve and reinvest
   allocations.

5. **Withdrawals are not expenses.** Owner salary is tracked in the `withdrawals`
   table, not in `expenses`. Entering salary withdrawals as expenses double-counts
   them and collapses the profit pool.

6. **PMG always takes 20% of gross revenue.** This happens before expenses.

7. **No client state for data.** Server Components fetch data. Server Actions mutate
   data. `revalidatePath` refreshes the page. The database is the single source of
   truth.

8. **Keep the proxy fast.** `src/proxy.ts` runs on every request. Cookie check only —
   no database calls, no heavy logic.

9. **All five chart datasets are fetched once.** `getAllDivisionSeriesData()` fetches
   all five range variants in a single `Promise.all`. Range switching in the division
   area chart is instant and client-side only — no subsequent fetches.

---

*Last updated: April 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
