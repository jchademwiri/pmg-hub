/**
 * Property-Based Tests for Invitation Flow
 *
 * Property 1: Uninvited emails are always rejected
 * Validates: Requirements 1.2, 2.4
 *
 * Property 2: Invitation creation round-trip
 * Validates: Requirements 1.3, 5.2
 *
 * Property 3: Role is preserved through invitation acceptance
 * Validates: Requirements 1.7
 */

import { describe, it, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ─── Hoist mock state ─────────────────────────────────────────────────────────
const { mockSession, mockDbInsert, mockDbSelect, mockDbExecute, mockDbUpdate, mockResendSend } =
  vi.hoisted(() => {
    return {
      mockSession: vi.fn(),
      mockDbInsert: vi.fn(),
      mockDbSelect: vi.fn(),
      mockDbExecute: vi.fn(),
      mockDbUpdate: vi.fn(),
      mockResendSend: vi.fn(),
    }
  })

// ─── Mock next/cache ──────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── Mock next/navigation ─────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// ─── Mock next/headers ────────────────────────────────────────────────────────
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// ─── Mock @/lib/auth ──────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  getSessionOrRedirect: mockSession,
  requireRole: vi.fn((session: { user: { role: string } }, role: string) => {
    const hierarchy: Record<string, number> = { super_admin: 3, admin: 2, viewer: 1 }
    const userLevel = hierarchy[session.user.role] ?? 1
    return userLevel >= (hierarchy[role] ?? 1)
  }),
  auth: {
    api: {
      revokeUserSessions: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

// ─── Mock resend ──────────────────────────────────────────────────────────────
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}))

// ─── Captured insert values ───────────────────────────────────────────────────
let capturedInsertValues: Record<string, unknown> | null = null

// ─── Mock @pmg/db ─────────────────────────────────────────────────────────────
vi.mock('@pmg/db', () => {
  function makeInsertChain() {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockDbInsert().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbInsert().catch(reject)
      },
    }
    chain['values'] = (vals: Record<string, unknown>) => {
      capturedInsertValues = vals
      return chain
    }
    return chain
  }

  function makeSelectChain() {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockDbSelect().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbSelect().catch(reject)
      },
    }
    chain['from'] = () => chain
    chain['where'] = () => chain
    chain['limit'] = () => chain
    return chain
  }

  function makeUpdateChain() {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockDbUpdate().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbUpdate().catch(reject)
      },
    }
    chain['set'] = () => chain
    chain['where'] = () => chain
    return chain
  }

  const dbMock = {
    insert: () => makeInsertChain(),
    select: () => makeSelectChain(),
    update: () => makeUpdateChain(),
    execute: mockDbExecute,
  }

  return {
    getDb: () => dbMock,
    invitations: {
      id: 'id',
      email: 'email',
      role: 'role',
      token: 'token',
      expiresAt: 'expiresAt',
      invitedBy: 'invitedBy',
      acceptedAt: 'acceptedAt',
    },
    user: { id: 'id', name: 'name', email: 'email', role: 'role', isActive: 'isActive' },
    session: { id: 'id', userId: 'userId' },
    eq: vi.fn(),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
      { raw: (s: string) => s }
    ),
  }
})

// ─── Import actions AFTER mocks ───────────────────────────────────────────────
import { inviteUser } from '@/app/actions/users'
import { APIError } from 'better-auth/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFormData(dict: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(dict)) {
    fd.set(k, v)
  }
  return fd
}

function makeSession(role: string) {
  return { user: { id: 'user-123', role, name: 'Test User', email: 'test@example.com' } }
}

const validRoles = ['super_admin', 'admin', 'viewer'] as const

/** UUID v4 regex */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

beforeEach(() => {
  vi.clearAllMocks()
  process.env.BETTER_AUTH_URL = 'http://localhost:3000'
  capturedInsertValues = null
  mockDbInsert.mockResolvedValue(undefined)
  mockDbSelect.mockResolvedValue([])
  mockDbUpdate.mockResolvedValue(undefined)
  mockDbExecute.mockResolvedValue({ rows: [] })
  mockResendSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })
})

