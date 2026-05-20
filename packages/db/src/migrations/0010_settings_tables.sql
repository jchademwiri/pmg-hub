CREATE TABLE IF NOT EXISTS "organisation_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text,
	"registration_number" text,
	"vat_number" text,
	"email" text,
	"phone" text,
	"website" text,
	"address_street" text,
	"address_city" text,
	"address_postal" text,
	"address_province" text,
	"country" text DEFAULT 'South Africa',
	"logo_url" text,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "division_billing_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"default_vat_rate" numeric(5, 2) DEFAULT '15',
	"payment_terms_days" integer DEFAULT 30,
	"bank_name" text,
	"bank_account_name" text,
	"bank_account_number" text,
	"bank_branch_code" text,
	"invoice_notes" text,
	"quote_notes" text,
	"logo_url" text,
	"updated_at" timestamp with time zone,
	CONSTRAINT "division_billing_settings_division_id_unique" UNIQUE("division_id")
);
--> statement-breakpoint
-- FK already applied in a previous partial run - skipped
-- ALTER TABLE "division_billing_settings" ADD CONSTRAINT "division_billing_settings_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;
