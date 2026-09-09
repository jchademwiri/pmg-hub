import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb, clients, user, eq, and, sql } from '@pmg/db';
import { portalAuth } from './auth';

export async function getPortalSession() {
  const db = getDb();

  const isDevAuthEnabled =
    process.env.DISABLE_PORTAL_AUTH === 'true' && process.env.NODE_ENV !== 'production';

  // Production authentication check
  const session = await portalAuth.api.getSession({ headers: await headers() });

  // Dev-only escape hatch: synthesize a client session for the dev user switcher
  // (dev_impersonate_client_id cookie) when explicitly enabled. Never active in
  // production. Real sessions take precedence over the dev cookie.
  if (!session && isDevAuthEnabled) {
    const cookieStore = await cookies();
    const impersonateId =
      cookieStore.get('dev_impersonate_client_id')?.value ??
      cookieStore.get('impersonate_client_id')?.value;

    if (impersonateId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, impersonateId), eq(clients.isActive, true)))
        .limit(1);
      if (client) {
        return {
          session: {
            user: {
              id: client.userId || 'dev-user',
              email: client.email || 'dev@playhousemedia.co.za',
              name: client.name,
            },
            session: {
              id: 'dev-session',
              userId: client.userId || 'dev-user',
              token: 'dev-token',
              expiresAt: new Date(Date.now() + 86400000),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          client,
          isAdmin: true,
        };
      }
    }
  }

  if (!session) return null;

  let [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  // Fallback: If client not linked by userId yet, match by email
  if (!client && session.user.email) {
    const userEmail = session.user.email.trim().toLowerCase();
    const [clientByEmail] = await db
      .select()
      .from(clients)
      .where(and(eq(sql`lower(${clients.email})`, userEmail), eq(clients.isActive, true)))
      .limit(1);

    if (clientByEmail) {
      client = clientByEmail;
      // Auto-link userId if not set
      if (!clientByEmail.userId) {
        await db
          .update(clients)
          .set({ userId: session.user.id, updatedAt: new Date() })
          .where(eq(clients.id, clientByEmail.id));
      }
    }
  }

  // Check if they are an admin/super_admin in the user table
  const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  const isAdmin = !!(dbUser && ['admin', 'super_admin'].includes(dbUser.role || ''));

  // If they are an admin/super_admin, allow impersonation or preview
  if (isAdmin) {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get('impersonate_client_id')?.value;

    if (impersonateId) {
      const [targetClient] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, impersonateId), eq(clients.isActive, true)))
        .limit(1);
      if (targetClient) {
        client = targetClient;
      }
    }

    // If an admin logged into the portal directly via magic link and has no client record,
    // fallback to the first active client so they can preview the portal without redirect loops
    if (!client) {
      const [firstClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.isActive, true))
        .limit(1);
      if (firstClient) {
        client = firstClient;
      }
    }
  }

  // Enforce that only active clients (or impersonated clients) can access the portal
  if (!client || !client.isActive) return null;

  return { session, client, isAdmin };
}

export async function getPortalSessionOrRedirect() {
  const result = await getPortalSession();
  if (!result) {
    redirect('/login');
  }
  return result;
}
