# PMG Hub — Portal Specification

**Status:** Approved  
**Date:** 2026-06-27  
**Scope:** Research, product design, and implementation plan for a client-facing self-service billing portal  
**Portal URL:** `https://portal.playhousemedia.co.za`

---

## 1. Executive Summary

PMG Hub has a fully functional internal admin app for billing, quotes, invoices, payments, and credits. Clients receive documents by email but have no self-service interface. This specification defines the **PMG Portal** — a dedicated, authenticated portal where clients can view their billing history, download documents, and accept or decline quotes.

The portal reuses the **existing Better Auth magic-link infrastructure** already powering the admin app. No new auth library is needed. Clients log in via a magic link sent to the email address stored on their `clients` record. The portal lives at `https://portal.playhousemedia.co.za` as a separate Next.js app inside the existing monorepo (`apps/portal`).

---

## 2. Industry Research Summary

### 2.1 What Leading Apps Offer

The following apps were studied: **Invoice Ninja**, **FreshBooks**, **QuickBooks Online**, **HoneyBook**, **Dubsado**, and **Xero** (via third-party portal integrations).

#### Invoice Ninja (closest match to PMG's architecture)

- Fully branded portal at a custom subdomain (e.g. `billing.yourcompany.com`)
- Magic link login — no passwords; every email contains a secure one-click login link
- Portal sections: Dashboard, Invoices, Recurring, Payments, Quotes, Credits, Payment Methods, Documents, Statements, Subscriptions, Tasks & Projects
- Quote actions: clients can approve or reject quotes directly; an approved quote auto-converts to an invoice
- 1-click invoice payment via Stripe, PayPal, GoCardless, etc.
- PDF download for every document

#### FreshBooks

- Free client accounts linked to the business's FreshBooks workspace
- Clients can view and comment on invoices, estimates, and proposals; save payment methods; pay invoices; collaborate on projects
- No separate login required for one-off payments — a link in the email is sufficient
- Persistent client account for repeat clients with saved payment info

#### QuickBooks Online

- "Customer Hub" with a transaction list per client
- Clients can view estimates, respond with approvals, and pay invoices via "Pay Now" buttons
- OTP-style 6-digit code login (email or phone)

#### HoneyBook / Dubsado

- Branded portal per project — clients see proposals, contracts, invoices, and files
- Clients can sign contracts, pay invoices, and upload files
- Dubsado clients can review full payment history and upcoming payment schedules

#### Xero (via Portal Genie and similar integrations)

- 24/7 client access to invoices, statements, quotes, and credit notes
- Invoice pay button; client file uploads in some integrations

### 2.2 Key Patterns Across All Apps

| Pattern                          | Prevalence                                       |
| -------------------------------- | ------------------------------------------------ |
| Magic link / passwordless login  | Universal (Invoice Ninja, FreshBooks, HoneyBook) |
| OTP / 6-digit code fallback      | Common (QuickBooks, Xero)                        |
| Quote accept / reject in portal  | Universal                                        |
| Invoice download as PDF          | Universal                                        |
| Payment history                  | Universal                                        |
| Credit note / balance visibility | Most (Invoice Ninja, FreshBooks, Xero)           |
| Account statement download       | Most                                             |
| Saved payment methods            | Some (Invoice Ninja, FreshBooks)                 |
| Document/file attachments        | Some (HoneyBook, Invoice Ninja)                  |
| Recurring invoice visibility     | Invoice Ninja, FreshBooks                        |
| Project/task visibility          | Invoice Ninja, FreshBooks, HoneyBook             |

### 2.3 Auth Pattern Consensus

Every major app either sends a **magic link** in every document email (Invoice Ninja, FreshBooks, HoneyBook) or sends an **OTP code** on demand (QuickBooks). None require clients to create a password. Clients pay infrequently, forget passwords, and abandon payment flows at a login wall — magic link or OTP eliminates that friction entirely.

---

## 3. PMG Portal — Product Design

### 3.1 Goals

