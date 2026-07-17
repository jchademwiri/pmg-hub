# Database Rename Plan: Tender to Project

## 1. Goal Description
Fully align the physical PostgreSQL database schema with the new "Project" terminology by renaming the legacy "tender_" tables, columns, and enums. Since the application code already uses the correct generalized TypeScript variables, this is strictly a database-layer refactoring.

## 2. User Review Required
> [!WARNING]
> **Data Preservation:** Database migrations involving renames can sometimes result in data loss if the ORM generates `DROP TABLE` and `CREATE TABLE` commands instead of renaming. 
> To prevent any data loss, the execution phase will include a strict manual review of the generated SQL migration file. We will ensure it uses `ALTER TABLE ... RENAME TO` and `ALTER TYPE ... RENAME TO` to preserve all existing project records before applying it to the database.

## 3. Proposed Changes

### Database Schema Component

#### [MODIFY] `packages/db/src/schema/project-schedule.ts`
- **Enums:**
  - Rename `tender_schedule_status` to `project_schedule_status`
  - Rename `tender_schedule_priority` to `project_schedule_priority`
  - Rename `tender_schedule_outcome` to `project_schedule_outcome`
- **Tables:**
  - Change `pgTable("tender_schedule_entries", ...)` to `pgTable("project_schedule_entries", ...)`
  - Change `pgTable("tender_progress_sections", ...)` to `pgTable("project_progress_sections", ...)`
  - Change `pgTable("tender_progress_items", ...)` to `pgTable("project_progress_items", ...)`
- **Columns:**
  - Rename `tender_reference` to `project_reference`
  - Rename `tender_id` to `project_id`
- **Indexes & Relations:**
  - Update all index names to use the `project_` prefix to prevent index naming collisions or stale references.

## 4. Verification Plan

### Automated Generation & Review
- Run `npm run db:generate` inside the `packages/db` directory.
- Manually inspect the resulting `.sql` file in the migrations folder to verify the presence of non-destructive rename commands.

### Manual Verification
- Once the migration is confirmed safe and applied (`npm run db:push` or via standard migration runner), we will start the development server (`npm run dev`).
- Navigate to the Projects/Scheduling tab in the Admin portal.
- Verify that existing project records load correctly, proving that the data was preserved and the ORM is mapping to the newly renamed tables perfectly.
