DROP INDEX IF EXISTS "invoices_recurring_invoice_id_billing_period_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_recurring_invoice_id_billing_period_unique" ON "invoices" USING btree ("recurring_invoice_id","billing_period") WHERE "invoices"."recurring_invoice_id" IS NOT NULL AND "invoices"."status" != 'void';
