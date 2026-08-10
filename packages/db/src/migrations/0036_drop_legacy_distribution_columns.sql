-- Drops the legacy salary/reinvest/reserve/flex distribution columns from
-- snapshots. 0035 deactivated these buckets going forward (distribution_settings
-- config only) but kept the historical columns/enum values in place. The app's
-- distribution model has since moved entirely to the accounting/billing system
-- (PMG Share is the only active allocation), so the historical columns are no
-- longer needed either.
--
-- Note: the 'salary'/'reinvest'/'reserve'/'flex' values on the ledger table's
-- allocation_type enum are NOT touched here — Postgres cannot drop enum values
-- while historical rows still reference them, and that's a separate, larger
-- migration with no functional upside (unused enum values are inert).
ALTER TABLE "snapshots" DROP COLUMN IF EXISTS "salary";
--> statement-breakpoint
ALTER TABLE "snapshots" DROP COLUMN IF EXISTS "reinvest";
--> statement-breakpoint
ALTER TABLE "snapshots" DROP COLUMN IF EXISTS "reserve";
--> statement-breakpoint
ALTER TABLE "snapshots" DROP COLUMN IF EXISTS "flex";
