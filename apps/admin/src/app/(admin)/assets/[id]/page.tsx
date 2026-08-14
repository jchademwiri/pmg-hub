import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getAssetById } from '@pmg/db';
import { formatZAR, fmtDate } from '@/lib/format';
import { formatStatusLabel } from '@/lib/billing-status';
import { AssetEditClient } from './asset-edit-client';
import { SetPageLabel } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Asset' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const asset = await getAssetById(id);
  if (!asset) notFound();

  return (
    <div className="flex flex-col gap-6 pb-32 lg:pb-0">
      <SetPageLabel value="Asset Details" />
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link href="/assets">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{asset.name}</h2>
              <Badge variant="secondary">{formatStatusLabel(asset.kind)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Registered {fmtDate(asset.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetEditClient asset={asset} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{formatStatusLabel(asset.status)}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span>{asset.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="tabular-nums">{formatZAR(Number(asset.cost))}</span>
                </div>
                {asset.currentValue != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Value</span>
                    <span className="tabular-nums">{formatZAR(Number(asset.currentValue))}</span>
                  </div>
                )}
                {asset.disposedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disposed</span>
                    <span>{fmtDate(asset.disposedAt)}</span>
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
