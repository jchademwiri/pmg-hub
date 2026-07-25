# PMG Hub - Database Setup Guide

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-db-setup-guide.md` · March 2026 · v3.0
>
> This document supersedes all earlier database setup guides.
> All env var names, package versions, and table lists reflect the live repository state.

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [DB Ownership Map](#2-db-ownership-map)
3. [Step 1 - Scaffold `packages/db`](#3-step-1--scaffold-packagesdb)
4. [Step 2 - Install Dependencies](#4-step-2--install-dependencies)
5. [Step 3 - Auth Schema](#5-step-3--auth-schema)
6. [Step 4 - AWS Pricing Schema](#6-step-4--aws-pricing-schema)
7. [Step 5 - Core Business Schema](#7-step-5--core-business-schema)
8. [Step 6 - Withdrawals Schema](#8-step-6--withdrawals-schema)
9. [Step 7 - Barrel Export](#9-step-7--barrel-export)
10. [Step 8 - Environment Variables](#10-step-8--environment-variables)
11. [Step 9 - DB Scripts in Root `package.json`](#11-step-9--db-scripts-in-root-packagejson)
12. [Step 10 - Run Migrations](#12-step-10--run-migrations)
13. [Step 11 - Seed Data](#13-step-11--seed-data)
14. [Step 12 - Connect `apps/admin`](#14-step-12--connect-appsadmin)
15. [Step 13 - Connect `apps/tes`](#15-step-13--connect-apptes)
16. [Step 14 - Connect `apps/pmg`](#16-step-14--connect-appspmg)
17. [Step 15 - Connect `apps/aws`](#17-step-15--connect-appsaws)
18. [Step 16 - Auth in `apps/admin`](#18-step-16--auth-in-appsadmin)
19. [Step 17 - Verify](#19-step-17--verify)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Monorepo Structure

```
pmg-hub/
├── apps/
│   ├── admin/     ← Next.js 16 - PMG Control Center + auth
│   ├── aws/       ← Astro 6 - Apex Web Solutions public site
│   ├── tes/       ← Astro 6 - Tender Edge Solutions public site
│   └── pmg/       ← Astro 6 - Playhouse Media Group holding site
│
└── packages/
    ├── db/                ← @pmg/db - Drizzle ORM + Neon PostgreSQL
    ├── eslint-config/     ← @pmg/eslint-config
    ├── tailwind-config/   ← @pmg/tailwind-config
    ├── typescript-config/ ← @pmg/typescript-config
    └── ui/                ← @pmg/ui
```

> **Note:** There is no `apps/web`. Auth and admin live in `apps/admin`.
> Future apps (`apps/launchpad`, `apps/creative`, `apps/studyedge`, `apps/tt360`)
> do not exist yet - do not reference them in current setup.

---

## 2. DB Ownership Map

| App | Framework | DB Role |
|---|---|---|
| `apps/admin` | Next.js 16 | Full CRUD on all tables - admin dashboard + auth |
| `apps/tes` | Astro 6 | Inserts into `leads` (source = "tes") from enquiry form |
| `apps/aws` | Astro 6 | Inserts into `leads` (source = "aws") from contact/booking forms |
| `apps/pmg` | Astro 6 | Inserts into `leads` (source = "pmg") from holding site form |

### Current live tables

| Table | Used by | Purpose |
|---|---|---|
| `divisions` | admin | Business divisions (TES, AWS, PMG…) |
| `clients` | admin | Client contact records |
| `income` | admin | Revenue entries per division/client |
| `expenses` | admin | Cost entries per division/category |
| `leads` | all apps + admin | Unified lead inbox from all public sites |
| `withdrawals` | admin | Owner salary withdrawal records (current month tracking) |
| `aws_pricing` | admin | Admin-managed pricing config for AWS packages |

> **Auth tables** (`user`, `session`, `account`, `verification`) will be added
> when Better Auth setup is completed. They live in the same Neon database but
> are managed entirely by Better Auth - do not write to them directly.

---

## 3. Step 1 - Scaffold `packages/db`

### `packages/db/package.json`

```json
{
  "name": "@pmg/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun src/migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:reset": "bun src/reset.ts",
    "db:seed": "bun src/reset.ts && bun src/migrate.ts && bun src/seed.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "drizzle-orm": "^0.45.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@pmg/typescript-config": "workspace:*",
    "@types/node": "^20.10.0",
    "@types/pg": "^8.20.0",
    "dotenv": "^16.4.5",
    "drizzle-kit": "^0.31.10",
    "fast-check": "^4.6.0",
    "pg": "^8.20.0",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  }
}
```

### `packages/db/drizzle.config.ts`

```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,   // unpooled - required for migrations
  },
  verbose: true,
});
```

### `packages/db/src/env.ts`

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL:          z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),
});

const parsed = envSchema.safeParse({
  DATABASE_URL:          process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
});

if (!parsed.success) {
  console.error("❌ Invalid database env vars:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid database environment variables");
}

export const env = parsed.data;
```

