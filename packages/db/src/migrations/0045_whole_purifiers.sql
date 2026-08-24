CREATE TYPE "public"."recurring_expense_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recurring_invoice_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"vendor_name" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"billing_cycle_day" integer DEFAULT 1 NOT NULL,
	"next_due_date" date NOT NULL,
	"last_paid_date" date,
	"status" "recurring_expense_status" DEFAULT 'active' NOT NULL,
	"client_id" uuid,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "recurring_expenses_amount_positive" CHECK ("recurring_expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "recurring_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"reference" text,
	"status" "recurring_invoice_status" DEFAULT 'active' NOT NULL,
	"billing_cycle_day" integer DEFAULT 25 NOT NULL,
	"due_days_offset" integer DEFAULT 6 NOT NULL,
	"auto_send_email" boolean DEFAULT true NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_type" text,
	"discount_value" numeric(12, 2),
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_enabled" boolean DEFAULT false NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"terms" text,
	"last_run_date" date,
	"next_run_date" date NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "recurring_invoices_total_non_negative" CHECK ("recurring_invoices"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recurring_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_invoice_id" uuid NOT NULL,
	"item_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount_type" text,
	"discount_value" numeric(12, 2),
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_line_items_quantity_positive" CHECK ("recurring_line_items"."quantity" > 0),
	CONSTRAINT "recurring_line_items_unit_price_non_negative" CHECK ("unit_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "distribution_settings" ADD COLUMN "distribution_basis" varchar(30) DEFAULT 'net_profit' NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_line_items" ADD CONSTRAINT "recurring_line_items_recurring_invoice_id_recurring_invoices_id_fk" FOREIGN KEY ("recurring_invoice_id") REFERENCES "public"."recurring_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_line_items" ADD CONSTRAINT "recurring_line_items_item_id_billing_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."billing_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_expenses_division_id_idx" ON "recurring_expenses" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "recurring_expenses_status_idx" ON "recurring_expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recurring_expenses_next_due_date_idx" ON "recurring_expenses" USING btree ("next_due_date");--> statement-breakpoint
CREATE INDEX "recurring_invoices_division_id_idx" ON "recurring_invoices" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "recurring_invoices_client_id_idx" ON "recurring_invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "recurring_invoices_status_idx" ON "recurring_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recurring_invoices_next_run_date_idx" ON "recurring_invoices" USING btree ("next_run_date");--> statement-breakpoint
CREATE INDEX "recurring_line_items_recurring_id_idx" ON "recurring_line_items" USING btree ("recurring_invoice_id");