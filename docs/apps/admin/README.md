# Admin App Documentation (`apps/admin`)

This folder contains documentation scoped specifically to the **PMG Hub Admin Dashboard Application** (`apps/admin`).

## Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Authentication**: Better Auth (`better-auth`)
- **State & Database**: Drizzle ORM + Neon PostgreSQL (`@pmg/db`)
- **Billing Engine**: `@pmg/billing`
- **Email Delivery**: `@pmg/emails` (Resend API)

---

## Scoped Modules & Documentation

### 1. Specifications & Architecture

- [Admin App Specification](./specifications/pmg-admin-specification.md) — Comprehensive technical overview of the Admin application.

### 2. Billing & Accounting Module (`/billing-accounting`)

- [Phase 8 AR Journal Posting Plan](./billing-accounting/pmg-hub-phase8-ar-journal-posting-plan.md) — Accounts Receivable journal posting workflows.
- [Finance & Billing Implementation Plan](./billing-accounting/finance/pmg-hub-finance-billing-accounting-implementation-plan-v2.md) — Double-entry accounting & finance setup.
- [Revenue Received vs Invoiced Chart Plan](./billing-accounting/revenue-received-vs-invoiced-chart-plan.md) — Dashboard revenue analytics.
- [Credit Apply Implementation Plan](./billing-accounting/credit-apply-implementation-plan.md) — Credit note workflows.
- [Write-Off Plan](./billing-accounting/write-off/write-off-plan.md) — Bad debt write-off process.

### 3. Scheduling & Project Management (`/scheduling`)

- [Waterfall Auto-Schedule Spec](./scheduling/waterfall-auto-schedule-spec.md) — Automated milestone scheduling algorithms.
- [Project Management Workflow](./scheduling/project-management/workflow-and-user-journey.md) — Tender to project tracking.

### 4. Insights & Analytics (`/insights`)

- [Insights UI/UX Design](./insights/01-insights-ui-ux.md) — Financial snapshots & analytics cockpit design.
- [Snapshot Comparison Implementation](./insights/03-snapshot-comparison-implementation.md) — Period-over-period snapshot engine.

### 5. Compliance Tracking (`/compliance-tracking`)

- [Compliance Tracking PRD](./compliance-tracking/01-compliance-tracking-prd.md) — Vendor & compliance document verification.
- [Compliance Architecture & Schema](./compliance-tracking/02-architecture-and-schema.md) — Data schema for compliance state machine.

### 6. App Audits & Tech Debt (`/audits`)

- [Admin Site Audit](./audits/admin-site-audit.md) — Performance & architectural recommendations.
- [Admin UX Audit & Code Comparison](./audits/pmg-hub-admin-ux-audit-code-comparison-report.md) — UI/UX audit vs production components.
