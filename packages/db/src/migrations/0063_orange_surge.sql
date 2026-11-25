CREATE TABLE "compliance_document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_document_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "compliance_document_types_sort_idx" ON "compliance_document_types" USING btree ("sort_order","name");--> statement-breakpoint
-- Seed 11 default South African compliance document types (idempotent)
INSERT INTO "compliance_document_types" ("name", "sort_order", "is_active") VALUES
  ('SARS Tax Clearance PIN', 1, true),
  ('B-BBEE Affidavit / Certificate', 2, true),
  ('CIPC Annual Returns', 3, true),
  ('COIDA / Letter of Good Standing', 4, true),
  ('CIDB Registration (Annual & 3-Year Renewals)', 5, true),
  ('CSD Registration Report', 6, true),
  ('NHBRC Certificate', 7, true),
  ('PSIRA Certificate', 8, true),
  ('Public Liability Insurance', 9, true),
  ('ISO 9001 Certificate', 10, true),
  ('Municipal Rates Clearance', 11, true)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
-- Promote any historical CUSTOM compliance documents into managed compliance_document_types
INSERT INTO "compliance_document_types" ("name", "sort_order", "is_active")
SELECT DISTINCT trim("custom_name"), 100, true
FROM "compliance_documents"
WHERE "document_type" = 'CUSTOM' AND "custom_name" IS NOT NULL AND trim("custom_name") <> ''
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "compliance_documents"
SET "document_type" = trim("custom_name"), "custom_name" = NULL
WHERE "document_type" = 'CUSTOM' AND "custom_name" IS NOT NULL AND trim("custom_name") <> '';
