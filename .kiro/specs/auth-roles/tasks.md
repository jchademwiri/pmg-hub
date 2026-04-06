# Implementation Plan: Auth, Roles & Advanced Features

## Overview

Implement invitation-only authentication, role-based access control, and user management for the PMG Control Center admin app. Better Auth handles the magic link flow and session lifecycle; the proxy enforces session presence; role enforcement happens at the route and Server Action level.

## Tasks

- [ ] 1. Add `invitations` table schema and run migration
  - Create `packages/db/src/schema/invitations.ts` with all required columns: `id`, `email` (unique), `role` (enum), `token` (unique), `expiresAt`, `acceptedAt`, `invitedBy` (FK to `users.id`), `createdAt`
  - Export the new schema from `packages/db/src/index.ts`
  - Generate and apply the Drizzle migration so the table is created without data loss to existing tables
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 2. Configure Better Auth server and browser client
  - [ ] 2.1 Create `apps/admin/src/lib/auth.ts`
    - Configure `betterAuth` with `drizzleAdapter(getDb(), { provider: 'pg' })`
    - Enable `magicLink` plugin with `sendMagicLink` calling Resend SDK; sender `PMG Admin <noreply@playhousemedia.co.za>`, subject "Sign in to PMG Control Center"
    - Disable `emailAndPassword` provider
    - Add `user.additionalFields` for `role` (default `'viewer'`) and `isActive` (default `true`)
    - Add `beforeSignIn` hook on `/sign-in/magic-link` that rejects emails not in the `users` table with "Not invited"
    - Add `afterSignIn` hook on `/sign-in/magic-link` that marks `invitation.acceptedAt`
    - Read `RESEND_API_KEY` from env — never hardcode
    - Export `getSessionOrRedirect()` and `requireRole()` helpers
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 2.1, 2.2, 9.1, 9.3, 10.3_
  - [ ] 2.2 Create `apps/admin/src/lib/auth-client.ts`
    - `createAuthClient` with `magicLinkClient()` plugin
    - Export `signIn`, `signOut`, `useSession`
    - _Requirements: 2.3, 7.3_

- [ ] 3. Add Better Auth catch-all API route
  - Create `apps/admin/src/app/api/auth/[...all]/route.ts`
  - Export `GET` and `POST` via `toNextJsHandler(auth)`
  - _Requirements: 10.1, 10.2_

- [ ] 4. Update `proxy.ts` with session guard and rate limiter
  - Add in-memory rate limiter (`Map<string, { count: number; windowStart: number }>`) keyed by IP from `x-forwarded-for` / `x-real-ip`; limit: 10 requests / 60 s per IP; return `429` when exceeded
  - Add session cookie check: redirect to `/login` for any path not in allowlist (`/login`, `/api/auth/*`) when `better-auth.session_token` cookie is absent
  - Proxy MUST NOT contain any role-checking logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3_
  - [ ] 4.1 Write property tests for proxy (P4, P5, P6, P11)
    - **Property 4: Proxy blocks unauthenticated requests to protected paths**
    - **Validates: Requirements 3.1**
    - **Property 5: Proxy passes authenticated requests through**
    - **Validates: Requirements 3.2**
    - **Property 6: Auth allowlist always passes through**
    - **Validates: Requirements 3.3**
    - **Property 11: Rate limiter isolates by IP**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - File: `apps/admin/src/__tests__/auth-proxy.property.test.ts`

- [ ] 5. Update admin layout with session fetch and user prop
  - Update `apps/admin/src/app/(admin)/layout.tsx` to call `auth.api.getSession({ headers: await headers() })` and `redirect('/login')` if null
  - Pass `session.user` (name, email, role) to `AppSidebar`
  - _Requirements: 4.4, 7.1, 7.4_

- [ ] 6. Update `AppSidebar` with user display and sign-out
  - Add `user: { name: string; email: string; role: string }` prop to `apps/admin/src/components/layout/app-sidebar.tsx`
  - Replace sidebar footer with user name/email display and a sign-out button that calls `authClient.signOut()` then redirects to `/login`
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 7. Replace login page with magic link form
  - Replace the static placeholder at `apps/admin/src/app/(auth)/login/page.tsx` with a client component containing an email-only input (no password field)
  - On submit: call `authClient.signIn.magicLink({ email })` and show a "Check your email" confirmation state
  - Display any auth error returned (e.g. expired link, not invited) without revealing whether the email exists
  - _Requirements: 2.4, 2.5, 2.6_

