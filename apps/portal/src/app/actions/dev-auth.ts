'use server';

import { cookies } from 'next/headers';
import { getDb, clients, eq } from '@pmg/db';

export async function getDevClientsAction(): Promise<
  Array<{ id: string; name: string; businessName: string | null; email: string | null }>
> {
  if (process.env.NODE_ENV !== 'development') {
    return [];
  }

  try {
    const db = getDb();
    const activeClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        businessName: clients.businessName,
        email: clients.email,
      })
      .from(clients)
      .where(eq(clients.isActive, true));

    return activeClients;
  } catch (error) {
    console.error('Failed to fetch dev clients:', error);
    return [];
  }
}

export async function loginAsDevClientAction(
  clientId: string,
): Promise<{ success: boolean; error?: string }> {
  if (process.env.NODE_ENV !== 'development') {
    return { success: false, error: 'Only available in development mode.' };
  }

  try {
    const db = getDb();
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);

    if (!client || !client.isActive) {
      return { success: false, error: 'Client not found or inactive.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('dev_impersonate_client_id', client.id, {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
      httpOnly: false,
    });

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to login as client.';
    return { success: false, error: message };
  }
}
