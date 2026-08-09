-- Removes the 'salary', 'reinvest', 'reserve', 'flex' distribution accounts from
-- active use. Keeps historical data intact (enum values and snapshot/ledger
-- columns are left in place; only forward-facing config/defaults change):
--   1. Deactivate distribution_settings rate rows for the removed buckets so
--      getActiveRates()/getCurrentRates() stop surfacing them.
--   2. Point new ledger entries at 'pmg_share' by default instead of 'salary'.
UPDATE "distribution_settings"
SET "is_active" = false, "updated_at" = now()
WHERE "rate_key" IN ('salary', 'reinvest', 'reserve', 'flex') AND "is_active" = true;
--> statement-breakpoint
ALTER TABLE "ledger" ALTER COLUMN "allocation_type" SET DEFAULT 'pmg_share';
