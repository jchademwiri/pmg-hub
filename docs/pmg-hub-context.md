# PMG Hub — monorepo context & handoff

## Project overview

PMG Consulting Group runs 3 sites under one monorepo called `pmg-hub`. The main holding site markets both sub-brands and handles general enquiries. Each sub-brand has its own public-facing site.

| Site | App name | Framework | Purpose |
|---|---|---|---|
| pmgconsulting.co.za | `apps/web` | Next.js 16 | Holding site — markets TES + AWS, general enquiries |
| TES (Tendering Services) | `apps/tes` | Astro 6 | Public-facing tendering services site |
| AWS (Apex Web Solutions) | `apps/aws` | Next.js (to be added) | Web development services site |

---

## Monorepo structure

```
pmg-hub/
├── apps/
│   ├── web/              # Next.js — holds /admin, markets TES + AWS
│   ├── tes/              # Astro — tendering services public site
│   └── aws/              # Astro — web dev services (to be added)
│
└── packages/
    ├── db/               # Shared Drizzle ORM + Neon DB package
    ├── ui/               # Shared React components (@pmg/ui)
    ├── eslint-config/    # @pmg/eslint-config
    └── typescript-config/ # @pmg/typescript-config
```

**Package manager:** Bun (bun.lock present)  
**Monorepo tool:** Turborepo  
**Scope:** `@pmg/` (e.g. `@pmg/db`, `@pmg/ui`)

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (web + aws), Astro 6 (tes) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Neon (PostgreSQL, serverless) |
| ORM | Drizzle ORM |
| Auth | Better Auth (magic link, admin only) |
| Email | Resend |
| Hosting | Vercel (assumed) |

---

## Database — Neon (PostgreSQL)

All 3 sites share **one Neon database**. The shared package `packages/db` is the single source of truth for all schemas, the Drizzle client, and migrations.

### Connection strings

Neon provides two URLs — use both:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require        # pooled — app queries
DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require  # direct — migrations only
```

### packages/db structure

```
packages/db/
├── src/
│   ├── client.ts          # Drizzle + Neon client
│   ├── index.ts           # Public exports
│   └── schema/
│       ├── index.ts       # Barrel export
│       ├── auth.ts        # Better Auth tables (auto-managed)
│       ├── tes.ts         # TES schema
│       ├── aws.ts         # AWS schema
│       └── web.ts         # Web schema
├── drizzle.config.ts
└── package.json
```

### packages/db/package.json

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

### drizzle.config.ts

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

### src/client.ts

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type DB = typeof db;
```

---

## Database schema — 5 tables (+ 4 auth tables auto-managed by Better Auth)

### Decision log

- No `contacts` unified table for now — too early, adds complexity
- No `subscribers` table — newsletter opt-in is a boolean column on each form table
- No `tenders` operational table — TES is public-facing only, no internal tender tracking yet
- No `discovery_leads` wizard — too much friction, minimise forms
- AWS pricing is admin-managed via `aws_pricing` table; TES has no pricing table
- Prices stored as **ZAR cents** (integers) — e.g. R299 = `29900`

---

### Auth tables — `src/schema/auth.ts`

Fully managed by Better Auth. Do not write to these directly.

```ts
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
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
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

### TES schema — `src/schema/tes.ts`

One table. Enquiry form submissions from the TES site.

```ts
import { pgTable, text, timestamp, boolean, uuid, pgEnum, index } from "drizzle-orm/pg-core";

export const tesLeadStatusEnum = pgEnum("tes_lead_status", [
  "new", "contacted", "converted", "archived",
]);

export const tesServiceEnum = pgEnum("tes_service", [
  "bid_preparation", "tender_tracking", "compliance_docs",
  "method_statements", "pricing_boq", "post_award",
  "project_management", "full_service",
]);

export const tesLeads = pgTable("tes_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  company: text("company"),
  serviceInterest: tesServiceEnum("service_interest"),
  message: text("message").notNull(),
  newsletterOptIn: boolean("newsletter_opt_in").default(false).notNull(),
  status: tesLeadStatusEnum("status").default("new").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("tes_leads_status_idx").on(t.status),
  index("tes_leads_email_idx").on(t.email),
]);