### `packages/db/src/client.ts`

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index";
import { getEnv } from "./env";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const env = getEnv();
    const sql = neon(env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

/** @deprecated use getDb() instead */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
```

### `packages/db/src/index.ts`

```ts
export { db } from "./client";
export type { DB } from "./client";
export * from "./schema";
export * from "./queries";
export type { PeriodSummary } from './queries';
export type { Withdrawal, NewWithdrawal } from './schema/withdrawals';
```

---

## 4. Step 2 - Install Dependencies

Run from the monorepo root:

```bash
bun install
bun --filter @pmg/db add @neondatabase/serverless drizzle-orm
bun --filter @pmg/db add -D drizzle-kit pg @types/pg dotenv vitest fast-check
```

---

## 5. Step 3 - Auth Schema

Auth tables are managed entirely by Better Auth. Do **not** write to these tables directly.

> **Status:** Not yet implemented. Will be added when Better Auth is wired in Phase 9.

### `packages/db/src/schema/auth.ts`

```ts
// DO NOT write to these tables directly - managed by Better Auth.
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image:         text("image"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id:        text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token:     text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId:    text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id:                     text("id").primaryKey(),
  accountId:              text("account_id").notNull(),
  providerId:             text("provider_id").notNull(),
  userId:                 text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken:            text("access_token"),
  refreshToken:           text("refresh_token"),
  idToken:                text("id_token"),
  accessTokenExpiresAt:   timestamp("access_token_expires_at"),
  refreshTokenExpiresAt:  timestamp("refresh_token_expires_at"),
  scope:                  text("scope"),
  password:               text("password"),
  createdAt:              timestamp("created_at").notNull().defaultNow(),
  updatedAt:              timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow(),
});
```

---

## 6. Step 4 - AWS Pricing Schema

### `packages/db/src/schema/aws.ts`

```ts
import { boolean, integer, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const awsPackageTypeEnum = pgEnum("aws_package_type", ["monthly", "once_off"]);

export const awsPricing = pgTable("aws_pricing", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        text("name").notNull().unique(),
  price:       integer("price").notNull(),
  period:      text("period"),
  upfront:     integer("upfront"),
  description: text("description").notNull(),
  features:    jsonb("features").notNull().$type<string[]>(),
  cta:         text("cta").notNull(),
  popular:     boolean("popular").default(false),
  type:        awsPackageTypeEnum("type").notNull(),
  sortOrder:   integer("sort_order").default(0),
  isActive:    boolean("is_active").default(true),
});

