CREATE TYPE "public"."asset_transaction_type" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
CREATE TABLE "asset_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" "asset_transaction_type" NOT NULL,
	"transaction_date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"quantity" numeric(20, 8),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_transactions_amount_non_negative" CHECK ("asset_transactions"."amount" >= 0),
	CONSTRAINT "asset_transactions_quantity_non_negative" CHECK ("asset_transactions"."quantity" IS NULL OR "asset_transactions"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "asset_transactions" ADD CONSTRAINT "asset_transactions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_transactions_asset_id_idx" ON "asset_transactions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_transactions_transaction_date_idx" ON "asset_transactions" USING btree ("transaction_date");
