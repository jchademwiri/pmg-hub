# PMG Hub — Full Portfolio Audit

**Date:** 2026-07-25
**Scope:** all 5 apps in the `pmg-hub` monorepo — `aws`, `pmg`, `tes`, `admin`, `portal`
**Method:** read-only codebase review (security, quality, dead code, test coverage) + live production pass (SEO, headers, mobile, console errors) + authenticated live session on `admin` (logged in by the repo owner) and root-cause investigation of two bugs found live. No files modified, no destructive actions taken, no credentials entered by the assistant.

## Executive summary

39 findings across the portfolio. Nothing rated critical. The highest-risk items are a dev-mode auth bypass in `portal` and unguarded financial-data mutations in `admin` — both listed first in the priority action list.

| App    | Role                               | High | Medium | Low | Tests            | Live headers |
| ------ | ---------------------------------- | ---- | ------ | --- | ---------------- | ------------ |
| aws    | Marketing — Apex Web Solutions     | 2    | 2      | 4   | Thin             | `/` only     |
| pmg    | Marketing — PMG corporate          | 1    | 4      | 2   | 0                | None         |
| tes    | Marketing — TenderEdge Solutions   | 1    | 2      | 3   | 10/10 passing    | `/` only     |
| admin  | Internal ops console               | 3    | 4      | 2   | 35 failing / 456 | None         |
| portal | Client-facing billing self-service | 2    | 4      | 4   | 0                | None         |

