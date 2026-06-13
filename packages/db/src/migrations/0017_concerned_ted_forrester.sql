ALTER TABLE "snapshots" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "snapshots" ADD COLUMN "status" text DEFAULT 'locked' NOT NULL;--> statement-breakpoint
ALTER TABLE "snapshots" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "snapshots" ADD COLUMN "closed_at" timestamp with time zone DEFAULT now() NOT NULL;