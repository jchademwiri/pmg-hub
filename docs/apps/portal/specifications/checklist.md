# PMG Client Portal — Implementation Checklist

This checklist tracks the progress of the PMG Client Portal (`apps/portal`) implementation.

---

## ── Phase 1: Foundation & Auth (Completed) ──

- [x] **Monorepo Integration**: Scaffolded Next.js app in the Turbo monorepo and updated dependencies.
- [x] **Schema Migration**: Added `user_id` to `clients` and quote action columns to `quotations` tables; ran Drizzle migrations.
- [x] **Better Auth Setup**:
  - [x] Configured `portalAuth` server instance (`lib/auth.ts`).
  - [x] Configured `authClient` client instance (`lib/auth-client.ts`).
- [x] **Edge Security**: Implemented `proxy.ts` for rate-limiting and route protection.
- [x] **Dev Impersonation Helper**:
  - [x] Configured `getPortalSessionOrRedirect` to allow viewing as a specific user via the `dev_impersonate_client_id` cookie.
  - [x] Added automatic fallback to the first active client in development for seamless local testing.
- [x] **Shared UI Components**: Copied core shadcn/ui components (`Card`, `Button`, `Input`, `Badge`, `Select`, `Tooltip`, `Field`, `Label`) and `utils.ts` helper.

---

## ── Phase 2: Navigation & Shell (Completed) ──

- [x] **Root Layout**: Configured dark mode and integrated the toast notification `Toaster` component.
- [x] **Portal Layout**: Created the responsive sidebar layout with links to all portal pages and a logout action.
- [x] **Dashboard**: Implemented the overview page displaying outstanding balances, paid totals, and recent documents.

---

## ── Phase 3: Portal Pages (Completed) ──

- [x] **Invoices**:
  - [x] List page with server-side status filtering.
  - [x] Detail page with line items, EFT info, and browser print-to-PDF styles.
- [x] **Quotes**:
  - [x] List page with server-side status filtering.
  - [x] Detail page with line items and contextual status banners.
  - [x] Server actions for `Accept` and `Decline` (with optional reason) with sales rep email routing.
  - [x] Client action buttons with confirmation modals.
- [x] **Statements**: Generated account statements with dynamic ageing summaries.
- [x] **Credit Notes**: Read-only list showing original amounts and remaining balances.
- [x] **Profile**: View contact information and assigned sales representative contact details.

---

## ── Phase 4: Remaining Tasks & Next Steps (To-Do) ──

### 1. Email Templates & Customization
- [ ] **Branded Magic Link Email**: Update the `MagicLinkEmail` React Email component in `packages/emails` to match the portal branding and copy (e.g., "Access your PMG Billing Portal" instead of "Sign in to PMG Control Center").
- [ ] **Admin Quote Notifications**: Verify the HTML layout of the email notifications sent to sales representatives when a quote is accepted/declined.

### 2. Admin App Integration
- [ ] **Email Change Handler**: In the admin app's client-editing action, reset `clients.userId = null` if the client's email address is modified, forcing a re-link on their next portal sign-in.
- [ ] **Portal Link in Invoices/Quotes**: Add a direct link to the client portal in the email templates sent out when invoices or quotes are dispatched from the admin app.
- [ ] **Impersonation Action**: Add a "View as Client in Portal" button in the admin app's client detail page that sets the `dev_impersonate_client_id` cookie and redirects the admin to `http://localhost:3001/dashboard` for troubleshooting.

### 3. Polish & Deployment
- [ ] **Mobile Sidebar Toggle**: Implement a client-side state for the hamburger menu button in the header of `(portal)/layout.tsx` to toggle the sidebar on mobile screens.
- [ ] **Production Deployment**: Deploy the portal app on Vercel and bind the custom domain `portal.playhousemedia.co.za`.
- [ ] **Testing**: Run end-to-end user tests using a test client account on staging.
