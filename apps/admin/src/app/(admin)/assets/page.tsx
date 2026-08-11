import type { Metadata } from 'next';
import Link from 'next/link';
import { Wallet, Landmark, Boxes } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getAllAssets, getAssetsSummary } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { AssetsTable } from './assets-table';
import { AddAssetDialog } from './add-asset-dialog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Assets Register' };

interface AssetsPageProps {
  searchParams: Promise<{ status?: string; kind?: string }>;
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { status, kind } = await searchParams;
  const showDisposed = status === 'disposed';
  const kindFilter = kind === 'fixed_asset' || kind === 'investment' ? kind : undefined;

  const [items, summary] = await Promise.all([
    getAllAssets({ status: showDisposed ? 'disposed' : 'active', kind: kindFilter }),
    getAssetsSummary(),
  ]);

  const baseHref = '/assets';
  const query = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set('status', params.status);
    if (params.kind) sp.set('kind', params.kind);
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
            Track equipment, vehicles, and investments owned by the company
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
              <Boxes className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fixed Assets Value</p>
              <p className="text-lg font-semibold tabular-nums">{formatZAR(summary.totalFixedAssetsValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Landmark className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Investments Value</p>
              <p className="text-lg font-semibold tabular-nums">{formatZAR(summary.totalInvestmentsValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Wallet className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Active Assets</p>
              <p className="text-lg font-semibold tabular-nums">{summary.totalCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Assets</CardTitle>
            <CardDescription>Fixed assets and investments owned by the company</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Kind filter */}
            <div className="flex gap-1 rounded-lg border p-1">
              <Link
                href={query({ status, kind: undefined })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  !kindFilter ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </Link>
              <Link
                href={query({ status, kind: 'fixed_asset' })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  kindFilter === 'fixed_asset' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fixed Assets
              </Link>
              <Link
                href={query({ status, kind: 'investment' })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  kindFilter === 'investment' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Investments
              </Link>
            </div>
            {/* Active / Disposed toggle */}
            <div className="flex gap-1 rounded-lg border p-1">
              <Link
                href={query({ status: undefined, kind: kindFilter })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  !showDisposed ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </Link>
              <Link
                href={query({ status: 'disposed', kind: kindFilter })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  showDisposed ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
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
                    : 'No assets yet. Register your first asset using the New Asset button above.'
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
