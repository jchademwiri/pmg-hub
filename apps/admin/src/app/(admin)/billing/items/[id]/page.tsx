import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { getItemById } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { ItemEditClient } from './item-edit-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Item' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) notFound();

  const totalUsage = item.usageInvoices + item.usageQuotes;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/items">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <BillingStatusBadge status={item.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created{' '}
              {new Date(item.createdAt).toLocaleDateString('en-ZA', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
              <CardDescription>Service item information</CardDescription>
            </CardHeader>
            <CardContent>
              <ItemEditClient item={item} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoices</span>
                  <span className="tabular-nums font-medium">{item.usageInvoices}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quotes</span>
                  <span className="tabular-nums font-medium">{item.usageQuotes}</span>
                </div>
                <Separator className="my-1" />
                <p className="text-xs text-muted-foreground">
                  {totalUsage === 0
                    ? 'Not used on any documents yet.'
                    : `Used on ${totalUsage} document${totalUsage === 1 ? '' : 's'} in total.`}
                </p>
                {totalUsage > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Archive instead of deleting items that are in use.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <BillingStatusBadge status={item.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="tabular-nums">{formatZAR(Number(item.unitPrice))} <span className="text-xs text-muted-foreground">excl. VAT</span></span>
                </div>
                {item.unitLabel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit</span>
                    <span>{item.unitLabel}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
