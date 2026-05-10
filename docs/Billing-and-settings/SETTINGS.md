# Settings

The Settings section lives at `/settings` and is split into sub-pages. Each sub-page follows the same `1/3 + 2/3` section layout — a label/description column on the left and a `Card` form on the right. The back button always reads "← Settings" and links to `/settings`.

---

## Route Map

| Route | Page | Status |
|---|---|---|
| `/settings` | Settings index — nav card grid | ✅ Active |
| `/settings/organisation` | Company details for all documents | ✅ Shell — wire up save |
| `/settings/billing` | Billing defaults per division | ✅ Active — wired to `getAllDivisions()` |
| `/settings/users` | Team members, roles, invitations | ✅ Active — fully working |
| `/settings/users/invite` | Invite user form | ✅ Active |
| `/settings/security` | Password, 2FA, sessions, audit log | 🔜 Soon |
| `/settings/data` | Exports, retention, danger zone | 🔜 Soon |

---

## `/settings` — Index

**File:** `src/app/(admin)/settings/page.tsx` ✅ Active

Renders a 2-column grid of clickable nav cards, one per section. Each card shows an icon, title, description, and a `Badge variant="secondary"` labelled "Soon" for unimplemented sections. Clicking a card navigates to the sub-page.

**Sections in order:**

| Section | Icon | Badge |
|---|---|---|
| Organisation | Building2 | — |
| Billing & Invoicing | Receipt | — |
| Users | Users | — |
| Security | Shield | Soon |
| Data & Exports | Database | Soon |

---

## `/settings/organisation`

**File:** `src/app/(admin)/settings/organisation/page.tsx` ✅ Shell — wire up save

Manages company-wide identity used across all documents (invoices, quotes, statements). These are workspace-global fields — not per-division. Division-specific overrides live in `/settings/billing`.

**Sections:**

### Company Identity
- Company Name (defaults to "PMG" in shell)
- Registration Number
- VAT Number

### Contact Details
- Email
- Phone
- Website

### Address
- Street Address
- City
- Postal Code
- Province
- Country (default: South Africa)

### Logo
- Upload PNG or SVG, max 2 MB
- Displayed on all documents. Division logos in `/settings/billing` override this per division.

**Save button** is currently disabled. When wiring up: create a `settings` table (or organisation settings record) and a `updateOrganisationSettings` server action.

---

## `/settings/billing`

**Files:**
- `src/app/(admin)/settings/billing/page.tsx` ✅ Active — server component, `export const dynamic = 'force-dynamic'`
- `src/app/(admin)/settings/billing/billing-settings-client.tsx` ✅ Active — client component, manages tab state

Configures billing defaults **per division**. Each division gets its own tab. Switching tabs re-renders the form for the selected division via `useState<string>` tracking `activeId`.

### Division Prefix Logic

Invoice and quote prefixes are auto-derived from the division name using `divisionPrefix()`:

```typescript
function divisionPrefix(name: string): string {
  const firstWord = name.trim().split(/\s+/)[0]
  if (/^[A-Z]{2,5}$/.test(firstWord)) return firstWord   // "AWS Solutions" → "AWS"
  return name.trim().split(/\s+/).slice(0, 3)
    .map((w) => w[0].toUpperCase()).join('')               // "Tender Edge" → "TE"
}
```

This produces prefixes like `APX-INV-`, `APX-QTE-`, with document numbers formatted as `APX-INV-2026-001`.

> **Note:** The shell uses `QTE` as the quote type code. The PRD specifies `Q`. Decide on one format and apply consistently across `document_sequences` and all display. Recommendation: use `Q` (shorter, cleaner).

### Sections (per division)

**Document Numbering**
- Invoice Prefix — derived, read-only (e.g. `APX-INV-`)
- Next Invoice Number — shows current sequence, editable for initial setup
- Quote Prefix — derived, read-only (e.g. `APX-QTE-`)
- Next Quote Number — shows current sequence, editable for initial setup

**Tax & Payment**
- Default VAT Rate — default 15%
- Default Payment Terms — default 30 days
- Currency — ZAR (read-only in v1)

**Logo**
- Division-specific logo (overrides the org logo for documents from this division)
- Upload PNG or SVG, max 2 MB

**Banking Details**
- Bank Name
- Account Name
- Account Number
- Branch Code

Printed on invoices and statements so clients know where to pay. These fields populate the `banking` prop on `DocumentPreview`.

