# Settings

The Settings section lives at `/settings` and is split into six sub-pages. Each sub-page follows the same 1/3 + 2/3 section layout used across the admin app — a label/description column on the left and a `Card` form on the right.

---

## Route Map

| Route | Page | Status |
|---|---|---|
| `/settings` | Settings index — nav card grid | ✅ Active |
| `/settings/organisation` | Organisation details | ✅ Active |
| `/settings/billing` | Billing & Invoicing per division | ✅ Active |
| `/settings/notifications` | Notification preferences | 🔜 Soon |
| `/settings/appearance` | Theme & display density | 🔜 Soon |
| `/settings/security` | Password, 2FA, sessions, audit log | 🔜 Soon |
| `/settings/data` | Exports, retention, danger zone | 🔜 Soon |

---

## `/settings` — Index

The index page renders a 2-column grid of clickable nav cards, one per section. Each card shows an icon, title, description, and a "Soon" badge where the feature is not yet implemented. Clicking a card navigates to the corresponding sub-page.

**File:** `src/app/(admin)/settings/page.tsx`

---

## `/settings/organisation`

Manages company-wide identity used across all documents.

**File:** `src/app/(admin)/settings/organisation/page.tsx`

### Sections

**Company Identity**
- Company Name
- Registration Number
- VAT Number

**Contact Details**
- Email
- Phone
- Website

**Address**
- Street Address
- City
- Postal Code
- Province
- Country (defaults to South Africa)

**Logo**
- Upload a PNG or SVG (max 2 MB) displayed on invoices, quotes, and statements.

---

## `/settings/billing`

Configures billing defaults **per division**. Each division gets its own tab. Settings are identical across divisions but stored independently.

**Files:**
- `src/app/(admin)/settings/billing/page.tsx` — server component, fetches divisions via `getAllDivisions()` from `@pmg/db`
- `src/app/(admin)/settings/billing/billing-settings-client.tsx` — client component, manages tab state

### Division Tabs

Divisions are fetched from the database and rendered as a horizontal scrollable tab bar. The active tab is tracked in `useState`. Switching tabs re-renders the form for the selected division.

### Document Prefix Logic

Invoice and quote prefixes are auto-derived from the division name using `divisionPrefix()`:

- If the first word is already all-caps and 2–5 characters, it is used as-is (e.g. `"AWS Solutions"` → `AWS`)
- Otherwise, initials of up to 3 words are used (e.g. `"The Energy Solutions"` → `TES`)

This produces prefixes like `AWS-INV-`, `AWS-QTE-`, with document numbers formatted as `AWS-INV-0001`.

### Sections (per division)

**Document Numbering**
- Invoice Prefix (e.g. `AWS-INV-`)
- Next Invoice Number
- Quote Prefix (e.g. `AWS-QTE-`)
- Next Quote Number

**Tax & Payment**
- Default VAT Rate (default: 15%)
- Default Payment Terms (default: 30 days)
- Currency (default: ZAR — South African Rand)

**Logo**
- Division-specific logo for invoices and quotes

**Banking Details**
- Bank Name
- Account Name
- Account Number
- Branch Code

**Default Notes**
- Invoice Notes
- Quote Notes / Terms

---

## `/settings/notifications`

Controls where and when alerts are sent.

**File:** `src/app/(admin)/settings/notifications/page.tsx`

> 🔜 Not yet implemented — UI is a placeholder with toggle rows.

### Sections

**Delivery Channel**
- Notification Email — all alerts are sent to this address

**Billing Alerts**
- Invoice overdue
- Invoice paid
- Quote expiring
- Quote accepted

**Finance Alerts**
- Monthly snapshot ready
- Expense limit exceeded
- New lead added

**System Alerts**
- New user invited
- User role changed
- Failed login attempt

---

## `/settings/appearance`

Controls the visual presentation of the admin interface.

**File:** `src/app/(admin)/settings/appearance/page.tsx`

> 🔜 Not yet implemented — UI is a placeholder.

### Sections

**Theme**
- System (follows OS preference)
- Light
- Dark

**Display Density**
- Comfortable — more spacing, easier to scan
- Compact — tighter layout, more data visible

**Sidebar**
- Collapse sidebar by default
- Remember last open group

---

## `/settings/security`

Manages account security and access history.

**File:** `src/app/(admin)/settings/security/page.tsx`

> 🔜 Not yet implemented — UI is a placeholder.

### Sections

**Password**
- Current Password
- New Password
- Confirm New Password

**Two-Factor Authentication**
- Enable authenticator app (Google Authenticator, Authy, etc.)

**Active Sessions**
- Lists devices currently signed in
- Ability to revoke individual sessions

**Audit Log**
- Table of recent actions: action, user, timestamp, IP address

---

## `/settings/data`

Handles data exports, retention policies, and destructive operations.

**File:** `src/app/(admin)/settings/data/page.tsx`

> 🔜 Not yet implemented — UI is a placeholder.

### Sections

**Export Data**
- Income & Expenses (CSV)
- Invoices (CSV)
- Clients (CSV)
- Full Data Export (JSON)

**Data Retention**
- Financial Records (default: keep indefinitely)
- Audit Log (default: 12 months)
- Deleted Records (default: 30 days soft delete)

**Danger Zone**
- Clear all snapshots — permanently deletes all financial snapshots
- Reset all settings — restores factory defaults

---

## Implementation Notes

- All sub-pages use a `Back → Settings` button linking to `/settings`.
- Form fields are currently placeholder `div` elements styled to look like inputs. Wire them up with real `Input` components and server actions when implementing each section.
- The billing page is the only settings page that is a server component (`async`) — it needs `getAllDivisions()` at render time.
- "Soon" sections have their save buttons disabled and display a `Badge variant="secondary"` in the page header.
