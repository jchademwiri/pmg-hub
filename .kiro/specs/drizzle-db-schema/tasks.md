# Implementation Plan: drizzle-db-schema

## Overview

Establish a domain-oriented schema layer in `packages/db` using Drizzle ORM + Neon HTTP. Tasks follow FK dependency order: cleanup → new schema files → barrel index → queries → seed → migration → tests → verification.

## Tasks

- [x] 1. Cleanup: delete obsolete schema files and rewrite aws.ts
  - [x] 1.1 Delete `src/schema/tes.ts` and `src/schema/pmg.ts`
    - Remove both files entirely; they are superseded by the unified `leads` table
    - _Requirements: 5.1_

  - [x] 1.2 Rewrite `src/schema/aws.ts` to keep pricing only
    - Retain `awsPackageTypeEnum`, `awsPricing`, `AwsPricing`, `NewAwsPricing`
    - Remove `awsMessageStatusEnum`, `awsBookingStatusEnum`, `awsMessages`, `awsBookings`
    - _Requirements: 11.1, 11.4_

- [x] 2. Create `src/schema/divisions.ts`
  - Define `divisions` table: `id` (uuid PK defaultRandom), `name` (text NOT NULL UNIQUE), `createdAt` (timestamptz defaultNow), `updatedAt` (timestamptz nullable)
  - Add code comment above `updatedAt` documenting the application-layer tradeoff (Req 9.11)
  - Add `divisions_name_idx` index on `name`
  - Export `Division` and `NewDivision` inferred types immediately after the table definition
  - Export `divisionsRelations` declaring hasMany income, expenses, and leads
  - _Requirements: 2.1–2.8, 6.4, 11.1–11.4, 12.4–12.5, 12.8_

  - [ ]* 2.1 Write property test for barrel index completeness (Property 1)
    - **Property 1: Barrel index completeness**
    - **Validates: Requirements 7.2, 7.3**
    - Generate random symbol names from each domain module; verify all are present in barrel index exports

- [x] 3. Create `src/schema/clients.ts`
  - Define `clients` table: `id` (uuid PK), `name` (text NOT NULL), `businessName` (text nullable), `email` (text nullable), `phone` (text nullable), `createdAt` (timestamptz), `updatedAt` (timestamptz nullable)
  - Add code comment above `updatedAt` documenting the application-layer tradeoff
  - Add `clients_name_idx` index on `name`; partial unique index on `email WHERE email IS NOT NULL`
  - Export `Client` and `NewClient` inferred types
  - Export `clientsRelations` declaring hasMany income
  - _Requirements: 3a.1–3a.11, 6.5, 11.1–11.4, 12.4–12.5, 12.10_

  - [ ]* 3.1 Write property test for clients email partial unique constraint (Property 8)
    - **Property 8: Clients email partial unique constraint**
    - **Validates: Requirements 3a.11**
    - Generate two clients with the same non-null email; verify second insert throws a unique constraint error

- [x] 4. Create `src/schema/income.ts`
  - Define `income` table: `id` (uuid PK), `date` (date NOT NULL, no default), `divisionId` (uuid NOT NULL FK→divisions.id onDelete:restrict), `clientId` (uuid nullable FK→clients.id onDelete:set null), `description` (text nullable), `amount` (numeric(12,2) NOT NULL), `createdAt` (timestamptz), `updatedAt` (timestamptz nullable)
  - Add inline comment on `divisionId`: `// restrict: prevent division deletion while financial records exist`
  - Add code comment above `updatedAt` documenting the application-layer tradeoff
  - Add CHECK constraint `amount > 0`
  - Add indexes: `income_date_idx`, `income_division_id_idx`, `income_client_id_idx`
  - Export `Income` and `NewIncome` inferred types
  - Export `incomeRelations` declaring belongsTo divisions and belongsTo clients (optional)
  - _Requirements: 3.1–3.14, 6.1–6.2, 11.1–11.4, 12.1, 12.4–12.6, 12.10_

  - [ ]* 4.1 Write property test for positive amount enforcement (Property 2)
    - **Property 2: Positive amount enforcement**
    - **Validates: Requirements 3.10, 4.10, 2.8**
    - Generate random amounts ≤ 0; verify insert throws a check constraint error and record is not persisted

  - [ ]* 4.2 Write property test for foreign key violation propagation (Property 3)
    - **Property 3: Foreign key violation propagation**
    - **Validates: Requirements 3.13, 3.14, 4.13, 2.8**
    - Generate random UUIDs not present in parent tables; verify FK insert throws a referential integrity error

