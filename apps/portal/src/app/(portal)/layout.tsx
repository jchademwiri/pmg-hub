import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, clients, eq } from '@pmg/db';
import { DevImpersonationBar } from '@/components/dev-impersonation-bar';
import { PortalShell } from '@/components/portal-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client, isAdmin } = await getPortalSessionOrRedirect();
  const isDev = process.env.NODE_ENV === 'development';
  const showImpersonation = isDev || isAdmin;

  // Fetch all active clients for impersonation if in development or if user is an admin
  let impersonationClients: { id: string; name: string; businessName: string | null }[] = [];
  if (showImpersonation) {
    const db = getDb();
    impersonationClients = await db
      .select({ id: clients.id, name: clients.name, businessName: clients.businessName })
      .from(clients)
      .where(eq(clients.isActive, true));
  }

  return (
    <>
      <PortalShell client={client}>
        {children}
      </PortalShell>

      {/* Impersonation Bar */}
      {showImpersonation && impersonationClients.length > 0 && (
        <DevImpersonationBar 
          clients={impersonationClients} 
          currentClientId={client.id} 
          cookieName={isDev ? 'dev_impersonate_client_id' : 'impersonate_client_id'}
          label={isDev ? 'Dev Impersonation' : 'Admin Impersonation'}
        />
      )}
    </>
  );
}
