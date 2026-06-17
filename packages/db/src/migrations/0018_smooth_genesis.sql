CREATE TYPE "public"."credit_note_status" AS ENUM('active', 'partially_applied', 'fully_applied', 'expired', 'void');--> statement-breakpoint
CREATE TYPE "public"."credit_note_type" AS ENUM('overpayment', 'manual_adjustment', 'credit_note', 'promotional', 'refund_reversal');--> statement-breakpoint
CREATE TABLE "credit_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_note_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_by" text NOT NULL,
	CONSTRAINT "credit_applications_amount_positive" CHECK ("credit_applications"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"division_id" uuid NOT NULL,
	"document_number" text NOT NULL,
	"status" "credit_note_status" DEFAULT 'active' NOT NULL,
	"type" "credit_note_type" NOT NULL,
	"reason" text,
	"original_invoice_id" uuid,
	"original_payment_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"amount_remaining" numeric(12, 2) NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	CONSTRAINT "credit_notes_document_number_unique" UNIQUE("document_number"),
	CONSTRAINT "credit_notes_amount_positive" CHECK ("credit_notes"."amount" > 0),
	CONSTRAINT "credit_notes_amount_remaining_non_negative" CHECK ("credit_notes"."amount_remaining" >= 0)
);
--> statement-breakpoint
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_credit_note_id_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_original_invoice_id_invoices_id_fk" FOREIGN KEY ("original_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_original_payment_id_income_id_fk" FOREIGN KEY ("original_payment_id") REFERENCES "public"."income"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_applications_credit_note_id_idx" ON "credit_applications" USING btree ("credit_note_id");--> statement-breakpoint
CREATE INDEX "credit_applications_invoice_id_idx" ON "credit_applications" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "credit_notes_client_id_idx" ON "credit_notes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "credit_notes_status_idx" ON "credit_notes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credit_notes_type_idx" ON "credit_notes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_notes_expires_at_idx" ON "credit_notes" USING btree ("expires_at");