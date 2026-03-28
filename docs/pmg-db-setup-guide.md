# PMG Hub — Database Setup Guide
## Step-by-Step: Building `packages/db` in the Monorepo

> **Verified against actual repo structure.** The planning documents referenced `apps/web` — that app does not exist. Your actual apps are `admin`, `aws`, `tes`, and `pmg`.

---

## Actual Monorepo Structure

```
pmg-hub/
├── apps/
│   ├── admin/     ← Next.js 16 — admin dashboard + public PMG holding site
│   ├── aws/       ← Astro 6 — Apex Web Solutions public site
│   ├── tes/       ← Astro 6 — Tender Edge Solutions public site
│   └── pmg/       ← Astro 6 — Playhouse Media Group holding site
│
└── packages/
    ├── db/                ← DOES NOT EXIST YET — create this
    ├── eslint-config/     ← @pmg/eslint-config ✓
    ├── tailwind-config/   ← @pmg/tailwind-config ✓
    ├── typescript-config/ ← @pmg/typescript-config ✓
    └── ui/                ← @pmg/ui ✓
```

**DB + Auth live in `apps/admin`** (not `apps/web` — that app doesn't exist).
**`packages/db`** needs to be created from scratch.

---

## DB Ownership Map

| App | Framework | DB Role |
|-----|-----------|---------|
| `apps/admin` | Next.js 16 | Admin dashboard + auth — full CRUD on all tables |
| `apps/tes` | Astro 6 | Inserts into `tes_leads` from public enquiry form |
| `apps/aws` | Astro 6 | Inserts into `aws_messages` and `aws_bookings` |
| `apps/pmg` | Astro 6 | Inserts into `web_leads` from holding site contact form |

**Tables to create:**

| Table | Used by | Purpose |
|-------|---------|---------|
| `user`, `session`, `account`, `verification` | admin only | Better Auth (auto-managed) |
| `tes_leads` | tes + admin | TES enquiry form submissions |
| `aws_messages` | aws + admin | AWS general contact form |
| `aws_bookings` | aws + admin | AWS package booking form |
| `aws_pricing` | admin | Admin-managed pricing config |
| `web_leads` | pmg + admin | PMG holding site enquiries |

---

## Step 1 — Scaffold `packages/db`

### AI Prompt

```
In my Bun + Turborepo monorepo (pmg-hub), create a new package at packages/db.

Requirements:
- Package name: @pmg/db
- Type: module (ESM)
- Use Drizzle ORM with @neondatabase/serverless for PostgreSQL
- Export the Drizzle db client from src/client.ts
- Export all schema from src/schema/index.ts
- Public exports via package.json "exports" field:
  - ".": "./src/index.ts"
  - "./schema": "./src/schema/index.ts"

Create these files:
- packages/db/package.json
- packages/db/tsconfig.json (extend @pmg/typescript-config/base.json)
- packages/db/src/client.ts
- packages/db/src/index.ts
- packages/db/src/schema/index.ts (empty barrel for now)
- packages/db/drizzle.config.ts

DATABASE_URL (pooled) for app queries, DATABASE_URL_DIRECT for migrations.
Do NOT install packages yet.
```

### `packages/db/package.json`

```json
{
  "name": "@pmg/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "better-auth": "^1.2.7",
    "drizzle-orm": "^0.36.0"
  },
  "devDependencies": {
    "@pmg/typescript-config": "*",
    "drizzle-kit": "^0.28.0",
    "typescript": "5.9.2"
  }
}
```

### `packages/db/drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT!,
  },
});
```

### `packages/db/src/client.ts`

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

### `packages/db/src/index.ts`

```ts
export { db } from "./client";
export type { DB } from "./client";
export * from "./schema";
```

---

## Step 2 — Install Dependencies

```bash
bun install
bun --filter @pmg/db add @neondatabase/serverless drizzle-orm better-auth
bun --filter @pmg/db add -D drizzle-kit
```

---

## Step 3 — Auth Schema

### AI Prompt

```
In packages/db/src/schema/auth.ts, create Better Auth tables for PostgreSQL
using Drizzle ORM: user, session, account, verification.

Add a top comment: "DO NOT write to these tables directly — managed by Better Auth."
Use imports from drizzle-orm/pg-core. Export all four tables.
```

```ts
// DO NOT write to these tables directly — managed by Better Auth.
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

## Step 4 — TES Schema

### AI Prompt

```
In packages/db/src/schema/tes.ts, create a Drizzle ORM schema for the
Tender Edge Solutions enquiry form.

One table: tes_leads
- UUID PK defaultRandom()
- name, email, phone: text NOT NULL
- company: text nullable
- serviceInterest: pgEnum "tes_service" (bid_preparation, tender_tracking,
  compliance_docs, method_statements, pricing_boq, post_award,
  project_management, full_service) — nullable
- message: text NOT NULL
- newsletterOptIn: boolean NOT NULL default false
- status: pgEnum "tes_lead_status" (new, contacted, converted, archived)
  NOT NULL default "new"
- isRead: boolean NOT NULL default false
- notes: text nullable
- createdAt: timestamp NOT NULL defaultNow()

Add indexes on status and email.
Export: tesLeads table, TesLead type ($inferSelect), NewTesLead type ($inferInsert).
```

