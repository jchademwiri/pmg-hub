# Requirements Document

## Introduction

This feature integrates the Luno cryptocurrency exchange API into the existing PMG admin app (`apps/admin`) and makes Luno the **single source of truth for all investments**. The manually recorded investment rows (cost, valuations, deposits/withdrawals) that previously lived in the assets register are **archived and removed** in a one-time migration — from that point on, investments are fetched live from Luno and no manual investment upkeep is required. Fixed assets remain manually recorded and unchanged.

The integration fetches **all** Luno accounts live via `/api/1/balance`, converts each crypto balance to a ZAR value using Luno's public ticker endpoint (`/api/1/ticker?pair={ASSET}ZAR`), stores the snapshot in a new `luno_accounts` table via a sync route, and displays investments on the `/assets` page as live rows with ZAR values. Each account links to a detail page at `/assets/luno/[accountId]` showing a balance-over-time chart (Recharts `stepAfter` line) built from the Luno transactions endpoint. Authentication against the Luno API uses HTTP Basic Auth with server-side secrets; no credentials are ever exposed to the client.

## Glossary

- **Luno_API**: The third-party Luno cryptocurrency exchange REST API hosted at `api.luno.com`.
- **Balance_Route**: The Next.js App Router server-side route handler at `apps/admin/src/app/api/luno/balance/route.ts` that proxies `GET /api/1/balance`, enriches each account with a ZAR value from the ticker endpoint, and returns all Luno accounts.
- **Ticker_Endpoint**: Luno's public market-data endpoint `GET /api/1/ticker?pair={ASSET}ZAR`, whose `last_trade` field is the current price of one unit of `ASSET` in ZAR.
- **ZAR_Value**: `zar_value` on a `LunoAccountRow`, computed as `balance × last_trade` rounded to 8 decimal places; `null` when the ticker is unavailable for that asset.
- **History_Route**: The Next.js App Router server-side route handler at `apps/admin/src/app/api/luno/history/[accountId]/route.ts` that proxies the Luno transactions endpoint for a single account.
- **Sync_Route**: The Next.js App Router server-side route handler at `apps/admin/src/app/api/luno/sync/route.ts` (`POST`) that fetches the enriched balance (balance + tickers) and upserts the `luno_accounts` snapshot table.
- **LunoAccounts_Table**: The `luno_accounts` database table storing the latest synced snapshot: `account_id`, `asset`, `name`, `balance`, `reserved`, `unconfirmed`, `zar_value`, `synced_at`.
- **Archive_Migration**: The database migration that copies all manual investment rows (plus their valuations and transactions) into `archived_assets`, `archived_asset_valuations`, and `archived_asset_transactions` backup tables, then deletes them from the register.
- **LunoChart**: The client-side React component at `apps/admin/src/components/luno-chart.tsx` that fetches from the History_Route and renders the balance history chart for one Luno account.
- **LunoAccountRow**: A single entry in the Luno balance response representing one account/wallet, containing `account_id`, `asset`, `balance`, `reserved`, `unconfirmed`, `name` (omitted when not present in the upstream response), and `zar_value` (number or `null`).
- **Balance_Point**: A `{ date: string; balance: number }` object derived from a single Luno transaction entry, where `date` is an ISO-8601 date string (YYYY-MM-DD) and `balance` is the numeric account balance after that transaction, rounded to 8 decimal places.
- **Transaction**: A single entry in the Luno transactions array containing at minimum a `timestamp` (non-negative integer, Unix milliseconds) and a `balance` (string representation of a decimal number parseable as a floating-point value).
- **LUNO_API_KEY_ID**: The Luno API key identifier stored in `apps/admin/.env.local`.
- **LUNO_API_KEY_SECRET**: The Luno API key secret stored in `apps/admin/.env.local`.
- **LUNO_ACCOUNT_ID**: An optional Luno account identifier stored in `apps/admin/.env.local`. When present and non-empty, filters the Balance_Route response (and therefore the synced snapshot) to accounts matching that identifier.
- **Admin_App**: The Next.js 16 App Router application located at `apps/admin`.
- **Assets_Page**: The investments and assets list page at `apps/admin/src/app/(admin)/assets/page.tsx`.
- **Asset_Detail_Page**: The per-asset detail page at `apps/admin/src/app/(admin)/assets/[id]/page.tsx`, which after this feature serves fixed assets only.
- **Fixed_Asset**: An asset of `kind = 'fixed_asset'` in the register; still recorded manually and entirely unaffected by this feature.

