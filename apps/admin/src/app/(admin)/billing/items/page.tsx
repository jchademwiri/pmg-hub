import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getAllItems } from '@pmg/db';
import { ItemsTable } from './items-table';

import { AddItemDialog } from './add-item-dialog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Items' };

interface ItemsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const { status } = await searchParams;
  const showArchived = status === 'archived';

  const [activeItems, archivedItems] = await Promise.all([
    getAllItems({ status: 'active' }),
    getAllItems({ status: 'archived' }),
  ]);

  const displayItems = showArchived ? archivedItems : activeItems;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Items</h2>
          <p className="text-sm text-muted-foreground">Manage your service catalogue</p>
        </div>
        <div className="flex items-center gap-2">
          <AddItemDialog />
        </div>
      </div>

      {/* Items table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Items</CardTitle>
            <CardDescription>Service items available for invoices and quotes</CardDescription>
          </div>
          {/* Active / Archived toggle */}
          <div className="flex gap-1 rounded-lg border p-1">
            <Link
              href="/billing/items"
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                !showArchived
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </Link>
            <Link
              href="/billing/items?status=archived"
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                showArchived
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Archived
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {displayItems.length === 0 ? (
            <div className="px-6 pb-4">
              <EmptyState
                message={
                  showArchived
                    ? 'No archived items.'
                    : 'No items yet. Create your first service item using the New Item button above.'
                }
              />
            </div>
          ) : (
            <ItemsTable items={displayItems} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