1. Allow clients to view and download invoices, quotes, statements, and credit notes without contacting PMG.
2. Allow clients to **accept or decline quotes** directly in the portal.
3. Reuse the existing Better Auth magic-link flow — no new auth dependency.
4. Keep the portal separate from the admin app but within the same monorepo (`apps/portal`).
5. Scope all data strictly to the authenticated client — a client must only ever see their own records.

### 3.2 Out of Scope (V1)

- Online payment processing (offline payments are handled by the admin team)
- File / document upload by clients
- Messaging or comments
- Subscription management
- Recurring invoice schedules
- e-Signature on quotes (accept action is sufficient for V1)
- Multiple contacts per client (V2 — see section 4.6)

---

## 4. Authentication Design

### 4.1 Two Doors, One House

The admin app and the portal each have their **own `betterAuth(...)` instance** with separate configurations. They share the same underlying PostgreSQL database — the same `user`, `session`, `account`, and `verification` tables. Think of it as two doors into the same house: same locks, different keys, different doormen checking different guest lists.

**What is shared (database layer):**

- `user`, `session`, `account`, `verification` tables in PostgreSQL
- A client who already has a `user` row (matched by email) reuses it — no duplicate records

**What is NOT shared (instance config):**

- `baseURL` — ties the session cookie to its domain; `portal.playhousemedia.co.za` cookies cannot bleed into the admin app
- `before` middleware — admin checks the `invitations` table; the portal checks the `clients` table
- Cookie name — Better Auth derives the cookie name from `baseURL`, so they never collide

### 4.2 Portal Auth Instance

`apps/portal/src/lib/auth.ts`:

```typescript
export const portalAuth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET, // same secret as admin
  baseURL: 'https://portal.playhousemedia.co.za', // different → isolated cookie scope
  database: drizzleAdapter(getDb(), { provider: 'pg' }),

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // reuses @pmg/emails MagicLinkEmail template
        // subject: "Access your PMG billing portal"
      },
    }),
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/magic-link') return;
      // Check clients table, not invitations
      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.email, email), eq(clients.isActive, true)))
        .limit(1);
      if (!client) throw new APIError('FORBIDDEN', { message: 'No active client account' });
    }),

    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/magic-link/verify') return;
      // Link user.id → clients.userId on first login
      // If clients.userId is already set, skip (idempotent)
    }),
  },
});
```

The API route in `apps/portal`:

```typescript
// apps/portal/src/app/api/auth/[...all]/route.ts
import { portalAuth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
export const { GET, POST } = toNextJsHandler(portalAuth);
```

This mirrors the admin app's `apps/admin/src/app/api/auth/[...all]/route.ts` exactly — only the imported instance differs.

### 4.3 Client Identity Linking

The `clients` table has an `email` column. When a client requests a magic link:

1. The portal `before` middleware checks `email` exists in `clients` where `isActive = true`.
2. If the email does not exist in the `user` table, Better Auth creates a new `user` row automatically (default magic link behaviour).
3. The `after` middleware links `user.id` to the `clients` row by writing to `clients.userId` (new column — see section 6.1). This runs once on first login and is idempotent.
4. All subsequent data queries resolve `clientId` from `session.user.id → clients.userId` — never from a URL parameter alone.

### 4.4 Magic Link Login Flow

```
Client receives an invoice/quote email
    → Visits portal.playhousemedia.co.za/login
      (email pre-filled from query param if linked from a document email)
    → Clicks "Send me a login link"
    → Receives branded email: "Access your PMG billing portal"
    → Clicks link → session created → lands on /dashboard
    → Session valid for 24 hours (matches admin app)
```

### 4.5 OTP Fallback (V1.5)

Better Auth's `emailOtp` plugin can be added alongside `magicLink` with minimal config. It provides a 6-digit code for clients whose email clients strip or block magic links. The login UI should be designed now with a "Use a code instead" toggle so this can be wired up without a layout change in V1.5.

### 4.6 One Contact Per Client (V1)

In V1, portal access is scoped to the single `clients.email` — one login per client record. If a client needs multiple people to access the portal (e.g. finance + operations), that requires a `client_contacts` table and is deferred to V2.

