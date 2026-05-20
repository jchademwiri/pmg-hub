/**
 * Property-Based Tests for UsersTable
 *
 * Property 13: User table renders all required fields
 * Validates: Requirements 5.1
 */

// Feature: auth-roles, Property 13: User table renders all required fields

import { describe, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'

// ─── Mock server actions ──────────────────────────────────────────────────────
vi.mock('@/app/actions/users', () => ({
  updateUserRole: vi.fn().mockResolvedValue({}),
  revokeUser: vi.fn().mockResolvedValue({}),
}))

// ─── Mock sonner (toast) ──────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ─── Mock shadcn Select (not rendered in jsdom without Radix portal issues) ───
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { UserTable } from '@/components/users/user-table'
import type { UserRow } from '@/components/users/user-table'

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom('super_admin', 'admin', 'viewer') as fc.Arbitrary<string>

/** Generates a valid UserRow with non-empty name and email */
const userRowArb: fc.Arbitrary<UserRow> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  email: fc.emailAddress(),
  role: roleArb,
  isActive: fc.boolean(),
})

/** Maps a role string to its display label */
function roleLabel(role: string): string {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  return 'Viewer'
}

// ─── Property 13 ─────────────────────────────────────────────────────────────

describe('Property 13: User table renders all required fields', () => {
  it(
    'renders each user name, email, role label, and status for any array of users - Validates: Requirements 5.1',
    () => {
      fc.assert(
        fc.property(fc.array(userRowArb, { minLength: 1, maxLength: 10 }), (users) => {
          const { container, unmount } = render(<UserTable users={users} />)
          const text = container.textContent ?? ''

          for (const user of users) {
            // Name must appear
            if (!text.includes(user.name)) {
              unmount()
              return false
            }
            // Email must appear
            if (!text.includes(user.email)) {
              unmount()
              return false
            }
            // Role label must appear
            if (!text.includes(roleLabel(user.role))) {
              unmount()
              return false
            }
            // Status must appear
            const expectedStatus = user.isActive ? 'Active' : 'Inactive'
            if (!text.includes(expectedStatus)) {
              unmount()
              return false
            }
          }

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    }
  )
})
