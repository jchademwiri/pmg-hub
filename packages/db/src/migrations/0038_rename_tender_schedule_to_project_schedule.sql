-- The project-schedule feature was originally named "tender schedule" and later
-- renamed in the application schema (src/schema/project-schedule.ts) without a
-- corresponding migration ever being committed. Some environments already had
-- this rename applied out-of-band (e.g. via drizzle-kit push); this migration
-- brings any environment still on the old names in line, and is a no-op
-- (via the existence guards) anywhere it was already applied.

-- Rename enums
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tender_schedule_status') THEN
    ALTER TYPE "public"."tender_schedule_status" RENAME TO "project_schedule_status";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tender_schedule_priority') THEN
    ALTER TYPE "public"."tender_schedule_priority" RENAME TO "project_schedule_priority";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tender_schedule_outcome') THEN
    ALTER TYPE "public"."tender_schedule_outcome" RENAME TO "project_schedule_outcome";
  END IF;
END $$;--> statement-breakpoint

-- Rename tables
ALTER TABLE IF EXISTS "tender_schedule_entries" RENAME TO "project_schedule_entries";--> statement-breakpoint
ALTER TABLE IF EXISTS "tender_progress_sections" RENAME TO "project_progress_sections";--> statement-breakpoint
ALTER TABLE IF EXISTS "tender_progress_items" RENAME TO "project_progress_items";--> statement-breakpoint

-- Rename columns
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_schedule_entries' AND column_name = 'tender_reference'
  ) THEN
    ALTER TABLE "project_schedule_entries" RENAME COLUMN "tender_reference" TO "project_reference";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_progress_sections' AND column_name = 'tender_id'
  ) THEN
    ALTER TABLE "project_progress_sections" RENAME COLUMN "tender_id" TO "project_id";
  END IF;
END $$;--> statement-breakpoint

-- Rename indexes
ALTER INDEX IF EXISTS "tender_schedule_status_idx" RENAME TO "project_schedule_status_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "tender_schedule_closing_date_idx" RENAME TO "project_schedule_closing_date_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "tender_schedule_client_id_idx" RENAME TO "project_schedule_client_id_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "tender_schedule_division_id_idx" RENAME TO "project_schedule_division_id_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "tender_progress_items_section_id_idx" RENAME TO "project_progress_items_section_id_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "tender_progress_sections_tender_id_idx" RENAME TO "project_progress_sections_project_id_idx";--> statement-breakpoint

-- Rename foreign key constraints to match current schema's naming
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tender_schedule_entries_client_id_clients_id_fk') THEN
    ALTER TABLE "project_schedule_entries" RENAME CONSTRAINT "tender_schedule_entries_client_id_clients_id_fk" TO "project_schedule_entries_client_id_clients_id_fk";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tender_schedule_entries_division_id_divisions_id_fk') THEN
    ALTER TABLE "project_schedule_entries" RENAME CONSTRAINT "tender_schedule_entries_division_id_divisions_id_fk" TO "project_schedule_entries_division_id_divisions_id_fk";
  END IF;
END $$;--> statement-breakpoint
-- Note: these two constraint names exceed Postgres's 63-byte identifier limit,
-- so both the old (as originally created) and new (as Drizzle would generate
-- today) names below are already truncated to what Postgres actually stores.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tender_progress_sections_tender_id_tender_schedule_entries_id_f') THEN
    ALTER TABLE "project_progress_sections" RENAME CONSTRAINT "tender_progress_sections_tender_id_tender_schedule_entries_id_f" TO "project_progress_sections_project_id_project_schedule_entries_i";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tender_progress_items_section_id_tender_progress_sections_id_fk') THEN
    ALTER TABLE "project_progress_items" RENAME CONSTRAINT "tender_progress_items_section_id_tender_progress_sections_id_fk" TO "project_progress_items_section_id_project_progress_sections_id_";
  END IF;
END $$;
