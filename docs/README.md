# PMG Hub Monorepo Documentation Index

Welcome to the **PMG Hub** documentation repository. Documentation is organized into **App-Scoped**, **Package-Scoped**, **Cross-Cutting Architecture**, and **Product Roadmap** sections.

---

## Monorepo Documentation Overview

```
docs/
├── apps/                 # Documentation scoped by application
│   ├── admin/           # PMG Hub Admin Dashboard (Next.js)
│   ├── portal/          # Client Self-Service Portal (Next.js)
│   ├── pmg/             # Playhouse Media Group Marketing Site (Astro)
│   ├── tes/             # Technical Event Services Site (Astro)
│   └── aws/             # AWS Marketing & Email Integration Site (Astro)
├── packages/             # Documentation scoped by shared workspace package
│   ├── db/              # Database schema, Neon setup, migrations & CI/CD
│   ├── billing/         # Shared billing calculation engine
│   ├── emails/          # Email templates & Resend API delivery
│   └── ui/              # Shared UI design system & Shadcn components
├── architecture/         # Cross-cutting system architecture & cloud infrastructure
├── specifications/       # System-wide PRDs & technical standards
├── research/             # Comparative analysis & UX research
├── roadmap/              # Product roadmap & launch readiness
└── archive/              # Historical implementation plans & past sprint notes
```

---

## 1. App-Scoped Documentation (`/apps`)

### 🛠️ [Admin Dashboard (`/apps/admin`)](./apps/admin/README.md)

Next.js 16 Admin Dashboard covering double-entry accounting, client management, automated scheduling, compliance tracking, and insights.

- [Admin Specification](./apps/admin/specifications/pmg-admin-specification.md)
- [Billing & Accounting Specs](./apps/admin/billing-accounting/)
- [Scheduling & Project Specs](./apps/admin/scheduling/)
- [Insights & Snapshot Cockpit](./apps/admin/insights/)
- [Compliance Tracking PRD](./apps/admin/compliance-tracking/)

### 👤 [Client Portal (`/apps/portal`)](./apps/portal/README.md)

Next.js 16 Client Portal for self-service quote viewing, invoice management, and project status tracking.

- [Client Portal Specification](./apps/portal/specifications/client-portal-spec.md)
- [Portal PRD & Checklist](./apps/portal/specifications/prd.md)

### 🚀 [PMG Marketing Site (`/apps/pmg`)](./apps/pmg/README.md)

Astro 6 Agency site for Playhouse Media Group.

- [PMG Business Plan](./apps/pmg/business-plan.md)
- [Brand Structure & Sub-Brands](./apps/pmg/brand-structure.md)
- [Services Catalog](./apps/pmg/services/)

### 🎪 [TES Marketing Site (`/apps/tes`)](./apps/tes/README.md)

Astro 6 site for Technical Event Services & Tender Edge Solutions.

- [TES Brand Profile](./apps/tes/profile/02_Tender_Edge_Solutions.md)
- [TES Technical Audit Report](./apps/tes/audits/tes-site-audit.md)

### ☁️ [AWS Service Site (`/apps/aws`)](./apps/aws/README.md)

Astro 6 marketing site & email workflow system.

- [SEO & Lighthouse Audit Report](./apps/aws/audits/seo-audit.md)

---

## 2. Package-Scoped Documentation (`/packages`)

- 🗄️ [Database Package (`@pmg/db`)](./packages/db/README.md) — Neon DB setup, Drizzle ORM schema, and GitHub Actions migration pipeline.
- 💳 [Billing Package (`@pmg/billing`)](./packages/billing/billing-system-spec.md) — Shared calculation algorithms and billing logic.
- ✉️ [Emails Package (`@pmg/emails`)](./packages/emails/invoice-email-delivery-plan.md) — React Email templates and Resend delivery pipeline.
- 🎨 [UI Package (`@pmg/ui`)](./packages/ui/shadcn-audit.md) — Design system and Shadcn component audit.

---

## 3. Cross-Cutting Architecture (`/architecture`)

- [PMG Financial Allocation Model](./architecture/pmg-financial-model.md) — Multi-divisional profit distribution model.
- [Route Grouping & Navigation Plan](./architecture/pmg-hub-overview-nav-items.md) — Shared app navigation structure.
- [Cloudflare Data Backups](./architecture/cloudflare-data-backups.md) — Database R2 backup guidelines.
- [PMG SEO Guide](./architecture/pmg-seo-guide.md) — Search engine optimization standards across all sites.

---

## 4. Product Roadmap & Strategic Vision (`/roadmap`)

- [PMG Hub Product Roadmap](./roadmap/ROADMAP.md) — Strategic feature milestones.
- [MVP v1 Readiness Assessment](./roadmap/pmg-mvp-v1-readiness.md) — Pre-launch checklist.
- [Master Execution Plan](./roadmap/master-execution-plan.md) — Implementation priority schedule.

---

## 5. Research & Archive (`/research` & `/archive`)

- [Accounting System Audit & Gap Analysis](./research/accounting-system/01-pmg-manual-bookkeeping-mvp-audit.md)
- [Invoice & Quote UX Research](./research/ux-research/invoice-quote-ux-research.md)
- [Historical Implementation Plans & Notes](./archive/)

---

## Documentation Guidelines

When creating documentation in this repository:

1. **App Specific**: Place documentation for features, UI, or workflows specific to one app inside `docs/apps/<app-name>/`.
2. **Package Specific**: Place documentation for shared modules, database, or UI libraries inside `docs/packages/<package-name>/`.
3. **Cross-Cutting**: Place system-wide architectural specifications inside `docs/architecture/` or `docs/specifications/`.
4. **App Readme**: Always maintain the `README.md` inside each app folder to reflect new features and specs.
