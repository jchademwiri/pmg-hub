import type { Metadata } from 'next';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getComplianceRecordsByClient } from '@pmg/db';
import { ComplianceClient } from './compliance-client';

export const metadata: Metadata = {
  title: 'Compliance Documents | PMG Hub',
};

export default async function CompliancePage() {
  const { client } = await getPortalSessionOrRedirect();
  const records = await getComplianceRecordsByClient(client.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Compliance Documents</h1>
        <p className="text-muted-foreground mt-1">Manage and track the expiry dates of your important business documents.</p>
      </div>

      <ComplianceClient records={records} />
    </div>
  );
}
