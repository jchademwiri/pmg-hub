import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb, invitations, user, eq } from '@pmg/db'
import React, { cache } from 'react'
import { createEmailClient, MagicLinkEmail, DEFAULT_EMAIL_FROM, DEFAULT_REPLY_TO } from '@pmg/emails'

// ── Better Auth config ────────────────────────────────────────────────────────

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL 
    ? [process.env.BETTER_AUTH_URL, "http://192.168.0.190:3000"] 
    : ["http://192.168.0.190:3000"],
  database: drizzleAdapter(getDb(), { provider: 'pg' }),

  emailAndPassword: {
    enabled: false,
  },

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        try {
          const emailClient = createEmailClient({
            apiKey: process.env.PMG_RESEND_API_KEY!,
            from: `PMG Admin <${DEFAULT_EMAIL_FROM}>`,
            adminEmail: DEFAULT_EMAIL_FROM,
          })

          const { error } = await emailClient({
            to: email,
            subject: 'Sign in to PMG Control Center',
            react: React.createElement(MagicLinkEmail, {
              url,
              expiresIn: '24 hours',
              companyName: 'Playhouse Media Group',
              primaryColor: '#1d4ed8',
              websiteUrl: 'https://playhousemedia.co.za',
            }),
            replyTo: DEFAULT_REPLY_TO,
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
export const getSessionOrRedirect = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  return session
})

/**
 * Returns true if the session user's role meets or exceeds the required role.
 */
export function requireRole(session: Session, role: Role): boolean {
  const userRole = (session.user as { role?: string }).role as Role | undefined
  const userLevel = ROLE_HIERARCHY[userRole ?? 'viewer'] ?? 1
  return userLevel >= ROLE_HIERARCHY[role]
}
