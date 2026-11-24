DO $$ BEGIN CREATE TYPE "public"."leave_status" AS ENUM('PLANNED', 'TAKEN', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."leave_type" AS ENUM('ANNUAL', 'SICK', 'FAMILY_RESPONSIBILITY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "leave_type" NOT NULL,
	"status" "leave_status" DEFAULT 'PLANNED' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days_count" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_entries_days_positive" CHECK ("leave_entries"."days_count" >= 1),
	CONSTRAINT "leave_entries_date_order" CHECK ("leave_entries"."end_date" >= "leave_entries"."start_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"employment_start_date" date DEFAULT '2022-01-01' NOT NULL,
	"anchor_date" date DEFAULT '2026-10-31' NOT NULL,
	"annual_opening_balance" numeric(5, 2) DEFAULT '16.50' NOT NULL,
	"annual_monthly_accrual" numeric(4, 2) DEFAULT '1.75' NOT NULL,
	"annual_max_carry_over" integer DEFAULT 5 NOT NULL,
	"sick_cycle_start_date" date DEFAULT '2025-01-01' NOT NULL,
	"sick_cycle_entitlement" integer DEFAULT 30 NOT NULL,
	"sick_opening_balance" integer DEFAULT 25 NOT NULL,
	"family_opening_balance" integer DEFAULT 0 NOT NULL,
	"family_annual_entitlement" integer DEFAULT 3 NOT NULL,
	"family_reset_month" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_settings_annual_accrual_non_negative" CHECK ("leave_settings"."annual_monthly_accrual" >= 0),
	CONSTRAINT "leave_settings_carry_over_non_negative" CHECK ("leave_settings"."annual_max_carry_over" >= 0),
	CONSTRAINT "leave_settings_sick_entitlement_positive" CHECK ("leave_settings"."sick_cycle_entitlement" > 0),
	CONSTRAINT "leave_settings_sick_opening_non_negative" CHECK ("leave_settings"."sick_opening_balance" >= 0),
	CONSTRAINT "leave_settings_family_opening_non_negative" CHECK ("leave_settings"."family_opening_balance" >= 0),
	CONSTRAINT "leave_settings_family_entitlement_non_negative" CHECK ("leave_settings"."family_annual_entitlement" >= 0),
	CONSTRAINT "leave_settings_family_reset_month_valid" CHECK ("leave_settings"."family_reset_month" >= 1 AND "leave_settings"."family_reset_month" <= 12)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_entries_start_date_idx" ON "leave_entries" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_entries_type_status_idx" ON "leave_entries" USING btree ("type","status");