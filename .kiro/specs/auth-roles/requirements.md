# Requirements Document

## Introduction

Phase 10 adds invitation-only authentication, role-based access control, and a user management interface to the PMG Control Center admin app. There is no public sign-up - all users are pre-created by a super-admin via email invite. Authentication uses Better Auth with magic links only (no passwords). The proxy enforces session presence; role enforcement happens at the route and Server Action level.

## Glossary

- **Auth_System**: The Better Auth instance configured in `lib/auth.ts`
- **Auth_Client**: The Better Auth browser client configured in `lib/auth-client.ts`
- **Proxy**: The Next.js 16 `proxy.ts` file (equivalent to middleware) that guards all routes
- **Magic_Link**: A time-limited, single-use sign-in URL sent to a user's email address
- **Invitation**: A pre-created record in the `invitations` table that authorises a specific email to activate an account
- **Session**: A Better Auth session record created after a user successfully authenticates via magic link
- **Session_Token**: The `better-auth.session_token` cookie set by Better Auth after successful authentication
- **super_admin**: A role with full access including user management at `/users`
- **admin**: A role with full access to all data routes but no user management
- **viewer**: A role with read-only access - no mutations, no CSV export, no withdrawals
- **Resend**: The transactional email service used to deliver magic links and invitations
- **Drizzle_Adapter**: The Better Auth database adapter that auto-creates `users` and `sessions` tables via Drizzle ORM
- **User_Management**: The `/users` and `/users/invite` routes restricted to `super_admin` only
- **Rate_Limiter**: The request throttle applied to `/api/auth/*` endpoints in the Proxy

---

## Requirements

### Requirement 1: Invitation-Only Account Creation

**User Story:** As a super_admin, I want to invite users by email so that only pre-approved people can access the system.

#### Acceptance Criteria

1. THE Auth_System SHALL disable the `emailAndPassword` provider so that password-based registration is not possible.
2. WHEN a magic link sign-up request is received for an email that does not exist in the `users` table, THE Auth_System SHALL reject the request with a `FORBIDDEN` error and the message "Not invited".
3. WHEN a super_admin submits a valid invitation form with an email and role, THE Auth_System SHALL store an invitation record in the `invitations` table with a unique token and a 7-day expiry.
4. WHEN an invitation is created, THE Auth_System SHALL send an invitation email via Resend to the invited email address containing the invite token link.
5. IF an invitation email already exists in the `invitations` table, THEN THE Auth_System SHALL return an error indicating the email has already been invited.
6. WHEN an invited user clicks the magic link and authenticates, THE Auth_System SHALL mark the invitation `acceptedAt` timestamp and create an active session.
7. THE Auth_System SHALL store the user's role (`super_admin`, `admin`, or `viewer`) on the `users` table at account activation time, sourced from the matching invitation record.

---

### Requirement 2: Magic Link Authentication

**User Story:** As an invited user, I want to sign in via a magic link sent to my email so that I don't need to manage a password.

#### Acceptance Criteria

1. THE Auth_System SHALL enable the `magicLink` provider as the sole authentication method.
2. WHEN a user submits their email on the login page, THE Auth_System SHALL send a magic link email via Resend with the subject "Sign in to PMG Control Center" from `noreply@playhousemedia.co.za`.
3. WHEN a user clicks a valid, unexpired magic link, THE Auth_System SHALL create a session and set the `better-auth.session_token` cookie.
4. IF a user submits an email that does not exist in the `users` table on the login page, THEN THE Auth_System SHALL return an error without revealing whether the email exists.
5. WHEN a magic link has already been used or has expired, THE Auth_System SHALL reject the authentication attempt and display an appropriate error on the login page.
6. THE Login_Page SHALL render an email-only input form with no password field.

---

### Requirement 3: Session-Based Route Protection

**User Story:** As a system operator, I want all admin routes protected by session validation so that unauthenticated users cannot access any data.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made to any route that is not `/login` or `/api/auth/*`, THE Proxy SHALL redirect the request to `/login`.
2. WHEN a request includes a valid `better-auth.session_token` cookie, THE Proxy SHALL allow the request to proceed without redirection.
3. WHEN a request targets `/login` or any path under `/api/auth/`, THE Proxy SHALL allow the request to proceed regardless of session state.
4. THE Proxy SHALL NOT perform role-based access checks - role enforcement is handled at the route and Server Action level.

---

### Requirement 4: Role-Based Access Control

**User Story:** As a system operator, I want role-based access control enforced server-side so that users can only perform actions permitted by their role.

#### Acceptance Criteria

1. WHEN a `viewer` role user accesses any route that performs mutations (add, edit, delete, withdraw, CSV export), THE route handler SHALL call `notFound()` to deny access.
2. WHEN a `viewer` role user accesses any Server Action that performs a mutation, THE Server Action SHALL return `{ error: 'Forbidden' }` without executing the mutation.
3. WHEN a non-`super_admin` user accesses `/users` or `/users/invite`, THE route handler SHALL call `notFound()` to deny access.
4. WHEN any protected page loads, THE page SHALL call `auth.api.getSession()` server-side and redirect to `/login` if no session is returned.
5. THE `admin` role SHALL have full access to all data routes including mutations, CSV export, and withdrawals, but SHALL NOT have access to `/users` or `/users/invite`.
6. THE `super_admin` role SHALL have full access to all routes including `/users` and `/users/invite`.

