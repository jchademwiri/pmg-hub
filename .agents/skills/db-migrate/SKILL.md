---
name: db-migrate
description: |
  Safe Drizzle database schema change, RLS verification, and migration generation workflow. Use when user says "/db-migrate", "db-migrate", "generate migration", "migrate db", or "schema migration".
metadata:
  author: custom
  version: '1.0.0'
---

# DB Migrate (Schema, RLS & Migration Gate)

Audits Drizzle schema changes in `packages/db`, verifies Row-Level Security (RLS) and foreign key indexes, generates migrations safely, and runs `@pmg/db` test suites.

## Steps

### 1. Audit Schema Diff

Inspect changes in `packages/db/src/schema/`:

```bash
git diff packages/db/src/schema/
```

Verify every new or modified table meets these invariants:
- **Row-Level Security (RLS)**: Any table storing client-scoped data includes `clientId` and has matching RLS policies configured for `withClientContext` (`app.current_client_id`, `app.is_client_mode`) and `withAdminContext` (`app.is_admin`).
- **Foreign Keys & Indexes**: All foreign key columns and high-cardinality filter columns (`clientId`, `divisionId`, `period`, `status`, `date`) are indexed.
- **Exports**: New tables and types are exported from `packages/db/src/schema/index.ts` and `packages/db/src/index.ts`.

### 2. Generate Drizzle Migration

```bash
bun --filter @pmg/db db:generate
```

### 3. Inspect Generated SQL for Destructive Operations

Read the newly generated `.sql` file in `packages/db/drizzle/` (or migrations folder) and check for:
- `DROP TABLE` or `DROP COLUMN` (confirm with user before proceeding if present).
- `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a `DEFAULT` on populated tables.
- Missing RLS `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` statements when required.

### 4. Validate Database & RLS Tests

```bash
bun --filter @pmg/db test
bun run check-types
```

All tests in `@pmg/db` (including `schema.test.ts`, `rls.test.ts`, and `queries.test.ts`) and workspace typechecks must pass with 0 errors.

### 5. Summary & Next Step Guidance

```
🗄️ Database Migration Verified:
- Migration file: <path>
- Destructive check: Clean
- RLS & @pmg/db tests: Passing

👉 Next Step: Run `/bug-hunter` or `/ship` to commit and push your schema changes to dev.
```
