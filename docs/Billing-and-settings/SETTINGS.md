# Settings

The Settings section lives at `/settings` and is split into ten sub-pages. Each sub-page follows the same 1/3 + 2/3 section layout used across the admin app — a label/description column on the left and a `Card` form on the right.

---

## Route Map

| Route | Page | Status |
|---|---|---|
| `/settings` | Settings index — nav card grid | ✅ Active |
| `/settings/organisation` | Organisation details | ✅ Active |
| `/settings/billing` | Billing & Invoicing per division | ✅ Active |
| `/settings/localisation` | Timezone, locale, financial year | 🔜 Soon |
| `/settings/email` | Outbound email / SMTP config | 🔜 Soon |
| `/settings/users` | Roles, permissions, invitations | 🔜 Soon |
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

## `/settings/localisation`

Controls global time, date, and financial year settings that affect the entire workspace — snapshots, reports, due date calculations, and document formatting.

**File:** `src/app/(admin)/settings/localisation/page.tsx`

> 🔜 Not yet implemented — UI is a placeholder.

### Sections

**Timezone**
- Timezone — searchable dropdown of IANA timezones (default: `Africa/Johannesburg`)
- Affects: due date calculations, snapshot timestamps, audit log entries, scheduled notifications

**Date & Number Format**
- Date Format — `DD/MM/YYYY` (default) | `MM/DD/YYYY` | `YYYY-MM-DD`
- Number Format — `R 1 000,00` (default) | `R 1,000.00`
- These apply to all documents, tables, and exports across the app

**Financial Year**
- Financial Year Start — month picker (default: March, i.e. 1 March – 28/29 February)
- Affects: financial snapshots, income/expense reports, year-to-date calculations

**Default Country**
- Pre-fills the Country field when creating new clients or leads (default: South Africa)

---

## `/settings/email`

Configures how outbound emails are sent — used for invoice delivery, quote sending, notifications, and user invitations.

**File:** `src/app/(admin)/settings/email/page.tsx`

> 🔜 Not yet implemented — UI is a placeholder.

### Sections

**Sending Provider**
- Provider — `Resend` | `SMTP` | `SendGrid` (radio/select)
- Switching provider shows the relevant credential fields below

**Resend**
- API Key

**SMTP**
- Host
- Port
- Username
- Password
- Encryption — None | TLS | STARTTLS

**Sender Identity**
- From Name — display name on outgoing emails (e.g. "PMG Hub")
- From Address — the `from` email address (e.g. `billing@yourdomain.com`)
- Reply-To Address — optional; defaults to From Address

**Test Email**
- Send a test email to a specified address to verify the configuration is working

> Credentials are stored encrypted. The API key or SMTP password is never returned to the client after saving — only a masked placeholder is shown.

---

## `/settings/users`

Manages who has access to the workspace, what they can do, and how they are invited.

**File:** `src/app/(admin)/settings/users/page.tsx`

> 🔜 Not yet implemented — UI is a placeholder.

### Sections

**Team Members**

Table of all users with access to the workspace.

| Column | Description |
|---|---|
| Name | User's display name |
| Email | Login email |
| Role | Current role badge |
| Status | Active / Invited / Suspended |
| Joined | Date added |
| Actions | Change role, Suspend, Remove |

**Invite User**
- Email address
- Role — assigned at invite time
- Send Invite button — dispatches an invitation email via the configured email provider

**Roles & Permissions**

Defines what each role can see and do across the app. Roles are fixed (not custom).

| Role | Description |
|---|---|
| `owner` | Full access; can manage users, settings, and all data |
| `admin` | Full access except user management and danger zone |
| `manager` | Can view and create all billing and finance records; cannot change settings |
| `viewer` | Read-only access across the app |

Permission matrix (✅ allowed, ❌ not allowed):

| Area | owner | admin | manager | viewer |
|---|---|---|---|---|
| View dashboard & reports | ✅ | ✅ | ✅ | ✅ |
| Create / edit invoices & quotes | ✅ | ✅ | ✅ | ❌ |
| Create / edit expenses & income | ✅ | ✅ | ✅ | ❌ |
| Manage clients & leads | ✅ | ✅ | ✅ | ❌ |
| Manage items catalogue | ✅ | ✅ | ✅ | ❌ |
| View settings | ✅ | ✅ | ❌ | ❌ |
| Change settings | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Danger zone actions | ✅ | ❌ | ❌ | ❌ |

**Access Control**
- Invitation mode — Invite-only (default) | Open registration
- Session timeout — duration of inactivity before automatic sign-out (default: 7 days)

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
- The billing page is the only settings page that is currently a server component (`async`) — it needs `getAllDivisions()` at render time. Localisation and Users will also need to be server components when implemented.
- "Soon" sections have their save buttons disabled and display a `Badge variant="secondary"` in the page header.
- **Email credentials** must be stored encrypted at rest. Never return the raw secret to the client — show a masked placeholder after saving.
- **Localisation settings** (timezone, financial year start, date format) are workspace-global and should be loaded once at the layout level and passed via context or server props to any component that formats dates or currency.
- **Role enforcement** should happen at the server action and route handler level, not just in the UI. The permission matrix in `/settings/users` is the source of truth for what each role can do.
