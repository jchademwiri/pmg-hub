# Route Grouping Refactor Plan
## Align URL structure with navigation groups

**Date:** May 2026  
**Goal:** Group routes under URL prefixes that match the sidebar navigation groups.  
**Risk level:** High — touches every route, every action, every link, and the test suite.  
**Estimated effort:** 1–2 days

---

## Current vs Target URL Structure

| Group | Current URLs | Target URLs |
|---|---|---|
| Finance | `/income`, `/expenses`, `/expense-categories`, `/ledger`, `/accounts` | `/finance/income`, `/finance/expenses`, `/finance/categories`, `/finance/ledger`, `/finance/accounts` |
| Billing | `/billing/quotes`, `/billing/invoices`, `/billing/statements`, `/billing/items` | unchanged — already grouped |
| Relationships | `/clients`, `/leads`, `/divisions` | `/relationships/clients`, `/relationships/leads`, `/relationships/divisions` |
| Insights | `/snapshots`, `/reports` | `/insights/snapshots`, `/insights/reports` |
| System | `/settings`, `/settings/*` | unchanged — already grouped |
| Overview | `/dashboard` | unchanged |

---

## What Needs to Change

### 1. File system — move route directories

Next.js App Router maps the file path directly to the URL. Moving a folder = changing the URL.

**Finance group** — create `(admin)/finance/` route group:
```
(admin)/income/           →  (admin)/finance/income/
(admin)/expenses/         →  (admin)/finance/expenses/
(admin)/expense-categories/ → (admin)/finance/categories/
(admin)/ledger/           →  (admin)/finance/ledger/
(admin)/accounts/         →  (admin)/finance/accounts/
```

Note: `expense-categories` → `categories` (shorter, cleaner URL).

**Relationships group** — create `(admin)/relationships/` route group:
```
(admin)/clients/          →  (admin)/relationships/clients/
(admin)/leads/            →  (admin)/relationships/leads/
(admin)/divisions/        →  (admin)/relationships/divisions/
```

**Insights group** — create `(admin)/insights/` route group:
```
(admin)/snapshots/        →  (admin)/insights/snapshots/
(admin)/reports/          →  (admin)/insights/reports/
```

### 2. nav-data.ts — update all URLs

Every `url` in `GROUPS` must be updated to the new paths. This is the single source of truth — the sidebar, breadcrumbs, and active-state detection all derive from it.

### 3. Server actions — update all revalidatePath() calls

Every `revalidatePath('/income')` becomes `revalidatePath('/finance/income')`, etc.

**Files to update:**
- `actions/income.ts` — `/income` → `/finance/income`
- `actions/expenses.ts` — `/expenses` → `/finance/expenses`
- `actions/expense-categories.ts` — `/expense-categories` → `/finance/categories`, `/expenses` → `/finance/expenses`
- `actions/ledger.ts` — `/ledger` → `/finance/ledger`, `/accounts` → `/finance/accounts`
- `actions/clients.ts` — `/clients` → `/relationships/clients`
- `actions/leads.ts` — `/leads` → `/relationships/leads`
- `actions/divisions.ts` — `/divisions` → `/relationships/divisions`
- `actions/snapshots.ts` — `/snapshots` → `/insights/snapshots`
- `actions/billing-invoices.ts` — `/income` → `/finance/income`

### 4. Hardcoded href links in page components

**Files to update:**
- `clients/[id]/page.tsx` — `href="/clients"` → `/relationships/clients`
- `leads/[id]/page.tsx` — `href="/leads"` → `/relationships/leads`
- `divisions/[id]/page.tsx` — `href="/divisions"` → `/relationships/divisions`
- `accounts/[account]/page.tsx` — `href="/accounts"` → `/finance/accounts`
- `billing/invoices/[id]/invoice-detail-actions.tsx` — `href="/income"` → `/finance/income`
- All not-found pages — update link hrefs

### 5. not-found.tsx files — update link hrefs

All scoped not-found pages reference old URLs. Update each one.

### 6. app/not-found.tsx — update quick links

The global 404 page has hardcoded quick links to `/leads`, `/clients`, `/income`, `/expenses`.

### 7. Test files — update any hardcoded route references

Check `__tests__/` for any hardcoded route strings.

### 8. Middleware (if any)

No middleware file found — no changes needed here.

---

## Execution Order (safe sequence)

The key constraint: **do not break the running app mid-refactor**. Each step should leave the app in a buildable state.

### Step 1 — Update nav-data.ts first
Update all URLs in `GROUPS`. The sidebar will show broken links temporarily, but the app still builds. This is the anchor — everything else follows from it.

### Step 2 — Move Finance routes
Move all 5 finance route directories. Update their internal back-links and revalidatePath calls in the same commit.

