ALTER TABLE "public_documents" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "subtitle" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "category" text DEFAULT 'sbd_form' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "seo_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "content" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "common_mistakes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "file_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "mime_type" text DEFAULT 'application/pdf' NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "sort_order" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "public_documents" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_public_documents_published_sort" ON "public_documents" USING btree ("is_published","category","sort_order");