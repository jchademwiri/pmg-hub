/**
 * Property-Based Tests for User Management Server Actions
 *
 * Property 7: Viewer role is denied all mutations
 * Validates: Requirements 4.1, 4.2
 *
 * Property 8: Non-super_admin is denied user management
 * Validates: Requirements 4.3, 5.7
 *
 * Property 9: Invalid invite inputs are rejected before DB operations
 * Validates: Requirements 5.5, 5.6
 *
 * Property 10: Role update round-trip
 * Validates: Requirements 5.4
 *
 * Property 12: Resend errors never propagate as exceptions
 * Validates: Requirements 9.4
 */

import { describe, it, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ─── Hoist mock state ─────────────────────────────────────────────────────────
const { mockSession, mockDbInsert, mockDbSelect, mockDbExecute, mockResendSend } = vi.hoisted(() => {
  return {
    mockSession: vi.fn(),
    mockDbInsert: vi.fn(),
    mockDbSelect: vi.fn(),
    mockDbExecute: vi.fn(),
    mockResendSend: vi.fn(),
  }
})

// ─── Mock next/cache ─────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── Mock next/navigation ────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// ─── Mock next/headers ───────────────────────────────────────────────────────
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// ─── Mock @/lib/auth ─────────────────────────────────────────────────────────
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

// ─── Mock resend ─────────────────────────────────────────────────────────────
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}))

// ─── Mock @pmg/db ─────────────────────────────────────────────────────────────
vi.mock('@pmg/db', () => {
  // Chainable builder that resolves via mockDbInsert/mockDbSelect
  function makeInsertChain() {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockDbInsert().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbInsert().catch(reject)
      },
    }
    chain['values'] = () => chain
    return chain
  }

  function makeSelectChain(rows: unknown[] = []) {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockDbSelect(rows).then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbSelect(rows).catch(reject)
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
        return mockDbExecute().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbExecute().catch(reject)
      },
    }
    chain['set'] = () => chain
    chain['where'] = () => chain
    return chain
  }

  function makeDeleteChain() {
    const chain: Record<string, unknown> = {
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
        return mockDbExecute().then(resolve, reject)
      },
      catch(reject: (e: unknown) => unknown) {
        return mockDbExecute().catch(reject)
      },
    }
    chain['where'] = () => chain
    return chain
  }

  const dbMock = {
    insert: () => makeInsertChain(),
    select: () => makeSelectChain(),
    update: () => makeUpdateChain(),
    delete: () => makeDeleteChain(),
    execute: mockDbExecute,
  }

  return {
    getDb: () => dbMock,
    invitations: { id: 'id', email: 'email', role: 'role', token: 'token', expiresAt: 'expiresAt', invitedBy: 'invitedBy' },
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
import { inviteUser, revokeUser, updateUserRole } from '@/app/actions/users'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/** Assert a value matches the { error?: string } contract */
function assertActionResult(result: unknown): void {
  expect(typeof result).toBe('object')
  expect(result).not.toBeNull()
  const keys = Object.keys(result as object)
  for (const key of keys) {
    expect(key).toBe('error')
  }
  const r = result as { error?: unknown }
  if ('error' in r) {
    expect(typeof r.error).toBe('string')
  }
}

const validRoles = ['super_admin', 'admin', 'viewer'] as const
const nonSuperAdminRoles = ['admin', 'viewer'] as const

beforeEach(() => {
  vi.clearAllMocks()
  // Default: no-op DB operations
  mockDbInsert.mockResolvedValue(undefined)
  mockDbSelect.mockResolvedValue([])
  mockDbExecute.mockResolvedValue({ rows: [] })
  mockResendSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })
})

// ─── Property 7: Viewer role is denied all mutations ─────────────────────────

