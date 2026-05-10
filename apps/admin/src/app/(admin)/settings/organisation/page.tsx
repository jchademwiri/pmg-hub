import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getOrganisationSettings } from '@pmg/db';
import { updateOrganisationSettings } from '@/app/actions/settings';
import { OrgSettingsForm } from './org-settings-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Organisation Settings' };

export default async function OrganisationSettingsPage() {
  const settings = await getOrganisationSettings();

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ChevronLeft className="size-4" />
            Settings
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Organisation</h2>
            <p className="text-sm text-muted-foreground">
              Company details shown on invoices and quotes
            </p>
          </div>
        </div>
      </div>

      <OrgSettingsForm settings={settings} saveAction={updateOrganisationSettings} />
    </div>
  );
}
