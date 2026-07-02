import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb, clients, user, eq, and } from '@pmg/db';
import { portalAuth } from './auth';

export async function getPortalSession() {
  const db = getDb();

  // Impersonation / Bypass Auth helper in development
  if (process.env.NODE_ENV === 'development') {
    const cookieStore = await cookies();
    // Check both the dev cookie AND the production impersonate cookie (set by /impersonate route)
    const impersonateId = cookieStore.get('dev_impersonate_client_id')?.value
      ?? cookieStore.get('impersonate_client_id')?.value;

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

    // Fallback to the first active client in the database to make dev seamless
    const [fallbackClient] = await db
      .select()
      .from(clients)
      .where(eq(clients.isActive, true))
      .limit(1);

    if (fallbackClient) {
      return {
        session: {
          user: {
            id: fallbackClient.userId || 'dev-user',
            email: fallbackClient.email || 'dev@playhousemedia.co.za',
            name: fallbackClient.name,
          },
          session: {
            id: 'dev-session',
            userId: fallbackClient.userId || 'dev-user',
            token: 'dev-token',
            expiresAt: new Date(Date.now() + 86400000),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        client: fallbackClient,
        isAdmin: true,
      };
    }
  }

  // Production authentication check
  const session = await portalAuth.api.getSession({ headers: await headers() });
  if (!session) return null;

  let [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  // Check if they are an admin/super_admin in the user table
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const isAdmin = !!(dbUser && ['admin', 'super_admin'].includes(dbUser.role || ''));

  // If they are an admin/super_admin, allow impersonation
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
