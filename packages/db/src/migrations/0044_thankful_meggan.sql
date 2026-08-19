CREATE TYPE "public"."savings_contribution_type" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
CREATE TYPE "public"."savings_goal_status" AS ENUM('saving', 'purchased', 'cancelled');--> statement-breakpoint
CREATE TABLE "savings_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"type" "savings_contribution_type" DEFAULT 'deposit' NOT NULL,
	"contribution_date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_contributions_amount_positive" CHECK ("savings_contributions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_amount" numeric(14, 2) NOT NULL,
	"actual_price" numeric(14, 2),
	"vendor" text,
	"product_url" text,
	"spend_tracker_key" text,
	"status" "savings_goal_status" DEFAULT 'saving' NOT NULL,
	"target_date" date,
	"purchased_at" date,
	"asset_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "savings_goals_target_positive" CHECK ("savings_goals"."target_amount" > 0),
	CONSTRAINT "savings_goals_actual_price_non_negative" CHECK ("savings_goals"."actual_price" IS NULL OR "savings_goals"."actual_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "savings_contributions" ADD CONSTRAINT "savings_contributions_goal_id_savings_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "savings_contributions_goal_id_idx" ON "savings_contributions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "savings_contributions_date_idx" ON "savings_contributions" USING btree ("contribution_date");--> statement-breakpoint
CREATE INDEX "savings_goals_status_idx" ON "savings_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "savings_goals_asset_id_idx" ON "savings_goals" USING btree ("asset_id");