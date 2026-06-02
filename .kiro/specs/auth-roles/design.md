# Design Document - Auth, Roles & Advanced Features

## Overview

Phase 10 adds invitation-only authentication, role-based access control (RBAC), and a user management interface to the PMG Control Center admin app. The system uses Better Auth with the magic link plugin as the sole authentication method - no passwords, no public registration.

The architecture follows a strict layered model:

- **Proxy** (`proxy.ts`) - fast cookie presence check only, no DB calls, no role logic
- **Route/Page level** - session fetch + role enforcement via `auth.api.getSession()`
- **Server Actions** - role check before any mutation, return `{ error: 'Forbidden' }` if denied
- **Better Auth** - handles magic link flow, session lifecycle, and the Drizzle adapter
- **Resend** - delivers magic link and invitation emails

All new files fit into the existing monorepo structure without restructuring. Better Auth auto-creates `users` and `sessions` tables via its Drizzle adapter; the only new schema file is `packages/db/src/schema/invitations.ts`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  auth-client.ts  →  signIn.magicLink() / signOut()             │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
┌────────────────────────────▼────────────────────────────────────┐
│  proxy.ts  (Next.js 16 - was middleware.ts)                     │
│  • Cookie presence check only (better-auth.session_token)       │
│  • In-memory rate limiter for /api/auth/* (10 req / 60s / IP)   │
│  • No DB calls, no role checks                                  │
└──────────┬──────────────────────────────────────────────────────┘
           │ passes through
┌──────────▼──────────────────────────────────────────────────────┐
│  app/api/auth/[...all]/route.ts                                 │
│  • Delegates GET + POST to Better Auth handler                  │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│  lib/auth.ts  (Better Auth server config)                       │
│  • magicLink plugin (sole auth method)                          │
│  • emailAndPassword disabled                                    │
│  • drizzleAdapter(@pmg/db, { provider: 'pg' })                  │
│  • beforeSignIn hook → rejects uninvited emails                 │
│  • afterSignIn hook → marks invitation.acceptedAt               │
│  • Resend for email delivery                                     │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│  app/(admin)/layout.tsx                                         │
│  • auth.api.getSession() → redirect /login if null              │
│  • Passes user { name, email, role } to AppSidebar              │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│  Route pages + Server Actions                                   │
│  • Each page: getSession() → role check → notFound() if denied  │
│  • Each mutation action: role check → { error: 'Forbidden' }    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**Why cookie-only proxy?** The proxy runs on every request. DB calls in the proxy would add latency to every page load. The session cookie is cryptographically signed by Better Auth - its presence is sufficient to allow the request through. Role enforcement happens at the page/action level where the full session is already fetched.

**Why `beforeSignIn` hook for invitation check?** Better Auth's `beforeSignIn` hook runs before a session is created. Returning an error here prevents the magic link from being consumed, which is the correct behavior - an uninvited email should never get a session.

**Why in-memory rate limiter in proxy?** The proxy cannot make DB calls. In-memory rate limiting is fast and sufficient for a low-traffic internal admin tool. The trade-off (resets on restart, not shared across instances) is acceptable for this use case.

**Why store role on `users` table?** Better Auth's `user.additionalFields` allows extending the user record. Storing role directly on the user avoids a separate join on every session fetch. The role is set once at invitation acceptance and updated only by `super_admin` via `updateUserRole`.

---

## Components and Interfaces

### `lib/auth.ts` - Better Auth server config

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { getDb } from '@pmg/db'
import { Resend } from 'resend'

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: 'pg' }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => { /* Resend call */ },
    }),
  ],
  user: {
    additionalFields: {
      role: { type: 'string', required: true, defaultValue: 'viewer' },
      isActive: { type: 'boolean', required: true, defaultValue: true },
    },
  },
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === '/sign-in/magic-link',
        handler: createAuthMiddleware(async (ctx) => {
          // Reject if email not in users table (not invited)
        }),
      },
    ],
    after: [
      {
        matcher: (ctx) => ctx.path === '/sign-in/magic-link',
        handler: createAuthMiddleware(async (ctx) => {
          // Mark invitation.acceptedAt on first sign-in
        }),
      },
    ],
  },
})

