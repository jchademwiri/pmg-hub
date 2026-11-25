import type { Metadata } from 'next';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getComplianceRecordsByClient, getComplianceDocumentTypes } from '@pmg/db';
import { ComplianceClient } from './compliance-client';

export const metadata: Metadata = {
  title: 'Compliance Documents | PMG Hub',
};

export default async function CompliancePage() {
  const { client } = await getPortalSessionOrRedirect();
  const [records, activeTypes] = await Promise.all([
    getComplianceRecordsByClient(client.id),
    getComplianceDocumentTypes({ activeOnly: true }),
  ]);

  return (
    <div>
      <ComplianceClient records={records} documentTypes={activeTypes.map((t) => t.name)} />
    </div>
  );
}