---

## Step 5 — AWS Schema

### AI Prompt

```
In packages/db/src/schema/aws.ts, create a Drizzle ORM schema for
Apex Web Solutions. Three tables:

1. aws_messages (general contact form)
   - id uuid PK, name/email text NOT NULL, phone/subject nullable
   - message NOT NULL, newsletterOptIn boolean default false
   - status pgEnum "aws_message_status" (new, read, replied, archived)
   - isRead boolean, notes nullable, createdAt timestamp
   - Indexes on status, email

2. aws_bookings (package booking)
   - id uuid PK, name/email/phone text NOT NULL
   - packageName text NOT NULL
   - packagePrice integer NOT NULL (ZAR cents — R299 = 29900)
   - packageType pgEnum "aws_package_type" (monthly, once_off)
   - newsletterOptIn boolean
   - status pgEnum "aws_booking_status" (new, contacted, active, completed, cancelled)
   - isRead boolean, notes nullable, createdAt timestamp
   - Indexes on status, email

3. aws_pricing (admin-managed config)
   - id uuid PK, name text NOT NULL
   - price integer NOT NULL (ZAR cents)
   - period text nullable (e.g. "/month" — null for once-off)
   - upfront integer nullable (setup fee in ZAR cents)
   - description text NOT NULL
   - features jsonb NOT NULL typed as string[]
   - cta text NOT NULL, popular boolean default false
   - type aws_package_type NOT NULL
   - sortOrder integer default 0, isActive boolean default true

Export all tables and their Select/Insert types.
```

---

## Step 6 — Web Schema

This table receives submissions from `apps/pmg` (the Playhouse Media Group holding site).

### AI Prompt

```
In packages/db/src/schema/web.ts, create a Drizzle ORM schema for the
PMG holding site (apps/pmg) general enquiry form.

One table: web_leads
- id uuid PK defaultRandom()
- name, email: text NOT NULL
- phone, company: text nullable
- serviceInterest: pgEnum "web_lead_service"
  (tendering, web_dev, both, general) NOT NULL default "general"
- message: text nullable
- newsletterOptIn: boolean NOT NULL default false
- status: pgEnum "web_lead_status"
  (new, contacted, referred_tes, referred_aws, converted, archived)
  NOT NULL default "new"
- isRead: boolean NOT NULL default false
- notes: text nullable
- createdAt: timestamp NOT NULL defaultNow()

Add indexes on status and email.
Export: webLeads table, WebLead type, NewWebLead type.
```

---

## Step 7 — Barrel Export

```ts
// packages/db/src/schema/index.ts
export * from "./auth";
export * from "./tes";
export * from "./aws";
export * from "./web";
```

---

## Step 8 — Environment Variables

### `packages/db/.env` (gitignored — migrations only)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

> Neon dashboard → your project → Connection Details  
> `DATABASE_URL` = pooled connection | `DATABASE_URL_DIRECT` = direct (required for migrations)

### `apps/admin/.env.local` (gitignored)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your_generated_secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

ADMIN_EMAIL=you@pmgconsulting.co.za
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### `apps/tes/.env`, `apps/aws/.env`, `apps/pmg/.env`

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

---

## Step 9 — Add DB Scripts to Root `package.json`

### AI Prompt

```
In the root package.json, add alongside the existing build/dev/lint scripts:

"db:generate": "bun --filter @pmg/db db:generate",
"db:migrate": "bun --filter @pmg/db db:migrate",
"db:studio": "bun --filter @pmg/db db:studio"
```

---

## Step 10 — Run Migrations

```bash
# Generate SQL migration files from schema
bun db:generate

# Apply to Neon
bun db:migrate

# Verify tables visually (optional)
bun db:studio
```

After this, Neon will have: `user`, `session`, `account`, `verification`, `tes_leads`, `aws_messages`, `aws_bookings`, `aws_pricing`, `web_leads`

---

## Step 11 — Seed AWS Pricing

### AI Prompt

