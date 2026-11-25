ALTER TABLE "public_documents" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "last_viewed_at" timestamp;