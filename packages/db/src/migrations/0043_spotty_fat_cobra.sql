CREATE TABLE "luno_accounts" (
	"account_id" text PRIMARY KEY NOT NULL,
	"asset" text NOT NULL,
	"name" text,
	"balance" text NOT NULL,
	"reserved" text NOT NULL,
	"unconfirmed" text NOT NULL,
	"zar_value" numeric(20, 8),
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "luno_accounts_asset_idx" ON "luno_accounts" USING btree ("asset");
--> statement-breakpoint
-- ── Archive manual investments (one-time data migration) ─────────────────────
-- Investments are now sourced live from Luno, so the manually recorded
-- investment rows (plus their valuations and deposit/withdrawal history) are
-- copied into archived_* backup tables BEFORE being deleted. This preserves the
-- ZAR cost-basis audit trail while the register transitions to Luno-only.
-- The archived tables are intentionally NOT part of the Drizzle schema: they
-- are a one-time data safety net and are never read by the application.
CREATE TABLE IF NOT EXISTS "archived_assets" (LIKE "assets" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "archived_asset_valuations" (LIKE "asset_valuations" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "archived_asset_transactions" (LIKE "asset_transactions" INCLUDING ALL);
--> statement-breakpoint
INSERT INTO "archived_assets" SELECT * FROM "assets" WHERE "kind" = 'investment';
--> statement-breakpoint
INSERT INTO "archived_asset_valuations" SELECT v.* FROM "asset_valuations" v JOIN "assets" a ON a."id" = v."asset_id" WHERE a."kind" = 'investment';
--> statement-breakpoint
INSERT INTO "archived_asset_transactions" SELECT t.* FROM "asset_transactions" t JOIN "assets" a ON a."id" = t."asset_id" WHERE a."kind" = 'investment';
--> statement-breakpoint
DELETE FROM "assets" WHERE "kind" = 'investment';
