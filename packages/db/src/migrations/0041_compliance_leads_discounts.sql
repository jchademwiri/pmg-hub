-- compliance_documents, leads.company_name, and the billing_line_items discount
-- columns were already created out-of-band on this database (e.g. via
-- drizzle-kit push) without a matching migration ever being committed, so the
-- tracked snapshot chain was stale and blocked `bun db:generate`. Every
-- statement below is guarded so this migration is a no-op wherever the
-- change was already applied, and does the real thing on a fresh database.

CREATE TABLE IF NOT EXISTS "compliance_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"custom_name" text,
	"expiry_date" date NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compliance_documents_client_id_clients_id_fk') THEN
    ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_documents_client_id_idx" ON "compliance_documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_documents_expiry_date_idx" ON "compliance_documents" USING btree ("expiry_date");--> statement-breakpoint

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "company_name" text;--> statement-breakpoint

ALTER TABLE "billing_line_items" ADD COLUMN IF NOT EXISTS "discount_type" text;--> statement-breakpoint
ALTER TABLE "billing_line_items" ADD COLUMN IF NOT EXISTS "discount_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "billing_line_items" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_line_items_discount_percent_max') THEN
    ALTER TABLE "billing_line_items" ADD CONSTRAINT "billing_line_items_discount_percent_max" CHECK (("discount_type" = 'percent' AND "discount_value" <= 100) OR "discount_type" IS DISTINCT FROM 'percent');
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_line_items_discount_value_non_negative') THEN
    ALTER TABLE "billing_line_items" ADD CONSTRAINT "billing_line_items_discount_value_non_negative" CHECK ("discount_value" >= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_line_items_discount_amount_non_negative') THEN
    ALTER TABLE "billing_line_items" ADD CONSTRAINT "billing_line_items_discount_amount_non_negative" CHECK ("discount_amount" >= 0);
  END IF;
END $$;
