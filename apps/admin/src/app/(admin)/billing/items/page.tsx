import type { Metadata } from 'next';
import { Package, DollarSign, Layers, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { getAllItems } from '@pmg/db';
import { ItemsTable } from './items-table';
import { AddItemDialog } from './add-item-dialog';
import { formatZAR } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Items' };

interface ItemsPageProps {
  searchParams?: Promise<{ status?: string }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps = {}) {
  const params = searchParams ? await searchParams : undefined;
  const [activeItems, archivedItems] = await Promise.all([
    getAllItems({ status: 'active' }),
    getAllItems({ status: 'archived' }),
  ]);

  const itemMap = new Map<string, (typeof activeItems)[number]>();
  for (const item of [...activeItems, ...archivedItems]) {
    itemMap.set(item.id, item);
  }
  const allItems = Array.from(itemMap.values());

  const avgRate = activeItems.length
    ? activeItems.reduce((acc, i) => acc + parseFloat(i.unitPrice), 0) / activeItems.length
    : 0;

  const unitTypesCount = new Set(
    activeItems.map((i) => (i.unitLabel ? i.unitLabel.toLowerCase() : 'fixed')),
  ).size;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Service Catalogue</h2>
          <p className="text-sm text-muted-foreground">
            Manage reusable service rates, line items, and retainer components
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddItemDialog />
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <BillingKpiCard
          title="Active Services"
          value={activeItems.length}
          subtitle="Ready for invoices, retainers & quotes"
          icon={Package}
          variant="blue"
        />

        <BillingKpiCard
          title="Average Unit Rate"
          value={formatZAR(avgRate)}
          subtitle="Across active catalogue items"
          icon={DollarSign}
          variant="emerald"
        />

        <BillingKpiCard
          title="Packaging Units"
          value={`${unitTypesCount} Unit Types`}
          subtitle="Hourly, monthly, project, fixed rates"
          icon={Layers}
          variant="violet"
        />

        <BillingKpiCard
          title="Total Catalogue"
          value={`${allItems.length} Items`}
          subtitle={`${archivedItems.length} archived service item(s)`}
          icon={Archive}
          variant="zinc"
        />
      </div>

      {/* Items table */}
      <Card>
        <CardContent className="p-0">
          <ItemsTable items={allItems} />
        </CardContent>
      </Card>
    </div>
  );
}
