CREATE TYPE "public"."billing_document_type" AS ENUM('quote', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."billing_item_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'paid', 'overdue', 'void');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'accepted', 'declined', 'expired', 'converted', 'cancelled');--> statement-breakpoint
CREATE TABLE "billing_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_price" numeric(12, 2) NOT NULL,
	"unit_label" text,
	"vat_applicable" boolean DEFAULT true NOT NULL,
	"status" "billing_item_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" "billing_document_type" NOT NULL,
	"document_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_line_items_quantity_positive" CHECK ("billing_line_items"."quantity" > 0),
	CONSTRAINT "billing_line_items_unit_price_non_negative" CHECK ("billing_line_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "document_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"document_type" "billing_document_type" NOT NULL,
	"year" integer NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_sequences_division_type_year_unique" UNIQUE("division_id","document_type","year")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"client_id" uuid,
	"document_number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date,
	"po_number" text,
	"quotation_id" uuid,
	"income_id" uuid,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"terms" text,
	"paid_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "invoices_document_number_unique" UNIQUE("document_number"),
	CONSTRAINT "invoices_total_non_negative" CHECK ("invoices"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"client_id" uuid,
	"document_number" text NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"quote_date" date NOT NULL,
	"expiry_date" date,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"terms" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "quotations_document_number_unique" UNIQUE("document_number"),
	CONSTRAINT "quotations_total_non_negative" CHECK ("quotations"."total" >= 0)
);
--> statement-breakpoint
DROP INDEX IF EXISTS "leads_email_unique_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "leads_phone_unique_idx";--> statement-breakpoint
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_income_id_income_id_fk" FOREIGN KEY ("income_id") REFERENCES "public"."income"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_items_status_idx" ON "billing_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_items_name_idx" ON "billing_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "billing_line_items_document_idx" ON "billing_line_items" USING btree ("document_type","document_id");--> statement-breakpoint
CREATE INDEX "invoices_division_id_idx" ON "invoices" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_invoice_date_idx" ON "invoices" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "invoices_quotation_id_idx" ON "invoices" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotations_division_id_idx" ON "quotations" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "quotations_client_id_idx" ON "quotations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_quote_date_idx" ON "quotations" USING btree ("quote_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_email_division_unique_idx" ON "leads" USING btree ("email","division_id") WHERE "leads"."email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_phone_division_unique_idx" ON "leads" USING btree ("phone","division_id") WHERE "leads"."phone" IS NOT NULL;