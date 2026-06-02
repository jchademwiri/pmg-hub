-- Upward migration for Partial Payments & Auto-Allocation
-- Wires the many-to-many relationship and backfills live payments data

-- 1. Extend the invoice_status enum to include partially_paid
ALTER TYPE "invoice_status" ADD VALUE 'partially_paid';

-- 2. Create the payment_allocations table
CREATE TABLE IF NOT EXISTS "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"income_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);

-- 3. Add index and foreign key constraints
CREATE INDEX IF NOT EXISTS "payment_allocations_income_id_idx" ON "payment_allocations" ("income_id");
CREATE INDEX IF NOT EXISTS "payment_allocations_invoice_id_idx" ON "payment_allocations" ("invoice_id");

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_income_id_income_id_fk" FOREIGN KEY ("income_id") REFERENCES "income"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE restrict ON UPDATE no action;

-- 4. Backfill existing live paid invoices into payment_allocations to preserve all historical data
INSERT INTO "payment_allocations" ("id", "income_id", "invoice_id", "amount", "created_at")
SELECT 
	gen_random_uuid(), 
	"income_id", 
	"id", 
	"total", 
	COALESCE("paid_at", "created_at")
FROM "invoices"
WHERE "status" = 'paid' AND "income_id" IS NOT NULL;
