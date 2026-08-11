CREATE TYPE "public"."asset_kind" AS ENUM('fixed_asset', 'investment');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('active', 'disposed');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "asset_kind" NOT NULL,
	"status" "asset_status" DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"acquisition_date" date NOT NULL,
	"cost" numeric(14, 2) NOT NULL,
	"current_value" numeric(14, 2),
	"notes" text,
	"serial_number" text,
	"location" text,
	"assigned_to" text,
	"quantity" numeric(20, 8),
	"unit_type" text,
	"disposed_at" date,
	"disposal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "assets_cost_non_negative" CHECK ("assets"."cost" >= 0),
	CONSTRAINT "assets_current_value_non_negative" CHECK ("assets"."current_value" IS NULL OR "assets"."current_value" >= 0),
	CONSTRAINT "assets_quantity_non_negative" CHECK ("assets"."quantity" IS NULL OR "assets"."quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX "assets_kind_idx" ON "assets" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "assets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "assets_acquisition_date_idx" ON "assets" USING btree ("acquisition_date");
