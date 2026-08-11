-- Gives the project_progress_sections/items foreign keys short, explicit names.
-- Drizzle's default FK name for these two exceeded Postgres's 63-byte identifier
-- limit and got silently truncated on creation, which meant every `db:generate`
-- run reported the same constraint as needing to be dropped and recreated
-- (harmless, but permanent noise). Renaming in place avoids a drop+recreate.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_progress_sections_project_id_project_schedule_entries_i') THEN
    ALTER TABLE "project_progress_sections" RENAME CONSTRAINT "project_progress_sections_project_id_project_schedule_entries_i" TO "project_progress_sections_project_id_fk";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_progress_items_section_id_project_progress_sections_id_') THEN
    ALTER TABLE "project_progress_items" RENAME CONSTRAINT "project_progress_items_section_id_project_progress_sections_id_" TO "project_progress_items_section_id_fk";
  END IF;
END $$;