export type TesLead = typeof tesLeads.$inferSelect;
export type NewTesLead = typeof tesLeads.$inferInsert;
```

**TES form fields (public):** Name, Email, Phone, Company (optional), Service interest (dropdown), Message, Newsletter opt-in (checkbox)

---

### AWS schema — `src/schema/aws.ts`

Three tables: general messages, package bookings, and pricing config.

```ts
import {
  pgTable, text, timestamp, boolean,
  integer, uuid, pgEnum, jsonb, index,
} from "drizzle-orm/pg-core";

export const awsMessageStatusEnum = pgEnum("aws_message_status", [
  "new", "read", "replied", "archived",
]);

export const awsBookingStatusEnum = pgEnum("aws_booking_status", [
  "new", "contacted", "active", "completed", "cancelled",
]);

export const awsPackageTypeEnum = pgEnum("aws_package_type", [
  "monthly", "once_off",
]);

// General contact form
export const awsMessages = pgTable("aws_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  newsletterOptIn: boolean("newsletter_opt_in").default(false).notNull(),
  status: awsMessageStatusEnum("status").default("new").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("aws_messages_status_idx").on(t.status),
  index("aws_messages_email_idx").on(t.email),
]);

export type AwsMessage = typeof awsMessages.$inferSelect;
export type NewAwsMessage = typeof awsMessages.$inferInsert;

// Package booking form
export const awsBookings = pgTable("aws_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  packageName: text("package_name").notNull(),
  packagePrice: integer("package_price").notNull(), // ZAR cents
  packageType: awsPackageTypeEnum("package_type").notNull(),
  newsletterOptIn: boolean("newsletter_opt_in").default(false).notNull(),
  status: awsBookingStatusEnum("status").default("new").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("aws_bookings_status_idx").on(t.status),
  index("aws_bookings_email_idx").on(t.email),
]);

export type AwsBooking = typeof awsBookings.$inferSelect;
export type NewAwsBooking = typeof awsBookings.$inferInsert;

// Admin-managed pricing plans
export const awsPricing = pgTable("aws_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  price: integer("price").notNull(),       // ZAR cents
  period: text("period"),                  // e.g. "/month" — null for once-off
  upfront: integer("upfront"),             // setup fee in ZAR cents
  description: text("description").notNull(),
  features: jsonb("features").notNull().$type<string[]>(),
  cta: text("cta").notNull(),
  popular: boolean("popular").default(false).notNull(),
  type: awsPackageTypeEnum("type").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export type AwsPricing = typeof awsPricing.$inferSelect;
export type NewAwsPricing = typeof awsPricing.$inferInsert;
```

**AWS contact form fields:** Name, Email, Phone (optional), Subject (optional), Message, Newsletter opt-in  
**AWS booking form fields:** Name, Email, Phone, Package (pre-filled from pricing page), Newsletter opt-in

---

### Web schema — `src/schema/web.ts`

One table. General enquiries from the PMG holding site, with routing to TES or AWS.

```ts
import { pgTable, text, timestamp, boolean, uuid, pgEnum, index } from "drizzle-orm/pg-core";

export const webLeadStatusEnum = pgEnum("web_lead_status", [
  "new", "contacted", "referred_tes", "referred_aws", "converted", "archived",
]);

export const webLeadServiceEnum = pgEnum("web_lead_service", [
  "tendering", "web_dev", "both", "general",
]);

export const webLeads = pgTable("web_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  serviceInterest: webLeadServiceEnum("service_interest").default("general").notNull(),
  message: text("message"),
  newsletterOptIn: boolean("newsletter_opt_in").default(false).notNull(),
  status: webLeadStatusEnum("status").default("new").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("web_leads_status_idx").on(t.status),
  index("web_leads_email_idx").on(t.email),
]);

export type WebLead = typeof webLeads.$inferSelect;
export type NewWebLead = typeof webLeads.$inferInsert;
```

**Web form fields:** Name, Email, Phone (optional), Company (optional), Service interest (dropdown), Message (optional), Newsletter opt-in

---

### Schema barrel export — `src/schema/index.ts`

```ts
export * from "./auth";
export * from "./tes";
export * from "./aws";
export * from "./web";
```

### src/index.ts

```ts
export { db } from "./client";
export type { DB } from "./client";
export * from "./schema";
```

---

## Auth — Better Auth (magic link, admin only)

Auth lives **only in `apps/web`**. No public sign-up. One admin account created manually in Neon/Better Auth dashboard.

### apps/web/lib/auth.ts

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { db, user, session, account, verification } from "@pmg/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: "PMG Admin <noreply@pmgconsulting.co.za>",
          to: email,
          subject: "PMG Admin — Sign in link",
          html: `<a href="${url}">Sign in to Admin</a>`,
        });
      },
    }),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
});
```