**Important operational note:** If an admin changes a client's email in the admin app, the old `clients.userId` link becomes stale. The fix is to reset `clients.userId = null` on email change in the admin app — the next magic link login will re-link to the new email's `user` row. This must be handled in the admin app's client-edit server action.

### 4.7 Session Security

- Client sessions are isolated from admin sessions via separate `baseURL` and cookie names.
- The portal `proxy.ts` validates on every request that the session user's email still resolves to an active `clients` row (`isActive = true`). If not, the session is rejected and the client is sent to `/login`.
- If a client is deactivated in the admin app, their next portal request is blocked — no manual session invalidation needed beyond the `proxy.ts` check.
- Magic link tokens expire after 24 hours.
- The magic link sign-in endpoint is rate-limited per IP address in `proxy.ts` (same in-memory pattern used in the admin app's `proxy.ts`) to prevent abuse.

---

## 5. Portal Pages & Routes

The portal lives at `apps/portal`. Route structure:

### 5.1 Public Routes (no auth required)

| Route           | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| `/login`        | Magic link request form. Accepts email, shows confirmation state after submit.        |
| `/login/verify` | Better Auth magic link callback handler — creates session, redirects to `/dashboard`. |

### 5.2 Authenticated Routes

All routes below are under a shared layout (`(portal)/layout.tsx`) that validates the session and resolves `clientId`. Unauthenticated requests redirect to `/login`.

---

#### `/dashboard` — Home / Overview

**Purpose:** At-a-glance summary of the client's billing relationship with PMG.

**Content:**

- Welcome message with client name and business name
- Summary cards:
  - Total invoiced (rolling 12 months)
  - Amount paid to date
  - Outstanding balance (sum of `issued` + `overdue` invoices)
  - Pending quotes (count of `sent` quotes awaiting action)
- Latest 5 invoices with status badges
- Latest 3 quotes with status badges and inline Accept / Decline for `sent` quotes
- Quick-access links to all portal sections

**Data sources:** `invoices`, `quotations`, `payment_allocations` — all filtered to `client_id`.

---

#### `/invoices` — Invoice List

**Purpose:** Full invoice history for this client.

**Content:**

- Filter tabs: All / Unpaid / Paid / Overdue
- Columns: Invoice #, Date, Due Date, Amount, Status, Actions
- Actions per row: Download PDF, View Detail
- `draft` invoices are never shown — only `issued` and beyond

**Status badge mapping (client-facing language — see section 8.2).**

---

#### `/invoices/[id]` — Invoice Detail

**Purpose:** Full read-only invoice view.

**Content:**

- Invoice header: number, date, due date, status badge
- Line items table
- Totals: subtotal, discount, VAT, total
- Payment history for this invoice (from `payment_allocations` — dates and amounts)
- Banking details for EFT payment (from `division_billing_settings`: bank name, account name, account number, branch code)
- Notes / Terms
- Download PDF button

**Access control:** Server-side ownership check — `invoice.clientId === resolvedClientId`. Returns generic 404 if not matched (never leaks existence of other clients' records).

---

#### `/quotes` — Quote List

**Purpose:** All quotes sent to this client, with the ability to act on pending ones.

**Content:**

- Filter tabs: All / Pending / Accepted / Declined / Expired / Converted
- Columns: Quote #, Date, Expiry Date, Amount, Status, Actions
- `draft` quotes are never shown — only `sent` and beyond
- Inline Accept / Decline buttons on rows with `sent` status

---

#### `/quotes/[id]` — Quote Detail + Accept / Decline

**Purpose:** Full quote view with client action capability.

**Content:**

- Quote header: number, date, expiry date, reference, status badge
- Line items table
- Totals
- Notes / Terms
- Download PDF button
- **Status banner** (always shown, context-dependent):
  - `sent`, not expired → blue info banner: "This quote is awaiting your response."
  - `sent`, expired → amber warning banner: "This quote expired on [date]. You can still respond — contact PMG if you have any questions." Accept / Decline buttons remain active.
  - `accepted` → green banner: "You accepted this quote on [date]."
  - `declined` → red banner: "You declined this quote on [date]." + decline reason if provided
  - `converted` → purple banner: "This quote has been converted to Invoice #XXXX."
  - `cancelled` → grey banner: "This quote has been cancelled."
- **Action bar** (shown when status is `sent` only):
  - "Accept Quote" → confirmation modal → server action
  - "Decline Quote" → modal with optional text area "Reason for declining (optional)" → server action

**Server action — Accept Quote:**

1. Validates session and `clientId` ownership
2. Confirms quote status is `sent` (expired quotes are allowed — warning is shown but action is not blocked)
3. Updates `quotations.status` → `accepted`, writes `acceptedAt`, `clientActionBy`
4. Sends notification email to `division_billing_settings.salesRepEmail` for the quote's division (fallback: `organisation_settings.email` if `salesRepEmail` is null)
5. Returns updated quote to the portal UI

**Server action — Decline Quote:**

1. Same ownership validation
2. Confirms quote status is `sent`
3. Updates `quotations.status` → `declined`, writes `declinedAt`, `declineReason` (nullable), `clientActionBy`
4. Sends same notification email as Accept, with "declined" wording
5. Returns updated quote to the portal UI

---

#### `/statements` — Account Statement

**Purpose:** Self-serve statement of account for a chosen date range.

**Content:**

- Date range picker (default: last 12 months)
- Statement table: opening balance, invoices issued, payments received, credits applied, closing balance
- Ageing summary: current, 30 days, 60 days, 90+ days
- Download as PDF button

**Data sources:** `invoices`, `payment_allocations`, `credit_notes`, `credit_applications`.

---

#### `/credits` — Credit Notes

**Purpose:** Visibility into any credits on account.

**Content:**

- List of all credit notes: number, type, date, original amount, remaining balance, status
- Status badges: `active`, `partially_applied`, `fully_applied`, `expired`, `void`
- Credits are read-only in V1 — application is handled by the PMG admin team

---

#### `/profile` — Profile

**Purpose:** View the contact information PMG holds on record.

**Content:**

- Client name, business name, email, phone
- Division name and sales rep contact details (from `division_billing_settings`)
- Static note: "To update your details, please contact your PMG account manager."

---

## 6. Schema Changes Required

All changes are additive — no breaking changes to the existing admin app.

### 6.1 `clients` table — add `userId` column

```sql
ALTER TABLE clients
  ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX clients_user_id_unique_idx
  ON clients(user_id)
  WHERE user_id IS NOT NULL;
```

Links a Better Auth `user` record to a `clients` record after first magic link login. Also reset to `NULL` in the admin app's client-edit flow if the client's email is changed.

### 6.2 `quotations` table — add client action columns

```sql
ALTER TABLE quotations
  ADD COLUMN accepted_at       TIMESTAMPTZ,
  ADD COLUMN declined_at       TIMESTAMPTZ,
  ADD COLUMN decline_reason    TEXT,
  ADD COLUMN client_action_by  TEXT;  -- stores Better Auth user.id of the client
```

Provides full audit trail for quote accept/decline actions initiated from the portal.

### 6.3 Migration

Both changes are delivered as a single Drizzle migration file in `packages/db/src/migrations/`. The migration runs before the portal is deployed. The admin app is unaffected by either column addition.

---

## 7. Technical Architecture

### 7.1 Monorepo Placement

The existing empty `apps/client` folder is renamed to `apps/portal`.

```
apps/
  admin/                        ← existing internal admin app (unchanged)
  portal/                       ← renamed from apps/client
    src/
      proxy.ts                  ← session guard, rate limiting, route protection
                                   (Next.js v16+ — replaces middleware.ts)
      app/
        (auth)/
          login/
            page.tsx            ← magic link request form
          verify/
            page.tsx            ← Better Auth callback handler
        (portal)/
          layout.tsx            ← clientId resolver (session already validated by proxy.ts)
          dashboard/
            page.tsx
          invoices/
            page.tsx
            [id]/
              page.tsx
          quotes/
            page.tsx
            [id]/
              page.tsx
          statements/
            page.tsx
          credits/
            page.tsx
          profile/
            page.tsx
        api/
          auth/
            [...all]/
              route.ts          ← toNextJsHandler(portalAuth)
      lib/
        auth.ts                 ← portalAuth Better Auth instance
        auth-client.ts          ← createAuthClient({ plugins: [magicLinkClient()] })
        portal-session.ts       ← getPortalSessionOrRedirect() + resolveClientId()
```

### 7.2 Shared Packages Used

| Package                | Usage                                                        |
| ---------------------- | ------------------------------------------------------------ |
| `@pmg/db`              | Same Drizzle instance, all existing schemas — no duplication |
| `@pmg/emails`          | `MagicLinkEmail` template reused with updated copy           |
| `@pmg/ui`              | Shared shadcn/ui component library                           |
| `@pmg/tailwind-config` | Consistent styling across admin and portal                   |

### 7.3 PDF Generation — Generate on Demand

**Decision: PDFs are generated on demand from live data. No file storage required.**

The existing `server-billing-pdf.ts` and `pdf-export.ts` utilities in `apps/admin` are extracted into a new shared package `packages/billing-pdf`. Both the admin app and the portal import from this package. The portal generates PDFs fresh on each request — no S3, no CDN, no sync problem.

This is better than a "Share to portal" admin button because:

- The client always sees the current state of the document — no stale PDFs
- No file storage infrastructure needed in V1
- No admin workflow change required
- The extract to `packages/billing-pdf` benefits the admin app too (cleaner separation)

The only tradeoff is slight latency on first PDF request, which is acceptable for a billing portal.

### 7.4 Data Access Pattern

Route protection and rate limiting happen in `proxy.ts`. The `clientId` is resolved once per request in the `(portal)` layout via `getPortalSessionOrRedirect()` and flows into all server components and actions — never trusted from URL parameters.

`proxy.ts` is the Next.js v16+ replacement for `middleware.ts`. The function export is named `proxy` (not `middleware`). It mirrors the exact pattern already used in `apps/admin/src/proxy.ts`.

```typescript
// apps/portal/src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { portalAuth } from '@/lib/auth';

// In-memory rate limiter — mirrors admin app proxy.ts
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Rate limit auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const ip =
      request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    if (isRateLimited(ip)) return new NextResponse('Too Many Requests', { status: 429 });
  }

  // Allow public routes through
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Require session cookie for all portal routes
  const sessionToken =
    request.cookies.get('__Secure-better-auth.session_token') ??
    request.cookies.get('better-auth.session_token');
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validate session — direct DB adapter call, no internal HTTP fetch
  try {
    const session = await portalAuth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.redirect(new URL('/login', request.url));
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)',
  ],
};
```

The `isActive` check and `clientId` resolution happen in `getPortalSessionOrRedirect()` inside the `(portal)` layout — keeping the proxy lean and business logic in the app layer:

```typescript
// apps/portal/src/lib/portal-session.ts
export async function getPortalSessionOrRedirect() {
  const session = await portalAuth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  // Enforces isActive — deactivated clients are blocked here
  if (!client || !client.isActive) redirect('/login');

  return { session, client };
}

// Usage in any server component or action:
const { client } = await getPortalSessionOrRedirect();

const clientInvoices = await db
  .select()
  .from(invoices)
  .where(
    and(
      eq(invoices.clientId, client.id), // ← always required
      ne(invoices.status, 'draft'), // ← never show drafts
    ),
  )
  .orderBy(desc(invoices.invoiceDate));
```

---

## 8. UI / UX Design Principles

### 8.1 Branding

- PMG branding (logo, colours) throughout — no third-party branding visible to clients
- Consistent with the admin app's design system (shadcn/ui, Tailwind)
- Mobile responsive — clients frequently check invoices and quotes on mobile

### 8.2 Status Badge Mapping (Client-Facing Language)

Technical status names from the database are never shown directly to clients.

| Internal Status     | Client-Facing Label    | Colour |
| ------------------- | ---------------------- | ------ |
| `issued`            | Due                    | Blue   |
| `partially_paid`    | Partially Paid         | Amber  |
| `paid`              | Paid                   | Green  |
| `overdue`           | Overdue                | Red    |
| `void`              | Cancelled              | Grey   |
| `sent` (quote)      | Awaiting Your Response | Blue   |
| `accepted` (quote)  | Accepted               | Green  |
| `declined` (quote)  | Declined               | Red    |
| `expired` (quote)   | Expired                | Grey   |
| `converted` (quote) | Converted to Invoice   | Purple |
| `cancelled` (quote) | Cancelled              | Grey   |

### 8.3 Empty States

Every list page has a clear, friendly empty state:

- Invoices: "No invoices yet. When PMG sends you an invoice, it'll appear here."
- Quotes: "No quotes yet. When PMG sends you a quote, it'll appear here."
- Credits: "You have no credit notes on your account."
- Statements: "No transactions found for the selected date range."

### 8.4 Error Handling

- Deactivated client → branded page: "Your account is currently inactive. Please contact your PMG account manager." with contact details from `organisation_settings`.
- Document not found or belonging to another client → generic 404. Never expose a "forbidden" error that would confirm a document exists.
- Quote already actioned (race condition — e.g. two tabs) → friendly message: "This quote has already been responded to."

---

## 9. Email Touchpoints

### 9.1 Magic Link Email (Login)

- Template: existing `MagicLinkEmail` from `@pmg/emails`
- Subject: "Access your PMG billing portal"
- Copy: updated to mention portal context (not admin control center)
- Expiry copy: "This link expires in 24 hours"

### 9.2 Quote Action Notification (New — admin-facing)

Triggered when a client accepts or declines a quote. Sent to:

- **Primary:** `division_billing_settings.salesRepEmail` for the division that owns the quote
- **Fallback:** `organisation_settings.email` if `salesRepEmail` is null or not set for that division
- Never silently skipped — if both are null, log an error

Email content:

- Subject: "[Client Name] has accepted Quote #XXXX" / "[Client Name] has declined Quote #XXXX"
- Body: client name, quote number, quote total, action timestamp, decline reason (if provided), direct link to the quote in the admin app (`/billing/quotes/[id]`)

### 9.3 Portal Link in Document Emails (V2)

Every invoice/quote email sent from the admin app will include a pre-authenticated magic link directly into the portal document view — the same approach Invoice Ninja uses. This requires the admin email-sending flow to generate a portal magic link token alongside the document. Deferred to V2 to avoid blocking V1 delivery.

---

## 10. Implementation Phases

### Phase 1 — Foundation (weeks 1–2)

- [ ] Rename `apps/client` → `apps/portal` in the monorepo
- [ ] Scaffold `apps/portal` as a Next.js app in the Turbo pipeline
- [ ] Add `userId` column to `clients` schema + Drizzle migration
- [ ] Configure `portalAuth` Better Auth instance (`apps/portal/src/lib/auth.ts`)
- [ ] Implement `proxy.ts` — session cookie check, rate limiting, public route allowlist (mirrors `apps/admin/src/proxy.ts`)
- [ ] Implement `/login` page and magic link request flow
- [ ] Implement `/login/verify` callback handler (session creation + `clients.userId` linking)
- [ ] Implement `getPortalSessionOrRedirect()` and `(portal)` layout
- [ ] Basic portal layout: header with client name, nav links, logout button
- [ ] Deploy `portal.playhousemedia.co.za` on Vercel with custom domain

### Phase 2 — Core Billing Pages (weeks 3–4)

- [ ] Extract PDF utilities to `packages/billing-pdf` (shared package)
- [ ] Dashboard / overview page (summary cards + recent invoices + pending quotes)
- [ ] Invoice list page (filter tabs, no drafts)
- [ ] Invoice detail page (line items, payment history, EFT banking details, PDF download)

### Phase 3 — Quotes & Client Actions (week 5)

- [ ] Add `accepted_at`, `declined_at`, `decline_reason`, `client_action_by` columns + migration
- [ ] Quote list page (filter tabs, inline Accept / Decline on `sent` rows)
- [ ] Quote detail page (status banners, expired-but-allowed logic, action modals)
- [ ] Accept / Decline server actions with ownership validation
- [ ] Quote action notification email to `salesRepEmail`

### Phase 4 — Statements, Credits & Profile (week 6)

- [ ] Account statement page (date range, ageing summary, PDF export)
- [ ] Credit notes list page (read-only)
- [ ] Profile page (read-only client details + sales rep contact)

### Phase 5 — Polish & Deploy (week 7)

- [ ] Mobile responsiveness audit across all pages
- [ ] Accessibility review (keyboard navigation, colour contrast, screen reader labels)
- [ ] Admin app: reset `clients.userId = null` on client email change (server action guard)
- [ ] End-to-end test with real client accounts on staging
- [ ] Update client-facing email templates and communications with portal URL

---

## 11. Decisions Log

All open questions from the initial draft have been resolved:

| Question                     | Decision                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Portal URL                   | `https://portal.playhousemedia.co.za`                                                |
| Monorepo folder name         | `apps/portal` (renamed from empty `apps/client`)                                     |
| Auth approach                | Separate `portalAuth` instance, shared database — two doors, one house               |
| Route protection file        | `proxy.ts` — Next.js v16+ replacement for deprecated `middleware.ts`                 |
| PDF delivery                 | Generated on demand from `packages/billing-pdf` — no file storage needed             |
| Quote expiry enforcement     | Show amber warning, allow accept/decline — no hard block                             |
| Decline reason               | Optional free-text field, stored as nullable `decline_reason`                        |
| Multiple contacts per client | Single registered email only in V1 — `client_contacts` table is V2                   |
| Quote notification routing   | `division_billing_settings.salesRepEmail`; fallback to `organisation_settings.email` |

---

## 12. Security Considerations

- **IDOR prevention:** Every query scopes by `clientId` resolved from `session.user.id` in `getPortalSessionOrRedirect()`, never from URL parameters alone. A wrong or guessed ID in the URL returns a 404.
- **Draft records hidden:** `draft` invoices and quotes are never returned in any portal query — filtered at the database layer.
- **Session isolation:** `portalAuth` uses `baseURL: 'https://portal.playhousemedia.co.za'` — cookie scope is entirely separate from the admin app. An admin session token cannot be used in the portal.
- **Magic link expiry:** Tokens expire after 24 hours.
- **Rate limiting:** The `/api/auth/` endpoints are rate-limited per IP address in `proxy.ts` (10 requests / 60 seconds) — same pattern as the admin app's `proxy.ts`. No additional config needed.
- **Inactive client blocking:** `getPortalSessionOrRedirect()` checks `clients.isActive` on every authenticated request. Deactivating a client in the admin app blocks their next portal request immediately — no manual session revocation needed.
- **Email change handling:** When a client's email is changed in the admin app, `clients.userId` is reset to `null`. The next magic link login re-establishes the link to the new email's user record.
- **Notification email safety:** Quote action notifications are sent server-side only. The client never influences the recipient address — it is always resolved from `division_billing_settings` or `organisation_settings`.
- **`proxy.ts` vs layout:** `proxy.ts` handles the fast cookie/session check and rate limiting at the edge. Business logic (`isActive`, `clientId` resolution) stays in the app layer (`getPortalSessionOrRedirect()`). This mirrors the admin app's architecture exactly and keeps the proxy lean and testable.

---

_Research sources: Invoice Ninja ([invoiceninja.com/client-portal](https://invoiceninja.com/client-portal/)), FreshBooks ([support.freshbooks.com](https://support.freshbooks.com/hc/en-us/articles/115011425548)), HoneyBook ([about.fast.io](https://about.fast.io/resources/honeybook-client-portal/)), QuickBooks Online, Dubsado, Xero — cross-referenced with the PMG Hub codebase and resolved decisions from design discussion on 2026-06-27._
