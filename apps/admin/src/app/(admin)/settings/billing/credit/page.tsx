import type { Metadata } from 'next';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
import { BillingCreditClient } from '../billing-settings-client';

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
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Credit Policy</h2>
        <p className="text-sm text-muted-foreground">
          Configure credit note retention limits and auto-application rules per division.
        </p>
      </div>

      <BillingCreditClient
        divisions={divisionsList}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