---

## Requirements

### Requirement 1: Secure Server-Side Luno API Proxy Routes

**User Story:** As an admin user, I want balance and transaction data fetched securely from Luno, so that my API credentials are never exposed in the browser.

#### Acceptance Criteria

1. THE Balance_Route SHALL accept HTTP GET requests at the path `/api/luno/balance` and SHALL return HTTP 405 with a JSON body `{ "error": "Method Not Allowed" }` for any other HTTP method.
2. THE History_Route SHALL accept HTTP GET requests at the path `/api/luno/history/[accountId]` and SHALL return HTTP 405 with a JSON body `{ "error": "Method Not Allowed" }` for any other HTTP method.
3. WHEN either route receives a GET request, THE route SHALL read `LUNO_API_KEY_ID` and `LUNO_API_KEY_SECRET` from the server-side environment and SHALL NOT include these values in any response body or response header.
4. WHEN either route constructs the upstream request, THE route SHALL encode the credentials as `base64(LUNO_API_KEY_ID + ":" + LUNO_API_KEY_SECRET)` and SHALL set the `Authorization` header to `Basic <encoded>`.
5. WHEN THE Balance_Route calls the Luno balance endpoint, THE Balance_Route SHALL use the URL `https://api.luno.com/api/1/balance` with HTTPS only, and SHALL enforce a request timeout of 10 seconds; IF the upstream request exceeds 10 seconds without a response, THE Balance_Route SHALL return HTTP 504 with JSON body `{ "error": "Upstream timeout" }`.
6. WHEN THE History_Route calls the Luno transactions endpoint, THE History_Route SHALL use the URL `https://api.luno.com/api/1/accounts/{accountId}/transactions?min_row=-100&max_row=0` with HTTPS only, where `{accountId}` is the dynamic path segment from the request URL; THE History_Route SHALL enforce a request timeout of 10 seconds; IF the upstream request exceeds 10 seconds without a response, THE History_Route SHALL return HTTP 504 with JSON body `{ "error": "Upstream timeout" }`.
7. IF either required environment variable (`LUNO_API_KEY_ID` or `LUNO_API_KEY_SECRET`) is absent or an empty string, THEN THE route SHALL return an HTTP 500 response with a JSON body `{ "error": "Server configuration error" }` and SHALL NOT make an outbound request to the Luno_API.
8. IF the Luno_API returns a non-2xx HTTP status, THEN THE route SHALL return an HTTP 502 response with a JSON body `{ "error": "Upstream error", "status": <luno_status_code> }`.
9. IF the Luno_API response body cannot be parsed as JSON, or THE Balance_Route response does not contain a `balance` array, or THE History_Route response does not contain a `transactions` array, THEN THE route SHALL return an HTTP 502 response with a JSON body `{ "error": "Invalid upstream response" }`.
10. WHEN THE Balance_Route returns a successful response, THE Balance_Route SHALL respond with HTTP 200 and a JSON body `{ "accounts": [LunoAccountRow, ...] }` where each element is the pass-through mapping of the corresponding entry in the upstream `balance` array, enriched with `zar_value`.
11. WHEN THE History_Route returns a successful response, THE History_Route SHALL respond with HTTP 200 and a JSON body `{ "data": [Balance_Point, ...] }` where each element is derived from the corresponding entry in the upstream `transactions` array.
12. WHEN THE History*Route receives a GET request, THE History_Route SHALL validate that the `accountId` path segment contains only characters matching `[A-Za-z0-9*-]`and is at most 64 characters long; IF the`accountId`fails this validation, THE History_Route SHALL return HTTP 400 with a JSON body`{ "error": "Invalid account ID" }` and SHALL NOT make an outbound request to the Luno_API.

