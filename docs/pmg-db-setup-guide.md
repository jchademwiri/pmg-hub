# PMG Hub — Database Setup Guide

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-db-setup-guide.md` · March 2026 · v2.0
>
> This document supersedes all earlier database setup guides.
> All env var names, package versions, and table lists reflect the live repository state.

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [DB Ownership Map](#2-db-ownership-map)
3. [Step 1 — Scaffold `packages/db`](#3-step-1--scaffold-packagesdb)
4. [Step 2 — Install Dependencies](#4-step-2--install-dependencies)
5. [Step 3 — Auth Schema](#5-step-3--auth-schema)
6. [Step 4 — AWS Pricing Schema](#6-step-4--aws-pricing-schema)
7. [Step 5 — Core Business Schema](#7-step-5--core-business-schema)
8. [Step 6 — Barrel Export](#8-step-6--barrel-export)
9. [Step 7 — Environment Variables](#9-step-7--environment-variables)
10. [Step 8 — DB Scripts in Root `package.json`](#10-step-8--db-scripts-in-root-packagejson)
11. [Step 9 — Run Migrations](#11-step-9--run-migrations)
12. [Step 10 — Seed Data](#12-step-10--seed-data)
13. [Step 11 — Connect `apps/admin`](#13-step-11--connect-appsadmin)
14. [Step 12 — Connect `apps/tes`](#14-step-12--connect-apptes)
15. [Step 13 — Connect `apps/pmg`](#15-step-13--connect-appspmg)
16. [Step 14 — Connect `apps/aws`](#16-step-14--connect-appsaws)
17. [Step 15 — Auth in `apps/admin`](#17-step-15--auth-in-appsadmin)
18. [Step 16 — Verify](#18-step-16--verify)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Monorepo Structure

```
pmg-hub/
├── apps/
│   ├── admin/     ← Next.js 16 — PMG Control Center + auth
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

> **Note:** There is no `apps/web`. Auth and admin live in `apps/admin`.
> Future apps (`apps/launchpad`, `apps/creative`, `apps/studyedge`, `apps/tt360`)
> do not exist yet — do not reference them in current setup.

---

## 2. DB Ownership Map

| App | Framework | DB Role |
|---|---|---|
| `apps/admin` | Next.js 16 | Full CRUD on all tables — admin dashboard + auth |
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
| `aws_pricing` | admin | Admin-managed pricing config for AWS packages |

> **Auth tables** (`user`, `session`, `account`, `verification`) are added in Step 3
> as part of the Better Auth setup in `apps/admin`. They live in the same Neon
> database but are managed entirely by Better Auth — do not write to them directly.

---

## 3. Step 1 — Scaffold `packages/db`

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
    url: process.env.DATABASE_URL_UNPOOLED!,   // unpooled — required for migrations
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
import { env } from "./env";

const sql = neon(env.DATABASE_URL);   // pooled — for app queries
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

### `packages/db/src/index.ts`

```ts
export { db } from "./client";
export type { DB } from "./client";
export * from "./schema";
export * from "./queries";
```

### `packages/db/src/schema/index.ts` (barrel — start empty)

```ts
// populated in Steps 3–5
```

---

## 4. Step 2 — Install Dependencies

Run from the monorepo root:

```bash
bun install
bun --filter @pmg/db add @neondatabase/serverless drizzle-orm
bun --filter @pmg/db add -D drizzle-kit pg @types/pg dotenv vitest fast-check
```

---

## 5. Step 3 — Auth Schema

Auth tables are managed entirely by Better Auth. Do **not** write to these tables directly.

### AI Prompt

```
In packages/db/src/schema/auth.ts, create Better Auth tables for PostgreSQL
using Drizzle ORM: user, session, account, verification.

Add a top comment: "DO NOT write to these tables directly — managed by Better Auth."
Use imports from drizzle-orm/pg-core. Export all four tables and their types.
```

### `packages/db/src/schema/auth.ts`