describe('Property 7: Viewer role is denied all mutations', () => {
  // Feature: auth-roles, Property 7: Viewer role is denied all mutations

  it('inviteUser returns Forbidden for viewer - Validates: Requirements 4.1, 4.2', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.constantFrom(...validRoles),
        async (email, role) => {
          mockSession.mockResolvedValue(makeSession('viewer'))

          const fd = buildFormData({ email, role })
          const result = await inviteUser(fd)

          expect(result).toEqual({ error: 'Forbidden' })
          expect(mockDbInsert).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('revokeUser returns Forbidden for viewer - Validates: Requirements 4.1, 4.2', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        mockSession.mockResolvedValue(makeSession('viewer'))

        const result = await revokeUser(userId)

        expect(result).toEqual({ error: 'Forbidden' })
        expect(mockDbExecute).not.toHaveBeenCalled()
      }),
      { numRuns: 100 }
    )
  })

  it('updateUserRole returns Forbidden for viewer - Validates: Requirements 4.1, 4.2', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...validRoles),
        async (userId, role) => {
          mockSession.mockResolvedValue(makeSession('viewer'))

          const fd = buildFormData({ role })
          const result = await updateUserRole(userId, fd)

          expect(result).toEqual({ error: 'Forbidden' })
          expect(mockDbExecute).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 8: Non-super_admin is denied user management ───────────────────

describe('Property 8: Non-super_admin is denied user management', () => {
  // Feature: auth-roles, Property 8: Non-super_admin is denied user management

  it('inviteUser returns Forbidden for admin and viewer - Validates: Requirements 4.3, 5.7', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonSuperAdminRoles),
        fc.emailAddress(),
        fc.constantFrom(...validRoles),
        async (callerRole, email, targetRole) => {
          mockSession.mockResolvedValue(makeSession(callerRole))

          const fd = buildFormData({ email, role: targetRole })
          const result = await inviteUser(fd)

          expect(result).toEqual({ error: 'Forbidden' })
          expect(mockDbInsert).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('revokeUser returns Forbidden for admin and viewer - Validates: Requirements 4.3, 5.7', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonSuperAdminRoles),
        fc.uuid(),
        async (callerRole, userId) => {
          mockSession.mockResolvedValue(makeSession(callerRole))

          const result = await revokeUser(userId)

          expect(result).toEqual({ error: 'Forbidden' })
          expect(mockDbExecute).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('updateUserRole returns Forbidden for admin and viewer - Validates: Requirements 4.3, 5.7', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonSuperAdminRoles),
        fc.uuid(),
        fc.constantFrom(...validRoles),
        async (callerRole, userId, role) => {
          mockSession.mockResolvedValue(makeSession(callerRole))

          const fd = buildFormData({ role })
          const result = await updateUserRole(userId, fd)

          expect(result).toEqual({ error: 'Forbidden' })
          expect(mockDbExecute).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 9: Invalid invite inputs are rejected before DB operations ──────

describe('Property 9: Invalid invite inputs are rejected before DB operations', () => {
  // Feature: auth-roles, Property 9: Invalid invite inputs are rejected before DB operations

  it('inviteUser rejects malformed email without touching DB - Validates: Requirements 5.5, 5.6', async () => {
    // Generate strings that are NOT valid emails
    const invalidEmailArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
      (s) => !s.includes('@') || s.startsWith('@') || s.endsWith('@')
    )

    await fc.assert(
      fc.asyncProperty(
        invalidEmailArb,
        fc.constantFrom(...validRoles),
        async (email, role) => {
          mockSession.mockResolvedValue(makeSession('super_admin'))

          const fd = buildFormData({ email, role })
          const result = await inviteUser(fd)

          expect(result).toHaveProperty('error')
          expect(typeof (result as { error: string }).error).toBe('string')
          expect(mockDbInsert).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('inviteUser rejects invalid role without touching DB - Validates: Requirements 5.5, 5.6', async () => {
    // Generate strings that are NOT valid roles
    const invalidRoleArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
      (s) => !['super_admin', 'admin', 'viewer'].includes(s)
    )

    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        invalidRoleArb,
        async (email, role) => {
          mockSession.mockResolvedValue(makeSession('super_admin'))

          const fd = buildFormData({ email, role })
          const result = await inviteUser(fd)

          expect(result).toHaveProperty('error')
          expect(typeof (result as { error: string }).error).toBe('string')
          expect(mockDbInsert).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 10: Role update round-trip ─────────────────────────────────────

describe('Property 10: Role update round-trip', () => {
  // Feature: auth-roles, Property 10: Role update round-trip

  it('updateUserRole succeeds for any valid role with super_admin session - Validates: Requirements 5.4', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...validRoles),
        async (userId, role) => {
          mockSession.mockResolvedValue(makeSession('super_admin'))
          mockDbExecute.mockResolvedValue({ rows: [] })

          const fd = buildFormData({ role })
          const result = await updateUserRole(userId, fd)

          // Should succeed (no error)
          expect(result).toEqual({})
          // DB execute should have been called with the role update
          expect(mockDbExecute).toHaveBeenCalled()
          assertActionResult(result)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('updateUserRole rejects invalid role values - Validates: Requirements 5.4', async () => {
    const invalidRoleArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
      (s) => !['super_admin', 'admin', 'viewer'].includes(s)
    )

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        invalidRoleArb,
        async (userId, role) => {
          mockSession.mockResolvedValue(makeSession('super_admin'))

          const fd = buildFormData({ role })
          const result = await updateUserRole(userId, fd)

          expect(result).toHaveProperty('error')
          expect(mockDbExecute).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 12: Resend errors never propagate as exceptions ─────────────────

describe('Property 12: Resend errors never propagate as exceptions', () => {
  // Feature: auth-roles, Property 12: Resend errors never propagate as exceptions

  it('inviteUser returns { error } when Resend throws - Validates: Requirements 9.4', async () => {
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
        async (email, role, errorMessage) => {
          mockSession.mockResolvedValue(makeSession('super_admin'))
          mockDbSelect.mockResolvedValue([]) // no duplicate
          mockDbInsert.mockResolvedValue(undefined)
          // Resend throws an exception
          mockResendSend.mockRejectedValue(new Error(errorMessage))

          const fd = buildFormData({ email, role })
          const result = await inviteUser(fd)

          // Must not throw - must return { error }
          assertActionResult(result)
          expect(result).toHaveProperty('error')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('inviteUser returns { error: "Failed to send email" } when Resend returns error object - Validates: Requirements 9.4', async () => {
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
        async (email, role, errorMessage) => {
          mockSession.mockResolvedValue(makeSession('super_admin'))
          mockDbSelect.mockResolvedValue([]) // no duplicate
          mockDbInsert.mockResolvedValue(undefined)
          // Resend returns an error object (not a throw)
          mockResendSend.mockResolvedValue({ data: null, error: { message: errorMessage } })

          const fd = buildFormData({ email, role })
          const result = await inviteUser(fd)

          assertActionResult(result)
          expect(result).toEqual({ error: 'Failed to send email' })
        }
      ),
      { numRuns: 100 }
    )
  })
})
