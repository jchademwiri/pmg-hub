ALTER TABLE "invoices" ADD COLUMN "discount_type" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "discount_type" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "discount_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "vat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "reference" text;