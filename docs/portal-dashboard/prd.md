# PMG Client Portal — Product Requirements Document (PRD)

## 1. Overview & Objectives
The **PMG Client Portal** is a dedicated, authenticated self-service portal for PMG's clients. It enables clients to view their billing history, download invoices/statements, and accept or decline quotes.

### Key Goals
1. **Self-Service**: Reduce administrative overhead by allowing clients to download their billing documents (invoices, statements, credit notes) on demand.
2. **Interactive Quotes**: Speed up sales cycles by enabling clients to accept or decline quotes directly in the portal.
3. **Seamless Authentication**: Implement a secure, passwordless magic-link login flow leveraging the existing Better Auth database schema.
4. **Data Isolation**: Ensure strict data access control (IDOR prevention) where clients can only see records belonging to their account.

---

## 2. Scope of Work (V1)

### In-Scope
* **Authentication**: Passwordless login via magic links (and email OTP fallback).
* **Dashboard**: Key billing metrics (total invoiced, amount paid, outstanding balance, pending quotes) and recent activity.
* **Invoices**: Searchable list and detail views of all non-draft invoices, with on-demand PDF generation.
* **Quotes**: List and detail views, with the ability to "Accept" or "Decline" (with optional reason) pending quotes.
* **Account Statements**: On-demand statement generation with a date-range picker and ageing summary (Current, 30, 60, 90+ days).
* **Credit Notes**: List of credits on account.
* **Client Profile**: View contact details on file.

### Out of Scope (V1)
* Online payment gateway integration (payments remain offline/EFT).
* File uploads by clients.
* Client-to-admin messaging or comments.
* Managing multiple contacts per client (V1 is limited to the primary email on the client record).

---

## 3. Architecture & Monorepo Integration

### Monorepo Placement
The portal is scaffolded as a separate Next.js application at [apps/portal](file:///D:/websites/pmg-hub/apps/portal).

### Shared Dependencies
The portal leverages existing shared packages in the monorepo:
* **`@pmg/db`**: Reuses the shared PostgreSQL database, Drizzle schemas, and query helpers.
* **`@pmg/ui`**: Shared shadcn/ui design tokens and components.
* **`@pmg/emails`**: Reuses the `MagicLinkEmail` template with portal-specific copy.
* **`packages/billing-pdf`** (to be extracted): Shared PDF generation logic.

### Authentication Design ("Two Doors, One House")
The portal uses its own Better Auth instance (`portalAuth`) configured with `baseURL: 'https://portal.playhousemedia.co.za'`. This keeps the session cookies isolated from the admin app while sharing the same underlying database tables (`user`, `session`, etc.).

---

## 4. Page Specifications & Routes

### Public Routes
* **`/login`**: Magic link request form.
* **`/login/verify`**: Better Auth magic-link callback handler.

### Authenticated Routes (under `(portal)` layout)
* **`/dashboard`**: Summary cards + latest 5 invoices + latest 3 quotes.
* **`/invoices`**: Filterable list (All / Unpaid / Paid / Overdue).
* **`/invoices/[id]`**: Line items, payment history, EFT banking details, and PDF download.
* **`/quotes`**: Filterable list of sent and responded quotes.
* **`/quotes/[id]`**: Detail view with status banners and "Accept / Decline" action bar.
* **`/statements`**: Statement table and ageing summary with PDF export.
* **`/credits`**: Read-only credit notes list.
* **`/profile`**: Client details and assigned sales representative contact info.

---

## 5. Security & Access Control
* **IDOR Prevention**: The `clientId` is resolved server-side from the authenticated session (`session.user.id → clients.userId`). No URL parameters are trusted for data fetching.
* **Draft Filter**: `draft` status invoices and quotes are filtered out at the database layer.
* **Deactivation Guard**: If a client is marked inactive (`isActive = false`) in the admin app, their portal session is rejected immediately on the next request.
* **Rate Limiting**: Auth endpoints are rate-limited per IP address in [proxy.ts](file:///D:/websites/pmg-hub/apps/portal/src/proxy.ts) (10 requests / 60 seconds).