```ts
// DO NOT write to these tables directly — managed by Better Auth.
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

## 6. Step 4 — AWS Pricing Schema

### `packages/db/src/schema/aws.ts`

```ts
import { boolean, integer, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const awsPackageTypeEnum = pgEnum("aws_package_type", ["monthly", "once_off"]);

export const awsPricing = pgTable("aws_pricing", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        text("name").notNull().unique(),
  price:       integer("price").notNull(),          // ZAR cents: R299 = 29900
  period:      text("period"),                       // "/month" or null for once-off
  upfront:     integer("upfront"),                   // setup fee in ZAR cents
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

## 7. Step 5 — Core Business Schema

These five tables form the heart of the PMG Financial Control System.

### `packages/db/src/schema/divisions.ts`

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { income } from "./income";
import { expenses } from "./expenses";
import { leads } from "./leads";

export const divisions = pgTable(
  "divisions",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    name:      text("name").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("divisions_name_idx").on(t.name)],
);

export type Division    = typeof divisions.$inferSelect;
export type NewDivision = typeof divisions.$inferInsert;

export const divisionsRelations = relations(divisions, ({ many }) => ({
  income:   many(income),
  expenses: many(expenses),
  leads:    many(leads),
}));
```

### `packages/db/src/schema/clients.ts`

```ts
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { income } from "./income";

export const clients = pgTable(
  "clients",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    name:         text("name").notNull(),
    businessName: text("business_name"),
    email:        text("email"),
    phone:        text("phone"),
    createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("clients_name_idx").on(t.name),
    uniqueIndex("clients_email_unique_idx").on(t.email).where(sql`${t.email} IS NOT NULL`),
  ],
);

export type Client    = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export const clientsRelations = relations(clients, ({ many }) => ({
  income: many(income),
}));
```

### `packages/db/src/schema/income.ts`

```ts
import { check, date, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { divisions } from "./divisions";
import { clients } from "./clients";

export const income = pgTable(
  "income",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    date:        date("date").notNull(),
    divisionId:  uuid("division_id").notNull().references(() => divisions.id, { onDelete: "restrict" }),
    clientId:    uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    description: text("description"),
    amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("income_amount_positive", sql`${t.amount} > 0`),
    index("income_date_idx").on(t.date),
    index("income_division_id_idx").on(t.divisionId),
    index("income_client_id_idx").on(t.clientId),
  ],
);

export type Income    = typeof income.$inferSelect;
export type NewIncome = typeof income.$inferInsert;

