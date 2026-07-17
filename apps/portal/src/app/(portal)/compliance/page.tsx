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
    <div>
      <ComplianceClient records={records} />
    </div>
  );
}
