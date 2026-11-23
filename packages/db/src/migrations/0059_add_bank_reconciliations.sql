CREATE TYPE "public"."bank_reconciliation_status" AS ENUM('reconciled', 'variance');--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" varchar(7) NOT NULL,
	"account_code" varchar(10) NOT NULL,
	"statement_date" date NOT NULL,
	"statement_balance" numeric(14, 2) NOT NULL,
	"book_balance" numeric(14, 2) NOT NULL,
	"variance" numeric(14, 2) NOT NULL,
	"adjustment_journal_id" uuid,
	"status" "bank_reconciliation_status" DEFAULT 'reconciled' NOT NULL,
	"notes" text,
	"reconciled_by" text,
	"reconciled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_adjustment_journal_id_journal_entries_id_fk" FOREIGN KEY ("adjustment_journal_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_reconciliations_period_account_uidx" ON "bank_reconciliations" USING btree ("period","account_code");--> statement-breakpoint
CREATE INDEX "bank_reconciliations_period_idx" ON "bank_reconciliations" USING btree ("period");--> statement-breakpoint
CREATE INDEX "bank_reconciliations_status_idx" ON "bank_reconciliations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_reconciliations_adjustment_journal_idx" ON "bank_reconciliations" USING btree ("adjustment_journal_id");--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS bank_reconciliations_admin_only ON "bank_reconciliations";--> statement-breakpoint
CREATE POLICY bank_reconciliations_admin_only ON "bank_reconciliations"
  FOR ALL
  USING (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()))
  WITH CHECK (app_is_admin() OR (app_current_client_id() IS NULL AND NOT app_is_client_mode()));