export const incomeRelations = relations(income, ({ one }) => ({
  division: one(divisions, { fields: [income.divisionId], references: [divisions.id] }),
  client:   one(clients,   { fields: [income.clientId],   references: [clients.id]   }),
}));
```

### `packages/db/src/schema/expenses.ts`

```ts
import { check, date, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { divisions } from "./divisions";

export const expenses = pgTable(
  "expenses",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    date:        date("date").notNull(),
    divisionId:  uuid("division_id").notNull().references(() => divisions.id, { onDelete: "restrict" }),
    category:    text("category").notNull(),
    description: text("description"),
    amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} > 0`),
    index("expenses_date_idx").on(t.date),
    index("expenses_division_id_idx").on(t.divisionId),
    index("expenses_category_idx").on(t.category),
  ],
);

export type Expense    = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export const expensesRelations = relations(expenses, ({ one }) => ({
  division: one(divisions, { fields: [expenses.divisionId], references: [divisions.id] }),
}));
```

### `packages/db/src/schema/leads.ts`

```ts
import {
  check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { divisions } from "./divisions";

export const leadStatusEnum = pgEnum("lead_status", [
  "new", "contacted", "converted", "lost",
]);

export const leads = pgTable(
  "leads",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    name:            text("name"),
    email:           text("email"),
    phone:           text("phone"),
    message:         text("message"),
    source:          text("source"),          // "tes" | "aws" | "pmg" | "whatsapp" | etc.
    serviceInterest: text("service_interest"),
    status:          leadStatusEnum("status").notNull().default("new"),
    divisionId:      uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
    createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:       timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("leads_email_or_phone", sql`${t.email} IS NOT NULL OR ${t.phone} IS NOT NULL`),
    index("leads_status_idx").on(t.status),
    index("leads_created_at_idx").on(t.createdAt),
    index("leads_email_idx").on(t.email),
    index("leads_division_id_idx").on(t.divisionId),
    uniqueIndex("leads_email_unique_idx").on(t.email).where(sql`${t.email} IS NOT NULL`),
    uniqueIndex("leads_phone_unique_idx").on(t.phone).where(sql`${t.phone} IS NOT NULL`),
  ],
);

export type Lead    = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export const leadsRelations = relations(leads, ({ one }) => ({
  division: one(divisions, { fields: [leads.divisionId], references: [divisions.id] }),
}));
```

---

## 8. Step 6 — Barrel Export

### `packages/db/src/schema/index.ts`

```ts
export * from "./auth";
export * from "./aws";
export * from "./divisions";
export * from "./clients";
export * from "./income";
export * from "./expenses";
export * from "./leads";
```

---

## 9. Step 7 — Environment Variables

### `packages/db/.env` (gitignored — used for migrations only)

```env
# Pooled connection — used by the app (neon-http driver)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# Unpooled / direct connection — required for migrations (node-postgres driver)
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

> Get both strings from: **Neon dashboard → your project → Connection Details**
> Select "Pooled" for `DATABASE_URL` and "Direct / Unpooled" for `DATABASE_URL_UNPOOLED`.
> The env var name is `DATABASE_URL_UNPOOLED` — not `DATABASE_URL_DIRECT`.

### `apps/admin/.env.local` (gitignored)

```env
# DB — pooled connection for Drizzle neon-http
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# Better Auth
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

These apps only insert into `leads` — they never run migrations and only need the pooled connection.

---

## 10. Step 8 — DB Scripts in Root `package.json`

The root `package.json` already has these — verify they match:

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

## 11. Step 9 — Run Migrations

```bash
# Generate SQL migration files from schema
bun db:generate

# Apply to Neon
bun db:migrate

# Verify tables visually (optional — opens Drizzle Studio in browser)
bun db:studio
```

After migration, Neon will have:
`user`, `session`, `account`, `verification`,
`divisions`, `clients`, `income`, `expenses`, `leads`, `aws_pricing`

---

## 12. Step 10 — Seed Data

### AI Prompt

```
In packages/db/src/seed.ts, seed the database with:

Divisions: "Playhouse Media Group", "Tender Edge Solutions", "Accounting & Web Services"

Clients (3): realistic South African names with businessName, email, phone

AWS Pricing (5):
  Monthly: Starter R1500, Growth R3500 (popular), Pro R7500
  Once-off: Logo & Brand Identity R4500, Website Launch R12000

Income (6 entries spread across 3 divisions and 2 months)
Expenses (7 entries covering Software, Advertising, Transport, Printing, Hosting)
Leads (5 entries with different statuses across divisions)

Use db from packages/db/src/client.ts.
Use .returning() to get IDs for FK references.
Run with: bun packages/db/src/seed.ts
```

---

## 13. Step 11 — Connect `apps/admin`

### `apps/admin/package.json` — add dependency

```json
{
  "dependencies": {
    "@pmg/db": "*",
    "next": "16.2.1",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

### AI Prompt

```
In apps/admin/src/app/(admin)/dashboard/page.tsx, create a Next.js 16
Server Component that:
1. Imports db and schema types from "@pmg/db"
2. Imports getFinancialSummary, getDivisionRevenue, getLeadCounts from "@/lib/financial"
3. Fetches all data with Promise.all
4. Renders KPI cards, salary highlight, allocation breakdown, division revenue,
   and leads-by-status summary

See pmg-admin-development-phases.md Phase 2 for full component specifications.
```

---

## 14. Step 12 — Connect `apps/tes`

### `apps/tes/package.json` — add dependency

```json
{ "dependencies": { "@pmg/db": "*" } }
```

### AI Prompt

```
In apps/tes/src/pages/api/enquiry.ts (Astro API route), create a POST handler that:
1. Accepts JSON body: name, email, phone, message, serviceInterest (optional)
2. Validates: name required, at least one of email or phone required
3. Inserts into leads using Drizzle:
   source = "tes", divisionId = TES division UUID, status = "new"
4. Returns { ok: true } on success, { error: "..." } on failure (400)

Use NewLead type from "@pmg/db". Use the pooled DATABASE_URL.
```

---

## 15. Step 13 — Connect `apps/pmg`

### `apps/pmg/package.json` — add dependency

```json
{ "dependencies": { "@pmg/db": "*" } }
```

### AI Prompt

```
In apps/pmg/src/pages/api/enquiry.ts (Astro API route), create a POST handler that:
1. Accepts JSON body: name, email, phone (optional), company (optional),
   message (optional), serviceInterest (optional: "tendering" | "web_dev" | "both" | "general")
2. Validates: name required, at least one of email or phone required
3. Inserts into leads:
   source = "pmg", status = "new"
   serviceInterest stored as-is in the service_interest text column
4. Returns { ok: true } on success

Use NewLead type from "@pmg/db".
```

---

## 16. Step 14 — Connect `apps/aws`

### `apps/aws/package.json` — add dependency

```json
{ "dependencies": { "@pmg/db": "*" } }
```

### AI Prompt

```
In apps/aws, create two Astro API routes:

1. src/pages/api/contact.ts
   - POST: validates name, email, message required; phone/subject optional
   - Inserts into leads: source = "aws", serviceInterest = "web_contact", status = "new"
   - Returns { ok: true }

2. src/pages/api/booking.ts
   - POST: validates name, email, phone, packageName required
   - Inserts into leads: source = "aws",
     serviceInterest = "booking:" + packageName, status = "new"
   - Returns { ok: true }

Note: aws_messages and aws_bookings tables do NOT exist. All leads from AWS
go into the unified leads table with source = "aws".
```

---

## 17. Step 15 — Auth in `apps/admin`

### Install

```bash
bun --filter admin add better-auth resend
```

### AI Prompt

```
Set up Better Auth with magic link in apps/admin only.

1. apps/admin/src/lib/auth.ts
   - betterAuth with drizzleAdapter using db from "@pmg/db"
   - Pass user, session, account, verification tables from "@pmg/db"
   - magicLink plugin: use Resend to send from "PMG Admin <noreply@pmgconsulting.co.za>"
   - trustedOrigins: [process.env.BETTER_AUTH_URL]

2. apps/admin/src/lib/auth-client.ts
   - createAuthClient with magicLinkClient plugin
   - baseURL: process.env.NEXT_PUBLIC_APP_URL

3. apps/admin/src/app/api/auth/[...all]/route.ts
   - toNextJsHandler(auth) — exported as GET and POST

4. apps/admin/src/proxy.ts  (Next.js 16 — NOT middleware.ts)
   - export function proxy(request: NextRequest)
   - Check for better-auth.session_token cookie
   - Redirect to /login if absent
   - matcher: ['/admin/:path*']

5. apps/admin/src/app/(auth)/login/page.tsx
   - Magic link form: email input + submit button
   - Calls authClient.signIn.magicLink({ email, callbackURL: '/admin/dashboard' })
   - Shows "Check your email" confirmation state after submit
```

> **Important:** The proxy file must be named `proxy.ts` and export a function
> named `proxy` (or use a default export). `middleware.ts` / `middleware()` are
> the Next.js 15 names and will not work in Next.js 16.

---

## 18. Step 16 — Verify

```bash
bun run check-types
bun run build
bun run lint
```

All three must pass clean before considering the DB setup complete.

---

## 19. Troubleshooting

**`Cannot find module '@pmg/db'`**
Run `bun install` from the monorepo root to link workspace packages.

**`DATABASE_URL is not defined`**
Check `.env` files exist in the right locations:
- `packages/db/.env` — for migrations (`DATABASE_URL_UNPOOLED` required)
- `apps/admin/.env.local` — for the admin app (`DATABASE_URL` required)
- `apps/tes/.env`, `apps/aws/.env`, `apps/pmg/.env` — for Astro apps

**`DATABASE_URL_DIRECT is not defined`**
The env var is `DATABASE_URL_UNPOOLED` — not `DATABASE_URL_DIRECT`. Update any
`.env` files or docs that use the old name.

**Migration fails with `already exists`**
Drop existing tables in the Neon dashboard (or run `bun db:reset`), then rerun `bun db:migrate`.

**TypeScript errors on `jsonb` field**
Chain `.$type<string[]>()` after `jsonb()` on `aws_pricing.features`.

**Enum conflicts on re-generate**
Enum names must be globally unique across all schema files. Do not duplicate enum names.

**`apps/admin` uses `moduleResolution: bundler`**
This is correct for Next.js 16 and is compatible with `@pmg/db` workspace imports.

**Better Auth session not found in proxy**
The cookie name is `better-auth.session_token`. Verify this matches what Better Auth
sets by inspecting the cookie in browser devtools after a successful login.

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
