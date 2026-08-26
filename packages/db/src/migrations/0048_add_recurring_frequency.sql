DO $$ BEGIN
 CREATE TYPE "public"."recurring_frequency" AS ENUM('monthly', 'quarterly', 'semi_annually', 'annually');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD COLUMN IF NOT EXISTS "frequency" "recurring_frequency" DEFAULT 'monthly' NOT NULL;
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN IF NOT EXISTS "frequency" "recurring_frequency" DEFAULT 'monthly' NOT NULL;
