import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb, clients, eq, and } from '@pmg/db';
import { portalAuth } from './auth';

export async function getPortalSessionOrRedirect() {
  const db = getDb();

  // Impersonation / Bypass Auth helper in development
  if (process.env.NODE_ENV === 'development') {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get('dev_impersonate_client_id')?.value;

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
      };
    }
  }

  // Production authentication check
  const session = await portalAuth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  // Enforce that only active clients can access the portal
  if (!client || !client.isActive) redirect('/login');

  return { session, client };
}