export type AwsPricing    = typeof awsPricing.$inferSelect;
export type NewAwsPricing = typeof awsPricing.$inferInsert;
```

---

## 7. Step 5 - Core Business Schema

These five tables form the heart of the PMG Financial Control System.
See `packages/db/src/schema/divisions.ts`, `clients.ts`, `income.ts`,
`expenses.ts`, and `leads.ts` for the full Drizzle definitions (unchanged
from v2.0 of this guide).

Key constraints:
- `income.division_id` - NOT NULL, FK restrict (no orphan income)
- `expenses.division_id` - NOT NULL, FK restrict (no orphan expenses)
- `leads.division_id` - nullable, FK set null (leads can exist without division)
- `leads` - CHECK: `email IS NOT NULL OR phone IS NOT NULL`
- All `amount` fields - CHECK: `> 0`

---

## 8. Step 6 - Withdrawals Schema

The `withdrawals` table tracks salary withdrawals made by the owner each month.
It is a standalone table with no foreign keys - it is intentionally simple.

### `packages/db/src/schema/withdrawals.ts`

```ts
import { check, date, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const withdrawals = pgTable(
  "withdrawals",
  {
    id:          uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    date:        date("date").notNull(),
    amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("withdrawals_amount_positive", sql`${t.amount} > 0`),
    index("withdrawals_date_idx").on(t.date),
  ],
);

export type Withdrawal    = typeof withdrawals.$inferSelect;
export type NewWithdrawal = typeof withdrawals.$inferInsert;
```

### Related queries in `packages/db/src/queries.ts`

```ts
// Get all withdrawals for the current calendar month
export async function getWithdrawalsCurrentMonth(): Promise<{
  total: number;
  entries: { date: string; description: string | null; amount: number }[];
}> { ... }

// Insert a new withdrawal record
export async function insertWithdrawal(
  amount: number,
  date: string
): Promise<{ id: string; date: string; amount: number; ... }> { ... }
```

### Server Action in `apps/admin/src/app/actions/withdraw.ts`

```ts
'use server';

import { insertWithdrawal } from '@pmg/db';

export async function recordWithdrawal(amount: number): Promise<{ error?: string }> {
  try {
    const date = new Date().toISOString().split('T')[0];
    await insertWithdrawal(amount, date);
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message };
  }
}
```

This action is called from `WithdrawModal` in the dashboard Salary Card.
On success it triggers `router.refresh()` (client-side) to reload the page data.

---

## 9. Step 7 - Barrel Export

### `packages/db/src/schema/index.ts`

```ts
export * from "./aws";
export * from "./divisions";
export * from "./clients";
export * from "./income";
export * from "./expenses";
export * from "./leads";
export * from "./withdrawals";
// Auth tables not yet included - add when Better Auth is wired
```

---

## 10. Step 8 - Environment Variables

### `packages/db/.env` (gitignored - used for migrations only)

```env
# Pooled connection - used by the app (neon-http driver)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# Unpooled / direct connection - required for migrations (node-postgres driver)
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

> Get both strings from: **Neon dashboard → your project → Connection Details**
> Select "Pooled" for `DATABASE_URL` and "Direct / Unpooled" for `DATABASE_URL_UNPOOLED`.
> The env var name is `DATABASE_URL_UNPOOLED` - not `DATABASE_URL_DIRECT`.

### `apps/admin/.env.local` (gitignored)

```env
# DB - pooled connection for Drizzle neon-http
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# Better Auth (not yet wired - add values when Phase 9 begins)
BETTER_AUTH_SECRET=your_generated_secret   # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin access
ADMIN_EMAIL=you@pmgconsulting.co.za

# Email (magic link delivery)
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### `apps/tes/.env`, `apps/aws/.env`, `apps/pmg/.env`

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

---

## 11. Step 9 - DB Scripts in Root `package.json`

```json
{
  "scripts": {
    "db:generate": "bun --filter @pmg/db db:generate",
    "db:migrate":  "bun --filter @pmg/db db:migrate",
    "db:push":     "bun --filter @pmg/db db:push",
    "db:reset":    "bun --filter @pmg/db db:reset",
    "db:seed":     "bun --filter @pmg/db db:seed",
    "db:studio":   "bun --filter @pmg/db db:studio"
  }
}
```

---

## 12. Step 10 - Run Migrations

```bash
# Generate SQL migration files from schema
bun db:generate

# Apply to Neon
bun db:migrate

