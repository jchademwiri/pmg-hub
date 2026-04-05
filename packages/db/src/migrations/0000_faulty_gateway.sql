CREATE TYPE "public"."aws_package_type" AS ENUM('monthly', 'once_off');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'converted', 'lost');--> statement-breakpoint
CREATE TABLE "aws_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"period" text,
	"upfront" integer,
	"description" text NOT NULL,
	"features" jsonb NOT NULL,
	"cta" text NOT NULL,
	"popular" boolean DEFAULT false,
	"type" "aws_package_type" NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "aws_pricing_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "divisions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"email" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "income" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"division_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "income_amount_positive" CHECK ("income"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"division_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"message" text,
	"source" text,
	"service_interest" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"division_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"notes" text,
	CONSTRAINT "leads_email_or_phone" CHECK ("leads"."email" IS NOT NULL OR "leads"."phone" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"account" text DEFAULT 'salary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "withdrawals_amount_positive" CHECK ("withdrawals"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"revenue" numeric(12, 2) NOT NULL,
	"expenses" numeric(12, 2) NOT NULL,
	"pmg_share" numeric(12, 2) NOT NULL,
	"profit_pool" numeric(12, 2) NOT NULL,
	"salary" numeric(12, 2) NOT NULL,
	"reinvest" numeric(12, 2) NOT NULL,
	"reserve" numeric(12, 2) NOT NULL,
	"flex" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_period_unique" UNIQUE("period")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "divisions_name_idx" ON "divisions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_email_unique_idx" ON "clients" USING btree ("email") WHERE "clients"."email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "income_date_idx" ON "income" USING btree ("date");--> statement-breakpoint
CREATE INDEX "income_division_id_idx" ON "income" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "income_client_id_idx" ON "income" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expenses_division_id_idx" ON "expenses" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_division_id_idx" ON "leads" USING btree ("division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_email_unique_idx" ON "leads" USING btree ("email") WHERE "leads"."email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_phone_unique_idx" ON "leads" USING btree ("phone") WHERE "leads"."phone" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "withdrawals_date_idx" ON "withdrawals" USING btree ("date");--> statement-breakpoint
CREATE INDEX "snapshots_period_idx" ON "snapshots" USING btree ("period");