### Step 3 — Move Relationships routes
Move clients, leads, divisions. Update internal links and actions.

### Step 4 — Move Insights routes
Move snapshots, reports.

### Step 5 — Update all remaining cross-references
- `billing-invoices.ts` revalidatePath for `/income`
- Global `not-found.tsx` quick links
- All scoped `not-found.tsx` files

### Step 6 — Build + verify
Run `bun run build` — must pass with zero errors.

### Step 7 — Update TASK-LIST.md

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Broken internal links | High | Grep for all old paths before finishing |
| revalidatePath misses | Medium | Grep for every old path string in actions/ |
| Test failures | Medium | Update test route strings; tests mock actions so URL changes are isolated |
| `expense-categories` → `categories` rename confusion | Low | Clear naming, update all references |
| Middleware/auth redirect loops | None | No middleware file exists; auth redirects use `/login` which doesn't move |

---

## Files Inventory

### Route directories to move (13 total)
```
(admin)/income/
(admin)/expenses/
(admin)/expense-categories/
(admin)/ledger/
(admin)/accounts/
(admin)/clients/
(admin)/leads/
(admin)/divisions/
(admin)/snapshots/
(admin)/reports/
```

### Action files to update (9 total)
```
actions/income.ts
actions/expenses.ts
actions/expense-categories.ts
actions/ledger.ts
actions/clients.ts
actions/leads.ts
actions/divisions.ts
actions/snapshots.ts
actions/billing-invoices.ts
```

### Component/page files with hardcoded hrefs (6 total)
```
clients/[id]/page.tsx
leads/[id]/page.tsx
divisions/[id]/page.tsx
accounts/[account]/page.tsx
billing/invoices/[id]/invoice-detail-actions.tsx
app/not-found.tsx
```

### not-found files to update (10 total)
```
(admin)/income/not-found.tsx
(admin)/expenses/not-found.tsx
(admin)/expense-categories/not-found.tsx
(admin)/ledger/not-found.tsx
(admin)/accounts/not-found.tsx
(admin)/clients/not-found.tsx
(admin)/leads/not-found.tsx
(admin)/divisions/not-found.tsx
(admin)/snapshots/not-found.tsx
(admin)/reports/not-found.tsx
```

### nav-data.ts (1 file — the anchor)
```
components/navigation/nav-data.ts
```

---

## Decisions Required Before Starting

1. **`expense-categories` → `categories`?**  
   The current URL is `/expense-categories`. Under `/finance/` it could be `/finance/categories` (cleaner) or `/finance/expense-categories` (consistent with current). Recommend `/finance/categories`.

2. **Redirect old URLs?**  
   Old bookmarks like `/income` will 404 after the move. Options:
   - Add Next.js `redirects` in `next.config.ts` for each old URL → new URL (recommended for production)
   - Accept the breakage (fine if this is internal-only and no one has bookmarks)

3. **Do billing routes stay as `/billing/*`?**  
   Yes — they're already correctly grouped. No change needed.

4. **Do settings routes stay as `/settings/*`?**  
   Yes — already correctly grouped. No change needed.

---

## Redirect Config (if chosen)

Add to `next.config.ts`:

```ts
async redirects() {
  return [
    // Finance
    { source: '/income',             destination: '/finance/income',       permanent: true },
    { source: '/expenses',           destination: '/finance/expenses',      permanent: true },
    { source: '/expense-categories', destination: '/finance/categories',    permanent: true },
    { source: '/ledger',             destination: '/finance/ledger',        permanent: true },
    { source: '/accounts',           destination: '/finance/accounts',      permanent: true },
    // Relationships
    { source: '/clients',            destination: '/relationships/clients',  permanent: true },
    { source: '/clients/:path*',     destination: '/relationships/clients/:path*', permanent: true },
    { source: '/leads',              destination: '/relationships/leads',    permanent: true },
    { source: '/leads/:path*',       destination: '/relationships/leads/:path*', permanent: true },
    { source: '/divisions',          destination: '/relationships/divisions', permanent: true },
    { source: '/divisions/:path*',   destination: '/relationships/divisions/:path*', permanent: true },
    // Insights
    { source: '/snapshots',          destination: '/insights/snapshots',    permanent: true },
    { source: '/reports',            destination: '/insights/reports',      permanent: true },
  ]
}
```

---

## Summary

- **Total files to touch:** ~35
- **Zero new features** — pure structural refactor
- **Build must pass at every step** — do not proceed to next step if build fails
- **Billing and Settings routes are unchanged** — lowest risk
- **The anchor is nav-data.ts** — update it first, everything else follows

---

*Created: May 2026 — Review decisions section before executing.*