### Requirement 2: Balance History Data Transformation

**User Story:** As an admin user, I want to see my Luno investment balance plotted over time, so that I can track the growth of my crypto portfolio visually.

#### Acceptance Criteria

1. WHEN the History_Route receives a transactions array where each entry contains a non-negative integer `timestamp` and a parseable numeric `balance` string, THE History_Route SHALL map each Transaction to a Balance_Point by converting `timestamp` from Unix milliseconds to an ISO-8601 date string (YYYY-MM-DD using UTC) and parsing `balance` to a floating-point number rounded to 8 decimal places.
2. WHEN mapping transactions, THE History_Route SHALL preserve the original chronological order of the transactions array as returned by the Luno_API.
3. WHEN the Luno_API returns a successful response containing an empty transactions array, THE History_Route SHALL return an HTTP 200 response with a JSON body `{ "data": [] }`.
4. WHEN the mapping of all transactions completes successfully, THE History_Route SHALL return HTTP 200 with a JSON body `{ "data": [Balance_Point, ...] }` where each Balance_Point conforms to `{ date: string; balance: number }`.
5. WHEN multiple transactions occur on the same calendar date, THE History_Route SHALL include each as a separate Balance_Point, preserving the intra-day chronological order.
6. IF any transaction entry in the Luno_API response is missing the `timestamp` field, has a non-integer `timestamp`, has a negative or zero `timestamp`, is missing the `balance` field, or has a `balance` value that cannot be parsed as a number, THEN THE History_Route SHALL return HTTP 422 with a JSON body `{ "error": "Invalid transaction data", "field": "<field_name>" }` and SHALL NOT return a partial transformation.
7. IF the Luno_API returns a non-2xx HTTP status during a transformation request, THEN THE History_Route SHALL return HTTP 502 with a JSON body `{ "error": "Upstream error", "status": <luno_status_code> }` and SHALL NOT attempt to transform any partial data.

### Requirement 3: Client-Side Balance History Chart

**User Story:** As an admin user, I want to see the balance history for a Luno account rendered as a line chart on the asset detail page, so that I can visually assess my investment performance over time without manually recording valuations.

#### Acceptance Criteria

1. THE LunoChart SHALL be a client-side React component (using the `"use client"` directive) located at `apps/admin/src/components/luno-chart.tsx`.
2. THE LunoChart SHALL accept an `accountId` prop of type `string` and SHALL use it to construct the fetch URL `/api/luno/history/{accountId}`.
3. WHEN LunoChart mounts with a non-empty `accountId` prop, THE LunoChart SHALL issue a GET request to `/api/luno/history/{accountId}` with a 30-second timeout and SHALL use the response body's `data` array as the chart dataset; IF the request exceeds 30 seconds, THE LunoChart SHALL treat it as a network failure and enter the error state.
4. WHILE the fetch request is in progress, THE LunoChart SHALL display a loading skeleton placeholder with `width="100%"` and `height="400px"` in place of the chart.
5. IF the fetch request rejects (network failure or timeout) or the API returns a non-2xx status, THE LunoChart SHALL display the error message string from the response body (if available) or `"Failed to load portfolio data."` and SHALL NOT render the chart.
6. WHEN balance history data is successfully loaded and the `data` array contains at least one Balance_Point, THE LunoChart SHALL render a Recharts `LineChart` containing a `Line` component with `type="stepAfter"` and `dataKey="balance"`.
7. WHILE the chart is rendered, THE LunoChart SHALL bind the X-axis to the `date` field of each Balance_Point and the Y-axis to the `balance` field, formatting Y-axis tick labels as numbers with two decimal places.
8. WHILE the chart is rendered, THE LunoChart SHALL include a Recharts `Tooltip` that displays the `date` value and the `balance` formatted to two decimal places on hover.
9. WHEN the fetch request returns HTTP 200 and the `data` array is empty, THE LunoChart SHALL display the static message `"No transaction history available."` centred within the chart container and SHALL NOT render the chart axes or line.
10. THE LunoChart SHALL wrap the `LineChart` in a Recharts `ResponsiveContainer` with `width="100%"` and `height="400px"` so the chart fills its parent container's full width at a fixed height.
11. IF the `accountId` prop is an empty string or undefined at mount time, THE LunoChart SHALL NOT issue a fetch request and SHALL display the static message `"No account selected."` centred within the chart container.

