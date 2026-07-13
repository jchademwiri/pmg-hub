# PMG Hub — Admin

Internal operations console for Playhouse Media Group (PMG): billing/AR, accounting, project coordination, and client relationships across PMG's divisions (Apex Web Solutions, TenderEdge Solutions, PMG Services).

Part of the `pmg-hub` Turborepo monorepo. This app lives at `apps/admin`.

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui
- **Database:** Neon Postgres via `@pmg/db` (Drizzle ORM)
- **Auth:** Better Auth (magic link + OTP)
- **Email:** Resend, via `@pmg/emails`
- **Charts:** Recharts
- **PDF export:** jsPDF + html2canvas-pro
- **Rate limiting:** Upstash Redis
- **Testing:** Vitest + Testing Library + fast-check (property-based tests)

## Modules

Route groups under `src/app/(admin)`, mirrored in the sidebar config at `src/components/navigation/nav-data.ts`.

| Module | Routes | What it does |
|---|---|---|
| **Dashboard** | `/dashboard` | Landing overview after login. |
| **Billing** | `/billing/*` | Quote-to-cash: accounts, quotations, invoices, payments, credits, statements, aging report, billable items catalogue. |
| **Projects** | `/projects/*` | Project coordination: schedule list and timeline views. |
| **Finance** | `/finance/*` | Income, expenses, expense categories, distributions/allocations. |
| **Accounting** | `/accounting/*` | Double-entry engine: chart of accounts, journals, general ledger, trial balance, profit & loss, period locking, exports. |
| **Relationships** | `/relationships/*` | CRM: clients, leads, PMG divisions. |
| **Insights** | `/insights/*` | Snapshots, reports, business analysis. |
| **System** | `/settings/*` | Users (with invite flow), organisation profile, subscription/billing plan, security, data & exports. |

To add, remove, or rename a route, edit `src/components/navigation/nav-data.ts` — it's the single source of truth for both the sidebar and breadcrumb labels.

## Getting started

From the monorepo root (uses Bun):

```bash
bun install
cp .env.example .env.local        # shared vars — DB, Resend keys, Turnstile, R2
cp apps/admin/.env.example apps/admin/.env.local   # app-specific vars, if present
bun run db:migrate                 # apply schema via @pmg/db
bun run dev                        # runs turbo: dev + db:studio + email:dev
```

Or scoped to just this app:

```bash
cd apps/admin
bun dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Other useful commands

```bash
bun run lint            # eslint
bun run check-types     # tsc across the monorepo
cd apps/admin && bun test          # vitest run
cd apps/admin && bun test:watch    # vitest watch mode
```

## Project structure

```text
apps/admin/
├── src/
│   ├── app/
│   │   ├── (admin)/        # authenticated route groups — see Modules table above
│   │   ├── (auth)/         # login / magic-link flow
│   │   ├── actions/        # server actions
│   │   └── api/            # route handlers (cron, webhooks, etc.)
│   ├── components/         # one folder per module (billing, projects, ledger, etc.) + shared ui/
│   ├── lib/                 # accounting engine, billing helpers, auth config, PDF/export utilities
│   └── __tests__/           # unit, component, and property-based tests
```

## Environment variables

Shared across the monorepo (see root `.env.example`):

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED` — Neon Postgres
- `PMG_RESEND_API_KEY` / `TES_RESEND_API_KEY` / `AWS_RESEND_API_KEY` — per-brand email sending
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` — bot protection
- `CLOUDFLARE_R2_*` — database export/backup storage
- `IMPERSONATION_SHARED_SECRET` — admin user impersonation

## Notes

- Financial figures flow through the `accounting` module (source of truth: journals → ledger → trial balance → P&L). Voided journal entries are filtered at the query level — see `src/lib/financial.ts` if touching trial balance logic.
- Billing aging buckets: Current, 1–30, 31–60, 61–90, 91–120 days (`src/lib/billing-ageing.ts`).
- This app shares its database and email packages (`@pmg/db`, `@pmg/emails`, `@pmg/billing`) with the other apps in the monorepo (`portal`, `pmg`, `aws`, `tes`) — schema or email-template changes here can affect those apps too.
