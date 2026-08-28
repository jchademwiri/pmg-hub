import type { Metadata } from 'next';
import { FileStack } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { BillingStatementsClient } from './billing-statements-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Automated Statements · Settings' };

export default async function BillingStatementsPage() {
  const [divisions, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Automated Statements"
        description="Configure automatic monthly account statements sent to clients with outstanding balances."
        icon={FileStack}
      />

      <BillingStatementsClient
        divisions={divisions}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
