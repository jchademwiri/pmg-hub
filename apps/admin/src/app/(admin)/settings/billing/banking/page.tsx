import type { Metadata } from 'next';
import { Landmark } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { BankingOverviewMatrix } from '../billing-settings-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Banking Accounts · Settings' };

export default async function BillingBankingPage() {
  const [divisions, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Banking Accounts"
        description="Bank accounts and payment details printed on client invoices per division"
        icon={Landmark}
      />

      <BankingOverviewMatrix divisions={divisions} allSettings={allSettings} />
    </div>
  );
}
