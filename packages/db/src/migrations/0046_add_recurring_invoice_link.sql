ALTER TABLE "invoices" ADD COLUMN "recurring_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "billing_period" text;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_recurring_invoice_id_billing_period_unique" ON "invoices" USING btree ("recurring_invoice_id","billing_period") WHERE "invoices"."recurring_invoice_id" IS NOT NULL;