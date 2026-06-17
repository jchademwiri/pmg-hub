CREATE TABLE "credit_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_note_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"refund_date" date NOT NULL,
	"refund_method" text DEFAULT 'bank_transfer' NOT NULL,
	"reference" text,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_refunds_amount_positive" CHECK ("credit_refunds"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "credit_refunds" ADD CONSTRAINT "credit_refunds_credit_note_id_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_refunds" ADD CONSTRAINT "credit_refunds_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_refunds_client_id_idx" ON "credit_refunds" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "credit_refunds_credit_note_id_idx" ON "credit_refunds" USING btree ("credit_note_id");