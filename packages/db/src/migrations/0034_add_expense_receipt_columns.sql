ALTER TABLE "expenses" ADD COLUMN "receipt_url" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "receipt_file_name" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "receipt_file_size" numeric;
