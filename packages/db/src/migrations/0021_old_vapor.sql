CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense');--> statement-breakpoint
CREATE TYPE "public"."journal_entry_status" AS ENUM('draft', 'posted', 'void');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('open', 'closed', 'locked');--> statement-breakpoint
CREATE TABLE "distribution_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_key" varchar(50) NOT NULL,
	"rate_value" numeric(6, 4) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"description" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" varchar(7) NOT NULL,
	"status" "period_status" DEFAULT 'open' NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "accounting_periods_period_unique" UNIQUE("period")
);
--> statement-breakpoint
CREATE TABLE "chart_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "account_type" NOT NULL,
	"parent_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_posting_account" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "chart_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_number" varchar(30) NOT NULL,
	"entry_date" date NOT NULL,
	"period" varchar(7) NOT NULL,
	"description" text NOT NULL,
	"status" "journal_entry_status" DEFAULT 'draft' NOT NULL,
	"source_module" varchar(50),
	"source_table" varchar(100),
	"source_id" uuid,
	"source_document_number" varchar(50),
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"void_reason" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "journal_entries_entry_number_unique" UNIQUE("entry_number")
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(14, 2),
	"credit" numeric(14, 2),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_lines_debit_or_credit" CHECK (("journal_lines"."debit" IS NOT NULL AND "journal_lines"."credit" IS NULL) OR ("journal_lines"."debit" IS NULL AND "journal_lines"."credit" IS NOT NULL)),
	CONSTRAINT "journal_lines_amount_positive" CHECK (("journal_lines"."debit" IS NULL OR "journal_lines"."debit" > 0) AND ("journal_lines"."credit" IS NULL OR "journal_lines"."credit" > 0))
);
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_chart_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "distribution_settings_rate_key_idx" ON "distribution_settings" USING btree ("rate_key");--> statement-breakpoint
CREATE INDEX "distribution_settings_active_idx" ON "distribution_settings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "distribution_settings_effective_idx" ON "distribution_settings" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "accounting_periods_status_idx" ON "accounting_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chart_accounts_type_idx" ON "chart_accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "chart_accounts_is_active_idx" ON "chart_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "chart_accounts_parent_id_idx" ON "chart_accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "journal_entries_period_idx" ON "journal_entries" USING btree ("period");--> statement-breakpoint
CREATE INDEX "journal_entries_status_idx" ON "journal_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "journal_entries_source_idx" ON "journal_entries" USING btree ("source_module","source_table","source_id");--> statement-breakpoint
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines" USING btree ("account_id");