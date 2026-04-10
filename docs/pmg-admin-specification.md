# PMG Admin — System Specification

> **Internal reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-admin-specification.md` · March 2026 · v3.0
>
> This document covers the system overview, financial model, database schema,
> and core feature specifications for the PMG Control Center (`apps/admin`).
> For the step-by-step build plan, see `pmg-admin-development-phases.md`.
> For database setup, see `pmg-db-setup-guide.md`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Admin URL Structure](#3-admin-url-structure)
4. [Financial Model](#4-financial-model)
5. [Database Schema](#5-database-schema)
6. [Core Features](#6-core-features)
7. [System Rules](#7-system-rules)
8. [Future Phases](#8-future-phases)

---

## 1. Overview

PMG Control Center is the internal admin system for Playhouse Media Group.
It manages finances, tracks leads from all public-facing websites, and provides
full visibility into business performance across multiple divisions.

**Three pillars:**

- **Financial tracking** — income, expenses, and automated profit distribution
- **Lead management** — unified inbox from TES, AWS, and PMG contact forms
- **Division performance** — per-division revenue, expenses, and margin

**Access:** `admin.playhousemedia.co.za` — protected by magic link auth.
Only `ADMIN_EMAIL` (set in `.env.local`) can sign in.

---

## 2. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.1 |
| Language | TypeScript | 5.9.2 |
| Database | PostgreSQL via Neon | serverless / pooled |
| ORM | Drizzle ORM | ^0.45.1 |
| Auth | Better Auth + magic link | ^1.2.7 (not yet wired) |
| Email | Resend | latest |
| Styling | Tailwind CSS | v4 |
| UI Components | shadcn/ui (radix-vega style) | ^4.1.1 |
| Charts | recharts | 3.8.0 |
| Toasts | sonner | ^2.0.7 |
| Themes | next-themes | ^0.4.6 |
| Validation | Zod | ^4 (root catalog) |
| Monorepo | Bun + Turborepo | Bun 1.3.5 |
| Deployment | Vercel | — |

### Next.js 16 — key changes

| Feature | Next.js 15 | Next.js 16 |
|---|---|---|
| Auth guard file | `middleware.ts` | `proxy.ts` |
| Export name | `export function middleware` | `export function proxy` |
| React version | 19.x | 19.2.4 |
| React Compiler | optional | enabled (`reactCompiler: true` in `next.config.ts`) |

The proxy file lives at `apps/admin/src/proxy.ts` and exports a named `proxy`
function. Auth is not yet wired — the proxy currently calls `NextResponse.next()`
on every request. The `matcher` config and `NextRequest`/`NextResponse` API are
unchanged from Next.js 15.

---

## 3. Admin URL Structure

All admin routes are nested under the `(admin)` route group and will be
protected by `src/proxy.ts` once auth is wired.

```
/                          → redirects to /dashboard
/login                     → magic link login (public, placeholder only)
/dashboard                 → financial overview — BUILT
/income                    → income list + add form — Phase 3
/income/[id]               → edit income entry — Phase 3
/expenses                  → expense list + add form — Phase 4
/expenses/[id]             → edit expense entry — Phase 4
/leads                     → leads inbox with status tabs — Phase 5
/leads/[id]                → lead detail + status update — Phase 5
/divisions                 → division list + add form — Phase 6 (stub exists)
/reports                   → charts and trend reporting — Phase 8 (stub exists)
```

---

## 4. Financial Model

The full model is documented in `pmg-financial-model.md`. Summary:

```
revenue     = SUM(income.amount)
expenses    = SUM(expenses.amount)

pmgShare    = revenue × 0.20
profitPool  = revenue − expenses − pmgShare