export type Session = typeof auth.$Infer.Session
```

### `lib/auth-client.ts` - Better Auth browser client

```ts
import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, useSession } = authClient
```

### `app/api/auth/[...all]/route.ts` - Next.js catch-all route

```ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

### `proxy.ts` - Updated session guard + rate limiter

The proxy gains two responsibilities:
1. **Session check** - redirect to `/login` if `better-auth.session_token` cookie is absent and the path is not in the allowlist
2. **Rate limiter** - in-memory `Map<string, { count: number; windowStart: number }>` keyed by IP, applied only to `/api/auth/*` paths

```ts
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // Rate limit auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const ip = request.headers.get('x-forwarded-for') 
             ?? request.headers.get('x-real-ip') 
             ?? 'unknown'
    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  // Allow auth routes through unconditionally
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Require session cookie for all other routes
  const sessionToken = request.cookies.get('better-auth.session_token')
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}
```

### `app/(admin)/layout.tsx` - Updated admin layout

```ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={session.user} />
        {/* ... rest of layout ... */}
      </SidebarProvider>
    </TooltipProvider>
  )
}
```

### `components/layout/app-sidebar.tsx` - Updated with user info

AppSidebar gains a `user` prop of type `{ name: string; email: string; role: string }`. The footer is replaced with a user display showing name/email and a sign-out button that calls `authClient.signOut()` then redirects to `/login`.

### `app/actions/users.ts` - User management Server Actions

```ts
'use server'

// Shared role guard helper
async function requireSuperAdmin(): Promise<{ error: string } | null>

export async function inviteUser(formData: FormData): Promise<{ error?: string }>
export async function revokeUser(userId: string): Promise<{ error?: string }>
export async function updateUserRole(userId: string, formData: FormData): Promise<{ error?: string }>
```

All three actions call `requireSuperAdmin()` first. `inviteUser` validates with Zod before any DB operation.

### `app/(admin)/users/` - User management pages

- `page.tsx` - Server Component, fetches all users, renders `UsersTable`
- `invite/page.tsx` - Server Component, renders `InviteUserForm`

Both pages call `getSession()` and `notFound()` if the user is not `super_admin`.

### Role enforcement helper

A shared utility used in pages and actions:

```ts
// lib/auth.ts (or a separate lib/session.ts)
export async function getSessionOrRedirect() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  return session
}

export function requireRole(
  session: Session,
  role: 'super_admin' | 'admin' | 'viewer'
): boolean {
  const hierarchy = { super_admin: 3, admin: 2, viewer: 1 }
  return hierarchy[session.user.role as keyof typeof hierarchy] >= hierarchy[role]
}
```

---

## Data Models

### `invitations` table - `packages/db/src/schema/invitations.ts`

```ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const invitations = pgTable('invitations', {
  id:          uuid('id').primaryKey().defaultRandom(),
  email:       text('email').notNull().unique(),
  role:        text('role', { enum: ['super_admin', 'admin', 'viewer'] }).notNull(),
  token:       text('token').notNull().unique(),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt:  timestamp('accepted_at', { withTimezone: true }),
  invitedBy:   uuid('invited_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert
```

> Note: `users` is auto-created by Better Auth's Drizzle adapter. The FK reference requires importing the Better Auth-generated `users` table or using a raw string reference.

### Better Auth `users` table extensions

Better Auth auto-creates the `users` table. The `role` and `isActive` fields are added via `user.additionalFields` in `auth.ts`. Better Auth will include these in its generated schema.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Auto by Better Auth |
| `name` | text | Auto by Better Auth |
| `email` | text | Auto by Better Auth |
| `emailVerified` | boolean | Auto by Better Auth |
| `image` | text | Auto by Better Auth |
| `createdAt` | timestamptz | Auto by Better Auth |
| `updatedAt` | timestamptz | Auto by Better Auth |
| `role` | text | Added via additionalFields |
| `isActive` | boolean | Added via additionalFields |

