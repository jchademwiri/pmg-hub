import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Receipt } from 'lucide-react';
import { getAllDivisions, getAllDivisionBillingSettings } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BillingSettingsClient } from './billing-settings-client';
import { saveDivisionBillingSettings } from '@/app/actions/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Billing & Invoicing Settings' };

export default async function BillingSettingsPage() {
  const [divisions, allSettings] = await Promise.all([
    getAllDivisions(),
    getAllDivisionBillingSettings(),
  ]);

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
          <Receipt className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Billing & Invoicing</h2>
            <p className="text-sm text-muted-foreground">
              Configure billing defaults per division
            </p>
          </div>
        </div>
      </div>

      <BillingSettingsClient
        divisions={divisions}
        allSettings={allSettings}
        saveAction={saveDivisionBillingSettings}
      />
    </div>
  );
}