Authenticated live audit of `admin` was completed (repo owner logged in). Authenticated live audit of `portal` remains open — the intended path (impersonation via `admin`'s "view as client") is currently blocked by a live bug documented below.

## Cross-cutting issues

Four patterns repeat across independently-written apps — each one fix (or wire-up) closes the finding everywhere it appears.

1. **Broken client-IP detection nukes rate limiting sitewide.** `apps/aws`, `apps/pmg`, and `apps/tes` all read `context.request.ip` in `src/middleware.ts` — a property that doesn't exist on Astro's standard `Request`. Every visitor collapses into one `'unknown'` bucket, so a single abusive client can 429-lock every real visitor on all three marketing sites. Fix: swap to `context.clientAddress` with an `x-forwarded-for` fallback, in all three files.
2. **Rate limiters are in-memory and inert on serverless.** Same class of bug, five separate implementations: the three Astro middlewares above, plus `apps/admin/src/proxy.ts` and `apps/portal/src/proxy.ts`. A plain `Map` doesn't persist or share state across Vercel's per-invocation instances — none of these bound anything in production. Both `admin` and `portal` already ship a working Upstash-backed limiter (`lib/rate-limit.ts`) that's simply never called on the auth path — this is a wiring fix, not new code.
3. **Security response headers are missing almost everywhere, live-verified.** `playhousemedia.co.za` ships zero security headers on any route. `admin.playhousemedia.co.za` and `portal.playhousemedia.co.za` — the two apps actually handling client and financial data — have zero headers too, including no HSTS. `apexwebsolutions.co.za` and `tenderedgesolutions.co.za` only set headers on `/`; confirmed live that AWS's `/privacy` ships with none.
4. **No privacy/terms page on two of the three lead-capture sites.** `pmg` and `tes` both persist name/phone/email into a database with no linked privacy notice — a POPIA documentation gap; `aws` already has both pages.

## apps/aws — Apex Web Solutions (marketing)

Astro brochure site, deployed on Vercel.

| Sev    | Finding                                                                                                                                                                                                                      | Location                     | Fix                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| High   | Rate-limit bypass via non-existent `request.ip` (cross-cutting #1)                                                                                                                                                           | `src/middleware.ts:10`       | Use `context.clientAddress`, fall back to `x-forwarded-for`        |
| High   | Security headers only applied on the homepage; live-confirmed `/privacy` ships with none                                                                                                                                     | `src/middleware.ts:53-58`    | Move header block outside the `if (pathname === '/')` conditional  |
| Medium | Unescaped JSON-LD via `set:html` — `JSON.stringify` doesn't escape `<`; static data today, low exploitability                                                                                                                | `src/seo/Schema.astro:11`    | `JSON.stringify(item).replace(/</g, '<')`                          |
| Medium | Production secrets in plaintext `.env.local` (gitignored, not leaked — rotation reminder)                                                                                                                                    | `.env.local`                 | Rotate if the file ever left the machine; prefer a secrets manager |
| Low    | Dead pricing data copy-pasted from another app (commented-out TES schema)                                                                                                                                                    | `src/data/pricing/*`         | Delete the folder                                                  |
| Low    | Dead portfolio images (~2.6MB) + external `s0.wp.com/mshots` screenshot dependency instead                                                                                                                                   | `src/assets/portfolio/*.png` | Remove unused files, or wire them in and drop the external calls   |
| Low    | Starter-kit leftovers (unmodified README, starter-named `Welcome.astro`), stray `src/test-emails.ts` smoke script in source tree, thin test coverage (one test re-implements the handler instead of testing the real action) | various                      | Housekeeping pass                                                  |

**Live check (apexwebsolutions.co.za):** SEO/OG/JSON-LD/sitemap/robots.txt all correct and unchanged since the 2026-05-27 audit. Headers present on `/`, confirmed absent on `/privacy`. No mobile overflow at 375px. No console errors.

## apps/pmg — PMG corporate (marketing)

Holding-company landing page; links to TES, AWS, and the TenderTrack 360 SaaS beta, plus its own lead-capture form.

| Sev    | Finding                                                                                                                                                                             | Location                                          | Fix                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| High   | Same `request.ip` rate-limit bypass as aws/tes                                                                                                                                      | `src/middleware.ts:9-11`                          | Use `context.clientAddress` with header fallback                                  |
| Medium | Zero test coverage anywhere in the app                                                                                                                                              | —                                                 | Add a Vitest suite around `src/actions/index.ts`, matching the `apps/tes` pattern |
| Medium | Duplicated, half-dead contact-form logic — `Contact.astro`/`FAQ.astro` built but commented out; live `ContactModal.astro` independently duplicates near-identical bot-protection JS | `src/components/{Contact,FAQ,ContactModal}.astro` | Extract one shared form-submit module; delete the unused pair or wire one in      |
| Medium | No privacy/terms page despite collecting name/phone/email/message into a DB (POPIA gap)                                                                                             | —                                                 | Add a privacy page, link from footer and the form; `apps/aws` has a template      |
| Medium | Oversized OG image (1.27MB)                                                                                                                                                         | `public/og-image.png`                             | Compress to under 300KB                                                           |
| Low    | Dead starter-boilerplate assets never imported                                                                                                                                      | `astro.svg`, `background.svg`, `pmg-logo.png`     | Remove                                                                            |

**Live check (playhousemedia.co.za):** SEO/OG/JSON-LD/sitemap/robots.txt all correct. **Zero security headers on any route**, including the homepage — worse than what code review alone suggested. No mobile overflow. No console errors.

## apps/tes — TenderEdge Solutions (marketing)

Tender-compliance service site; has the most audit history of the three marketing sites (prior audit 2026-05-22). This pass verifies fix status.

| Sev    | Finding                                                                                                                                      | Location                  | Fix                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| High   | Rate-limit bypass — still open since the prior audit, unchanged across 86+ commits since                                                     | `src/middleware.ts:7-8`   | Use `context.clientAddress` with header fallback               |
| Medium | Security headers scoped to `/` only (smaller blast radius — effectively a single-route site, but 404/500/robots.txt still ship without them) | `src/middleware.ts:53-58` | Apply headers unconditionally                                  |
| Medium | In-memory limiter unsound on serverless regardless of the IP fix (cross-cutting #2)                                                          | —                         | Move to a shared KV/Redis store, or accept as best-effort only |
| Low    | Dead `ComingSoon.astro` component, unreferenced anywhere; no privacy/terms page (same POPIA gap as pmg)                                      | —                         | Delete dead component; add privacy page                        |
| Low    | `vitest@^1.4.0` two majors behind current; no active CVE found                                                                               | `package.json`            | Routine bump alongside `fast-check`                            |

**Fixed since the 2026-05-22 audit:** `ServicesSection.test.ts` price-assertion bug is fixed; full suite passing 10/10. Sitemap `customPages` workaround for the `prerender = false` homepage still verified correct.

**Live check (tenderedgesolutions.co.za):** SEO/OG/JSON-LD correct, headers present on `/`. **~38px horizontal-scroll overflow at 375px**, traced to a `.grain-overlay` decorative div. `lang="en"` (sibling `pmg` uses `"en-ZA"` — minor locale inconsistency). No console errors.

## apps/admin — internal ops console

Billing/AR, double-entry accounting, projects, finance, CRM, settings. Better Auth (magic link + OTP), Neon Postgres via Drizzle. The most heavily pre-audited app in the repo (`docs/final-audit/`, `docs/audits/admin-site-audit.md`) — this pass checks fix status and looks for what those missed, plus an authenticated live session.

| Sev           | Finding                                                                                                                                                                                                                                                                                                                                                                | Location                                                                      | Fix                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| High          | Six mutating server actions still have no internal session check — rely entirely on `proxy.ts`-level gating. Of the original 9 flagged files, `clients.ts` and `snapshots.ts` are now fixed; these 6 aren't                                                                                                                                                            | `app/actions/{expenses,income,divisions,expense-categories,leads,reports}.ts` | Add `await getSessionOrRedirect()` at the top of each mutating export                            |
| High          | New file, same gap: project-progress actions are unguarded — not in the original audited file list                                                                                                                                                                                                                                                                     | `app/actions/project-progress.ts`                                             | Same session-guard pattern                                                                       |
| High          | A working rate limiter exists and is never called — auth rate limiting is an in-memory `Map` that resets per cold start; the real Upstash-backed `Ratelimit` in `lib/rate-limit.ts` is imported nowhere. Contradicts the prior audit's claim that rate limiting is "fully operational"                                                                                 | `src/proxy.ts:10-31`, `src/lib/rate-limit.ts`                                 | Call the existing Upstash limiter from the auth path                                             |
| High (live)   | **`/relationships/clients` and `/relationships/leads` hang indefinitely** on loading skeletons — confirmed reproducible after a hard reload. `/relationships/divisions` and `/billing/invoices` load fine with real data, isolating the bug to these two pages                                                                                                         | see root cause below                                                          | See below                                                                                        |
| Medium        | Test suite has regressed, hiding a real bug among mock failures — 15 of 52 files / 35 of 456 tests fail. `clients-actions.test.ts` fails entirely because the session guard was added to `clients.ts` without updating its mocks; two further failures (`project-schedule-transitions`, `project-schedule-risk-badge`) look like genuine behavior changes              | —                                                                             | Mock `@/lib/auth` in the clients test; investigate the two schedule-transition failures directly |
| Medium        | Impersonation link has no expiry enforced by the issuer — correctly checks admin role/active client before minting an HMAC-signed URL, but nothing bounds how long the embedded timestamp remains valid; expiry is delegated entirely to `portal`                                                                                                                      | `app/actions/portal-impersonation.ts`                                         | Add a max-age check on this side too                                                             |
| Medium        | Profit-pool split math isn't guaranteed to sum to the total — four buckets computed as independent float multiplications with no rounding (classic split-remainder problem); `posting.ts` (actual ledger writes) rounds, this display path doesn't. No fast-check property test asserts the sum invariant despite fast-check already being used elsewhere in the suite | `src/lib/financial.ts:80-91`                                                  | Round consistently; add a fast-check test asserting the four buckets sum to the pool             |
| Medium (live) | **Dashboard "Expense Breakdown by Division" shows impossible percentages** (Tender Edge Solutions: "303% of total")                                                                                                                                                                                                                                                    | see root cause below                                                          | See below                                                                                        |
| Low           | Rate limiter fails open if Upstash env vars are absent (moot while unused, risk once wired in); hardcoded `LOCKED_ACCOUNTS` array, open since the prior audit                                                                                                                                                                                                          | `lib/rate-limit.ts`, `packages/db/src/accounts.ts`                            | Log a warning on fail-open; move locked accounts to a DB flag                                    |

### Root cause — Clients/Leads pages hang (confirmed for Leads, high-confidence lead for Clients)

`packages/db/src/queries/leads.ts:107-115`, `getLeadCountsByStatus()`, uses a raw SQL string with unquoted column aliases:

```sql
SELECT
  COUNT(*)                                    AS all,
  COUNT(*) FILTER (WHERE status = 'new')      AS new,
  ...
FROM leads
```

**`ALL` is a fully reserved keyword in PostgreSQL** and cannot be used as an unquoted column alias — this query is very likely throwing a SQL syntax error on every call. `apps/admin/src/app/(admin)/relationships/leads/page.tsx:23-28` awaits this inside an unguarded `Promise.all`, so a rejection here should normally surface Next's `error.tsx` boundary rather than an infinite skeleton — the mismatch between "should error" and "hangs instead" is worth checking directly in Vercel's function logs. **Fix:** quote the aliases (`AS "all"`, or rename to non-reserved words like `total`/`newCount`).

The **Clients** page hang doesn't share this query — `getClientsWithIncomeCount()` (`packages/db/src/queries/clients.ts:37-57`) is a normal Drizzle query-builder call with no obvious syntax issue. Root cause unconfirmed; both pages call `getAllDivisions()` alongside their own heavier query inside a `Promise.all`, and the dashboard alone issues ~16 parallel Neon queries the same way — worth checking Vercel logs for a timeout or Neon connection-pool exhaustion rather than assuming a single shared bug.

### Root cause — Expense Breakdown percentage bug (confirmed)

`packages/db/src/queries/general.ts:53-65`, `getExpensesByDivision()`, has **no date/period filter at all** — it sums _all-time_ expenses per division:

```ts
export async function getExpensesByDivision() {
  return db.select({ divisionId, divisionName, total: sql`COALESCE(SUM(${expenses.amount}), '0')` })
    .from(expenses).innerJoin(divisions, ...).groupBy(...)
}
```

`apps/admin/src/app/(admin)/dashboard/page.tsx:63,112` fetches this once, unscoped by the active tab, and `apps/admin/src/components/dashboard/dashboard-shell.tsx:268` passes it to `<ExpenseSnapshot>` alongside `totalExpenses={activeSummary.expenses}` — which **is** period-scoped (current/previous/YTD depending on the selected tab). A division's all-time expense total can exceed the current month's total expenses, producing the observed >100% figures (R3,842 ÷ R1,267 = 303%). **Fix:** give `getExpensesByDivision()` a date-range parameter and call it with the same period as `activeSummary` for whichever tab is selected, or compute the breakdown from period-scoped data at the call site.

**Live check (admin.playhousemedia.co.za):** Login page — zero security headers including no HSTS; correct `noindex, nofollow` meta; no mobile overflow; no console errors. Authenticated session (repo owner logged in): Dashboard, Invoices, and Divisions all render correctly with real data; Clients and Leads do not (see above).

## apps/portal — client self-service portal

Client-facing billing portal — invoices, quotes, statements, credits, compliance docs, a projects/task-board. Far less documented than `admin`, but functional and near-production despite a stale `create-next-app` README — not a skeleton.

| Sev    | Finding                                                                                                                                                                                                                                                                                                                                                                                             | Location                                               | Fix                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| High   | Dev-mode auth bypass can leak a real client's billing data — `proxy.ts` skips all session checks whenever `NODE_ENV === 'development'`; `portal-session.ts` auto-logs in as the impersonation cookie's client or, with no cookie set, falls back to the first active client in the database. If `NODE_ENV` is ever not exactly `"production"` in a real deploy, this is a full unauthenticated leak | `src/proxy.ts:44`, `src/lib/portal-session.ts:9-73`    | Gate behind an explicit `PORTAL_DEV_BYPASS` flag checked alongside `NODE_ENV`, never `NODE_ENV` alone |
| High   | Same rate-limiting gap as admin — in-memory limiter in `proxy.ts`; a working Upstash limiter exists but is only wired into quote accept/decline, not the auth path                                                                                                                                                                                                                                  | `src/proxy.ts`, `lib/rate-limit.ts`                    | Call `checkRateLimit()` from `proxy.ts` too                                                           |
| Medium | Impersonation hand-builds a Better Auth session cookie — manually inserts a session row and HMAC-signs it to mimic the library's internal format rather than using its session API. Correctly checks admin role, active client, and a 5-minute TTL — but couples to internals that could silently drift on a library upgrade, with no success audit log                                             | `app/(auth)/impersonate/route.ts`                      | Use Better Auth's session-creation API if available; add an audit log entry                           |
| Medium | Quote status banners/list don't match spec — only `accepted`/`declined` render; `sent` (awaiting), expired-warning, `converted`, `cancelled` states and an "Expired" list tab are all missing                                                                                                                                                                                                       | `app/(portal)/quotes/[id]/page.tsx`, `quotes/page.tsx` | Fill in the remaining banner states per the portal spec                                               |
| Medium | Compliance docs and projects modules built outside the documented spec — fully implemented, ownership checks manually verified correct, but never went through a documented security review since they're absent from the PRD                                                                                                                                                                       | `app/actions/compliance.ts`, `app/(portal)/projects/`  | Backfill the spec docs to cover what's actually shipped                                               |
| Medium | Statements page falls back to placeholder bank details when a division's settings are missing, instead of hiding the EFT section — risk of a client paying into fabricated details                                                                                                                                                                                                                  | `app/(portal)/statements/page.tsx:329-341`             | Hide the EFT section entirely when `divSettings` is null                                              |
| Low    | Stale `create-next-app` README; one file imports the shared `db` singleton directly instead of `getDb()`; non-functional OTP toggle on login just shows a toast; profile page is editable though the spec calls V1 view-only                                                                                                                                                                        | various                                                | Batch housekeeping pass                                                                               |
| Low    | Zero automated tests anywhere, including for impersonation and quote accept/decline — the two most consequential server actions in the app                                                                                                                                                                                                                                                          | —                                                      | Start with those two flows given what's at stake                                                      |

**What's solid:** every data-fetching path checked (dashboard, invoices, quotes, statements, credits, compliance, projects, PDF export) correctly scopes by server-resolved `client.id`, never trusts URL params, and matches the PRD's IDOR-prevention design. No raw SQL, no hardcoded secrets, no `dangerouslySetInnerHTML`.

**Live check (portal.playhousemedia.co.za):** Login page — zero security headers including no HSTS; **no `robots` meta tag at all** (unlike admin's correct `noindex, nofollow` — client portal login is technically indexable); no mobile overflow; no console errors. **Authenticated pages not yet audited** — the intended path (impersonation via admin's "view as client" button) is currently blocked by the Clients-page hang documented above.

## Priority action list

Ranked by real-world risk, not by which app it's in.

1. **Fix the portal dev-mode auth bypass** — `apps/portal/src/proxy.ts` + `portal-session.ts`. The single highest-risk finding in the portfolio if `NODE_ENV` is ever misconfigured in a real deploy.
2. **Add session guards to the 7 unguarded admin server actions** — expenses, income, divisions, expense-categories, leads, reports, project-progress. Direct financial-data mutation risk.
3. **Fix the Clients/Leads page hang in admin** — start with quoting the reserved-word aliases in `getLeadCountsByStatus()`; check Vercel logs for the Clients-page root cause. This also blocks the intended client-impersonation audit path into `portal`.
4. **Wire the existing Upstash limiters into both apps' auth paths** — admin and portal; the hard part (a working limiter) is already written.
5. **Fix `request.ip` → `clientAddress` across aws, pmg, tes** — three one-line fixes; currently causes global 429 lockouts from a single abuser on each site.
6. **Apply security response headers unconditionally on all five properties** — currently missing entirely on pmg / admin / portal, partial (home route only) on aws / tes.
7. **Fix the Expense Breakdown percentage bug** — scope `getExpensesByDivision()` to the active dashboard period.
8. **Re-mock `clients-actions.test.ts` in admin**, then look at the two other failing schedule tests — a real regression may be hiding behind what looks like routine mock drift.
9. **Add privacy/terms pages to pmg and tes** — both collect PII with no linked notice; aws already has a template for both pages.

---

_Read-only audit. Live checks ran against production URLs provided by the repo owner, who signed in themselves for the authenticated `admin` session — no credentials were entered by the assistant. Authenticated `portal` audit remains open pending a fix to the Clients-page hang._
