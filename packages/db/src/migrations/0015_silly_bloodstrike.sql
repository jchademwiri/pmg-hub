CREATE TYPE "public"."email_audit_status" AS ENUM('success', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."email_audit_type" AS ENUM('overdue_reminder', 'payment_receipt', 'invoice', 'quote', 'custom');--> statement-breakpoint
CREATE TABLE "email_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resend_email_id" text,
	"email_type" "email_audit_type" NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"client_id" uuid,
	"division_id" uuid,
	"sent_by" text NOT NULL,
	"status" "email_audit_status" NOT NULL,
	"error_message" text,
	"idempotency_key" text NOT NULL,
	"customization_details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_audit_log_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "email_audit_log" ADD CONSTRAINT "email_audit_log_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_audit_log" ADD CONSTRAINT "email_audit_log_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_audit_log" ADD CONSTRAINT "email_audit_log_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_audit_log_client_id_idx" ON "email_audit_log" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "email_audit_log_division_id_idx" ON "email_audit_log" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "email_audit_log_status_idx" ON "email_audit_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_audit_log_created_at_idx" ON "email_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_audit_log_idempotency_key_idx" ON "email_audit_log" USING btree ("idempotency_key");