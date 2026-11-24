import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PiggyBank,
  Target,
  Wallet,
  CheckCircle2,
  CalendarDays,
  ExternalLink,
  PackageCheck,
  ArrowUpRight,
  Store,
} from 'lucide-react';
import { getAllSavingsGoals } from '@pmg/db';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { GoalFormDialog } from '@/components/savings/goal-form-dialog';
import { computeProgress, computeSavingRate } from '@/lib/savings';
import { SARS_SMALL_ASSET_THRESHOLD } from '@/lib/accounting/posting';
import { formatZAR, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Savings Goals' };

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  saving: 'default',
  purchased: 'secondary',
  cancelled: 'outline',
};

interface SavingsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SavingsPage({ searchParams }: SavingsPageProps) {
  const { status } = await searchParams;
  const activeTab = status === 'purchased' || status === 'all' ? status : 'saving';

  const goals = await getAllSavingsGoals().catch((e) => {
    console.error('getAllSavingsGoals failed:', e);
    return [];
  });

  const savingGoals = goals.filter((g) => g.status === 'saving');
  const purchasedGoals = goals.filter((g) => g.status === 'purchased');
  const totalSaved = savingGoals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = savingGoals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const overallPercent = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
  const readyToBuyCount = savingGoals.filter(
    (g) => computeProgress(g.saved, Number(g.targetAmount)).isFunded,
  ).length;

  const filteredGoals =
    activeTab === 'saving' ? savingGoals : activeTab === 'purchased' ? purchasedGoals : goals;

  const tabs = [
    { key: 'saving', label: 'Saving', count: savingGoals.length, href: '/savings' },
    {
      key: 'purchased',
      label: 'Purchased',
      count: purchasedGoals.length,
      href: '/savings?status=purchased',
    },
    { key: 'all', label: 'All', count: goals.length, href: '/savings?status=all' },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Savings Goals"
        description="Plan and fund equipment, hardware, and business assets you intend to buy"
        actions={<GoalFormDialog />}
      />

      {goals.length === 0 ? (
        <EmptyState
          title="No planned items yet"
          message="Add equipment or assets you intend to buy for the business, set a target price, and track savings until you convert them into the Assets Register."
        />
      ) : (
        <>
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Saved
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2 tabular-nums">{formatZAR(totalSaved)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {overallPercent.toFixed(0)}% funded across {savingGoals.length} active{' '}
                {savingGoals.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Remaining to Fund
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Target className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2 tabular-nums">
                {formatZAR(Math.max(0, totalTarget - totalSaved))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Of {formatZAR(totalTarget)} planned budget
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ready / Purchased
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                {readyToBuyCount > 0 ? `${readyToBuyCount} ready` : purchasedGoals.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {readyToBuyCount > 0
                  ? `${purchasedGoals.length} already in Assets Register`
                  : 'Items converted to Assets Register'}
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex gap-1 rounded-lg border bg-card p-1">
              {tabs.map((tab) => (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label} ({tab.count})
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Select any item to log contributions or convert to a Fixed Asset
            </p>
          </div>

          {filteredGoals.length === 0 ? (
            <EmptyState
              title={`No ${activeTab} items`}
              message={
                activeTab === 'purchased'
                  ? 'Items you mark as purchased will appear here and link directly to the Assets Register.'
                  : 'All planned items are currently completed. Add a new planned item above.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredGoals.map((g) => {
                const target = Number(g.targetAmount);
                const actualPrice = g.actualPrice !== null ? Number(g.actualPrice) : null;
                const effectiveCost = actualPrice ?? target;
                const isCapitalisedPpe = effectiveCost >= SARS_SMALL_ASSET_THRESHOLD;
                const progress = computeProgress(g.saved, target);
                const rate = computeSavingRate(
                  g.saved,
                  target,
                  g.firstContribution,
                  g.lastContribution,
                );

                return (
                  <Link
                    key={g.id}
                    href={`/savings/${g.id}`}
                    className="group rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                              {g.name}
                            </h3>
                            <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                            {g.vendor && (
                              <span className="inline-flex items-center gap-1">
                                <Store className="size-3" /> {g.vendor}
                              </span>
                            )}
                            {g.productUrl && (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <ExternalLink className="size-3" /> Product link
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              isCapitalisedPpe
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isCapitalisedPpe ? 'PPE ≥ R7k' : 'Small Asset < R7k'}
                          </span>
                          <Badge
                            variant={statusVariant[g.status] ?? 'outline'}
                            className="capitalize"
                          >
                            {g.status}
                          </Badge>
                        </div>
                      </div>

                      {g.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {g.description}
                        </p>
                      )}

                      {/* Funding Progress */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-2xl font-bold tabular-nums">
                            {formatZAR(g.saved)}
                          </span>
                          <span className="text-sm text-muted-foreground tabular-nums">
                            of {formatZAR(target)}
                            {actualPrice !== null && actualPrice !== target && (
                              <span className="text-xs ml-1">(est. {formatZAR(actualPrice)})</span>
                            )}
                          </span>
                        </div>

                        <Progress
                          value={progress.fraction * 100}
                          className="h-2"
                          indicatorClassName={progress.isFunded ? 'bg-emerald-500' : 'bg-primary'}
                        />

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium">{progress.percent.toFixed(0)}% funded</span>
                          {progress.isFunded && g.status === 'saving' ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              Target reached — ready to buy
                            </span>
                          ) : g.status === 'purchased' ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                              <PackageCheck className="size-3.5" />
                              {g.assetId ? 'In Assets Register' : 'Purchased'}
                            </span>
                          ) : (
                            <span>{formatZAR(progress.remaining)} to go</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t pt-3">
                      {g.status === 'saving' && rate.projectedDate ? (
                        <span>
                          At {formatZAR(rate.perMonth)}/mo · est.{' '}
                          <span className="font-medium text-foreground">
                            {fmtDate(rate.projectedDate)}
                          </span>
                        </span>
                      ) : g.status === 'saving' && !progress.isFunded ? (
                        <span>
                          <PiggyBank className="inline size-3.5 mr-1 -mt-0.5" />
                          Open to log savings contribution
                        </span>
                      ) : g.status === 'saving' && progress.isFunded ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          Open to mark purchased &amp; post to GL
                        </span>
                      ) : (
                        <span>
                          {g.purchasedAt ? `Purchased on ${fmtDate(g.purchasedAt)}` : 'Completed'}
                        </span>
                      )}

                      {g.targetDate && g.status === 'saving' && (
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <CalendarDays className="size-3" />
                          Target {fmtDate(g.targetDate)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
