# PMG Hub — Sidebar "Overview" Nav Items

**Repository:** `jchademwiri/pmg-hub` (`dev` branch)
**Companion script:** `add-overview-nav-items.sh`

---

## What this changes, and why

Looking at the sidebar screenshots: Billing, Finance, Accounting, and Relationships are collapsible groups. Clicking the group label expands or collapses it (confirmed in `app-sidebar.tsx` — the label is wrapped in a `CollapsibleTrigger`, not a `Link`). It does **not** navigate anywhere on its own.

That means there was no way to reach a group's own root page (`/billing`, `/finance`, `/accounting`, `/relationships`) from the sidebar at all, even though those root pages already exist in the app (as Coming Soon placeholders for Billing/Finance/Accounting; not yet built for Relationships). The fix: add an "Overview" item as the first entry inside each group's expanded list, linking to that group's existing root path.

**This does not create any new route.** `/billing`, `/finance`, and `/accounting` already exist; this only adds a sidebar shortcut to them. `/relationships` does not have a root page yet — the nav link is added for consistency, but it will 404 until that page exists (see step 4 in the script's printed output, and note in the section below).

---

## The bug this surfaces (and fixes)

The sidebar's active-state logic used:

```ts
const isActive = item.url === '/settings'
  ? pathname === '/settings'
  : pathname.startsWith(item.url)
```

There was already a special case for `/settings`, with a comment explaining why: without it, `/settings` would show as "active" while viewing `/settings/users`, because `'/settings/users'.startsWith('/settings')` is true. The same problem would have appeared for every new Overview item — `/billing` showing active while actually viewing `/billing/invoices`, and so on for Finance, Accounting, and Relationships.

Rather than adding four more special cases, the check is generalized:

```ts
const isGroupRoot = item.url.split('/').filter(Boolean).length === 1
const isActive = isGroupRoot
  ? pathname === item.url
  : pathname.startsWith(item.url)
```

Any nav item whose URL is a single path segment (`/billing`, `/finance`, `/accounting`, `/relationships`, `/settings`) now gets exact-match behavior automatically. Sub-routes (`/billing/invoices`, `/finance/income`, etc.) keep the original `startsWith` behavior, which is correct for them.

---

## Files changed

### `apps/admin/src/components/navigation/nav-data.ts`

- Added `LayoutGrid` to the icon imports (used for all four new Overview items, kept visually distinct from the `LayoutDashboard` icon already used for the top-level "Dashboard" item).
- Added an `Overview` item as the **first** entry in the `items` array for the Billing, Finance, Accounting, and Relationships groups, each pointing at that group's root path.
- Removed `/billing`, `/finance`, `/accounting`, and `/billing/accounts` from `EXTRA_LABELS`. That object exists specifically for routes that exist in the app but aren't sidebar items — now that `/billing`, `/finance`, and `/accounting` are real sidebar items (as "Overview"), and `/billing/accounts` was already a sidebar item, listing them again was redundant and risked drifting out of sync with the actual sidebar entries.

### `apps/admin/src/components/navigation/app-sidebar.tsx`

- Generalized the `isActive` check in `NavMenu` from a `/settings`-only special case to any single-segment root path, as described above.

---

## A side effect worth a decision

Because `ROUTE_LABELS` is auto-derived from the sidebar items (`derivedLabels`), and `/billing`/`/finance`/`/accounting` are now sidebar items titled "Overview" rather than entries in `EXTRA_LABELS` titled "Billing"/"Finance"/"Accounting", any breadcrumb or page title that reads from `ROUTE_LABELS` will now show "Overview" instead of the section name when on that root page.

This matches the literal request — "Overview" is meant to be the nav label, and it's the same root route either way — but if you'd rather the breadcrumb still say "Billing" while the *sidebar item* says "Overview", that needs splitting into two separate label sources (one for sidebar item titles, one for breadcrumb/page titles) rather than deriving both from the same `title` field. Flagging this now rather than silently picking one; let me know if you want it split.

---

## What's still open

- `/relationships` has no root `page.tsx` at all (unlike `/billing`, `/finance`, `/accounting`, which already have Coming Soon placeholders). The new "Overview" link under Relationships will 404 until that page is created. This was already a known gap from the previous routes audit, not something this change introduces — but it's now reachable from the sidebar, which makes the missing page more visible.
- No changes were made to `/dashboard`, `/insights`, or `/settings` groups — those weren't part of this request.

---

## How to apply

Run from the repo root:

```bash
bash add-overview-nav-items.sh
```

The script uses exact-string matching (via an embedded Python step) rather than line numbers, so if your local `nav-data.ts` or `app-sidebar.tsx` has changed since this script was written, it fails loudly with no changes written, rather than silently corrupting the file. It's also safe to run twice — it detects already-applied changes and skips them instead of duplicating.

This was tested end-to-end against a fresh pull of the actual repo before being handed over: both files produced by the script are byte-for-byte identical to the manually verified version.