```
Create packages/db/src/seed.ts that inserts initial pricing into aws_pricing.

Monthly packages (ZAR cents):
1. Starter — R299/mo, no upfront, features: ["1-page website", "Mobile responsive",
   "Contact form", "Basic SEO", "1 revision/month"], cta: "Get Started"
2. Growth — R599/mo, R1500 upfront, features: ["Up to 5 pages", "Mobile responsive",
   "Contact form + WhatsApp button", "Google Analytics", "Monthly content update",
   "2 revisions/month"], cta: "Start Growing", popular: true
3. Pro — R999/mo, R2500 upfront, features: ["Up to 10 pages", "E-commerce ready",
   "SEO optimised", "Monthly reporting", "Priority support", "Unlimited revisions"],
   cta: "Go Pro"

Once-off packages:
4. Landing Page — R2500, features: ["1 page", "Mobile responsive",
   "Contact/lead form", "Delivered in 5 days"], cta: "Order Now"
5. Business Website — R6500, features: ["5 pages", "Mobile responsive",
   "Contact form", "Basic SEO", "30-day support"], cta: "Get a Quote"

Use db from packages/db/src/client.ts.
Add main() with try/catch. Run with: bun packages/db/src/seed.ts
```

---

## Step 12 — Connect `apps/admin`

### AI Prompt

```
In apps/admin/package.json, add: "@pmg/db": "*"

Create apps/admin/src/app/page.tsx as a Next.js Server Component that:
1. Imports db and table types from "@pmg/db"
2. Fetches unread counts from tes_leads, aws_messages, aws_bookings,
   and web_leads (where isRead = false)
3. Displays them as a simple dashboard overview

No "use client". Use Drizzle's count() aggregate.
```

---

## Step 13 — Connect `apps/tes`

### AI Prompt

```
In apps/tes/package.json, add: "@pmg/db": "*"

Create apps/tes/src/pages/api/enquiry.ts (Astro API route) that:
1. Accepts POST with JSON body
2. Validates required: name, email, phone, message
3. Inserts into tes_leads using Drizzle
4. Returns { ok: true } on success, { error: "..." } on failure

Use TypeScript types from @pmg/db.
```

---

## Step 14 — Connect `apps/pmg`

### AI Prompt

```
In apps/pmg/package.json, add: "@pmg/db": "*"

Create apps/pmg/src/pages/api/enquiry.ts (Astro API route) that:
1. Accepts POST with JSON body
2. Validates: name, email required; phone, company, message optional
3. Accepts serviceInterest (tendering, web_dev, both, general)
4. Inserts into web_leads using Drizzle
5. Returns { ok: true } on success
```

---

## Step 15 — Connect `apps/aws`

### AI Prompt

```
In apps/aws/package.json, add: "@pmg/db": "*"

Create two Astro API routes:

1. apps/aws/src/pages/api/contact.ts
   - POST: validates name, email, message required
   - Inserts into aws_messages
   - Returns { ok: true }

2. apps/aws/src/pages/api/booking.ts
   - POST: validates name, email, phone, packageName,
     packagePrice (integer cents), packageType required
   - Inserts into aws_bookings
   - Returns { ok: true }
```

---

## Step 16 — Auth in `apps/admin`

### AI Prompt

```
Set up Better Auth with magic link in apps/admin only.

Install: bun --filter admin add better-auth resend

Create:
1. apps/admin/src/lib/auth.ts — betterAuth with drizzleAdapter
   using @pmg/db, magicLink plugin using Resend.
   From: "PMG Admin <noreply@pmgconsulting.co.za>"

2. apps/admin/src/lib/auth-client.ts — createAuthClient
   with magicLinkClient plugin

3. apps/admin/src/app/api/auth/[...all]/route.ts — toNextJsHandler

4. apps/admin/middleware.ts — protect /admin/* routes.
   Allow only ADMIN_EMAIL. Redirect to /login if not authed.

Import user, session, account, verification from "@pmg/db".
```

---

## Step 17 — Verify

```bash
bun run check-types
bun run build
bun run lint
```

---

## Final Architecture

```
pmg-hub/
├── apps/
│   ├── admin/  ← Next.js — auth (Better Auth) + admin dashboard
│   │           ← Reads/writes ALL tables
│   ├── aws/    ← Astro — inserts aws_messages + aws_bookings
│   ├── tes/    ← Astro — inserts tes_leads
│   └── pmg/    ← Astro — inserts web_leads
│
└── packages/
    └── db/     ← @pmg/db: client + 4 schema files + migrations
                ← Imported by all 4 apps via "bun workspaces"
```

---

## Troubleshooting

**`Cannot find module '@pmg/db'`** — Run `bun install` from root to link workspace packages.

**`DATABASE_URL is not defined`** — Check `.env` files exist in the right locations. Drizzle reads `packages/db/.env` for migrations; each app reads its own `.env` file.

**Migration fails with `already exists`** — Drop existing tables in the Neon dashboard, then rerun `bun db:migrate`.

**TypeScript errors on `jsonb` field** — Chain `.$type<string[]>()` after `jsonb()` on `aws_pricing.features`.

**Enum conflicts on re-generate** — Enum names must be globally unique. Do not duplicate across schema files.

**`apps/admin` uses `moduleResolution: bundler`** — This is correct for Next.js and is compatible with `@pmg/db` workspace imports.