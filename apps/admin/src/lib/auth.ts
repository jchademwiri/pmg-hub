import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb, invitations, user, eq } from '@pmg/db'
import { Resend } from 'resend'
import { DEFAULT_EMAIL_FROM } from '@pmg/emails'

// ── Resend client ─────────────────────────────────────────────────────────────

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// ── Better Auth config ────────────────────────────────────────────────────────

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
  database: drizzleAdapter(getDb(), { provider: 'pg' }),

  emailAndPassword: {
    enabled: false,
  },

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const resend = getResend()
        try {
          const { error } = await resend.emails.send({
            from: `PMG Admin <${DEFAULT_EMAIL_FROM}>`,
            to: email,
            subject: 'Sign in to PMG Control Center',
            html: `<p>Click the link below to sign in to PMG Control Center:</p><p><a href="${url}">${url}</a></p>`,
          })
          if (error) {
            console.error('[MagicLink Error]', error)
            throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Failed to send email' })
          }
        } catch (err) {
          console.error('[MagicLink Error Catch]', err)
          if (err instanceof APIError) throw err
          throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Failed to send email' })
        }
      },
    }),
  ],

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'viewer',
      },
      isActive: {
        type: 'boolean',
        required: true,
        defaultValue: true,
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/magic-link') return

      const email = ctx.body?.email as string | undefined
      if (!email) {
        throw new APIError('FORBIDDEN', { message: 'Not invited' })
      }

      const existingUser = await ctx.context.adapter.findOne({
        model: 'user',
        where: [{ field: 'email', value: email }],
      })

      if (!existingUser) {
        const db = getDb()
        const [invitation] = await db
          .select()
          .from(invitations)
          .where(eq(invitations.email, email))
          .limit(1)

        if (!invitation || new Date() > invitation.expiresAt) {
          throw new APIError('FORBIDDEN', { message: 'Not invited' })
        }
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/magic-link/verify') return

      const newSession = ctx.context.newSession
      if (!newSession?.user?.email) return

      const db = getDb()
      try {
        const [invitation] = await db
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.email, newSession.user.email))
          .returning()

        if (invitation && newSession.user.id) {
          await db
            .update(user)
            .set({ 
              role: invitation.role, 
              name: invitation.name 
            })
            .where(eq(user.id, newSession.user.id))
        }
      } catch (err) {
        // Non-fatal: invitation may not exist for legacy users
        console.error('[MagicLink Update Error]', err)
      }
    }),
  },
})

export type Session = typeof auth.$Infer.Session

// ── Role hierarchy ────────────────────────────────────────────────────────────

const ROLE_HIERARCHY = { super_admin: 3, admin: 2, viewer: 1 } as const
type Role = keyof typeof ROLE_HIERARCHY

// ── Server helpers ────────────────────────────────────────────────────────────

/**
 * Fetches the current session server-side.
 * Redirects to /login if no session exists.
 */
export async function getSessionOrRedirect() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  return session
}

/**
 * Returns true if the session user's role meets or exceeds the required role.
 */
export function requireRole(session: Session, role: Role): boolean {
  const userRole = (session.user as { role?: string }).role as Role | undefined
  const userLevel = ROLE_HIERARCHY[userRole ?? 'viewer'] ?? 1
  return userLevel >= ROLE_HIERARCHY[role]
}