### Requirement 4: Luno Accounts Balance Fetch with ZAR Conversion

**User Story:** As an admin user, I want all my Luno accounts fetched automatically with their ZAR value, so that I can see every wallet's current balance and value without manually configuring each account ID or entering prices by hand.

#### Acceptance Criteria

1. WHEN THE Balance_Route receives a GET request and both `LUNO_API_KEY_ID` and `LUNO_API_KEY_SECRET` are present and non-empty, THE Balance_Route SHALL call `https://api.luno.com/api/1/balance` and derive its response from the `balance` array in the upstream response.
2. WHEN the Luno_API returns a `balance` array, THE Balance_Route SHALL map each entry to a LunoAccountRow object containing `account_id`, `asset`, `balance`, `reserved`, and `unconfirmed` from the upstream entry; THE Balance_Route SHALL include `name` only when the upstream entry contains it as a non-empty string and SHALL omit the `name` field entirely otherwise.
3. AFTER mapping accounts, THE Balance_Route SHALL determine the set of unique `asset` values among the returned accounts and, for each, issue a GET request to `https://api.luno.com/api/1/ticker?pair={ASSET}ZAR` with the same 10-second timeout; ticker calls SHALL be issued in parallel (Promise.all) and SHALL NOT require authentication.
4. FOR each account, THE Balance_Route SHALL compute `zar_value = round(parseFloat(balance) × last_trade, 8)` using the `last_trade` field of the corresponding ticker response, and SHALL include `zar_value` as a number on the LunoAccountRow.
5. IF a ticker request for an asset fails (timeout, non-2xx, network error) or its response body is invalid or missing a parseable `last_trade`, THE Balance_Route SHALL set `zar_value: null` for the accounts of that asset and SHALL NOT fail the whole request; THE Balance_Route SHALL still return HTTP 200 with the remaining accounts.
6. IF `LUNO_ACCOUNT_ID` is set to a non-empty string in the server environment, THEN THE Balance_Route SHALL return only the accounts whose `account_id` exactly matches the value of `LUNO_ACCOUNT_ID`, and SHALL only fetch tickers for the assets of the filtered accounts.
7. IF `LUNO_ACCOUNT_ID` is set to a non-empty string and no account in the upstream response has an `account_id` matching that value, THEN THE Balance_Route SHALL return HTTP 200 with a JSON body `{ "accounts": [] }`.
8. WHERE `LUNO_ACCOUNT_ID` is absent or an empty string in the server environment, THE Balance_Route SHALL return all accounts from the upstream response without filtering.
9. WHEN the Luno_API returns a successful response containing an empty `balance` array, THE Balance_Route SHALL return HTTP 200 with a JSON body `{ "accounts": [] }`.
10. WHEN the mapping of all accounts completes successfully, THE Balance_Route SHALL return HTTP 200 with a JSON body `{ "accounts": [LunoAccountRow, ...] }`.

### Requirement 5: Sync Route and Luno Accounts Snapshot

**User Story:** As an admin user, I want the Luno balances and ZAR values stored in the app's database, so that the assets page renders fast and stays useful even when Luno is temporarily unreachable.

#### Acceptance Criteria

