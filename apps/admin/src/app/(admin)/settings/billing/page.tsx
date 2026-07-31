import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { BillingDefaultsClient } from './billing-settings-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Document Defaults · Settings' };

export default async function BillingSettingsPage() {
  const [divisions, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Document Defaults"
        description="Configure document numbering prefixes, VAT rate, and payment terms per division"
        icon={Receipt}
      />

      <BillingDefaultsClient
        divisions={divisions}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
