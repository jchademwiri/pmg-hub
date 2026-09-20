---
title: "Modern Fullstack SaaS Playbook: Turborepo, Next.js, and Postgres at Scale"
description: "Inside the PMG Hub engineering architecture: type-safe monorepos, multi-tenant databases, server actions, and automated CI/CD pipelines."
publishedAt: 2026-09-12
author: "Apex Web Solutions Team"
draft: false
tags:
  - "SaaS"
  - "Cloud Architecture"
  - "Next.js"
  - "Turborepo"
---

Building scalable modern web applications requires a robust balance between developer velocity and bulletproof architectural integrity. Inside the **PMG Hub** monorepo—which powers operations across multiple business divisions, accounting systems, and marketing portals—we engineered an architecture designed to eliminate code duplication and type drift.

Here is an architectural tour of our production SaaS foundation built with **Turborepo**, **Next.js**, **Drizzle ORM**, and **PostgreSQL**.

---

## 1. Monorepo Organization with Turborepo

Managing multiple web apps alongside shared business logic within separate repositories quickly leads to dependency hell and out-of-sync API contracts.

```
pmg-hub/
├── apps/
│   ├── admin/       # Next.js ERP & Financial Platform
│   ├── portal/      # Client Billing & Onboarding Portal
│   ├── aws/         # Apex Web Solutions Website (Astro)
│   ├── tes/         # TenderEdge Solutions Website (Astro)
│   └── pmg/         # Playhouse Media Group Website (Astro)
└── packages/
    ├── db/          # Drizzle ORM schemas & queries
    ├── emails/      # React Email templates & Resend
    ├── billing/     # PDF engine, tax calculations & ZAR formatting
    └── ui/          # Shared design system components
```

### Why This Architecture Scales

- **Atomic Type Safety**: A schema migration in `packages/db` immediately reflects across all frontend and backend applications without manual code generation.
- **Computation Caching**: Turborepo caches linting, test runs, and static builds. Unaffected applications are skipped in CI/CD, reducing deployment times to under two minutes.

---

## 2. Server Actions and Type-Safe Data Mutations

With Next.js App Router, we transitioned away from handwritten REST endpoints toward type-safe Server Actions paired with Zod schemas:

- **Direct Database Access**: Server Actions run in an isolated Node.js environment with direct pooled connections to PostgreSQL.
- **Colocated Validation**: Input data is validated at runtime before touching database transactions.
- **Optimistic UI Updates**: Client components update instantly while transitions process in the background.

---

## 3. Database Integrity & Strict Financial Rules

For enterprise billing and financial systems, data consistency is paramount:

1. **Foreign Key Constraints & Cascade Prevention**: Deletions of divisions or clients with active ledger balances are strictly blocked at both the schema and action levels.
2. **Double-Entry Journal Balancing**: Every invoice issuance or expense payment automatically verifies that debits equal credits before committing transactions.
3. **Period Locking**: Closed financial periods cannot be altered or deleted, maintaining audit compliance with South African accounting standards.

By investing in clean monorepo architecture and robust database invariants, SaaS teams can ship features rapidly without sacrificing production stability.