1. THE Admin_App SHALL provide a route at `/api/luno/sync` that accepts HTTP POST requests and SHALL return HTTP 405 with a JSON body `{ "error": "Method Not Allowed" }` for any other HTTP method.
2. WHEN THE Sync_Route receives a POST request with valid credentials, THE Sync_Route SHALL fetch the enriched balance (accounts with `zar_value`, using the same logic as the Balance_Route) and upsert each account into the `luno_accounts` table keyed on `account_id`, updating `asset`, `name`, `balance`, `reserved`, `unconfirmed`, `zar_value`, and `synced_at` (now) on conflict.
3. WHEN THE Sync_Route receives a POST request with missing or empty credentials, THE Sync_Route SHALL return HTTP 500 with `{ "error": "Server configuration error" }` without making an outbound request.
4. IF the underlying balance/ticker fetch fails with a 5xx-class upstream failure, THE Sync_Route SHALL return the corresponding error (504 timeout / 502 upstream) and SHALL NOT modify the `luno_accounts` table.
5. WHEN a ticker for an asset is unavailable, THE Sync_Route SHALL store `zar_value = null` for the accounts of that asset, preserving the last-known `zar_value` is NOT required — the snapshot reflects the latest sync attempt.
6. WHEN the sync succeeds, THE Sync_Route SHALL return HTTP 200 with `{ "synced": <count> }` where `<count>` is the number of accounts upserted.
7. THE `luno_accounts` table SHALL expose queries `getLunoAccounts()` (all accounts ordered by `zar_value` descending), `getLunoAccountById(accountId)`, and `getLunoInvestmentsValue()` (the sum of `zar_value`, treating `null` as 0).

### Requirement 6: Archive Manual Investments Migration

**User Story:** As a developer migrating this feature in, I want the manually recorded investment rows archived safely, so that no ZAR cost-basis history is lost while the register transitions to Luno-only investments.

#### Acceptance Criteria

1. THE Archive_Migration SHALL create backup tables `archived_assets`, `archived_asset_valuations`, and `archived_asset_transactions` mirroring the structure of `assets`, `asset_valuations`, and `asset_transactions` respectively (via `LIKE ... INCLUDING ALL`).
2. THE Archive_Migration SHALL copy every row of `assets` with `kind = 'investment'` into `archived_assets`, and copy the corresponding `asset_valuations` and `asset_transactions` rows (joined on `asset_id`) into their archived counterparts, BEFORE deleting anything.
3. THE Archive_Migration SHALL then delete all investment rows from `assets` (cascading to their valuations and transactions), leaving only `fixed_asset` rows in the register.
4. THE Archive_Migration SHALL create the `luno_accounts` table (see Requirement 5) in the same migration.
5. THE Archive_Migration SHALL be idempotent in effect for fresh databases: when no investment rows exist, the archive copies zero rows and the delete removes nothing.
6. AFTER the Archive_Migration, the `asset_kind` enum SHALL retain the `investment` value (no enum value removal) but the Admin_App SHALL NOT create new investment rows; the `AddAssetDialog` SHALL create `fixed_asset` rows only.

### Requirement 7: Assets Page — Luno-Only Investments View

**User Story:** As an admin user, I want the investments section of the assets page to show my live Luno portfolio with ZAR values, so that I no longer have to record investments by hand.

#### Acceptance Criteria

1. WHEN the Assets_Page renders, THE Assets_Page SHALL render a Luno investments section (titled "Crypto Portfolio") showing one row per account from `luno_accounts`, displaying the account `asset`, `name` (or an em dash `—` when absent), `balance` (crypto, 8 decimal places), and `zar_value` formatted as ZAR (or `—` when `null`).
2. THE Assets_Page SHALL render the "Investments Value" stat card from `getLunoInvestmentsValue()` (the sum of synced `zar_value`s) instead of the manual register's investment aggregation; the "Fixed Assets Value" and "Total Active Assets" cards SHALL continue to derive from the fixed-asset register.
3. WHEN the `luno_accounts` table is empty or has never been synced, THE Assets_Page SHALL display `"No Luno accounts found."` in the investments section and render a "Sync now" control that calls the Sync_Route and refreshes the page data.
4. THE Assets_Page SHALL render the synced-at timestamp (`synced_at`) subtly in the investments section header so users know the data is a snapshot, and SHALL provide a manual "Refresh" control that re-runs the Sync_Route and refreshes the displayed data.
5. WHEN a user clicks a Luno account row on the Assets_Page, THE Assets_Page SHALL navigate to `/assets/luno/{account_id}` using the `account_id` from the clicked row.
6. THE register table (AssetsTable) SHALL show fixed assets only; THE "Investments" kind filter SHALL be removed from the register table header and the `AddAssetDialog` SHALL NOT offer `investment` as a creatable kind.
7. THE existing fixed-asset flows (register table, `AddAssetDialog`, detail page at `/assets/[id]`) SHALL continue to work unchanged for fixed assets.
8. THE manual investment UI SHALL be removed as dead code: the investment branch of `/assets/[id]` (Deposits & Withdrawals and Valuation History cards) and the `ValuationHistory` / `TransactionHistory` components SHALL be deleted, since no investment rows remain after the Archive_Migration.