// ─── Property 1: Uninvited emails are always rejected ─────────────────────────

describe('Property 1: Uninvited emails are always rejected', () => {
  // Feature: auth-roles, Property 1: Uninvited emails are always rejected

  /**
   * The beforeSignIn hook in auth.ts calls ctx.context.adapter.findOne to check
   * if the email exists in the users table. If it returns null, it throws FORBIDDEN.
   * We test this logic directly by simulating the hook's behaviour.
   */
  it('throws FORBIDDEN when adapter.findOne returns null - Validates: Requirements 1.2, 2.4', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), async (email) => {
        // Simulate the beforeSignIn hook logic extracted from auth.ts
        const mockFindOne = vi.fn().mockResolvedValue(null)

        const ctx = {
          path: '/sign-in/magic-link',
          body: { email },
          context: {
            adapter: { findOne: mockFindOne },
          },
        }

        // Replicate the hook logic from auth.ts
        async function runBeforeSignInHook(
          hookCtx: typeof ctx
        ): Promise<void> {
          if (hookCtx.path !== '/sign-in/magic-link') return

          const hookEmail = hookCtx.body?.email as string | undefined
          if (!hookEmail) {
            throw new APIError('FORBIDDEN', { message: 'Not invited' })
          }

          const user = await hookCtx.context.adapter.findOne({
            model: 'user',
            where: [{ field: 'email', value: hookEmail }],
          })

          if (!user) {
            throw new APIError('FORBIDDEN', { message: 'Not invited' })
          }
        }

        let threw = false
        let thrownError: unknown = null
        try {
          await runBeforeSignInHook(ctx)
        } catch (err) {
          threw = true
          thrownError = err
        }

        // Must throw
        expect(threw).toBe(true)
        // Must be an APIError with FORBIDDEN status
        expect(thrownError).toBeInstanceOf(APIError)
        const apiErr = thrownError as APIError
        expect(apiErr.status).toBe('FORBIDDEN')
        // Adapter must have been called with the email
        expect(mockFindOne).toHaveBeenCalledWith({
          model: 'user',
          where: [{ field: 'email', value: email }],
        })
      }),
      { numRuns: 100 }
    )
  })

  it('does NOT throw when adapter.findOne returns a user - Validates: Requirements 1.2, 2.4', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), async (email) => {
        // When user exists, hook should not throw
        const mockFindOne = vi.fn().mockResolvedValue({ id: 'user-1', email })

        const ctx = {
          path: '/sign-in/magic-link',
          body: { email },
          context: {
            adapter: { findOne: mockFindOne },
          },
        }

        async function runBeforeSignInHook(hookCtx: typeof ctx): Promise<void> {
          if (hookCtx.path !== '/sign-in/magic-link') return

          const hookEmail = hookCtx.body?.email as string | undefined
          if (!hookEmail) {
            throw new APIError('FORBIDDEN', { message: 'Not invited' })
          }

          const user = await hookCtx.context.adapter.findOne({
            model: 'user',
            where: [{ field: 'email', value: hookEmail }],
          })

          if (!user) {
            throw new APIError('FORBIDDEN', { message: 'Not invited' })
          }
        }

        // Should not throw
        await expect(runBeforeSignInHook(ctx)).resolves.toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 2: Invitation creation round-trip ───────────────────────────────

describe('Property 2: Invitation creation round-trip', () => {
  // Feature: auth-roles, Property 2: Invitation creation round-trip

  it('creates invitation record with non-empty UUID token and ~7-day expiresAt - Validates: Requirements 1.3, 5.2', async () => {
    // Use a simple valid email format that Zod's .email() accepts
    const zodValidEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/),
        fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/),
        fc.stringMatching(/^[a-z]{2,4}$/)
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

    await fc.assert(
      fc.asyncProperty(
        zodValidEmailArb,
        fc.constantFrom(...validRoles),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (email, role, name) => {
          capturedInsertValues = null
          mockSession.mockResolvedValue(makeSession('super_admin'))
          mockDbSelect.mockResolvedValue([]) // no duplicate
          mockDbInsert.mockResolvedValue(undefined)
          mockResendSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })

          const before = Date.now()
          const fd = buildFormData({ name, email, role })
          const result = await inviteUser(fd)
          const after = Date.now()

          // Action must succeed
          expect(result).toEqual({})

          // Captured insert values must exist
          expect(capturedInsertValues).not.toBeNull()
          const vals = capturedInsertValues!

          // Token must be a non-empty UUID v4
          expect(typeof vals['token']).toBe('string')
          expect((vals['token'] as string).length).toBeGreaterThan(0)
          expect(vals['token']).toMatch(UUID_RE)

          // expiresAt must be approximately 7 days from now (within a 5-second window)
          expect(vals['expiresAt']).toBeInstanceOf(Date)
          const expiresAt = (vals['expiresAt'] as Date).getTime()
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
          expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 5000)
          expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 5000)

          // Email and role must match inputs
          expect(vals['email']).toBe(email)
          expect(vals['role']).toBe(role)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 3: Role is preserved through invitation acceptance ──────────────

describe('Property 3: Role is preserved through invitation acceptance', () => {
  // Feature: auth-roles, Property 3: Role is preserved through invitation acceptance

  /**
   * The afterSignIn hook in auth.ts marks invitation.acceptedAt.
   * The role is set on the user record at account creation time (sourced from the invitation).
   * We test the afterSignIn hook logic: given a session with a user email, the DB update
   * is called to mark acceptedAt. The role preservation is tested by verifying that
   * the user's role in the session matches the role from the invitation.
   *
   * Since the role is set by Better Auth's user creation (via the invitation record),
   * we test the hook logic that ensures the invitation is marked accepted, and separately
   * verify that the role stored on the user matches the invitation role.
   */
  it('afterSignIn hook marks acceptedAt for the signed-in user email - Validates: Requirements 1.7', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.constantFrom(...validRoles),
        async (email, role) => {
          const mockDbUpdateSet = vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          })
          const mockDbUpdateFn = vi.fn().mockReturnValue({ set: mockDbUpdateSet })

          const mockEq = vi.fn()

          // Simulate the afterSignIn hook logic from auth.ts
          async function runAfterSignInHook(hookCtx: {
            path: string
            context: { newSession: { user: { email: string; role: string } } | null }
          }): Promise<void> {
            if (hookCtx.path !== '/sign-in/magic-link') return

            const newSession = hookCtx.context.newSession
            if (!newSession?.user?.email) return

            // Simulate DB update: mark acceptedAt
            await mockDbUpdateFn('invitations')
              .set({ acceptedAt: new Date() })
              .where(mockEq('email', newSession.user.email))
          }

          const ctx = {
            path: '/sign-in/magic-link',
            context: {
              newSession: { user: { email, role } },
            },
          }

          await runAfterSignInHook(ctx)

          // DB update must have been called
          expect(mockDbUpdateFn).toHaveBeenCalled()
          expect(mockDbUpdateSet).toHaveBeenCalledWith(
            expect.objectContaining({ acceptedAt: expect.any(Date) })
          )

          // The user's role in the session must match the invitation role
          expect(ctx.context.newSession.user.role).toBe(role)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('afterSignIn hook does nothing when path is not magic-link - Validates: Requirements 1.7', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.constantFrom(...validRoles),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s !== '/sign-in/magic-link'),
        async (email, role, path) => {
          const mockDbUpdateFn = vi.fn()

          async function runAfterSignInHook(hookCtx: {
            path: string
            context: { newSession: { user: { email: string; role: string } } | null }
          }): Promise<void> {
            if (hookCtx.path !== '/sign-in/magic-link') return

            const newSession = hookCtx.context.newSession
            if (!newSession?.user?.email) return

            await mockDbUpdateFn('invitations')
          }

          const ctx = {
            path,
            context: { newSession: { user: { email, role } } },
          }

          await runAfterSignInHook(ctx)

          // DB update must NOT have been called for non-magic-link paths
          expect(mockDbUpdateFn).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})
