import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { BillingSettingsClient } from './billing-settings-client';
import { saveDivisionBillingSettings } from '@/app/actions/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Billing & Taxes Settings' };

export default async function BillingSettingsPage() {
  const [divisions, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Billing & Taxes"
        description="Configure document numbering prefixes, VAT rate, payment terms, and credit policy per division"
        icon={Receipt}
      />

      <BillingSettingsClient
        divisions={divisions}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}


