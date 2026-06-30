CREATE TYPE "public"."project_task_status" AS ENUM('backlog', 'in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "tender_progress_sections" ADD COLUMN "status" "project_task_status" DEFAULT 'backlog' NOT NULL;--> statement-breakpoint
UPDATE "tender_progress_sections" s
SET "status" = CASE
  WHEN NOT EXISTS (SELECT 1 FROM "tender_progress_items" i WHERE i."section_id" = s."id")
    THEN 'backlog'::"project_task_status"
  WHEN (SELECT COUNT(*) FROM "tender_progress_items" i WHERE i."section_id" = s."id" AND i."is_completed" = false) = 0
    THEN 'completed'::"project_task_status"
  WHEN (SELECT COUNT(*) FROM "tender_progress_items" i WHERE i."section_id" = s."id" AND i."is_completed" = true) > 0
    THEN 'in_progress'::"project_task_status"
  ELSE 'backlog'::"project_task_status"
END;