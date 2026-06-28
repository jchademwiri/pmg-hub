import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, clients, eq } from '@pmg/db';
import { DevImpersonationBar } from '@/components/dev-impersonation-bar';
import { PortalShell } from '@/components/portal-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client } = await getPortalSessionOrRedirect();

  // Fetch all active clients for impersonation in development mode
  let devClients: { id: string; name: string; businessName: string | null }[] = [];
  if (process.env.NODE_ENV === 'development') {
    const db = getDb();
    devClients = await db
      .select({ id: clients.id, name: clients.name, businessName: clients.businessName })
      .from(clients)
      .where(eq(clients.isActive, true));
  }

  return (
    <>
      <PortalShell client={client}>
        {children}
      </PortalShell>

      {/* Dev Impersonation Bar */}
      {process.env.NODE_ENV === 'development' && devClients.length > 0 && (
        <DevImpersonationBar clients={devClients} currentClientId={client.id} />
      )}
    </>
  );
}