- [x] 5. Create `src/schema/expenses.ts`
  - Define `expenses` table: `id` (uuid PK), `date` (date NOT NULL, no default), `divisionId` (uuid NOT NULL FK→divisions.id onDelete:restrict), `category` (text NOT NULL), `description` (text nullable), `amount` (numeric(12,2) NOT NULL), `createdAt` (timestamptz), `updatedAt` (timestamptz nullable)
  - Add inline comment on `divisionId`: `// restrict: prevent division deletion while financial records exist`
  - Add code comment above `updatedAt` documenting the application-layer tradeoff
  - Add CHECK constraint `amount > 0`
  - Add indexes: `expenses_date_idx`, `expenses_division_id_idx`, `expenses_category_idx`
  - Export `Expense` and `NewExpense` inferred types
  - Export `expensesRelations` declaring belongsTo divisions
  - _Requirements: 4.1–4.13, 6.3, 11.1–11.4, 12.1, 12.4–12.6, 12.10_

- [x] 6. Create `src/schema/leads.ts`
  - Define `leadStatusEnum` pgEnum with values `["new", "contacted", "converted", "lost"]`
  - Define `leads` table: `id` (uuid PK), `name` (text nullable), `email` (text nullable), `phone` (text nullable), `message` (text nullable), `source` (text nullable), `serviceInterest` (text nullable), `status` (leadStatusEnum NOT NULL default "new"), `divisionId` (uuid nullable FK→divisions.id onDelete:set null), `createdAt` (timestamptz), `updatedAt` (timestamptz nullable)
  - Add inline comment on `divisionId`: `// set null: leads are soft-linked; division deletion should not block or cascade`
  - Add code comment above `updatedAt` documenting the application-layer tradeoff
  - Add CHECK constraint `(email IS NOT NULL OR phone IS NOT NULL)`
  - Add indexes: `leads_status_idx`, `leads_created_at_idx`, `leads_email_idx`, `leads_division_id_idx`
  - Add partial unique index on `email WHERE email IS NOT NULL`; partial unique index on `phone WHERE phone IS NOT NULL`
  - Export `leadStatusEnum`, `Lead`, and `NewLead` inferred types
  - Export `leadsRelations` declaring belongsTo divisions (optional)
  - _Requirements: 5.1–5.18, 6.6, 11.1–11.4, 12.4–12.5, 12.9–12.10_

  - [ ]* 6.1 Write property test for leads email partial unique constraint (Property 13)
    - **Property 13: Leads email partial unique constraint**
    - **Validates: Requirements 5.18**
    - Generate two leads with the same non-null email; verify second insert throws a unique constraint error

  - [ ]* 6.2 Write property test for leads phone partial unique constraint (Property 12)
    - **Property 12: Leads phone partial unique constraint**
    - **Validates: Requirements 5.17**
    - Generate two leads with the same non-null phone; verify second insert throws a unique constraint error

  - [ ]* 6.3 Write property test for leads email normalization (Property 9)
    - **Property 9: Leads email normalization**
    - **Validates: Requirements 5.16**
    - Generate leads with mixed-case emails; verify stored email equals the lowercased input

- [x] 7. Rewrite `src/schema/index.ts` barrel
  - Replace contents with `export * from` for each of: `./aws`, `./divisions`, `./clients`, `./income`, `./expenses`, `./leads`
  - Confirm `tes.ts` and `pmg.ts` are no longer referenced
  - _Requirements: 7.1–7.3, 6.7_

- [x] 8. Create `src/queries.ts`
  - Implement `getTotalRevenue(): Promise<number>` — `coalesce(sum(income.amount), 0)`, cast to number
  - Implement `getTotalExpenses(): Promise<number>` — `coalesce(sum(expenses.amount), 0)`, cast to number
  - Implement `getRevenueByDivision(): Promise<{ divisionName: string; total: number }[]>` — join income+divisions, group by division name, order DESC
  - Implement `getExpensesByDivision(): Promise<{ divisionName: string; total: number }[]>` — join expenses+divisions, group by division name, order DESC
  - Implement `getLeadsByStatus(): Promise<{ status: string; count: number }[]>` — group leads by status, order DESC
  - All numeric driver values explicitly cast to `number` before returning
  - _Requirements: 10.1–10.10, 12.2–12.3_

  - [ ]* 8.1 Write property test for total aggregation correctness (Property 4)
    - **Property 4: Total aggregation correctness**
    - **Validates: Requirements 10.2, 10.3, 10.7**
    - Generate random arrays of positive amounts; verify sum matches `getTotalRevenue` / `getTotalExpenses`; verify empty tables return `0`

  - [ ]* 8.2 Write property test for grouped aggregation correctness (Property 5)
    - **Property 5: Grouped aggregation correctness**
    - **Validates: Requirements 10.4, 10.5, 10.7**
    - Generate random income/expense records across divisions; verify per-division sums match; verify empty tables return `[]`

  - [ ]* 8.3 Write property test for lead status count correctness (Property 6)
    - **Property 6: Lead status count correctness**
    - **Validates: Requirements 10.6, 10.7**
    - Generate random leads across status values; verify per-status counts match; verify empty table returns `[]`

  - [ ]* 8.4 Write property test for grouped query result ordering (Property 11)
    - **Property 11: Grouped query result ordering**
    - **Validates: Requirements 10.10**
    - Generate non-empty result sets; verify first element has the highest total/count value

