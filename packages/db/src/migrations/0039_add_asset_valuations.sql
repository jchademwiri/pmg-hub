CREATE TABLE "asset_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"valuation_date" date NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_valuations_value_non_negative" CHECK ("asset_valuations"."value" >= 0)
);
--> statement-breakpoint
ALTER TABLE "asset_valuations" ADD CONSTRAINT "asset_valuations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_valuations_asset_id_idx" ON "asset_valuations" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_valuations_valuation_date_idx" ON "asset_valuations" USING btree ("valuation_date");
