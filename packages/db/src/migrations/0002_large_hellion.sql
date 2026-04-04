CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"revenue" numeric(12, 2) NOT NULL,
	"expenses" numeric(12, 2) NOT NULL,
	"pmg_share" numeric(12, 2) NOT NULL,
	"profit_pool" numeric(12, 2) NOT NULL,
	"salary" numeric(12, 2) NOT NULL,
	"reinvest" numeric(12, 2) NOT NULL,
	"reserve" numeric(12, 2) NOT NULL,
	"flex" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_period_unique" UNIQUE("period")
);
--> statement-breakpoint
CREATE INDEX "snapshots_period_idx" ON "snapshots" USING btree ("period");