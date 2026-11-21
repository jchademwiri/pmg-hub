ALTER TABLE "leave_entries" ADD COLUMN "proof_key" text;--> statement-breakpoint
ALTER TABLE "leave_entries" ADD COLUMN "proof_file_name" text;--> statement-breakpoint
ALTER TABLE "leave_entries" ADD COLUMN "proof_mime_type" text;--> statement-breakpoint
ALTER TABLE "leave_entries" ADD COLUMN "proof_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "leave_entries" ADD COLUMN "proof_uploaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leave_entries" ADD CONSTRAINT "leave_entries_proof_size_positive" CHECK ("leave_entries"."proof_size_bytes" IS NULL OR "leave_entries"."proof_size_bytes" > 0);