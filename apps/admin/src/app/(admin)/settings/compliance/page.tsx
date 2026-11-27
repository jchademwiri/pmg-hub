import type { Metadata } from 'next';
import { getComplianceDocumentTypes } from '@pmg/db';
import { ComplianceTypesManager } from './compliance-types-manager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Compliance Document Types' };

export default async function ComplianceSettingsPage() {
  const types = await getComplianceDocumentTypes();

  return (
    <div className="flex flex-col gap-6">
      <ComplianceTypesManager initialTypes={types} />
    </div>
  );
}
