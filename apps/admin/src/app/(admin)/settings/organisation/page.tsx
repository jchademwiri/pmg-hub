import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { getOrganisationSettings } from '@pmg/db';
import { updateOrganisationSettings } from '@/app/actions/settings';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { OrgSettingsForm } from './org-settings-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Organisation Settings' };

export default async function OrganisationSettingsPage() {
  const settings = await getOrganisationSettings();

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Organisation"
        description="Company details shown on invoices and quotes"
        icon={Building2}
      />

      <OrgSettingsForm settings={settings} saveAction={updateOrganisationSettings} />
    </div>
  );
}
