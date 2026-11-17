import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { BillingTemplatesClient } from '../billing-settings-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Document Templates & Notes | Billing Settings',
  description: 'Manage default invoice notes and quotation terms per division.',
};

export default async function BillingTemplatesPage() {
  const [divisionsList, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        icon={FileText}
        title="Document Templates & Notes"
        description="Default invoice payment instructions and quote terms for each division."
      />

      <BillingTemplatesClient
        divisions={divisionsList}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
