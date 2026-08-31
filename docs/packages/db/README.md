# Database Package Documentation (`packages/db`)

This folder contains documentation scoped specifically to the shared database package (`packages/db`).

## Tech Stack & Architecture

- **ORM**: Drizzle ORM
- **Database Engine**: Neon PostgreSQL (Serverless branching)
- **Environments**:
  - `dev` branch $\rightarrow$ Neon Staging DB
  - `master` branch $\rightarrow$ Neon Production DB

---

## Scoped Documentation

- [PMG Database Setup Guide](./setup-guide.md) — Database credentials, schema setup, and local environment guidelines.
- [Drizzle Migration & CI/CD Pipeline](./db-sync-cicd.md) — GitHub Actions automated migration workflow on push.
- [Database Audit Report](./audits/database_audit_report.md) — Schema audit, index optimizations, and double-entry balance verification.
