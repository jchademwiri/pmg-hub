# Implementation Plan: database-integration

## Overview

Set up `packages/db` (`@pmg/db`) as the shared database package: define the production schema, fix config, wire the Turborepo pipeline, generate and push migrations, seed pricing data, and add tests. No app integration is in scope.

## Tasks

- [-] 1. Create production schema files
  - [-] 1.1 Create `packages/db/src/schema/tes.ts`
    - Define `tesServiceEnum` (`tes_service`) with 8 values
    - Define `tesLeadStatusEnum` (`tes_lead_status`) with 4 values
    - Define `tesLeads` table with all columns, indexes on `status` and `email`
    - Export `TesLead` and `NewTesLead` inferred types
    - _Requirements: 2.1, 2.2, 2.3, 2.12, 2.13, 2.14_

  - [ ] 1.2 Create `packages/db/src/schema/aws.ts`
    - Define `awsPackageTypeEnum`, `awsMessageStatusEnum`, `awsBookingStatusEnum`
    - Define `awsMessages`, `awsBookings`, `awsPricing` tables with all columns and indexes
    - Export all inferred types (`AwsMessage`, `NewAwsMessage`, `AwsBooking`, `NewAwsBooking`, `AwsPricing`, `NewAwsPricing`)
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.12, 2.13, 2.14, 3.1, 3.2_

  - [ ] 1.3 Create `packages/db/src/schema/pmg.ts`
    - Define `pmgLeadServiceEnum` (`pmg_lead_service`) with 4 values
    - Define `pmgLeadStatusEnum` (`pmg_lead_status`) with 6 values
    - Define `pmgLeads` table with all columns, indexes on `status` and `email`
    - Export `PmgLead` and `NewPmgLead` inferred types
    - _Requirements: 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

  - [ ] 1.4 Update `packages/db/src/schema/index.ts` to re-export from `tes.ts`, `aws.ts`, and `pmg.ts`; remove the `./test` export
    - Delete `packages/db/src/schema/test.ts`
    - _Requirements: 4.1, 4.2, 6.2_

- [ ] 2. Fix `packages/db/drizzle.config.ts`
  - Change `dbCredentials.url` from `env.DATABASE_URL` to `env.DATABASE_URL_UNPOOLED`
  - _Requirements: 1.5, 5.3_

- [ ] 3. Wire root `package.json` and `turbo.json`
  - [ ] 3.1 Add `db:generate`, `db:migrate`, and `db:studio` scripts to root `package.json` delegating via `bun --filter @pmg/db`
    - _Requirements: 5.5_

  - [ ] 3.2 Add `db:generate` task to `turbo.json` with `"cache": false`
    - _Requirements: 12.1_

- [ ] 4. Generate and push migrations
  - Run `bun db:generate` from the repo root to produce SQL files in `packages/db/src/migrations/`
  - Run `bun db:migrate` from the repo root to apply the schema to Neon via `DATABASE_URL_UNPOOLED`
  - Verify the Neon database contains all tables from Requirements 2 and 3
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 5. Create seed script
  - [ ] 5.1 Create `packages/db/src/seed.ts`
    - Import `db` and `awsPricing` from the package internals
    - Define the 5 pricing rows (3 monthly, 2 once-off) with correct cent values
    - Insert using `onConflictDoNothing()` keyed on `name` for idempotence
    - Run with `bun packages/db/src/seed.ts` and confirm rows are inserted
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 6. Checkpoint — ensure schema, migrations, and seed are working
  - Confirm `bun db:generate` and `bun db:migrate` complete without errors
  - Confirm `bun packages/db/src/seed.ts` runs twice without creating duplicates
  - Ask the user if any questions arise before proceeding to tests.

- [ ] 7. Add test infrastructure and write tests
  - [ ] 7.1 Add `fast-check` dev dependency and create `packages/db/vitest.config.ts`
    - Run `bun add -D fast-check --filter @pmg/db`
    - Create `packages/db/vitest.config.ts` with `environment: "node"`
    - _Requirements: (testing infrastructure)_

  - [ ]* 7.2 Write unit tests for `env.ts`
    - Create `packages/db/src/__tests__/env.test.ts`
    - Test specific valid URL pairs succeed
    - Test missing `DATABASE_URL`, missing `DATABASE_URL_UNPOOLED`, and both missing throw with descriptive messages
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 7.3 Write property test for env validator (Property 1)
    - **Property 1: Env validator rejects invalid inputs**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Generate arbitrary objects with absent, empty, non-URL, or numeric URL fields; assert validator throws and error includes the field name
    - Also generate valid URL pairs and assert validator succeeds
    - Tag: `// Feature: database-integration, Property 1: Env validator rejects invalid inputs`

  - [ ]* 7.4 Write unit tests for schema exports
    - Verify all expected table names and type exports are present from `src/index.ts`
    - Confirm `connection_test` is not exported
    - _Requirements: 4.1, 6.1, 6.2_

  - [ ]* 7.5 Write unit tests for seed data
    - Verify the seed rows array contains exactly 5 entries
    - Verify correct `price`, `type`, `popular`, and `name` values for each row
    - _Requirements: 11.2, 11.3_

  - [ ]* 7.6 Write property test for seed idempotence (Property 2)
    - **Property 2: Seed script is idempotent**
    - **Validates: Requirements 11.5**
    - Extract seed rows and upsert logic into a pure function; generate arbitrary existing table states; assert applying the function twice equals applying it once
    - Tag: `// Feature: database-integration, Property 2: Seed script is idempotent`

- [ ] 8. Final checkpoint — ensure all tests pass
  - Run `bun test --filter @pmg/db` and confirm all tests pass
  - Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `drizzle-kit push` is used (not `migrate`) — it directly syncs the schema without a migration history table
- The `connection_test` table must be removed before generating migrations to avoid it appearing in the schema
- All cent values are integers in ZAR cents (e.g. R299/mo = 29900)