- [x] 9. Checkpoint — ensure schema and queries compile
  - Ensure all TypeScript types resolve without errors, ask the user if questions arise.

- [x] 10. Rewrite `src/seed.ts`
  - Preserve Block 1 (aws_pricing) exactly as-is using `.onConflictDoNothing()`
  - Add Block 2 wrapped in `db.transaction()`:
    - Insert 2 divisions (`TES`, `AWS`) — query by name first, skip if exists
    - Insert 2–3 clients — query by name first, skip if exists
    - Insert 3 income records referencing seeded divisions and clients — deterministic check before inserting
    - Insert 3 expense records referencing seeded divisions — deterministic check before inserting
    - Insert 3 lead records — check by email or phone before inserting; normalize email to lowercase before insert
  - Block 2 failure rolls back entirely; Block 1 is unaffected
  - Add `db:seed` script to `package.json`: `"db:seed": "bun src/seed.ts"`
  - _Requirements: 9.1–9.11_

  - [ ]* 10.1 Write property test for seed idempotency (Property 7)
    - **Property 7: Seed idempotency**
    - **Validates: Requirements 9.7, 9.9**
    - Run seed twice against a test DB; verify row counts for all 5 tables are identical after both runs

  - [ ]* 10.2 Write property test for seed transaction atomicity (Property 10)
    - **Property 10: Seed transaction atomicity**
    - **Validates: Requirements 9.10**
    - Simulate a mid-seed failure; verify no partial records from that run are committed

- [x] 11. Create `.env.example`
  - Add template with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` placeholders (no real credentials)
  - _Requirements: 1.6, 1.7_

- [x] 12. Generate migration
  - Run `bun db:generate` to produce `src/migrations/0002_*.sql`
  - Do NOT run `bun db:migrate` — review the generated SQL before applying
  - Confirm the generated migration DROPs `tes_leads`, `aws_messages`, `aws_bookings`, `pmg_leads` and CREATEs `divisions`, `clients`, `income`, `expenses`, `leads` in FK-safe order
  - _Requirements: 8.1–8.5_

- [x] 13. Rewrite `__tests__/db.test.ts` and add new test files
  - [x] 13.1 Rewrite `__tests__/db.test.ts`
    - Remove assertions for deleted tables (`tes_leads`, `pmg_leads`, `aws_messages`, `aws_bookings`)
    - Add assertions confirming those symbols are NOT exported from the barrel index
    - Add grep/import check confirming no file in the codebase imports from `tes.ts`, `pmg.ts`, or aws messages/bookings
    - _Requirements: 7.2, 7.3_

  - [x] 13.2 Create `__tests__/schema.test.ts`
    - Verify all 5 new domain tables, enums, and types are exported from the barrel index
    - Verify `leadStatusEnum` contains exactly `["new", "contacted", "converted", "lost"]`
    - Verify `awsPackageTypeEnum` is exported and contains exactly `["monthly", "once_off"]`
    - Verify `leads` table has a nullable `divisionId` FK column referencing `divisions.id`
    - _Requirements: 2.7, 3.12, 3a.10, 4.12, 5.14, 7.2_

  - [x] 13.3 Create `__tests__/queries.test.ts`
    - Unit tests: verify `getTotalRevenue` and `getTotalExpenses` return `0` on empty tables
    - Unit tests: verify `getRevenueByDivision`, `getExpensesByDivision`, `getLeadsByStatus` return `[]` on empty tables
    - Include property tests from tasks 8.1–8.4
    - _Requirements: 10.2–10.7, 10.10_

  - [x] 13.4 Create `__tests__/seed.test.ts`
    - Include property tests from tasks 10.1–10.2
    - _Requirements: 9.7, 9.9, 9.10_

- [x] 14. Final checkpoint — ensure all tests pass
  - Run `bun test --filter @pmg/db` and confirm all tests pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Do NOT modify `src/env.ts`, `src/client.ts`, `src/index.ts`, `drizzle.config.ts`, or any existing migration files
- Run `bun db:generate` (task 12) only after all schema files are finalized
- Do NOT run `bun db:migrate` automatically — review the generated SQL first
- Property tests use `fast-check` with `numRuns: 100` minimum; annotate each with `// Feature: drizzle-db-schema, Property {N}: {property_text}`
