import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  CalendarDays,
  ExternalLink,
  PackageCheck,
  Store,
  Target,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import { getSavingsGoalById, getContributionsForGoal } from '@pmg/db';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { GoalFormDialog } from '@/components/savings/goal-form-dialog';
import { ContributionPanel } from '@/components/savings/contribution-panel';
import { MarkPurchasedDialog } from '@/components/savings/mark-purchased-dialog';
import { DeleteGoalButton } from '@/components/savings/delete-goal-button';
import { computeProgress, computeSavingRate } from '@/lib/savings';
import { SARS_SMALL_ASSET_THRESHOLD } from '@/lib/accounting/posting';
import { formatZAR, fmtDate, getSASTToday } from '@/lib/format';
import { SetPageLabel, SetPageTotal } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Planned Item' };

export default async function SavingsGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const goal = await getSavingsGoalById(id).catch((e) => {
    console.error('getSavingsGoalById failed:', e);
    return null;
  });
  if (!goal) notFound();

  const contributions = await getContributionsForGoal(id).catch((e) => {
    console.error('getContributionsForGoal failed:', e);
    return [];
  });

  const target = Number(goal.targetAmount);
  const actualPrice = goal.actualPrice !== null ? Number(goal.actualPrice) : null;
  const effectiveCost = actualPrice ?? target;
  const isCapitalisedPpe = effectiveCost >= SARS_SMALL_ASSET_THRESHOLD;
  const progress = computeProgress(goal.saved, target);
  const rate = computeSavingRate(goal.saved, target, goal.firstContribution, goal.lastContribution);

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value={goal.name} />
      <SetPageTotal
        value={`${progress.percent.toFixed(0)}% funded`}
        variant={progress.percent >= 100 ? 'green' : 'default'}
      />

      <StickyPageHeader
        title={goal.name}
        description={goal.description ?? goal.vendor ?? 'Planned business purchase'}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/savings">
                <ArrowLeft className="size-4" /> All items
              </Link>
            </Button>
            {goal.status === 'purchased' && goal.assetId ? (
              <Button asChild variant="secondary" size="sm" className="gap-1.5">
                <Link href={`/assets/${goal.assetId}`}>
                  <PackageCheck className="size-4 text-emerald-600" /> View in Assets
                </Link>
              </Button>
            ) : goal.status === 'saving' ? (
              <MarkPurchasedDialog
                goalId={goal.id}
                goalName={goal.name}
                suggestedCost={actualPrice ?? target}
              />
            ) : null}
            <GoalFormDialog
              goal={{
                id: goal.id,
                name: goal.name,
                description: goal.description,
                targetAmount: goal.targetAmount,
                actualPrice: goal.actualPrice,
                vendor: goal.vendor,
                productUrl: goal.productUrl,
                targetDate: goal.targetDate,
                notes: goal.notes,
              }}
            />
            <DeleteGoalButton goalId={goal.id} goalName={goal.name} redirectTo="/savings" />
          </>
        }
      />

      {/* Row 1: Funding Progress (2 cols) + Item & SARS Details (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funding Progress Card */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Funding Progress
              </h3>
              <Badge
                variant={goal.status === 'saving' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {goal.status}
              </Badge>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3 mb-2.5">
                <span className="text-3xl font-bold tabular-nums">{formatZAR(goal.saved)}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  of {formatZAR(target)} target
                </span>
              </div>
              <Progress
                value={progress.fraction * 100}
                className="h-2.5"
                indicatorClassName={progress.isFunded ? 'bg-emerald-500' : 'bg-primary'}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span className="font-medium">{progress.percent.toFixed(0)}% funded</span>
                {progress.isFunded && goal.status === 'saving' ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Target reached — ready to mark as purchased
                  </span>
                ) : goal.status === 'purchased' ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {goal.purchasedAt
                      ? `Purchased on ${fmtDate(goal.purchasedAt)}`
                      : 'Purchased & closed'}
                  </span>
                ) : (
                  <span>{formatZAR(progress.remaining)} still to go</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-5">
            <Metric
              icon={<Wallet className="size-3.5 text-emerald-600" />}
              label="Est. Price"
              value={actualPrice !== null ? formatZAR(actualPrice) : '—'}
            />
            <Metric
              icon={<Target className="size-3.5 text-primary" />}
              label="Savings Target"
              value={formatZAR(target)}
            />
            <Metric
              icon={<TrendingUp className="size-3.5 text-blue-600" />}
              label="Saving Rate"
              value={rate.perMonth > 0 ? `${formatZAR(rate.perMonth)}/mo` : '—'}
            />
            <Metric
              icon={<CalendarClock className="size-3.5 text-amber-600" />}
              label="On Track For"
              value={
                progress.isFunded
                  ? 'Funded'
                  : rate.projectedDate
                    ? fmtDate(rate.projectedDate)
                    : '—'
              }
            />
          </div>
        </div>

        {/* Item & SARS Details Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Item &amp; Tax Details
            </h3>

            {/* SARS Classification Box */}
            <div
              className={`rounded-lg border p-3.5 flex items-start gap-2.5 ${
                isCapitalisedPpe
                  ? 'border-indigo-500/20 bg-indigo-500/5'
                  : 'border-emerald-500/20 bg-emerald-500/5'
              }`}
            >
              {isCapitalisedPpe ? (
                <Boxes className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              ) : (
                <Wrench className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <p className="font-semibold text-foreground">
                  {isCapitalisedPpe ? 'Capitalised PPE (≥ R7,000)' : 'SARS Small Asset (< R7,000)'}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {isCapitalisedPpe
                    ? 'Auto-posts Dr 1500 PPE / Cr 1010 Cheque when marked purchased.'
                    : 'Auto-posts Dr 5030 Small Equipment / Cr 1010 Cheque (100% immediate write-off).'}
                </p>
              </div>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Store className="size-3.5" /> Vendor
                </dt>
                <dd className="font-medium text-right truncate">{goal.vendor || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> Target Date
                </dt>
                <dd className="font-medium text-right">
                  {goal.targetDate ? fmtDate(goal.targetDate) : '—'}
                </dd>
              </div>
            </dl>

            {goal.notes && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{goal.notes}</p>
              </div>
            )}
          </div>

          {goal.productUrl && (
            <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
              <a href={goal.productUrl} target="_blank" rel="noopener noreferrer">
                Open Product Page <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Savings Contributions Ledger */}
      <ContributionPanel
        goalId={goal.id}
        contributions={contributions}
        today={getSASTToday()}
        readOnly={goal.status !== 'saving'}
      />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-base font-semibold tabular-nums mt-1">{value}</p>
    </div>
  );
}
