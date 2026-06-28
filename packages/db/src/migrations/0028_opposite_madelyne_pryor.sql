CREATE TABLE "client_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"proposed_business_name" text,
	"proposed_vat_number" text,
	"proposed_registration_number" text,
	"proposed_billing_email" text,
	"proposed_billing_address" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tender_progress_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"task" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tender_progress_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "client_change_requests" ADD CONSTRAINT "client_change_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_change_requests" ADD CONSTRAINT "client_change_requests_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_progress_items" ADD CONSTRAINT "tender_progress_items_section_id_tender_progress_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."tender_progress_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_progress_sections" ADD CONSTRAINT "tender_progress_sections_tender_id_tender_schedule_entries_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_schedule_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_progress_items_section_id_idx" ON "tender_progress_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "tender_progress_sections_tender_id_idx" ON "tender_progress_sections" USING btree ("tender_id");