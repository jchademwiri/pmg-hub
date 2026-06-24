CREATE TYPE "public"."tender_schedule_outcome" AS ENUM('won', 'lost', 'pending');--> statement-breakpoint
CREATE TYPE "public"."tender_schedule_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."tender_schedule_status" AS ENUM('planned', 'in_progress', 'completed', 'submitted', 'cancelled');--> statement-breakpoint
CREATE TABLE "tender_schedule_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"division_id" uuid,
	"tender_reference" text NOT NULL,
	"closing_date" date NOT NULL,
	"effort_days" integer NOT NULL,
	"actual_effort_days" integer,
	"buffer_days" integer DEFAULT 2 NOT NULL,
	"start_date" date NOT NULL,
	"target_completion_date" date NOT NULL,
	"actual_completion_date" date,
	"submission_date" date,
	"status" "tender_schedule_status" DEFAULT 'planned' NOT NULL,
	"priority" "tender_schedule_priority" DEFAULT 'normal' NOT NULL,
	"notes" text,
	"blockers" text,
	"outcome" "tender_schedule_outcome",
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tender_schedule_entries" ADD CONSTRAINT "tender_schedule_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_schedule_entries" ADD CONSTRAINT "tender_schedule_entries_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_schedule_status_idx" ON "tender_schedule_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tender_schedule_closing_date_idx" ON "tender_schedule_entries" USING btree ("closing_date");--> statement-breakpoint
CREATE INDEX "tender_schedule_client_id_idx" ON "tender_schedule_entries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "tender_schedule_division_id_idx" ON "tender_schedule_entries" USING btree ("division_id");