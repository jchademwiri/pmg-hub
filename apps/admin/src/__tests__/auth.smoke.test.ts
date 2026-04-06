// Feature: auth-roles, Smoke Tests

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// __dirname = apps/admin/src/__tests__
// ADMIN_ROOT = apps/admin/src
// MONOREPO_ROOT = apps/admin/src/../../../.. = (workspace root)
const ADMIN_SRC = resolve(__dirname, '..')          // apps/admin/src
const ADMIN_ROOT = resolve(__dirname, '../..')      // apps/admin
const MONOREPO_ROOT = resolve(__dirname, '../../..', '..') // workspace root

// ── Helpers ───────────────────────────────────────────────────────────────────

function readAdminSrc(relativePath: string): string {
  return readFileSync(resolve(ADMIN_SRC, relativePath), 'utf-8')
}

function readMonorepoFile(relativePath: string): string {
  return readFileSync(resolve(MONOREPO_ROOT, relativePath), 'utf-8')
}

// ── 1. emailAndPassword provider is disabled ──────────────────────────────────
// Validates: Requirements 1.1

describe('auth config — emailAndPassword disabled', () => {
  it('auth.ts sets emailAndPassword.enabled to false — Validates: Requirements 1.1', () => {
    const src = readAdminSrc('lib/auth.ts')
    expect(src).toContain('emailAndPassword')
    expect(src).toContain('enabled: false')
    expect(src).not.toContain('enabled: true')
  })
})

// ── 2. magicLink plugin is enabled ────────────────────────────────────────────
// Validates: Requirements 2.1

describe('auth config — magicLink plugin enabled', () => {
  it('auth.ts imports and uses the magicLink plugin — Validates: Requirements 2.1', () => {
    const src = readAdminSrc('lib/auth.ts')
    expect(src).toContain("from 'better-auth/plugins'")
    expect(src).toContain('magicLink(')
  })
})

// ── 3. RESEND_API_KEY is read from env, not hardcoded ─────────────────────────
// Validates: Requirements 9.3

describe('auth config — RESEND_API_KEY from env', () => {
  it('auth.ts reads RESEND_API_KEY from process.env — Validates: Requirements 9.3', () => {
    const src = readAdminSrc('lib/auth.ts')
    expect(src).toContain('process.env.RESEND_API_KEY')
  })

  it('auth.ts does not contain a hardcoded Resend API key — Validates: Requirements 9.3', () => {
    const src = readAdminSrc('lib/auth.ts')
    // Resend API keys start with "re_"
    expect(src).not.toMatch(/["']re_[A-Za-z0-9_]{10,}["']/)
  })
})

// ── 4. Auth catch-all route exports GET and POST ──────────────────────────────
// Validates: Requirements 10.1, 10.2

describe('auth catch-all route — GET and POST exports', () => {
  it('route.ts source exports GET and POST named exports — Validates: Requirements 10.1, 10.2', () => {
    const src = readAdminSrc('app/api/auth/[...all]/route.ts')
    // The route must export GET and POST (via destructuring or explicit export)
    expect(src).toMatch(/export\s+.*\bGET\b/)
    expect(src).toMatch(/export\s+.*\bPOST\b/)
  })
})

// ── 5. invitations schema has all required columns ────────────────────────────
// Validates: Requirements 6.1

describe('invitations schema — required columns', () => {
  it('invitations table has all required columns with correct types — Validates: Requirements 6.1', async () => {
    const { invitations } = await import('@pmg/db')
    const columns = invitations as unknown as Record<string, unknown>

    const requiredColumns = [
      'id',
      'email',
      'role',
      'token',
      'expiresAt',
      'acceptedAt',
      'invitedBy',
      'createdAt',
    ]

    for (const col of requiredColumns) {
      expect(columns, `Expected column "${col}" to exist on invitations table`).toHaveProperty(col)
    }
  })

  it('invitations schema source has all required column definitions — Validates: Requirements 6.1', () => {
    const src = readMonorepoFile('packages/db/src/schema/invitations.ts')
    const expectedColumns = ['id', 'email', 'role', 'token', 'expiresAt', 'acceptedAt', 'invitedBy', 'createdAt']
    for (const col of expectedColumns) {
      expect(src, `Expected column "${col}" in invitations schema`).toContain(col)
    }
    // Verify UUID type for id and invitedBy
    expect(src).toContain('uuid(')
    // Verify timestamp type for date columns
    expect(src).toContain('timestamp(')
    // Verify role enum
    expect(src).toContain('super_admin')
    expect(src).toContain('admin')
    expect(src).toContain('viewer')
  })
})

// ── 6. Proxy contains no role-checking logic ──────────────────────────────────
// Validates: Requirements 3.4

describe('proxy — no role-checking logic', () => {
  it('proxy.ts does not contain role-checking keywords — Validates: Requirements 3.4', () => {
    const src = readAdminSrc('proxy.ts')
    // These are role-enforcement keywords that must NOT appear in the proxy
    const forbiddenKeywords = ['super_admin', 'requireRole', 'getSession', 'notFound']
    for (const keyword of forbiddenKeywords) {
      expect(src, `proxy.ts must not contain role-checking keyword: "${keyword}"`).not.toContain(keyword)
    }
  })
})
