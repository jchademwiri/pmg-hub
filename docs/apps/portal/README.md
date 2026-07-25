# Client Portal App Documentation (`apps/portal`)

This folder contains documentation scoped specifically to the **PMG Hub Client Portal Application** (`apps/portal`).

## Tech Stack & Architecture
- **Framework**: Next.js 16 (App Router)
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
- [Client Forms Audit](./audits/client-forms-audit.md) — UX and validation audit for client onboarding and quote request forms.
