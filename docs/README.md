# PMG Hub Documentation Index

Welcome to the **PMG Hub** documentation directory. All system documentation, specifications, architecture guides, feature plans, audits, and research notes are organized into 8 primary categories.

---

## Directory Navigation

```
docs/
├── architecture/         # System design, database setup, CI/CD & SEO guidelines
├── audits/               # Codebase, UI/UX, security & database audit reports
├── business-profiles/    # Business plans, brand structure, handoffs & services
├── features/             # Feature documentation organized by product module
├── specifications/       # Formal Product Requirement Documents (PRDs) & specs
├── research/             # Accounting research, comparative analysis & UX studies
├── roadmap/              # Product roadmap & MVP execution plans
└── archive/              # Historical implementation plans, task lists & legacy notes
```

---

## 1. System Architecture (`/architecture`)

Core technical guides and setup documentation:
- [PMG Database Setup Guide](./architecture/pmg-db-setup-guide.md) — Neon DB configuration and schema setup.
- [DB Sync & CI/CD Migration](./architecture/db-sync-cicd.md) — GitHub Actions automated Drizzle migrations pipeline.
- [Cloudflare Data Backups](./architecture/cloudflare-data-backups.md) — Cloudflare R2 backup procedures.
- [PMG Financial Model](./architecture/pmg-financial-model.md) — Financial allocation and revenue distribution logic.
- [Route Grouping Plan](./architecture/route-grouping-plan.md) — App router structure and route definitions.
- [PMG SEO Guide](./architecture/pmg-seo-guide.md) — Search engine optimization standards and metadata guidelines.

---

## 2. Feature Modules (`/features`)

Documentation categorized by functional area:

### Billing & Accounting (`/features/billing-accounting`)
- [Phase 8 AR Journal Posting Plan](./features/billing-accounting/pmg-hub-phase8-ar-journal-posting-plan.md)
- [Finance & Billing Implementation Plan](./features/billing-accounting/finance/pmg-hub-finance-billing-accounting-implementation-plan-v2.md)
- [Revenue Received vs Invoiced Chart Plan](./features/billing-accounting/revenue-received-vs-invoiced-chart-plan.md)
- [Credit Apply Implementation Plan](./features/billing-accounting/credit-apply-implementation-plan.md)
- [Write-Off Plan](./features/billing-accounting/write-off/write-off-plan.md)

### Client Portal (`/features/client-portal`)
- [Client Portal Specification](./features/client-portal/client-portal-spec.md)
- [Portal Specification](./features/client-portal/portal-spec.md)
- [Portal PRD](./features/client-portal/prd.md)

### Scheduling & Projects (`/features/scheduling`)
- [Waterfall Auto-Schedule Spec](./features/scheduling/waterfall-auto-schedule-spec.md)
- [Scheduling PRD](./features/scheduling/client-portal-scheduling-prd.md)
- [Project Management Workflow](./features/scheduling/project-management/workflow-and-user-journey.md)

### Insights & Analytics (`/features/insights`)
- [Insights UI/UX Design](./features/insights/01-insights-ui-ux.md)
- [Snapshot Comparison Implementation](./features/insights/03-snapshot-comparison-implementation.md)

### Compliance Tracking (`/features/compliance-tracking`)
- [Compliance Tracking PRD](./features/compliance-tracking/01-compliance-tracking-prd.md)
- [Compliance Architecture & Schema](./features/compliance-tracking/02-architecture-and-schema.md)

---

## 3. Specifications & PRDs (`/specifications`)

- [PMG Billing System Specification](./specifications/pmg-billing-system-spec.md)
- [PMG Admin Specification](./specifications/pmg-admin-specification.md)
- [PMG Financial Statements PRD](./specifications/pmg-financial-statements.md)
- [Bot Protection PRD](./specifications/bot-protection-prd.md) & [Cloudflare Turnstile Guide](./specifications/cloudflare-turnstile-guide.md)
- [Financial Lock Grace Period PRD](./specifications/financial_lock_grace_period_prd.md)

---

## 4. Product Roadmap (`/roadmap`)

- [PMG Hub Product Roadmap](./roadmap/ROADMAP.md) — Strategic feature vision and milestones.
- [MVP v1 Readiness Assessment](./roadmap/pmg-mvp-v1-readiness.md) — Pre-launch checklist and platform readiness.
- [Master Execution Plan](./roadmap/master-execution-plan.md) — Prioritized implementation tasks.

---

## 5. Audits & Reports (`/audits`)

- [Full Portfolio Audit (July 2026)](./audits/full-portfolio-audit-2026-07-25.md)
- [PMG Hub Admin UX Audit](./audits/pmg-hub-admin-ux-audit.md)
- [Database Audit Report](./audits/database-audit/database_audit_report.md)
- [Shadcn UI Audit](./audits/shadcn-audit.md)
- [Final Audit Summary](./audits/final-audit/README.md)

---

## 6. Business Profiles & Strategy (`/business-profiles`)

- [PMG Business Plan (Markdown)](./business-profiles/PMG_Business_Plan_Final.md)
- [PMG Brand Structure](./business-profiles/playhouse_media_group_business_plan_brand_structure.md)
- [PMG Handoff Summary](./business-profiles/PMG_Handoff_Summary.md)

---

## 7. Research & Gap Analysis (`/research`)

- [Accounting System Audit & Roadmap](./research/accounting-system/01-pmg-manual-bookkeeping-mvp-audit.md)
- [Invoice & Quote UX Research](./research/ux-research/invoice-quote-ux-research.md)

---

## 8. Archive (`/archive`)

Historical artifacts, completed task lists, and past phase plans:
- [`/archive/implementation-plans`](./archive/implementation-plans/) — Completed feature implementation plans.
- [`/archive/summaries-and-notes`](./archive/summaries-and-notes/) — Legacy daily session summaries and prompt notes.
- [`/archive/july-2026`](./archive/july-2026/) — Previous sprint execution notes.

---

## Documentation Standards

When adding or updating documentation:
1. **Location**: Place new technical specs in `specifications/`, feature guides in `features/<module>`, architecture plans in `architecture/`, and research notes in `research/`.
2. **Index**: Update this `README.md` with links to newly created high-level documentation.
3. **Format**: Use Standard GitHub-Flavored Markdown with standard code block highlighting and descriptive headings.
