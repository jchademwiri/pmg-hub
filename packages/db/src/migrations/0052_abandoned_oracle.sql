CREATE TYPE "public"."onboarding_status" AS ENUM('pending', 'converted', 'rejected', 'archived');--> statement-breakpoint
CREATE TABLE "client_onboardings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid,
	"lead_id" uuid,
	"contact_name" text NOT NULL,
	"company_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"registration_number" text,
	"notes" text,
	"status" "onboarding_status" DEFAULT 'pending' NOT NULL,
	"converted_client_id" uuid,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "registration_number" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "client_onboardings" ADD CONSTRAINT "client_onboardings_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_onboardings" ADD CONSTRAINT "client_onboardings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_onboardings" ADD CONSTRAINT "client_onboardings_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_onboardings" ADD CONSTRAINT "client_onboardings_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboarding_status_idx" ON "client_onboardings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_lead_id_idx" ON "client_onboardings" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "onboarding_created_at_idx" ON "client_onboardings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "onboarding_email_idx" ON "client_onboardings" USING btree ("email");