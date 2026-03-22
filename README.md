# Playhouse Media Group — Monorepo

Multi-app monorepo for [Playhouse Media Group](https://playhousemedia.co.za) and all its division websites. Built with Bun workspaces, Next.js, and Astro. Deployed on Vercel.

> **Current focus:** PMG hub + Tender Edge Solutions. All other apps added as each division launches.

---

## Apps

| App | Domain | Framework | Status |
|---|---|---|---|
| `Playhouse Media Group Hub` | playhousemedia.co.za | Next.js 16 | Building — trust hub + admin panel |
| `Tender Edge Solutions` | tenderedgesolutions.co.za | Astro 6 | Building — primary revenue site |
| `Apex Web Solutions` | apexwebsolutions.co.za | Astro 6 | Migrating from separate repo |
| `Jacob C` | jacobc.co.za | Astro 6 | Migrating + converting from Next.js |

**External — not in this monorepo:**

| Site | Domain | Notes |
|---|---|---|
| TenderTrack 360 | tendertrack360.co.za | Live SaaS product — stays in its own repo |

---

## Packages

| Package | Purpose |
|---|---|
| `@pmg/ui` | Shared shadcn/ui components (used by Next.js apps) |
| `@pmg/config` | Shared Tailwind base config, TypeScript base config, ESLint base config |
| `@pmg/lib` | Shared TypeScript types, utilities, WhatsApp link helpers |

---

## Stack

| Layer | Technology |
|---|---|
| Runtime & package manager | Bun |
| Hub + admin panel | Next.js 16 (App Router) |
| Division marketing sites | Astro 6 |
| Database | Neon DB (serverless PostgreSQL) + Drizzle ORM |
| File storage | Cloudflare R2 (zero egress fees) |
| Email | Resend + React Email |
| Email bot (future) | Chat SDK + @resend/chat-sdk-adapter |
| Authentication | Better Auth |
| API layer | Hono (mounted inside Next.js) |
| Hosting | Vercel (one team, all projects) |
| DNS + CDN | Cloudflare |
| UI components | shadcn/ui + Tailwind CSS |

---

## Framework Decision

```
Static marketing sites (Astro)        Dynamic apps with auth + DB (Next.js)
─────────────────────────────          ──────────────────────────────────────
Tender Edge Solutions                    Playhouse Media Group Hub
Apex Web Solutions                       ├── public site
Jacob C                                  ├── admin panel (/admin)
Launchpad SA (future)                    └── Hono API (/api)
Creative Studio (future)
StudyEdge (future)
```

Astro sites handle forms via Astro Actions — no Next.js needed for a contact form.

---

## Getting Started

```bash
# Install all workspaces
bun install

# Run individual apps
bun run dev           # pmg-hub (Next.js) → localhost:3000
bun run dev:tes       # tender-edge (Astro) → localhost:4321
bun run dev:apex      # apex-web (Astro)
bun run dev:jacobc    # jacobc (Astro)

# Build
bun run build         # pmg-hub
bun run build:tes     # tender-edge

# Type check all
bun run typecheck
```

---

## Repository Structure

```
playhousemedia/
│
├── apps/
│   ├── playhouse-media-group-hub/              # playhousemedia.co.za — Next.js
│   │   ├── src/
│   │   │   ├── app/           # All pages + components
│   │   │   │   ├── (public)/  # Public site — Home, About, Services, Contact
│   │   │   │   ├── (admin)/   # Admin panel — auth protected
│   │   │   │   └── api/       # Hono API routes
│   │   │   └── lib/
│   │   │       ├── db/        # Neon DB + Drizzle
│   │   │       ├── auth/      # Better Auth
│   │   │       ├── storage/   # Cloudflare R2
│   │   │       └── email/     # Resend + React Email templates
│   │
│   ├── tender-edge-solutions/          # tenderedgesolutions.co.za — Astro
│   │   └── src/
│   │       ├── pages/        # Home, Services, Portfolio, About, Contact
│   │       ├── actions/      # Astro Actions → PMG leads API
│   │       └── content/      # Portfolio case studies (MDX)
│   │
│   ├── apex-web-solutions/             # apexwebsolutions.co.za — Astro (migrating)
│   │   └── src/
│   │
│   └── jacobc/                         # jacobc.co.za — Astro (migrating + converting)
│       └── src/
│
└── packages/
    ├── ui/                   # Shared shadcn/ui components
    ├── config/               # Shared tailwind, tsconfig, eslint base configs
    └── lib/                  # Shared types, utils, WhatsApp utility
```

## Lead Flow

Every division site submits leads to the centralised PMG API — all leads land in one database and appear in the PMG admin panel regardless of which site collected them.

```
Division site form submit
        ↓
Astro Action → POST playhousemedia.co.za/api/leads
        ↓
Hono route → Neon DB (public.leads)
        ↓
Resend → auto-reply to visitor + notification to PMG
        ↓
Appears in playhousemedia.co.za/admin/leads
```

---

## Domain Strategy

| Domain | Status | Notes |
|---|---|---|
| playhousemedia.co.za | Primary | All new development |
| playhousemedia.net | Legacy | Permanent 301 → .co.za |
| tenderedgesolutions.co.za | Register now | Building TES |
| apexwebsolutions.co.za | Live | Migrate repo only |
| jacobc.co.za | Live | Migrate + convert to Astro |
| tendertrack360.co.za | Live — external | Stays independent |

---

## Environment Variables

Each app manages its own `.env.local`. Never commit env files.

**`apps/pmg-hub`** — needs: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `CF_ACCOUNT_ID`, `CF_R2_ACCESS_KEY`, `CF_R2_SECRET_KEY`, `CF_R2_BUCKET`, `NEXT_PUBLIC_WHATSAPP`

**`apps/tender-edge`** — needs: `PUBLIC_SITE_URL`, `PMG_LEADS_API`, `RESEND_API_KEY`, `BRAND_DOMAIN`, `BRAND_NOTIFY_EMAIL`, `PUBLIC_WHATSAPP`

See individual developer guides in `/developer-guides/` for full variable reference.

---

## Build Order

| Priority | App | Task |
|---|---|---|
| 1 | `pmg-hub` | Neon DB + Drizzle schema + Hono `POST /api/leads` |
| 2 | `pmg-hub` | Better Auth + login + admin leads table |
| 3 | `tender-edge` | Full site — 5 pages live |
| 4 | `pmg-hub` | Public site — Home, About, Services, Contact |
| 5 | `apex-web` | Migrate from separate repo |
| 6 | `jacobc` | Migrate + convert Next.js → Astro |
| 7 | `pmg-hub` | Admin full panel — clients, files, dashboard |

---

## Developer Guides

Detailed AI-assisted developer guides live in `/developer-guides/`:

| Guide | Contents |
|---|---|
| `01_PMG_Hub_Developer_Guide.md` | All pages, components, DB, Hono, Better Auth, admin panel |
| `02_TES_Developer_Guide.md` | All pages, Astro Actions, QuoteForm, deployment |
| `03_WhatsApp_Utility_Guide.md` | `packages/lib/whatsapp.ts` — all components and patterns |
| `04_ChatSDK_Email_Bot_Guide.md` | Future email bot — build after core is live |

---

## About PMG

Playhouse Media Group (PTY) Ltd is a South African multi-service business group based in Centurion, Gauteng — providing tender compliance, web development, company registrations, graphic design, and academic support through five specialist divisions.

*"Building Businesses. One Service at a Time."*

---

**Private repository — Playhouse Media Group (PTY) Ltd**  
Jacob Chademwiri · Centurion, Gauteng, South Africa  
info@playhousemedia.co.za