**Default Notes**
- Invoice Notes — pre-filled on new invoices for this division
- Quote Notes / Terms — pre-filled on new quotes

All Save buttons are currently disabled. When wiring up: add a `division_billing_settings` table (or extend divisions table) and a `saveDivisionBillingSettings(divisionId, data)` server action.

---

## `/settings/users`

**Files:**
- `src/app/(admin)/settings/users/page.tsx` ✅ Active — fully working server component
- `src/app/(admin)/settings/users/invite/page.tsx` ✅ Active

Access is restricted to `super_admin` role — other roles receive a 404 via `requireRole(session, 'super_admin')`.

Fetches users and pending invitations directly via raw SQL (Better Auth manages the `user` table schema).

### Team Members Table

| Column | Notes |
|---|---|
| Name | User's display name |
| Email | Login email |
| Role | `super_admin`, `admin`, or `viewer` |
| Status | Active / Invited / Suspended |
| Actions | Change role, Revoke, Delete |

### Pending Invitations Table

Shows pending (not yet accepted) invitation rows. Actions: Resend, Delete.

### Roles & Permissions

Roles are fixed — not custom. Permission matrix:

| Area | super_admin | admin | viewer |
|---|:---:|:---:|:---:|
| View dashboard & reports | ✅ | ✅ | ✅ |
| View all billing documents | ✅ | ✅ | ✅ |
| Create / edit invoices & quotes | ✅ | ✅ | ❌ |
| Mark invoice paid | ✅ | ✅ | ❌ |
| Create / edit expenses & income | ✅ | ✅ | ❌ |
| Manage clients & leads | ✅ | ✅ | ❌ |
| Manage items catalogue | ✅ | ✅ | ❌ |
| View settings | ✅ | ✅ | ❌ |
| Change settings | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Danger zone actions | ✅ | ❌ | ❌ |

### Invite User Form

- Name
- Email address
- Role (select: super_admin, admin, viewer)
- Send Invite → dispatches invitation email via Resend

---

## `/settings/security`

**File:** `src/app/(admin)/settings/security/page.tsx` ✅ Shell — everything disabled

Manages account security and access history.

### Sections

**Password** — Current, New, Confirm. "Update Password" button (disabled)

**Two-Factor Authentication** — "Enable 2FA" button (disabled). Supports authenticator app (Google Authenticator, Authy)

**Active Sessions** — Lists devices currently signed in. "Revoke" per session. Shell shows one placeholder row for current session.

**Audit Log** — Table: Action | User | Time | IP. Shell shows 3 placeholder rows. Wire to a real `audit_log` table in v2.

---

## `/settings/data`

**File:** `src/app/(admin)/settings/data/page.tsx` ✅ Shell — all buttons disabled

Handles data exports, retention policies, and destructive operations.

### Export Data

| Export | Format |
|---|---|
| Income & Expenses | CSV |
| Invoices | CSV |
| Clients | CSV |
| Full Data Export | JSON |

Wire export buttons to server actions that return downloadable content (mirrors the existing `exportFinancialsCsv` action pattern).

### Data Retention

- Financial Records — keep indefinitely
- Audit Log — 12 months
- Deleted Records — 30 days (soft delete)

### Danger Zone

- Clear all snapshots — permanently deletes all snapshot rows
- Reset all settings — restores factory defaults

Both actions use `border-destructive/50 text-destructive` styled buttons and require confirmation.

---

## Implementation Notes

- **All sub-pages** use a `Back → Settings` ghost button linking to `/settings`, followed by a vertical `Separator` and the page heading with icon.
- **Form fields** in shells are styled `div` placeholders. Replace with real shadcn `Input`, `Select`, `Switch`, and `DatePicker` components when implementing each section.
- **`/settings/billing`** is already a working server component — it calls `getAllDivisions()` at render time and passes divisions to `BillingSettingsClient`. When implementing the save flow, add a `division_billing_settings` table and keep the server component pattern.
- **`/settings/users`** is fully working. It queries the `user` and `invitations` tables directly via raw SQL (Better Auth manages the `user` table). Role enforcement happens at the action level via `requireSuperAdmin()`.
- **"Soon" sections** display a `Badge variant="secondary"` in the page header and have all save buttons disabled.
- **Role enforcement** happens at the server action level, not just in the UI. The permission matrix in `/settings/users` is the source of truth.
- **The `/users` route** (top-level) still exists for backward compatibility. The canonical location is `/settings/users`. Consolidate to `/settings/users` and add a redirect from `/users` when cleaning up.
