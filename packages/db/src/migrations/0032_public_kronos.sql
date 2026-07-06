ALTER TYPE "public"."invoice_status" ADD VALUE 'written_off';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "write_off_amount" numeric(12, 2) DEFAULT '0' NOT NULL;