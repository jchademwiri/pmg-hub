ALTER TABLE "clients" ADD COLUMN "exclude_from_auto_statements" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "division_billing_settings" ADD COLUMN "auto_send_statements" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "division_billing_settings" ADD COLUMN "statement_cycle_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "division_billing_settings" ADD COLUMN "statement_type" text DEFAULT 'outstanding' NOT NULL;