# Verify tables visually (optional)
bun db:studio
```

After migration, Neon will have:
`divisions`, `clients`, `income`, `expenses`, `leads`, `withdrawals`, `aws_pricing`

Auth tables are added separately when Better Auth is wired.

---

## 13. Step 11 - Seed Data

The seed script is at `packages/db/src/seed.ts`. It provides:

- **3 divisions:** Playhouse Media Group, Tender Edge Solutions, Apex Web Solutions
- **9 clients:** realistic South African businesses
- **5 AWS pricing packages**
- **12 months of income** (Apr 2025 – Mar 2026, ~R2.1M total across all divisions)
- **12 months of expenses** covering Software, Advertising, Transport, Printing, Freelancers, Equipment
- **21 leads** across all four statuses

Run with:
```bash
bun db:seed
```

> The seed script uses `reset.ts` to clear all tables first, then re-migrates,
> then seeds. Safe to run multiple times from scratch.

---

## 14. Step 12 - Connect `apps/admin`

### `apps/admin/package.json` - add dependency

```json
{
  "dependencies": {
    "@pmg/db": "*"
  }
}
```

The admin app imports from `@pmg/db` in two places:
- `src/lib/financial.ts` - all dashboard data queries
- `src/app/actions/withdraw.ts` - withdrawal mutation

---

## 15. Step 13 - Connect `apps/tes`

POST handler at `apps/tes/src/pages/api/enquiry.ts`:
- Accepts: name, email, phone, message, serviceInterest (optional)
- Validates: name required, at least one of email or phone required
- Inserts into `leads`: source = "tes", status = "new"
- Returns `{ ok: true }` on success

---

## 16. Step 14 - Connect `apps/pmg`

POST handler at `apps/pmg/src/pages/api/enquiry.ts`:
- Accepts: name, email, phone, company, message, serviceInterest
- Inserts into `leads`: source = "pmg", status = "new"

---

## 17. Step 15 - Connect `apps/aws`

Two API routes:

1. `apps/aws/src/pages/api/contact.ts` - source = "aws", serviceInterest = "web_contact"
2. `apps/aws/src/pages/api/booking.ts` - source = "aws", serviceInterest = "booking:" + packageName

Both insert into the unified `leads` table.

---

## 18. Step 16 - Auth in `apps/admin`

> **Status:** Not yet implemented. Proxy currently passes all requests through.
> Complete this in Phase 9 (System Hardening).

```bash
bun --filter admin add better-auth resend
```

Files to create:
- `apps/admin/src/lib/auth.ts` - betterAuth with drizzleAdapter + magicLink plugin
- `apps/admin/src/lib/auth-client.ts` - createAuthClient with magicLinkClient
- `apps/admin/src/app/api/auth/[...all]/route.ts` - toNextJsHandler(auth)
- Update `apps/admin/src/proxy.ts` - check `better-auth.session_token` cookie

> **Next.js 16:** The auth guard file is `src/proxy.ts`, not `middleware.ts`.
> Export a named `proxy` function. The `matcher` config is unchanged.

---

## 19. Step 17 - Verify

```bash
bun run check-types
bun run build
bun run lint
```

All three must pass clean before considering the DB setup complete.

---

## 20. Troubleshooting

**`Cannot find module '@pmg/db'`**
Run `bun install` from the monorepo root to link workspace packages.

**`DATABASE_URL is not defined`**
Check `.env` files exist in the right locations:
- `packages/db/.env` - for migrations (`DATABASE_URL_UNPOOLED` required)
- `apps/admin/.env.local` - for the admin app (`DATABASE_URL` required)

**`DATABASE_URL_DIRECT is not defined`**
The env var is `DATABASE_URL_UNPOOLED` - not `DATABASE_URL_DIRECT`.

**Migration fails with `already exists`**
Drop existing tables in the Neon dashboard (or run `bun db:reset`), then rerun `bun db:migrate`.

**TypeScript errors on `jsonb` field**
Chain `.$type<string[]>()` after `jsonb()` on `aws_pricing.features`.

**Better Auth session not found in proxy**
The cookie name is `better-auth.session_token`. Verify this matches what Better Auth
sets by inspecting the cookie in browser devtools after a successful login.

**`apps/admin` uses `moduleResolution: bundler`**
This is correct for Next.js 16 and is compatible with `@pmg/db` workspace imports.

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