salary      = profitPool × 0.35
reinvest    = profitPool × 0.30
reserve     = profitPool × 0.30
flex        = profitPool × 0.05
```

All calculations are performed at runtime in `apps/admin/src/lib/financial.ts`.
Period-specific variants (current month, previous month, YTD) are computed by
`getFinancialSummaryForPeriod()` in `packages/db/src/queries.ts`. Historical
values will be locked by the snapshot system in Phase 7.

---

## 5. Database Schema

> Full schema source of truth is in `packages/db/src/schema/`.
> This section is a reference summary — always prefer the Drizzle schema files.

### `divisions`

```
id          uuid PK
name        text NOT NULL UNIQUE
created_at  timestamptz
updated_at  timestamptz
```

### `clients`

```
id            uuid PK
name          text NOT NULL
business_name text
email         text UNIQUE (nullable, partial index)
phone         text
created_at    timestamptz
updated_at    timestamptz
```

### `income`

```
id           uuid PK
date         date NOT NULL
division_id  uuid FK → divisions (ON DELETE RESTRICT)
client_id    uuid FK → clients (ON DELETE SET NULL)
description  text
amount       numeric(12,2) NOT NULL CHECK (> 0)
created_at   timestamptz
updated_at   timestamptz
```

Indexes: `date`, `division_id`, `client_id`

### `expenses`

```
id           uuid PK
date         date NOT NULL
division_id  uuid FK → divisions (ON DELETE RESTRICT)
category     text NOT NULL  (freeform — "Hosting", "Printing", etc.)
description  text
amount       numeric(12,2) NOT NULL CHECK (> 0)
created_at   timestamptz
updated_at   timestamptz
```

Indexes: `date`, `division_id`, `category`

### `leads`

```
id               uuid PK
name             text
email            text UNIQUE (nullable, partial index)
phone            text UNIQUE (nullable, partial index)
message          text
source           text  ("tes" | "aws" | "pmg" | "whatsapp" | …)
service_interest text
status           enum: new | contacted | converted | lost  DEFAULT 'new'
division_id      uuid FK → divisions (ON DELETE SET NULL)  — nullable
created_at       timestamptz
updated_at       timestamptz
```

CHECK: `email IS NOT NULL OR phone IS NOT NULL`
Indexes: `status`, `created_at`, `email`, `division_id`

### `withdrawals`

```
id           uuid PK
date         date NOT NULL
amount       numeric(12,2) NOT NULL CHECK (> 0)
description  text (nullable)
created_at   timestamptz
```

Indexes: `date`

> Withdrawals are recorded when the owner takes salary from the profit pool.
> The current month's withdrawals are fetched via `getWithdrawalsCurrentMonth()`
> and displayed on the Salary Card alongside the calculated salary entitlement.
> The `recordWithdrawal` Server Action in `apps/admin/src/app/actions/withdraw.ts`
> inserts new rows and is called from the Withdraw modal on the dashboard.

### `aws_pricing`

```
id           uuid PK
name         text NOT NULL UNIQUE
price        integer NOT NULL        (ZAR cents)
period       text                    ("/month" or null)
upfront      integer                 (setup fee in ZAR cents)
description  text NOT NULL
features     jsonb NOT NULL          (string[])
cta          text NOT NULL
popular      boolean DEFAULT false
type         enum: monthly | once_off
sort_order   integer DEFAULT 0
is_active    boolean DEFAULT true
```

### Auth tables (Better Auth — not yet created)

These will be added when Better Auth setup is completed (Phase 9 hardening):
`user`, `session`, `account`, `verification`

### Relationships

```
divisions ──< income       (one division, many income entries)
divisions ──< expenses     (one division, many expense entries)
divisions ──< leads        (one division, many leads — nullable)
clients   ──< income       (one client, many income entries — nullable)
withdrawals                (standalone, no FK — current month filtered in query)
```

---

## 6. Core Features

### Dashboard (`/dashboard`) — BUILT

Real-time financial overview. All data is fetched server-side on every request
via `Promise.all` in the page Server Component, then passed to `DashboardShell`
(a client component that manages the period tab state).

**Period tab switcher**

Three tabs — Current Month, Previous Month, Year to Date — control which
`PeriodSummary` is active. The active label and summary recalculate on the client
without any new fetch. MoM deltas only display on the Current Month tab.

**KPI grid (4 cards)**
- Total Revenue — with MoM delta badge vs previous month
- Total Expenses — with MoM delta badge (inverted: up is bad)
- PMG Share (20%) — with MoM delta badge
- Profit Pool — highlighted red when negative

**Salary card**

Highlighted card (teal border) showing:
- Recommended owner salary (35% of profit pool) for the active period
- YTD salary as a sub-label
- Current month only: withdrawn amount vs salary balance
- Withdraw button → opens `WithdrawModal` → calls `recordWithdrawal` Server Action
- Warning state (red border) when profit pool is negative — withdrawal blocked

**Revenue sparkline**

6-month area chart (recharts `AreaChart`) showing revenue vs expenses side by side.
Custom tooltip shows revenue, expenses, and net for each month. Trend label shows
% change over the period.

**Interactive division area chart**

Stacked area chart (recharts) with five range selectors: This Month, Prev Month,
Last 3 Months, Last 6 Months, Year to Date. Data for all ranges is fetched once
server-side via `getAllDivisionSeriesData()` and passed down; range switching is
client-side only. Division summary pills below the chart show per-division totals
and percentage of grand total.

**Division revenue card**

Per-division horizontal bar breakdown showing both revenue and expense bars side
by side (proportional to max revenue). Net profit shown as a coloured label —
green for positive, red for negative. Pulls from `getRevenueByDivision()` and
`getExpensesByDivision()`.

**Leads summary**

Three-metric summary row (New, Converted, Win Rate) plus per-status breakdown
with progress bars. Status order: New → Contacted → Converted → Lost.

**Expense snapshot**

Stacked proportion bar + per-division breakdown cards. Only rendered when there
are expenses in the active period. Sorted by total descending.

### Income (`/income`) — Phase 3

- List sorted by date descending
- Filter by division and month
- Inline add form (no modal): date, division, client (optional), description, amount
- Edit → `/income/[id]`
- Delete with confirm
- Running total shown at top

### Expenses (`/expenses`) — Phase 4

- List sorted by date descending
- Filter by division, category, and month
- Category field: free text with datalist from existing categories
- Inline add form: date, division, category, description, amount
- Edit → `/expenses/[id]`
- Delete with confirm
- Running total + category breakdown at top

### Leads (`/leads`) — Phase 5

- Tab bar: All | New | Contacted | Converted | Lost (with counts)
- Filter by division and source
- Table: date, name, contact, source, division, service interest, status badge, view link
- Lead detail (`/leads/[id]`): full info card, status update, internal notes

> Leads are created by the public Astro apps — no manual lead creation in admin.

### Divisions (`/divisions`) — Phase 6

- Table: name, total income, total expenses, net profit, lead count
- Net shown green (positive) or red (negative)
- Inline add form: name only
- Rename via inline edit
- Delete disabled if income or expenses reference the division (FK restrict)

---

## 7. System Rules

1. Every income entry must have a division (`NOT NULL` enforced by DB)
2. Every expense entry must have a division (`NOT NULL` enforced by DB)
3. Salary is system-calculated — there is no salary input field
4. PMG always takes 20% of gross revenue — not configurable
5. Expenses are real costs only — salary withdrawals are tracked in the `withdrawals` table, never in expenses
6. Withdrawal tracking is current-month only on the dashboard; historical withdrawals are in the DB but not surfaced in the UI yet
7. All allocation calculations are dynamic (runtime) until a month is closed (Phase 7)
8. The proxy (`src/proxy.ts`) checks cookies only — no DB calls in the proxy
9. Only `ADMIN_EMAIL` can authenticate — single-user system until Phase 10

---

## 8. Future Phases

The following phases are planned. Full specifications are in
`pmg-admin-development-phases.md`.

| Phase | Name | Summary |
|---|---|---|
| 3 | Income Management | Add/edit/delete income entries with division and client |
| 4 | Expense Management | Add/edit/delete expense entries with category and division |
| 5 | Leads Management | Status updates, notes, tab filtering |
| 6 | Division Management | Create/rename divisions, view per-division P&L |
| 7 | Financial Snapshots | Lock historical month figures to prevent retroactive shifts |
| 8 | Reporting & Insights | Monthly trend charts, category breakdowns, CSV export |
| 9 | System Hardening | Auth wiring, error boundaries, loading skeletons, rate limiting |
| 10 | SaaS Expansion | Multi-tenant organizations, user roles, Stripe billing |

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