### Requirement 8: Asset Detail Page — Luno-Linked Account View

**User Story:** As an admin user, I want to open a Luno account's detail page and see a live balance chart and ZAR summary, so that I don't need to maintain redundant records for live-data assets.

#### Acceptance Criteria

1. THE Admin_App SHALL provide a route at `/assets/luno/[accountId]` that renders a detail page for the Luno account identified by `accountId`.
2. WHEN the Luno detail page loads, THE Admin_App SHALL render the `LunoChart` component, passing the `accountId` route parameter as the `accountId` prop.
3. WHEN the Luno detail page loads, THE Admin_App SHALL look up the account in `luno_accounts` via `getLunoAccountById(accountId)` and display the `asset`, `balance` (8 decimal places), `zar_value` (formatted as ZAR, or `—` when `null`), and `name` in a summary card alongside the chart.
4. IF the account is not found in `luno_accounts`, THE Luno detail page SHALL display the message `"Luno account not found."` in place of the chart and summary card, and SHALL NOT render the chart.
5. THE Luno detail page SHALL NOT render the `TransactionHistory` or `ValuationHistory` forms (they no longer exist after Requirement 7.8).
6. THE standard `Asset_Detail_Page` at `/assets/[id]` SHALL remain for fixed assets and SHALL NOT render any Luno data.

### Requirement 9: Environment Configuration

**User Story:** As a developer deploying this feature, I want clear documentation of required environment variables, so that the integration can be configured without inspecting source code.

#### Acceptance Criteria

1. THE Balance_Route, THE History_Route, and THE Sync_Route SHALL each read `LUNO_API_KEY_ID` and `LUNO_API_KEY_SECRET` exclusively from server-side environment variables (e.g., `process.env`) and SHALL NOT read these values from request query parameters or HTTP request headers supplied by the client.
2. WHEN any route is invoked and `LUNO_API_KEY_ID` or `LUNO_API_KEY_SECRET` is absent or an empty string in the server environment, THE route SHALL return HTTP 500 with a JSON body `{ "error": "Server configuration error" }` without making any outbound network request.
3. THE Luno integration SHALL require exactly `LUNO_API_KEY_ID` and `LUNO_API_KEY_SECRET` as the only mandatory environment variables; WHEN both are present and non-empty, all routes SHALL return a non-500 response without any additional environment variable being set.
4. WHEN `LUNO_ACCOUNT_ID` is absent or an empty string in the server environment, THE Balance_Route SHALL return all accounts from the Luno balance endpoint without filtering and THE History_Route SHALL not alter its behavior relative to the `accountId` path parameter.
5. WHEN `LUNO_ACCOUNT_ID` is set to a non-empty string in the server environment, THE Balance_Route (and therefore the Sync_Route snapshot) SHALL filter its response to only include the account whose `account_id` matches that value, and THE History_Route SHALL continue to use the `accountId` path segment from the request URL as the upstream account identifier without modification.

### Requirement 10: Recharts Dependency

**User Story:** As a developer, I want Recharts available in the admin app, so that I can render the balance history chart without introducing a conflicting charting library.

#### Acceptance Criteria

1. THE `apps/admin/package.json` `dependencies` field SHALL contain `recharts` at version `3.8.0`; this dependency is already present and no installation step is required.
2. THE Admin_App SHALL NOT add `@types/recharts` as a dependency or dev dependency, because `recharts` v2 and later bundles its own TypeScript type definitions.
3. THE LunoChart SHALL import `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, and `CartesianGrid` exclusively from `recharts`.
4. THE LunoChart SHALL NOT import `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, or `CartesianGrid` from any package other than `recharts`.
