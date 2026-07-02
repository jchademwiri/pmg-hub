import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { PortalShell } from '@/components/portal-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client } = await getPortalSessionOrRedirect();

  return (
    <>
      <PortalShell client={client}>
        {children}
      </PortalShell>
    </>
  );
}
