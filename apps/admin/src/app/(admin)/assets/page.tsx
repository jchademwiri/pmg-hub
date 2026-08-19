import type { Metadata } from 'next';
import Link from 'next/link';
import { Wallet, Landmark, Boxes } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getAllAssets, getAssetsSummary, getLunoAccounts } from '@pmg/db';
import { formatZAR, fmtDateTime } from '@/lib/format';
import { isVisibleLunoAccount } from '@/lib/luno';
import { AssetsTable } from './assets-table';
import { AddAssetDialog } from './add-asset-dialog';
import { LunoAccountsTable } from '@/components/luno-accounts-table';
import { LunoSyncButton } from '@/components/luno-sync-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Assets Register' };

interface AssetsPageProps {
  searchParams: Promise<{ status?: string }>;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { status } = await searchParams;
  const showDisposed = status === 'disposed';

  const [items, summary, lunoAccounts] = await Promise.all([
    getAllAssets({ status: showDisposed ? 'disposed' : 'active', kind: 'fixed_asset' }),
    getAssetsSummary(),
    getLunoAccounts(),
  ]);

  const baseHref = '/assets';
  const query = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set('status', params.status);
    const qs = sp.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  // Auto-sync when the snapshot is empty or older than 15 minutes so the
  // dashboard stays fresh without a scheduler.
  const STALE_AFTER_MS = 15 * 60 * 1000;
  const lastSyncedMs =
    lunoAccounts.length > 0 ? Math.max(...lunoAccounts.map((a) => a.syncedAt.getTime())) : 0;
  // react-hooks/purity assumes a component may be re-rendered/memoized on the
  // client, where an impure call like Date.now() could produce inconsistent
  // output across renders. This is a Server Component (no 'use client') -
  // it runs exactly once per request on the server - so that concern doesn't
  // apply here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isStale = lunoAccounts.length === 0 || now - lastSyncedMs > STALE_AFTER_MS;
  const lastSynced = lastSyncedMs > 0 ? new Date(lastSyncedMs) : null;

  const visibleAccounts = lunoAccounts.filter(isVisibleLunoAccount);
  // The Investments Value stat card sums only priced accounts — tokenised
  // stocks have no ZAR value and contribute nothing.
  const lunoInvestmentsValue = visibleAccounts.reduce((sum, a) => sum + Number(a.zarValue ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Assets Register</h2>
          <p className="text-sm text-muted-foreground">
            Track equipment and vehicles owned by the company, with crypto investments synced live
            from Luno
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
              <p className="text-lg font-semibold tabular-nums">
                {formatZAR(summary.totalFixedAssetsValue)}
              </p>
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
              <p className="text-lg font-semibold tabular-nums">
                {formatZAR(lunoInvestmentsValue)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Wallet className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Asset Value</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatZAR(summary.totalFixedAssetsValue + lunoInvestmentsValue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.totalCount} fixed {summary.totalCount === 1 ? 'asset' : 'assets'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Crypto Portfolio — live Luno investments */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Crypto Portfolio</CardTitle>
              <LiveBadge />
            </div>
            <CardDescription>
              Live balances synced from Luno
              {lastSynced && ` · last synced ${fmtDateTime(lastSynced)}`}
            </CardDescription>
          </div>
          <CardAction>
            <LunoSyncButton syncNow={lunoAccounts.length === 0} autoSyncIfStale={isStale} />
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {lunoAccounts.length === 0 ? (
            <div className="px-6 pb-4">
              <EmptyState
                title="No Luno accounts yet"
                message="Sync your portfolio to fetch live balances and ZAR values from Luno."
              />
            </div>
          ) : visibleAccounts.length === 0 ? (
            <div className="px-6 pb-4">
              <EmptyState
                title="No accounts to show"
                message="All synced Luno accounts currently have an empty balance, are priced at R1 or less, or have no ZAR price available at all."
              />
            </div>
          ) : (
            <LunoAccountsTable accounts={visibleAccounts} />
          )}
        </CardContent>
      </Card>

      {/* Fixed assets register */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Fixed Assets</CardTitle>
            <CardDescription>Equipment and vehicles owned by the company</CardDescription>
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
