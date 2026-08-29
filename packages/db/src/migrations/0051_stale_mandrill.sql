CREATE TABLE IF NOT EXISTS "public_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"s3_key" text NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_documents_slug_unique" UNIQUE("slug")
);
