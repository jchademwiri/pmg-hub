import type { Metadata } from 'next';
import { Package, DollarSign, Layers, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  const allItems = [...activeItems, ...archivedItems];

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-b-4 border-b-primary overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Package className="size-4" /> Active Services
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{activeItems.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Ready for invoices, retainers & quotes
          </CardContent>
        </Card>

        <Card className="border-b-4 border-b-emerald-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-4" /> Average Unit Rate
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatZAR(avgRate)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across active catalogue items
          </CardContent>
        </Card>

        <Card className="border-b-4 border-b-blue-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <Layers className="size-4" /> Packaging Units
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{unitTypesCount} Unit Types</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Hourly, monthly, project, fixed rates
          </CardContent>
        </Card>

        <Card className="border-b-4 border-b-muted-foreground/60 overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Archive className="size-4" /> Total Catalogue
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{allItems.length} Items</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {archivedItems.length} archived service item(s)
          </CardContent>
        </Card>
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

