'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getDb, invitations, eq, sql } from '@pmg/db'
import { getSessionOrRedirect, requireRole } from '@/lib/auth'
import { Resend } from 'resend'

// ── Zod schemas ───────────────────────────────────────────────────────────────

const InviteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email(),
  role: z.enum(['super_admin', 'admin', 'viewer']),
})

const UpdateRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'viewer']),
})

// ── Resend client ─────────────────────────────────────────────────────────────

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// ── Role guard ────────────────────────────────────────────────────────────────

/**
 * Verifies the current session belongs to a super_admin.
 * Returns { error: 'Forbidden' } if not, or null if authorized.
 */
async function requireSuperAdmin(): Promise<{ error: string } | null> {
  const session = await getSessionOrRedirect()
  if (!requireRole(session, 'super_admin')) {
    return { error: 'Forbidden' }
  }
  return null
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function inviteUser(formData: FormData): Promise<{ error?: string }> {
  const guard = await requireSuperAdmin()
  if (guard) return guard

  const raw = Object.fromEntries(formData)
  const result = InviteSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation error' }
  }

  const { name, email, role } = result.data
  const db = getDb()

  try {
    // Check for duplicate email
    const existing = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.email, email))
      .limit(1)

    if (existing.length > 0) {
      return { error: 'Email already invited' }
    }

    const session = await getSessionOrRedirect()
    const invitedBy = session.user.id

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(invitations).values({
      name,
      email,
      role,
      token,
      expiresAt,
      invitedBy,
    })

    // Send invitation email via Resend
    const resend = getResend()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const inviteUrl = `${appUrl}/invite?token=${token}`
    const { error: emailError } = await resend.emails.send({
      from: 'PMG Admin <noreply@playhousemedia.co.za>',
      to: email,
      subject: 'You have been invited to PMG Control Center',
      html: `<p>Hi ${name},</p><p>You have been invited to join PMG Control Center as <strong>${role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`,
    })

    if (emailError) {
      return { error: 'Failed to send email' }
    }

    revalidatePath('/users')
    return {}
  } catch {
    return { error: 'Something went wrong' }
  }
}

export async function revokeUser(userId: string): Promise<{ error?: string }> {
  const guard = await requireSuperAdmin()
  if (guard) return guard

  const db = getDb()

  try {
    // Invalidate all sessions for the user via raw SQL (Better Auth manages the sessions table)
    await db.execute(sql`DELETE FROM "session" WHERE "userId" = ${userId}`)

    // Mark user as inactive via raw SQL (Better Auth manages the users table)
    await db.execute(sql`UPDATE "user" SET "isActive" = false WHERE "id" = ${userId}`)

    revalidatePath('/users')
    return {}
  } catch {
    return { error: 'Something went wrong' }
  }
}

export async function updateUserName(userId: string, formData: FormData): Promise<{ error?: string }> {
  const guard = await requireSuperAdmin()
  if (guard) return guard

  const name = (formData.get('name') as string | null)?.trim()
  if (!name || name.length < 1) return { error: 'Name cannot be empty' }
  if (name.length > 100) return { error: 'Name too long' }

  try {
    const db = getDb()
    await db.execute(sql`UPDATE "user" SET "name" = ${name} WHERE "id" = ${userId}`)
    revalidatePath('/users')
    return {}
  } catch {
    return { error: 'Something went wrong' }
  }
}

export async function updateUserRole(userId: string, formData: FormData): Promise<{ error?: string }> {
  const guard = await requireSuperAdmin()
  if (guard) return guard

  const raw = Object.fromEntries(formData)
  const result = UpdateRoleSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Validation error' }
  }

  const { role } = result.data

  try {
    const db = getDb()
    // Update role via raw SQL (Better Auth manages the users table)
    await db.execute(sql`UPDATE "user" SET "role" = ${role} WHERE "id" = ${userId}`)

    revalidatePath('/users')
    return {}
  } catch {
    return { error: 'Something went wrong' }
  }
}
