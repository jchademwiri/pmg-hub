import type { Metadata } from 'next';
import { CreditCard } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { BillingCreditClient } from '../billing-settings-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Credit Policy | Billing Settings',
  description: 'Manage credit note retention and automatic credit allocation rules.',
};

export default async function BillingCreditPage() {
  const [divisionsList, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        icon={CreditCard}
        title="Credit Policy"
        description="Configure credit note retention limits and auto-application rules per division."
      />

      <BillingCreditClient
        divisions={divisionsList}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
