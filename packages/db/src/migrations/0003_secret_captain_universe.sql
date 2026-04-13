CREATE TYPE "public"."allocation_type" AS ENUM('salary', 'reinvest', 'reserve', 'flex');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('spend', 'transfer', 'adjustment');--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"allocation_type" "allocation_type" DEFAULT 'salary' NOT NULL,
	"entry_type" "entry_type" DEFAULT 'spend' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" text,
	CONSTRAINT "ledger_amount_positive" CHECK ("ledger"."amount" > 0)
);
--> statement-breakpoint
CREATE INDEX "ledger_date_idx" ON "ledger" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ledger_allocation_type_idx" ON "ledger" USING btree ("allocation_type");