### Zod schemas for Server Actions

```ts
const InviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['super_admin', 'admin', 'viewer']),
})

const UpdateRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'viewer']),
})
```

### Role access matrix

| Route / Action | viewer | admin | super_admin |
|---|---|---|---|
| All data routes (read) | ✅ | ✅ | ✅ |
| Mutations (add/edit/delete) | ❌ notFound() | ✅ | ✅ |
| CSV export | ❌ notFound() | ✅ | ✅ |
| Withdrawals | ❌ notFound() | ✅ | ✅ |
| `/users`, `/users/invite` | ❌ notFound() | ❌ notFound() | ✅ |
| `inviteUser` action | ❌ Forbidden | ❌ Forbidden | ✅ |
| `revokeUser` action | ❌ Forbidden | ❌ Forbidden | ✅ |
| `updateUserRole` action | ❌ Forbidden | ❌ Forbidden | ✅ |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Uninvited emails are always rejected

*For any* valid email address that does not exist in the `users` table, a magic link sign-in request SHALL return an error response and SHALL NOT create a session.

**Validates: Requirements 1.2, 2.4**

### Property 2: Invitation creation round-trip

*For any* valid email address and role value (`super_admin`, `admin`, `viewer`), calling `inviteUser` with a `super_admin` session SHALL create an `invitations` record with a non-empty unique token and an `expiresAt` timestamp approximately 7 days in the future.

**Validates: Requirements 1.3, 5.2**

### Property 3: Role is preserved through invitation acceptance

*For any* invitation record with any valid role, when the invited user activates their account via magic link, the resulting `users` record SHALL have a `role` field equal to the invitation's `role`.

**Validates: Requirements 1.7**

### Property 4: Proxy blocks unauthenticated requests to protected paths

*For any* URL path that is not `/login` and does not start with `/api/auth/`, a request without a `better-auth.session_token` cookie SHALL receive a redirect response to `/login`.

**Validates: Requirements 3.1**

### Property 5: Proxy passes authenticated requests through

*For any* URL path and any valid `better-auth.session_token` cookie value, the proxy SHALL return a pass-through response (not a redirect).

**Validates: Requirements 3.2**

### Property 6: Auth allowlist always passes through

*For any* path starting with `/api/auth/` or equal to `/login`, the proxy SHALL return a pass-through response regardless of whether a session cookie is present.

**Validates: Requirements 3.3**

### Property 7: Viewer role is denied all mutations

*For any* Server Action that performs a mutation (create, update, delete, withdraw, export), calling it with a `viewer` session SHALL return `{ error: 'Forbidden' }` without executing the mutation.

**Validates: Requirements 4.1, 4.2**

### Property 8: Non-super_admin is denied user management

*For any* user with role `admin` or `viewer`, calling `inviteUser`, `revokeUser`, or `updateUserRole` SHALL return `{ error: 'Forbidden' }` without creating or modifying any records.

**Validates: Requirements 4.3, 5.7**

### Property 9: Invalid invite inputs are rejected before DB operations

*For any* input to `inviteUser` where the email is malformed or the role is not one of `super_admin`, `admin`, `viewer`, the action SHALL return `{ error: string }` and SHALL NOT create any record in the `invitations` table.

**Validates: Requirements 5.5, 5.6**

### Property 10: Role update round-trip

*For any* existing user and any valid role value, calling `updateUserRole` with a `super_admin` session SHALL result in the user's `role` field in the database matching the new role value.

**Validates: Requirements 5.4**

### Property 11: Rate limiter isolates by IP

*For any* two distinct IP addresses, requests from one IP SHALL NOT count against the rate limit of the other IP. Each IP has an independent 10-request / 60-second window.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 12: Resend errors never propagate as exceptions

*For any* error thrown by the Resend SDK (network error, API error, invalid key), the calling function SHALL return `{ error: 'Failed to send email' }` and SHALL NOT throw or propagate the exception.

**Validates: Requirements 9.4**

### Property 13: User table renders all required fields

*For any* array of user records, the `UsersTable` component SHALL render each user's name, email, role, and account status in the output.

