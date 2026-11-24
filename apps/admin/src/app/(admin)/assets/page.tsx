import type { Metadata } from 'next';
import Link from 'next/link';
import { Wallet, Boxes, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getAllAssets, getAssetsSummary } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { SARS_SMALL_ASSET_THRESHOLD } from '@/lib/accounting/posting';
import { AssetsTable } from './assets-table';
import { AddAssetDialog } from './add-asset-dialog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Assets Register' };

interface AssetsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { status } = await searchParams;
  const showDisposed = status === 'disposed';

  const [items, activeAssets, summary] = await Promise.all([
    getAllAssets({ status: showDisposed ? 'disposed' : 'active', kind: 'fixed_asset' }),
    getAllAssets({ status: 'active', kind: 'fixed_asset' }),
    getAssetsSummary(),
  ]);

  const capitalizedAssets = activeAssets.filter(
    (a) => Number(a.cost) >= SARS_SMALL_ASSET_THRESHOLD,
  );
  const smallAssets = activeAssets.filter((a) => Number(a.cost) < SARS_SMALL_ASSET_THRESHOLD);
  const capitalizedTotal = capitalizedAssets.reduce((sum, a) => sum + Number(a.cost), 0);
  const smallAssetsTotal = smallAssets.reduce((sum, a) => sum + Number(a.cost), 0);

  const baseHref = '/assets';
  const query = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set('status', params.status);
    const qs = sp.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Assets Register</h2>
          <p className="text-sm text-muted-foreground">
            Track equipment, hardware, vehicles, and capitalised business assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddAssetDialog />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Wallet className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Fixed Assets</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatZAR(summary.totalFixedAssetsValue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.totalCount} active {summary.totalCount === 1 ? 'asset' : 'assets'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <Boxes className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capitalised PPE (≥ R7k)</p>
              <p className="text-lg font-semibold tabular-nums">{formatZAR(capitalizedTotal)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {capitalizedAssets.length} {capitalizedAssets.length === 1 ? 'asset' : 'assets'} ·
                GL 1500
              </p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Wrench className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Small Assets (&lt; R7k)</p>
              <p className="text-lg font-semibold tabular-nums">{formatZAR(smallAssetsTotal)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {smallAssets.length} {smallAssets.length === 1 ? 'item' : 'items'} · SARS 5030
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed assets register */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Fixed Assets</CardTitle>
            <CardDescription>
              Equipment, hardware, and vehicles owned by the company
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Active / Disposed toggle */}
            <div className="flex gap-1 rounded-lg border p-1">
              <Link
                href={query({ status: undefined })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  !showDisposed
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </Link>
              <Link
                href={query({ status: 'disposed' })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  showDisposed
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Disposed
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="px-6 pb-4">
              <EmptyState
                message={
                  showDisposed
                    ? 'No disposed assets.'
                    : 'No fixed assets yet. Register your first asset using the New Asset button above.'
                }
              />
            </div>
          ) : (
            <AssetsTable assets={items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