### apps/web/lib/auth-client.ts

```ts
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [magicLinkClient()],
});
```

### apps/web/app/api/auth/[...all]/route.ts

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

### apps/web/middleware.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  if (session.user.email !== ADMIN_EMAIL)
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
```

---

## Admin dashboard — `apps/web/app/admin/`

Lives at `/admin` on the main PMG site. Protected by middleware. Sidebar covers all 3 sites.

### Route structure

```
app/admin/
├── layout.tsx          # Sidebar + auth guard
├── page.tsx            # Dashboard overview — counts from all tables
├── tes/
│   └── leads/          # TES enquiry management
├── aws/
│   ├── messages/       # AWS contact messages
│   ├── bookings/       # AWS package bookings
│   └── pricing/        # Manage pricing plans
└── web/
    └── leads/          # PMG general enquiries
```

---

## Environment variables

### packages/db/.env (migrations only, gitignored)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

### apps/web/.env.local

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# Better Auth — generate: openssl rand -base64 32
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin gate
ADMIN_EMAIL=you@pmgconsulting.co.za

# Email
RESEND_API_KEY=re_
```

### apps/tes/.env (when DB reads are needed)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

---

## Root package.json scripts

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "db:generate": "bun --filter @pmg/db db:generate",
    "db:migrate": "bun --filter @pmg/db db:migrate",
    "db:studio": "bun --filter @pmg/db db:studio"
  }
}
```

---

## Setup commands (first time)

```bash
# 1. Install all dependencies
bun install

# 2. Add better-auth + resend to apps/web
bun --filter web add better-auth resend

# 3. Add @neondatabase/serverless + drizzle to packages/db
bun --filter @pmg/db add @neondatabase/serverless drizzle-orm
bun --filter @pmg/db add -D drizzle-kit

# 4. Fill in .env files (see above)

# 5. Generate migration files from schema
bun db:generate

# 6. Apply migrations to Neon
bun db:migrate

# 7. Open Drizzle Studio to verify tables
bun db:studio

# 8. Run all sites in dev
bun dev
```

---

## Using the DB in each site

### In apps/web (Next.js) — server component or route handler

```ts
import { db, tesLeads, awsBookings, webLeads } from "@pmg/db";
import { eq, isNull } from "drizzle-orm";

// Fetch all unread TES leads
const leads = await db
  .select()
  .from(tesLeads)
  .where(eq(tesLeads.isRead, false));
```

### In apps/tes (Astro) — API route or page

```ts
// src/pages/api/enquiry.ts
import type { APIRoute } from "astro";
import { db, tesLeads } from "@pmg/db";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  await db.insert(tesLeads).values({
    name: body.name,
    email: body.email,
    phone: body.phone,
    message: body.message,
    newsletterOptIn: body.newsletterOptIn ?? false,
  });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

### Handling prices (ZAR cents)

```ts
// Store: R299/month → 29900
// Display: 29900 → "R299"
const displayPrice = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA")}`;
```

---

## Key decisions summary

| Decision | Reason |
|---|---|
| Neon (PostgreSQL) not Cloudflare D1 | Shared across all 3 sites; D1 is per-worker |
| Bun not pnpm | Already in use — bun.lock present |
| Better Auth not Supabase Auth | No Supabase dependency; cleaner with Neon |
| Magic link only | Single admin, no password management needed |
| Auth only in apps/web | TES + AWS are public; no auth needed there |
| 5 tables not 15+ | MVP scope — expand when the need is proven |
| Prices as ZAR cents (integer) | Sortable, filterable, no float arithmetic bugs |
| newsletter_opt_in on each table | Avoids a separate subscribers table at this stage |
| No contacts unified table yet | Premature — add when cross-site deduplication is needed |
| No tenders operational table | TES is public-facing only for now |

---

## What to build next (after DB is set up)

1. **Form API routes** — one POST route per table in the relevant app
2. **Admin CRUD pages** — list + detail view for each table in `/admin`
3. **AWS pricing seed** — insert initial pricing plans via Drizzle Studio or a seed script
4. **Email notifications** — Resend fires on new lead/booking insert
5. **apps/aws** — add the third Next.js app to the monorepo
