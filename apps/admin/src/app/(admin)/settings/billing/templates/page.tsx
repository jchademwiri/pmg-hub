import type { Metadata } from 'next';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { saveDivisionBillingSettings } from '@/app/actions/settings';
import { BillingTemplatesClient } from '../billing-settings-client';

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
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Document Templates & Notes</h2>
        <p className="text-sm text-muted-foreground">
          Default invoice payment instructions and quote terms for each division.
        </p>
      </div>

      <BillingTemplatesClient
        divisions={divisionsList}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
