import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/ui/back-button';
import { getLunoAccountById } from '@pmg/db';
import { formatZAR, fmtDateTime } from '@/lib/format';
import { isTokenisedStock } from '@/lib/luno';
import { LunoChart } from '@/components/luno-chart';
import { LunoSyncButton } from '@/components/luno-sync-button';
import { SetPageLabel } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Luno Account' };

interface Props {
  params: Promise<{ accountId: string }>;
}

/** Formats a Luno decimal balance to 8 decimal places. */
function formatBalance(balance: string): string {
  const n = parseFloat(balance);
  return Number.isFinite(n) ? n.toFixed(8) : balance;
}

export default async function LunoAccountPage({ params }: Props) {
  const { accountId } = await params;
  const account = await getLunoAccountById(accountId);

  // Auto-sync when the summary snapshot is older than 15 minutes so it stays
  // in step with the live chart.
  const STALE_AFTER_MS = 15 * 60 * 1000;
  // react-hooks/purity assumes a component may be re-rendered/memoized on the
  // client, where an impure call like Date.now() could produce inconsistent
  // output across renders. This is a Server Component (no 'use client') -
  // it runs exactly once per request on the server - so that concern doesn't
  // apply here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isStale = !account || now - new Date(account.syncedAt).getTime() > STALE_AFTER_MS;

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value="Luno Account" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/assets" label="Back" />
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{account?.name ?? accountId}</h2>
            {account && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                {account.asset}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Live Luno account</p>
        </div>
        </div>
        <LunoSyncButton autoSyncIfStale={isStale} />
      </div>

      {!account ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">Luno account not found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          {/* Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Balance History</CardTitle>
                <CardDescription>Last 100 transactions from Luno</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <LunoChart accountId={account.accountId} />
              </CardContent>
            </Card>
          </div>

          {/* Summary sidebar */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-16">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Asset</span>
                    <span className="font-mono text-xs font-semibold">{account.asset}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account</span>
                    <span className="max-w-[160px] truncate font-medium" title={account.name ?? undefined}>
                      {account.name ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="tabular-nums">{formatBalance(account.balance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value (ZAR)</span>
                    <span className="tabular-nums font-medium">
                      {account.zarValue != null ? formatZAR(account.zarValue) : '—'}
                    </span>
                  </div>
                  {isTokenisedStock(account.asset) && account.zarValue == null && (
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Tokenised stock — no price available right now, so this account shows units only.
                    </p>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Synced</span>
                    <span className="tabular-nums">{fmtDateTime(account.syncedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
