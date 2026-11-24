CREATE TYPE "public"."dividend_payout_type" AS ENUM('director_bonus', 'dividend');--> statement-breakpoint
CREATE TABLE "dividend_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year" integer NOT NULL,
	"quarter" varchar(2) NOT NULL,
	"payout_date" date NOT NULL,
	"payout_type" "dividend_payout_type" NOT NULL,
	"gross_amount" numeric(14, 2) NOT NULL,
	"dwt_withheld" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"loan_offset_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"net_cash_paid" numeric(14, 2) NOT NULL,
	"solvency_signed_off" boolean DEFAULT false NOT NULL,
	"solvency_signed_by" text,
	"solvency_signed_at" timestamp with time zone,
	"journal_entry_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dividend_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year" integer NOT NULL,
	"min_cash_reserve" numeric(14, 2) DEFAULT '25000.00' NOT NULL,
	"payout_ratio_percent" numeric(5, 2) DEFAULT '50.00' NOT NULL,
	"paye_tax_free_threshold" numeric(14, 2) DEFAULT '95750.00' NOT NULL,
	"dwt_rate_percent" numeric(5, 2) DEFAULT '20.00' NOT NULL,
	"is_sbc_qualified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "dividend_payouts" ADD CONSTRAINT "dividend_payouts_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dividend_payouts_fy_idx" ON "dividend_payouts" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "dividend_payouts_quarter_idx" ON "dividend_payouts" USING btree ("fiscal_year","quarter");--> statement-breakpoint
CREATE INDEX "dividend_payouts_journal_idx" ON "dividend_payouts" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dividend_policies_fy_uidx" ON "dividend_policies" USING btree ("fiscal_year");--> statement-breakpoint
ALTER TABLE "dividend_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dividend_policies" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS dividend_policies_admin_only ON "dividend_policies";--> statement-breakpoint
CREATE POLICY dividend_policies_admin_only ON "dividend_policies"
  FOR ALL
  USING (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()))
  WITH CHECK (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()));--> statement-breakpoint
ALTER TABLE "dividend_payouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dividend_payouts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS dividend_payouts_admin_only ON "dividend_payouts";--> statement-breakpoint
CREATE POLICY dividend_payouts_admin_only ON "dividend_payouts"
  FOR ALL
  USING (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()))
  WITH CHECK (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()));--> statement-breakpoint
UPDATE "journal_entries"
SET "period" = TO_CHAR("entry_date"::date, 'YYYY-MM')
WHERE "period" != TO_CHAR("entry_date"::date, 'YYYY-MM');
