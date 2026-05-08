import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Package, CheckCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllItems } from '@pmg/db';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { formatZAR } from '@/lib/format';

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

  const stats = [
    { label: 'Total Items', value: String(activeItems.length + archivedItems.length), icon: Package, description: 'All items' },
    { label: 'Active', value: String(activeItems.length), icon: CheckCircle, description: 'Available for selection' },
    { label: 'Archived', value: String(archivedItems.length), icon: Archive, description: 'Hidden from selection' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Items</h2>
          <p className="text-sm text-muted-foreground">Manage your service catalogue</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/billing/items/new">
              <Plus className="size-4" />
              New Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
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
                !showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </Link>
            <Link
              href="/billing/items?status=archived"
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
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
                    : 'No items yet. Create your first service item to get started.'
                }
                ctaLabel={!showArchived ? 'New Item' : undefined}
                ctaHref={!showArchived ? '/billing/items/new' : undefined}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/billing/items/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {item.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatZAR(Number(item.unitPrice))}
                      {item.unitLabel && (
                        <span className="text-muted-foreground"> / {item.unitLabel}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.vatApplicable ? '15%' : 'Exempt'}
                    </TableCell>
                    <TableCell>
                      <BillingStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/billing/items/${item.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