---

### Requirement 5: User Management Interface

**User Story:** As a super_admin, I want a user management interface so that I can invite, view, and manage all system users.

#### Acceptance Criteria

1. THE User_Management page at `/users` SHALL display a table of all users showing name, email, role, and account status.
2. WHEN a super_admin submits the invite form at `/users/invite` with a valid email and role, THE `inviteUser` Server Action SHALL create an invitation record and send the invitation email.
3. WHEN a super_admin revokes a user via the `revokeUser` Server Action, THE Auth_System SHALL invalidate all active sessions for that user and mark the user as inactive.
4. WHEN a super_admin updates a user's role via the `updateUserRole` Server Action, THE Auth_System SHALL update the role on the `users` table immediately.
5. THE `inviteUser` Server Action SHALL validate the email format and role value using Zod before performing any database operation.
6. IF the `inviteUser` Server Action receives an invalid email or unsupported role, THEN THE Server Action SHALL return `{ error: string }` without creating any records.
7. THE `inviteUser`, `revokeUser`, and `updateUserRole` Server Actions SHALL verify the calling user has the `super_admin` role before executing and return `{ error: 'Forbidden' }` if not.

---

### Requirement 6: Invitations Database Table

**User Story:** As a developer, I want an `invitations` table in the database so that pending invitations can be tracked and validated.

#### Acceptance Criteria

1. THE database schema SHALL include an `invitations` table with fields: `id` (UUID primary key), `email` (unique text), `role` (enum: `super_admin`, `admin`, `viewer`), `token` (unique text), `expiresAt` (timestamptz), `acceptedAt` (nullable timestamptz), `invitedBy` (UUID FK to `users.id`), `createdAt` (timestamptz defaultNow).
2. THE `invitations` table `email` column SHALL have a unique constraint so that duplicate invitations for the same email are rejected at the database level.
3. THE `invitations` table `token` column SHALL have a unique constraint so that token collisions are rejected at the database level.
4. WHEN a Drizzle migration is run, THE database SHALL reflect the `invitations` table schema without data loss to existing tables.

---

### Requirement 7: Session Display in App Layout

**User Story:** As a logged-in user, I want to see my name and a sign-out button in the top navigation so that I know who I am signed in as and can sign out.

#### Acceptance Criteria

1. THE `AppSidebar` component SHALL receive the current session user's name and email as props from the root admin layout.
2. WHEN a user is authenticated, THE top navigation SHALL display the user's name or email.
3. WHEN a user clicks the sign-out button, THE Auth_Client SHALL call `signOut()` and redirect the user to `/login`.
4. THE admin layout SHALL fetch the session server-side using `auth.api.getSession()` and pass the user data to `AppSidebar`.

---

### Requirement 8: Rate Limiting on Auth Endpoints

**User Story:** As a system operator, I want rate limiting on authentication endpoints so that brute-force and abuse attempts are mitigated.

#### Acceptance Criteria

1. WHILE a single IP address makes more than 10 requests to `/api/auth/*` within a 60-second window, THE Proxy SHALL return a `429 Too Many Requests` response.
2. WHEN a request to `/api/auth/*` is within the allowed rate limit, THE Proxy SHALL forward the request normally.
3. THE Rate_Limiter SHALL track request counts in-memory per IP address using the `x-forwarded-for` or `x-real-ip` header as the identifier.

---

### Requirement 9: Resend Email Integration

**User Story:** As a developer, I want Resend wired up for transactional emails so that magic links and invitations are reliably delivered.

#### Acceptance Criteria

1. THE Auth_System SHALL use the Resend SDK to send all magic link emails with the sender address `PMG Admin <noreply@playhousemedia.co.za>`.
2. WHEN an invitation is created, THE `inviteUser` Server Action SHALL use the Resend SDK to send an invitation email containing the invite link.
3. THE Resend API key SHALL be read from the `RESEND_API_KEY` environment variable and SHALL NOT be hardcoded.
4. IF the Resend SDK returns an error when sending an email, THEN THE calling function SHALL return `{ error: 'Failed to send email' }` without throwing.

---

### Requirement 10: Better Auth API Route

**User Story:** As a developer, I want a Better Auth catch-all API route so that all auth operations are handled through the standard Next.js App Router.

#### Acceptance Criteria

1. THE application SHALL expose a catch-all route at `app/api/auth/[...all]/route.ts` that delegates all `GET` and `POST` requests to the Better Auth handler.
2. THE Better Auth handler SHALL be exported as both `GET` and `POST` named exports from the route file.
3. THE Auth_System configuration SHALL use the Drizzle adapter with the `@pmg/db` database instance and `pg` provider.