**Validates: Requirements 5.1**

---

## Error Handling

All Server Actions follow the established `Promise<{ error?: string }>` pattern - never throw.

| Scenario | Behavior |
|---|---|
| Unauthenticated request to protected route | Proxy redirects to `/login` |
| Session missing in Server Component | `redirect('/login')` |
| Session missing in Server Action | `return { error: 'Unauthorized' }` |
| Insufficient role in Server Action | `return { error: 'Forbidden' }` |
| Insufficient role in route page | `notFound()` |
| Duplicate invitation email | `return { error: 'Email already invited' }` |
| Invalid Zod input | `return { error: <zod message> }` |
| Resend SDK error | `return { error: 'Failed to send email' }` |
| DB error in Server Action | `return { error: 'Something went wrong' }` |
| Expired/used magic link | Better Auth returns error; login page displays it |
| Rate limit exceeded | Proxy returns `429 Too Many Requests` |

### `revalidatePath` placement

Following the established project pattern: `revalidatePath` is called inside `try` on success only, never in `catch`.

---

## Testing Strategy

### Property-Based Testing (fast-check)

The project already uses fast-check with 100 iterations per property test. Each property test is tagged with a comment referencing the design property.

Tag format: `// Feature: auth-roles, Property N: <property_text>`

**Properties to implement as PBT:**

| Property | What to generate | What to assert |
|---|---|---|
| P1: Uninvited emails rejected | `fc.emailAddress()` not in users table | Response is error, no session created |
| P2: Invitation round-trip | `fc.emailAddress()`, `fc.constantFrom('super_admin','admin','viewer')` | Record exists, token non-empty, expiresAt ~7 days |
| P4: Proxy blocks unauthenticated | `fc.webPath()` excluding allowlist | Response is redirect to /login |
| P5: Proxy passes authenticated | `fc.webPath()`, valid cookie | Response is next() |
| P6: Auth allowlist passes through | `fc.string()` prefixed with /api/auth/ | Response is next() |
| P7: Viewer denied mutations | `fc.constantFrom(...mutationActions)` | Returns { error: 'Forbidden' }, no side effects |
| P8: Non-super_admin denied user mgmt | `fc.constantFrom('admin','viewer')` | Returns { error: 'Forbidden' } |
| P9: Invalid inputs rejected | `fc.string()` (invalid email), `fc.string()` (invalid role) | Returns { error }, no DB record |
| P10: Role update round-trip | `fc.constantFrom('super_admin','admin','viewer')` | user.role matches new role |
| P11: Rate limiter IP isolation | `fc.ipV4()` pairs | Counts are independent per IP |
| P12: Resend errors don't throw | `fc.anything()` as error | Returns { error: 'Failed to send email' } |
| P13: User table renders fields | `fc.array(fc.record({name, email, role, isActive}))` | All fields present in render output |

### Unit / Example Tests

- Login page renders email input, no password field
- Sign-out button calls `authClient.signOut()` on click
- Admin layout passes user data to AppSidebar
- Magic link email uses correct from address and subject
- `inviteUser` sends invitation email via Resend on success

### Integration Tests

- Full magic link flow: invite → click link → session created → `acceptedAt` set
- Migration: `invitations` table created, existing tables unaffected
- Better Auth route handler responds to `GET /api/auth/ok`

### Smoke Tests

- `emailAndPassword` provider is disabled in auth config
- `magicLink` plugin is enabled in auth config
- `RESEND_API_KEY` is read from env, not hardcoded
- Auth catch-all route exports `GET` and `POST`
- `invitations` schema has all required columns with correct types
- Proxy contains no role-checking logic

### Test file locations

```
apps/admin/src/__tests__/
├── auth-proxy.property.test.ts       ← P4, P5, P6, P11
├── auth-actions.property.test.ts     ← P7, P8, P9, P10, P12
├── auth-invite.property.test.ts      ← P1, P2, P3
├── users-table.property.test.tsx     ← P13
└── auth.smoke.test.ts                ← smoke tests
```
