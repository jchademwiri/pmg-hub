CREATE TABLE "budget_monthly_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"revenue_target" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"expense_budget" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"director_salary_budget" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"tax_reserve_target" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "budget_revenue_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"division_id" uuid NOT NULL,
	"target_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "budget_revenue_targets" ADD CONSTRAINT "budget_revenue_targets_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_monthly_plan_period_uidx" ON "budget_monthly_plan" USING btree ("period");--> statement-breakpoint
CREATE INDEX "budget_monthly_plan_fy_idx" ON "budget_monthly_plan" USING btree ("fiscal_year");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_revenue_targets_period_division_uidx" ON "budget_revenue_targets" USING btree ("period","division_id");--> statement-breakpoint
CREATE INDEX "budget_revenue_targets_fy_idx" ON "budget_revenue_targets" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "budget_revenue_targets_division_idx" ON "budget_revenue_targets" USING btree ("division_id");--> statement-breakpoint
ALTER TABLE "budget_monthly_plan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "budget_monthly_plan" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS budget_monthly_plan_admin_only ON "budget_monthly_plan";--> statement-breakpoint
CREATE POLICY budget_monthly_plan_admin_only ON "budget_monthly_plan"
  FOR ALL
  USING (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()))
  WITH CHECK (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()));--> statement-breakpoint
ALTER TABLE "budget_revenue_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "budget_revenue_targets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS budget_revenue_targets_admin_only ON "budget_revenue_targets";--> statement-breakpoint
CREATE POLICY budget_revenue_targets_admin_only ON "budget_revenue_targets"
  FOR ALL
  USING (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()))
  WITH CHECK (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()));
