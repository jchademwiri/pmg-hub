# Implementation Plan: Luno Portfolio Dashboard (Luno-Only Investments)

## Overview

Make Luno the single source of truth for all investments in `apps/admin`. The plan: archive the manual investment rows (one-time migration), build the enriched Balance_Route (balance + ZAR ticker conversion), build the Sync_Route that upserts a `luno_accounts` snapshot table, build the History_Route + `LunoChart`, rework the assets page (Crypto Portfolio from the snapshot, ZAR stat card, fixed-assets-only register), add the `/assets/luno/[accountId]` detail page, and remove the manual investment dead code. Fixed assets remain manual and untouched.

All dependencies (`recharts@3.8.0`, `vitest`, `fast-check`, `@testing-library/react`) are already present — no installation step is required.

---

## Tasks

### Wave 0 — Docs & data model

- [ ] 0.1 Update `requirements.md` / `design.md` / `tasks.md` for Luno-only investments + ZAR ticker sync
- [ ] 0.2 Add `packages/db/src/schema/luno.ts` (`luno_accounts`) and export from `schema/index.ts`
- [ ] 0.3 Add `packages/db/src/queries/luno.ts` (`getLunoAccounts`, `getLunoAccountById`, `getLunoInvestmentsValue`, `upsertLunoAccounts`) and export from `queries/index.ts`

### Wave 1 — Migration (archive manual investments + snapshot table)

- [ ] 1.1 Run `drizzle-kit generate` in `packages/db` to create `0043_luno_investments.sql` (luno_accounts DDL + journal + snapshot)
- [ ] 1.2 Hand-extend `0043_luno_investments.sql` with archive statements:
  - Create `archived_assets`, `archived_asset_valuations`, `archived_asset_transactions` via `LIKE ... INCLUDING ALL`
  - `INSERT INTO archived_* SELECT ... WHERE kind = 'investment'` (valuations/transactions joined on `asset_id`)
  - `DELETE FROM assets WHERE kind = 'investment'`
- [ ] 1.3 Verify the migration SQL by inspection (idempotent on empty register; fixed assets untouched)

### Wave 2 — Shared Luno lib (balance + ticker enrichment)

- [ ] 2.1 Extend `apps/admin/src/lib/luno.ts`:
  - Add `zar_value: number | null` to `LunoAccountRow`
  - Add `buildTickerUrl(asset)` → `https://api.luno.com/api/1/ticker?pair={asset}ZAR`
  - Add `mapTickerPrice(body)` → `last_trade` as finite non-negative number, else `null`
  - Add `fetchLunoAccounts()`: credentials → balance fetch (10s timeout) → map rows → optional `LUNO_ACCOUNT_ID` filter → parallel ticker fetch per unique asset → `zar_value` enrichment (null on ticker failure)
- [ ] 2.2 Refactor Balance_Route `GET` to delegate to `fetchLunoAccounts()` and return `{ accounts }`; keep the 405 guards and error mapping (500/504/502)
- [ ] 2.3 Update/extend tests for the new helpers (`buildTickerUrl`, `mapTickerPrice`) and the enriched route (ticker failure → `zar_value: null`, still 200)

### Wave 3 — Sync route

- [ ] 3.1 Create `apps/admin/src/app/api/luno/sync/route.ts`:
  - Export only `POST` (405 otherwise)
  - Call `fetchLunoAccounts()`, then `upsertLunoAccounts(accounts)` from `@pmg/db`
  - Return `{ synced: count }`; map errors like the Balance_Route
- [ ] 3.2 Tests: successful sync upserts rows; missing credentials → 500 with no DB writes; idempotent re-sync

### Wave 4 — History route

- [ ] 4.1 Create `apps/admin/src/app/api/luno/history/[accountId]/route.ts` (spec: `buildLunoUrl`, `transformTransaction`, `transformTransactions` already in `lib/luno.ts`)
- [ ] 4.2 Tests: unit (buildLunoUrl, transformTransaction, transformTransactions) + properties 5, 6, 7, 11 + integration round-trip, timeout, empty array

### Wave 5 — LunoChart

- [ ] 5.1 Create `apps/admin/src/components/luno-chart.tsx` (`"use client"`, Recharts `stepAfter` line, five states, `balanceFormatter` export, theme-token chart colours)
- [ ] 5.2 Tests: property 8 (`balanceFormatter`), unit formatter cases, RTL state tests (skeleton/error/empty/idle/ready)

### Wave 6 — Assets page rework

- [ ] 6.1 Update `apps/admin/src/app/(admin)/assets/page.tsx`:
  - `Investments Value` stat card from `getLunoInvestmentsValue()`
  - Crypto Portfolio card (server-rendered rows from `getLunoAccounts()`, Live badge, `synced_at` caption, rows link to `/assets/luno/{account_id}`)
  - Remove `Investments` kind filter from the register table; `AddAssetDialog` creates `fixed_asset` only
- [ ] 6.2 Create `apps/admin/src/components/luno-sync-button.tsx` (`'use client'`: POST `/api/luno/sync` → `router.refresh()`, inline error, spinner)
- [ ] 6.3 Tests: stat card uses Luno value; register excludes investments; sync button refreshes

### Wave 7 — Luno detail page + dead code removal

- [ ] 7.1 Create `apps/admin/src/app/(admin)/assets/luno/[accountId]/page.tsx` (server component: summary card from `getLunoAccountById`, `LunoChart`, back button, "Luno account not found.")
- [ ] 7.2 Remove manual investment dead code: investment branch of `/assets/[id]` (Deposits & Withdrawals, Valuation History cards) + delete `transaction-history.tsx` and `valuation-history.tsx`
- [ ] 7.3 Verify `/assets/[id]` still works for fixed assets (typecheck + manual smoke)

### Wave 8 — Final checks

- [ ] 8.1 Run `pnpm --filter admin test` (and `@pmg/db` tests if any) — all suites pass
- [ ] 8.2 Run the admin typecheck / build — no type errors
- [ ] 8.3 Confirm `apps/admin/.env.local` documents `LUNO_API_KEY_ID`, `LUNO_API_KEY_SECRET`, `LUNO_ACCOUNT_ID`

---

## Notes

- All paths are relative to `apps/admin/src/` unless prefixed with `packages/` or `apps/admin/`
- `balanceFormatter` is a named export from `luno-chart.tsx` so it can be tested without mounting the component
- `buildAuthHeader`, `buildLunoUrl`, `transformTransaction(s)`, `buildTickerUrl`, `mapTickerPrice`, and `fetchLunoAccounts` live in `src/lib/luno.ts` so routes share one source of truth
- The `archived_*` tables are NOT part of the Drizzle schema — one-time data safety net only
- The `asset_kind` enum keeps its `investment` value; the app stops creating investment rows
- `recharts` ships its own TypeScript types in v2+; do not add `@types/recharts`
- `ResponsiveContainer` requires an explicit height — the `height="400px"` prop satisfies this
- The fixed-asset flows (`/assets/[id]`, register table, `AddAssetDialog`) are left working, with only investment-specific code removed

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1", "0.2", "0.3"] },
    { "id": 1, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["5.1", "5.2"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
