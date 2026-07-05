import * as React from 'react';
import { cookies } from 'next/headers';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { PortalShell } from '@/components/portal-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client, isAdmin } = await getPortalSessionOrRedirect();

  // Check if an admin is currently impersonating a client (either production or dev mode)
  const cookieStore = await cookies();
  const isImpersonating =
    isAdmin &&
    !!(cookieStore.get('impersonate_client_id')?.value ||
      cookieStore.get('dev_impersonate_client_id')?.value);

  return (
    <>
      <PortalShell client={client} isImpersonating={isImpersonating}>
        {children}
      </PortalShell>
    </>
  );
}
