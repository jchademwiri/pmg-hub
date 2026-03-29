# PMG Admin — System Specification

> **Internal reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-admin-specification.md` · March 2026 · v2.0
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
| Auth | Better Auth + magic link | ^1.2.7 |
| Email | Resend | latest |
| Styling | Tailwind CSS | v4 |
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
function. The `matcher` config and `NextRequest`/`NextResponse` API are unchanged
from Next.js 15.

---

## 3. Admin URL Structure

All admin routes are nested under `/admin/` and protected by `src/proxy.ts`.

```
/                          → redirects to /admin/dashboard
/login                     → magic link login (public)
/admin/dashboard           → financial overview (Phase 2)
/admin/income              → income list + add form (Phase 3)
/admin/income/[id]         → edit income entry (Phase 3)
/admin/expenses            → expense list + add form (Phase 4)
/admin/expenses/[id]       → edit expense entry (Phase 4)
/admin/leads               → leads inbox with status tabs (Phase 5)
/admin/leads/[id]          → lead detail + status update (Phase 5)
/admin/divisions           → division list + add form (Phase 6)
/admin/snapshots           → monthly financial snapshots (Phase 7)
/admin/reports             → charts and trend reporting (Phase 8)
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
Nothing is stored (until Phase 7 snapshots lock historical months).

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

### Auth tables (Better Auth — do not write to directly)

```
user          — id, name, email, emailVerified, image, timestamps
session       — id, expiresAt, token, userId FK, ipAddress, userAgent, timestamps
account       — id, accountId, providerId, userId FK, tokens, scope, password, timestamps
verification  — id, identifier, value, expiresAt, timestamps
```

### Relationships

```
divisions ──< income    (one division, many income entries)
divisions ──< expenses  (one division, many expense entries)
divisions ──< leads     (one division, many leads — nullable)
clients   ──< income    (one client, many income entries — nullable)
```

---

## 6. Core Features

### Dashboard (`/admin/dashboard`)

Real-time financial overview. All data fetched server-side on every request.

**KPI cards:**
- Total Revenue
- Total Expenses
- PMG Share (20% of revenue)
- Profit Pool

**Highlights:**
- Salary card (amber — visually distinct, "calculated not guessed")
- Allocation breakdown bar (35 / 30 / 30 / 5%)

**Supplementary:**
- Revenue by division (horizontal bar per division)
- Leads by status (coloured count breakdown)

### Income (`/admin/income`)

- List sorted by date descending
- Filter by division and month
- Inline add form (no modal): date, division, client (optional), description, amount
- Edit → `/admin/income/[id]`
- Delete with confirm
- Running total shown at top

### Expenses (`/admin/expenses`)

- List sorted by date descending
- Filter by division, category, and month
- Category field: free text with datalist from existing categories
- Inline add form: date, division, category, description, amount
- Edit → `/admin/expenses/[id]`
- Delete with confirm
- Running total + category breakdown at top

### Leads (`/admin/leads`)

- Tab bar: All | New | Contacted | Converted | Lost (with counts)
- Filter by division and source
- Table: date, name, contact, source, division, service interest, status badge, view link
- Lead detail (`/admin/leads/[id]`):
  - Full info card
  - Status update dropdown (Server Action)
  - Internal notes textarea (Server Action)

> Leads are created by the public Astro apps — there is no manual lead creation
> in the admin. The admin reads and manages leads only.

### Divisions (`/admin/divisions`)

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
5. Expenses are real costs only — salary withdrawals are never entered as expenses
6. All allocation calculations are dynamic (runtime) until a month is closed (Phase 7)
7. The proxy (`src/proxy.ts`) checks cookies only — no DB calls in the proxy
8. Only `ADMIN_EMAIL` can authenticate — single-user system until Phase 10

---

## 8. Future Phases

The following phases are planned. Full specifications for each are in
`pmg-admin-development-phases.md`.

| Phase | Name | Summary |
|---|---|---|
| 7 | Financial Snapshots | Lock historical month figures to prevent retroactive shifts |
| 8 | Reporting & Insights | Monthly trend charts, category breakdowns, CSV export |
| 9 | System Hardening | Error boundaries, loading skeletons, validation feedback, rate limiting |
| 10 | SaaS Expansion | Multi-tenant organizations, user roles, Stripe billing |

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
