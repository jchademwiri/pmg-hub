ALTER TABLE "tender_schedule_entries" RENAME TO "project_schedule_entries";--> statement-breakpoint
ALTER TABLE "tender_progress_sections" RENAME TO "project_progress_sections";--> statement-breakpoint
ALTER TABLE "tender_progress_items" RENAME TO "project_progress_items";--> statement-breakpoint
ALTER TABLE "project_schedule_entries" RENAME COLUMN "tender_reference" TO "project_reference";--> statement-breakpoint
ALTER TABLE "project_progress_sections" RENAME COLUMN "tender_id" TO "project_id";--> statement-breakpoint
ALTER TYPE "public"."tender_schedule_status" RENAME TO "project_schedule_status";--> statement-breakpoint
ALTER TYPE "public"."tender_schedule_priority" RENAME TO "project_schedule_priority";--> statement-breakpoint
ALTER TYPE "public"."tender_schedule_outcome" RENAME TO "project_schedule_outcome";--> statement-breakpoint
ALTER INDEX "tender_schedule_status_idx" RENAME TO "project_schedule_status_idx";--> statement-breakpoint
ALTER INDEX "tender_schedule_closing_date_idx" RENAME TO "project_schedule_closing_date_idx";--> statement-breakpoint
ALTER INDEX "tender_schedule_client_id_idx" RENAME TO "project_schedule_client_id_idx";--> statement-breakpoint
ALTER INDEX "tender_schedule_division_id_idx" RENAME TO "project_schedule_division_id_idx";--> statement-breakpoint
ALTER INDEX "tender_progress_sections_tender_id_idx" RENAME TO "project_progress_sections_project_id_idx";--> statement-breakpoint
ALTER INDEX "tender_progress_items_section_id_idx" RENAME TO "project_progress_items_section_id_idx";--> statement-breakpoint
ALTER TABLE "project_schedule_entries" RENAME CONSTRAINT "tender_schedule_entries_client_id_clients_id_fk" TO "project_schedule_entries_client_id_clients_id_fk";--> statement-breakpoint
ALTER TABLE "project_schedule_entries" RENAME CONSTRAINT "tender_schedule_entries_division_id_divisions_id_fk" TO "project_schedule_entries_division_id_divisions_id_fk";--> statement-breakpoint
ALTER TABLE "project_progress_sections" RENAME CONSTRAINT "tender_progress_sections_tender_id_tender_schedule_entries_id_fk" TO "project_progress_sections_project_id_project_schedule_entries_id_fk";--> statement-breakpoint
ALTER TABLE "project_progress_items" RENAME CONSTRAINT "tender_progress_items_section_id_tender_progress_sections_id_fk" TO "project_progress_items_section_id_project_progress_sections_id_fk";
