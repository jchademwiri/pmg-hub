import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { getDb, clients, user, eq, and } from '@pmg/db';
import React from 'react';
import { createEmailClient, MagicLinkEmail, DEFAULT_EMAIL_FROM, DEFAULT_REPLY_TO } from '@pmg/emails';

const getBaseURL = () => {
  // Helper to check if a URL contains localhost or 127.0.0.1
  const isLocalUrl = (url: string) => url.includes('localhost') || url.includes('127.0.0.1');

  // Check env vars in order, rejecting local URLs (mirrors getPortalBaseUrl logic)
  if (process.env.PORTAL_AUTH_URL && !isLocalUrl(process.env.PORTAL_AUTH_URL)) {
    return process.env.PORTAL_AUTH_URL;
  }
  if (process.env.PORTAL_URL && !isLocalUrl(process.env.PORTAL_URL)) {
    return process.env.PORTAL_URL;
  }
  if (process.env.BETTER_AUTH_URL && !isLocalUrl(process.env.BETTER_AUTH_URL)) {
    return process.env.BETTER_AUTH_URL;
  }
  if (process.env.VERCEL_ENV === 'preview') return 'https://client.playhousemedia.co.za';
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return 'https://portal.playhousemedia.co.za';
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.PORTAL_AUTH_URL || process.env.PORTAL_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3001';
};

const resolvedBaseURL = getBaseURL();

export const portalAuth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: resolvedBaseURL,
  trustedOrigins: [
    ...(process.env.PORTAL_AUTH_URL ? [process.env.PORTAL_AUTH_URL] : []),
    ...(process.env.PORTAL_URL ? [process.env.PORTAL_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    'https://portal.playhousemedia.co.za',
    'https://client.playhousemedia.co.za',
  ],
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
            from: `PMG Billing <${DEFAULT_EMAIL_FROM}>`,
            adminEmail: DEFAULT_EMAIL_FROM,
          });

          const { error } = await emailClient({
            to: email,
            subject: 'Access your PMG Billing Portal',
            react: React.createElement(MagicLinkEmail, {
              url,
              expiresIn: '24 hours',
              companyName: 'Playhouse Media Group',
              primaryColor: '#2563eb', // blue-600
              websiteUrl: 'https://playhousemedia.co.za',
            }),
            replyTo: DEFAULT_REPLY_TO,
          });

          if (error) {
            console.error('[MagicLink Error]', error);
            throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Failed to send email' });
          }
        } catch (e) {
          console.error('[sendMagicLink failed]', e);
          throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Failed to send email' });
        }
      },
    }),
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/magic-link') return;
      
      const body = ctx.body as { email?: string };
      const email = body?.email?.toLowerCase();
      if (!email) return;

      const db = getDb();
      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.email, email), eq(clients.isActive, true)))
        .limit(1);

      if (!client) {
        // Also check if they are an admin/super_admin in the user table
        const [adminUser] = await db
          .select()
          .from(user)
          .where(eq(user.email, email))
          .limit(1);

        if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role || '')) {
          throw new APIError('FORBIDDEN', { message: 'No active client account found for this email.' });
        }
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/magic-link/verify') return;

      const newSession = ctx.context.newSession;
      if (!newSession?.user?.email) return;

      const db = getDb();
      const email = newSession.user.email.toLowerCase();

      // Do NOT auto-link admin/super_admin users to client records.
      // Admins have their own user record (created by the admin auth) and should
      // NOT be linked to a client — otherwise getPortalSession() will always
      // return that client for this user, breaking both normal portal access
      // and impersonation.
      const [dbUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (dbUser && ['admin', 'super_admin'].includes(dbUser.role || '')) {
        return;
      }

      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.email, email))
        .limit(1);

      if (client && !client.userId) {
        await db
          .update(clients)
          .set({ userId: newSession.user.id, updatedAt: new Date() })
          .where(eq(clients.id, client.id));
      }
    }),
  },
});
