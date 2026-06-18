#!/usr/bin/env bash
# Adds an "Overview" nav item to the Billing, Finance, Accounting, and
# Relationships sidebar groups, pointing at each group's existing root route
# (/billing, /finance, /accounting, /relationships). No new routes are created
# — this only adds a nav shortcut to routes that already exist.
#
# Also fixes a latent bug this change would otherwise trigger: the sidebar's
# "isActive" check used plain `pathname.startsWith(item.url)`, which made
# /settings show as active on every /settings/* page (already special-cased
# in the original code) — and would do the same for /billing showing active
# on /billing/invoices, /finance on /finance/income, etc. once Overview items
# existed. The fix is generalized so any single-segment root path is handled
# correctly, instead of adding a new special case per group.
#
# Run from the repo root (where apps/admin lives).
#
# Files changed:
#   apps/admin/src/components/navigation/nav-data.ts
#   apps/admin/src/components/navigation/app-sidebar.tsx
#
# This script uses exact string matching (via python3) rather than line
# numbers, so it FAILS LOUDLY with no changes made if your local file doesn't
# match what this script expects — it will never silently corrupt a file.

set -euo pipefail

NAV_FILE="apps/admin/src/components/navigation/nav-data.ts"
SIDEBAR_FILE="apps/admin/src/components/navigation/app-sidebar.tsx"

if [ ! -f "$NAV_FILE" ] || [ ! -f "$SIDEBAR_FILE" ]; then
  echo "Error: expected files not found. Run this script from the repo root." >&2
  echo "  Looking for: $NAV_FILE" >&2
  echo "  Looking for: $SIDEBAR_FILE" >&2
  exit 1
fi

python3 << 'PYEOF'
import sys

def apply_replacements(path, replacements, label):
    with open(path, 'r') as f:
        content = f.read()

    changed = False
    for old, new, desc in replacements:
        if new in content:
            print(f"  [{label}] Already applied: {desc} — skipping.")
            continue
        if old not in content:
            print(f"ERROR [{label}]: could not find expected text for: {desc}", file=sys.stderr)
            print("This usually means the file has changed since this script was written.", file=sys.stderr)
            print("No changes have been written to this file.", file=sys.stderr)
            sys.exit(1)
        content = content.replace(old, new, 1)
        changed = True
        print(f"  [{label}] Applied: {desc}")

    if changed:
        with open(path, 'w') as f:
            f.write(content)
    return changed

# ── nav-data.ts ──────────────────────────────────────────────────────────────

nav_path = "apps/admin/src/components/navigation/nav-data.ts"

nav_replacements = [
    (
        "  Calendar, Download,\n} from 'lucide-react'",
        "  Calendar, Download, LayoutGrid,\n} from 'lucide-react'",
        "import LayoutGrid icon",
    ),
    (
        "    items: [\n      { title: 'Accounts',   url: '/billing/accounts',   icon: PiggyBank  },",
        "    items: [\n      { title: 'Overview',   url: '/billing',            icon: LayoutGrid },\n      { title: 'Accounts',   url: '/billing/accounts',   icon: PiggyBank  },",
        "add Overview item to Billing group",
    ),
    (
        "    items: [\n      { title: 'Income',       url: '/finance/income',       icon: ArrowDownLeft },",
        "    items: [\n      { title: 'Overview',     url: '/finance',              icon: LayoutGrid    },\n      { title: 'Income',       url: '/finance/income',       icon: ArrowDownLeft },",
        "add Overview item to Finance group",
    ),
    (
        "    items: [\n      { title: 'Chart of Accounts', url: '/accounting/chart-of-accounts', icon: BookMarked   },",
        "    items: [\n      { title: 'Overview',          url: '/accounting',                   icon: LayoutGrid   },\n      { title: 'Chart of Accounts', url: '/accounting/chart-of-accounts', icon: BookMarked   },",
        "add Overview item to Accounting group",
    ),
    (
        "    items: [\n      { title: 'Clients',   url: '/relationships/clients',   icon: Users     },",
        "    items: [\n      { title: 'Overview',  url: '/relationships',           icon: LayoutGrid },\n      { title: 'Clients',   url: '/relationships/clients',   icon: Users     },",
        "add Overview item to Relationships group",
    ),
    (
        "const EXTRA_LABELS: Record<string, string> = {\n  '/billing': 'Billing',\n  '/finance': 'Finance',\n  '/accounting': 'Accounting',\n  '/settings/users/invite': 'Invite User',\n  '/billing/payments/add': 'Record Payment',\n  '/billing/accounts': 'Accounts',\n}",
        "const EXTRA_LABELS: Record<string, string> = {\n  '/settings/users/invite': 'Invite User',\n  '/billing/payments/add': 'Record Payment',\n}",
        "remove now-redundant section-root labels (they're sidebar items now)",
    ),
]

apply_replacements(nav_path, nav_replacements, "nav-data.ts")

# ── app-sidebar.tsx ──────────────────────────────────────────────────────────

sidebar_path = "apps/admin/src/components/navigation/app-sidebar.tsx"

sidebar_replacements = [
    (
        "        // Exact match for root-level settings to avoid /settings matching /settings/users etc.\n"
        "        const isActive = item.url === '/settings'\n"
        "          ? pathname === '/settings'\n"
        "          : pathname.startsWith(item.url)",
        "        // Exact match for group-root \"Overview\" items (e.g. /billing, /finance,\n"
        "        // /accounting, /settings) to avoid them showing active on every sub-route\n"
        "        // (e.g. /billing matching /billing/invoices). Sub-routes always have a\n"
        "        // path segment after the group root, so segment count is the reliable check.\n"
        "        const isGroupRoot = item.url.split('/').filter(Boolean).length === 1\n"
        "        const isActive = isGroupRoot\n"
        "          ? pathname === item.url\n"
        "          : pathname.startsWith(item.url)",
        "generalize the exact-match active-state check beyond /settings",
    ),
]

apply_replacements(sidebar_path, sidebar_replacements, "app-sidebar.tsx")

print("\nAll changes applied successfully.")
PYEOF

echo ""
echo "Done. Next steps:"
echo "1. Run your typecheck/build to confirm no type errors."
echo "2. Visit /billing, /finance, /accounting, /relationships and confirm an"
echo "   'Overview' item now appears at the top of each expanded sidebar group."
echo "3. Visit a sub-route (e.g. /billing/invoices) and confirm 'Overview' does"
echo "   NOT show as the active sidebar item — only 'Invoices' should."
echo "4. /relationships has no root page.tsx yet, so its new 'Overview' link"
echo "   will 404 until that page is created."
echo "5. Breadcrumb/page-title text for /billing, /finance, /accounting will"
echo "   now read 'Overview' instead of 'Billing'/'Finance'/'Accounting',"
echo "   since ROUTE_LABELS now derives those labels from the sidebar item."
