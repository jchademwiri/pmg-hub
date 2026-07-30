# Client Portal App Documentation (`apps/portal`)

This folder contains documentation scoped specifically to the **PMG Hub Client Portal Application** (`apps/portal`).

## Tech Stack & Architecture
- **Framework**: Next.js 16.2 (App Router with Turbopack)
- **Port**: `3001` (Dev mode)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI / Shadcn
- **Authentication**: Better Auth (`better-auth`)
- **Shared Packages**: `@pmg/db`, `@pmg/billing`, `@pmg/emails`, `@pmg/utils`

---

## Scoped Documentation & Specifications

### Specifications & Requirements (`/specifications`)
- [Client Portal Specification](./specifications/client-portal-spec.md) — Self-service client dashboard feature set and portal specifications.
- [Portal PRD](./specifications/prd.md) — Product Requirement Document for client access, invoice viewing, and project status tracking.
- [Portal Checklist](./specifications/checklist.md) — Launch readiness and security validation checklist.

### Portal Audits (`/audits`)
- [Portal Site Audit Report (July 2026)](./audits/portal-site-audit-2026-07-25.md) — Production build benchmark, 14 route verification, security scoping, and performance recommendations.
- [Client Forms Audit](./audits/client-forms-audit.md) — UX and validation audit for client onboarding and quote request forms.