- [ ] 8. Implement user management Server Actions
  - Create `apps/admin/src/app/actions/users.ts`
  - Implement `requireSuperAdmin()` helper that calls `getSessionOrRedirect()` and returns `{ error: 'Forbidden' }` if role is not `super_admin`
  - Implement `inviteUser(formData)`: validate with `InviteSchema` (Zod), check for duplicate email, insert `invitations` record with unique token and 7-day `expiresAt`, send invitation email via Resend, `revalidatePath('/users')` inside `try` on success only
  - Implement `revokeUser(userId)`: invalidate all sessions for the user, set `isActive = false`, `revalidatePath('/users')` inside `try` on success only
  - Implement `updateUserRole(userId, formData)`: validate with `UpdateRoleSchema` (Zod), update `users.role`, `revalidatePath('/users')` inside `try` on success only
  - All actions follow `Promise<{ error?: string }>` — never throw
  - _Requirements: 1.3, 1.4, 1.5, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.2, 9.4_
  - [ ] 8.1 Write property tests for user actions (P7, P8, P9, P10, P12)
    - **Property 7: Viewer role is denied all mutations**
    - **Validates: Requirements 4.1, 4.2**
    - **Property 8: Non-super_admin is denied user management**
    - **Validates: Requirements 4.3, 5.7**
    - **Property 9: Invalid invite inputs are rejected before DB operations**
    - **Validates: Requirements 5.5, 5.6**
    - **Property 10: Role update round-trip**
    - **Validates: Requirements 5.4**
    - **Property 12: Resend errors never propagate as exceptions**
    - **Validates: Requirements 9.4**
    - File: `apps/admin/src/__tests__/auth-actions.property.test.ts`

- [ ] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement invitation property tests
  - [ ] 10.1 Write property tests for invitation flow (P1, P2, P3)
    - **Property 1: Uninvited emails are always rejected**
    - **Validates: Requirements 1.2, 2.4**
    - **Property 2: Invitation creation round-trip**
    - **Validates: Requirements 1.3, 5.2**
    - **Property 3: Role is preserved through invitation acceptance**
    - **Validates: Requirements 1.7**
    - File: `apps/admin/src/__tests__/auth-invite.property.test.ts`

- [ ] 11. Build user management UI components
  - [ ] 11.1 Create `apps/admin/src/components/users/user-table.tsx`
    - Render a shadcn `Table` with columns: name, email, role (badge), account status (active/inactive)
    - Include role-change select and revoke button per row (actions call `updateUserRole` / `revokeUser`)
    - _Requirements: 5.1, 5.3, 5.4_
  - [ ] 11.2 Write property test for UsersTable (P13)
    - **Property 13: User table renders all required fields**
    - **Validates: Requirements 5.1**
    - File: `apps/admin/src/__tests__/users-table.property.test.tsx`
  - [ ] 11.3 Create `apps/admin/src/components/users/invite-form.tsx`
    - Email input + role select (`super_admin`, `admin`, `viewer`) + submit button
    - Calls `inviteUser` Server Action; shows inline error or success confirmation
    - _Requirements: 5.2, 5.5, 5.6_

- [ ] 12. Build user management pages
  - Create `apps/admin/src/app/(admin)/users/page.tsx`: call `getSessionOrRedirect()`, `notFound()` if role is not `super_admin`, fetch all users, render `UsersTable`
  - Create `apps/admin/src/app/(admin)/users/invite/page.tsx`: same session + role guard, render `InviteUserForm`
  - _Requirements: 4.3, 5.1, 5.2_

- [ ] 13. Write smoke tests
  - Create `apps/admin/src/__tests__/auth.smoke.test.ts` covering:
    - `emailAndPassword` provider is disabled in auth config
    - `magicLink` plugin is enabled in auth config
    - `RESEND_API_KEY` is read from env, not hardcoded
    - Auth catch-all route exports `GET` and `POST`
    - `invitations` schema has all required columns with correct types
    - Proxy contains no role-checking logic
  - _Requirements: 1.1, 2.1, 9.3, 10.1, 10.2, 6.1_

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- `revalidatePath` is always called inside `try` on success only, never in `catch`
- The proxy must never contain role-checking logic — role enforcement is route/action level only
- Better Auth auto-creates `users` and `sessions` tables via the Drizzle adapter; no manual schema needed for those
- Property tests use fast-check with 100 iterations; tag format: `// Feature: auth-roles, Property N: <property_text>`
