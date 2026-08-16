import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Target, Wallet, TrendingUp, CalendarClock } from 'lucide-react';
import {
  getSavingsGoalById,
  getContributionsForGoal,
  getSpendRows,
  getSpendMonthlySummary,
} from '@pmg/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { GoalFormDialog } from '@/components/savings/goal-form-dialog';
import { ContributionPanel } from '@/components/savings/contribution-panel';
import { PaybackPanel } from '@/components/savings/payback-panel';
import { MarkPurchasedDialog } from '@/components/savings/mark-purchased-dialog';
import { DeleteGoalButton } from '@/components/savings/delete-goal-button';
import { getSpendTracker } from '@/lib/spend-trackers';
import { computeProgress, computeSavingRate } from '@/lib/savings';
import { formatZAR, fmtDate, getSASTToday, getSASTParts } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Savings Goal' };

export default async function SavingsGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const goal = await getSavingsGoalById(id).catch((e) => {
    console.error('getSavingsGoalById failed:', e);
    return null;
  });
  if (!goal) notFound();

  const tracker = getSpendTracker(goal.spendTrackerKey);

  const [contributions, trackerRows, trackerMonthly] = await Promise.all([
    getContributionsForGoal(id).catch((e) => {
      console.error('getContributionsForGoal failed:', e);
      return [];
    }),
    tracker
      ? getSpendRows(tracker.match).catch((e) => {
          console.error('getSpendRows failed:', e);
          return [];
        })
      : Promise.resolve([]),
    tracker
      ? getSpendMonthlySummary(tracker.match).catch((e) => {
          console.error('getSpendMonthlySummary failed:', e);
          return [];
        })
      : Promise.resolve([]),
  ]);

  const target = Number(goal.targetAmount);
  const actualPrice = goal.actualPrice !== null ? Number(goal.actualPrice) : null;
  const progress = computeProgress(goal.saved, target);
  const rate = computeSavingRate(goal.saved, target, goal.firstContribution, goal.lastContribution);

  const { year, month } = getSASTParts();
  const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title={goal.name}
        description={goal.description ?? goal.vendor ?? undefined}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/savings">
                <ArrowLeft className="size-4" /> All goals
              </Link>
            </Button>
            {goal.status === 'purchased' && goal.assetId ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/assets/${goal.assetId}`}>View asset</Link>
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
                spendTrackerKey: goal.spendTrackerKey,
                targetDate: goal.targetDate,
                notes: goal.notes,
              }}
            />
            <DeleteGoalButton goalId={goal.id} goalName={goal.name} redirectTo="/savings" />
          </>
        }
      />

      {/* Progress */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Progress</CardTitle>
            <Badge variant={goal.status === 'saving' ? 'default' : 'secondary'} className="capitalize">
              {goal.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-3xl font-bold tabular-nums">{formatZAR(goal.saved)}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                of {formatZAR(target)} target
              </span>
            </div>
            <Progress
              value={progress.fraction * 100}
              className="h-2"
              indicatorClassName="bg-emerald-500"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>{progress.percent.toFixed(0)}% funded</span>
              {progress.isFunded ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Target reached — ready to buy
                </span>
              ) : (
                <span>{formatZAR(progress.remaining)} still to go</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-t pt-5">
            <Metric
              icon={<Target className="size-4 text-primary" />}
              label="Target to save"
              value={formatZAR(target)}
              hint={
                actualPrice !== null && actualPrice !== target
                  ? `Rounded up from ${formatZAR(actualPrice)}`
                  : undefined
              }
            />
            <Metric
              icon={<Wallet className="size-4 text-emerald-500" />}
              label="Actual price"
              value={actualPrice !== null ? formatZAR(actualPrice) : '—'}
              hint={goal.vendor ?? undefined}
            />
            <Metric
              icon={<TrendingUp className="size-4 text-primary" />}
              label="Saving rate"
              value={rate.perMonth > 0 ? `${formatZAR(rate.perMonth)}/mo` : '—'}
              hint={
                rate.perMonth > 0
                  ? `Over ${rate.monthsSaving} ${rate.monthsSaving === 1 ? 'month' : 'months'}`
                  : 'No contributions yet'
              }
            />
            <Metric
              icon={<CalendarClock className="size-4 text-amber-500" />}
              label="On track for"
              value={
                progress.isFunded
                  ? 'Funded'
                  : rate.projectedDate
                    ? fmtDate(rate.projectedDate)
                    : '—'
              }
              hint={
                goal.targetDate ? `Target: ${fmtDate(goal.targetDate)}` : undefined
              }
            />
          </div>

          {(goal.productUrl || goal.notes) && (
            <div className="border-t pt-4 flex flex-col gap-2">
              {goal.notes && <p className="text-sm text-muted-foreground">{goal.notes}</p>}
              {goal.productUrl && (
                <a
                  href={goal.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 w-fit"
                >
                  View product <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {tracker && trackerMonthly.length > 0 && (
        <PaybackPanel
          label={tracker.label}
          primaryLabel={tracker.primaryLabel}
          companionLabel={tracker.companionLabel}
          caveat={tracker.caveat}
          actualPrice={actualPrice}
          targetAmount={target}
          monthly={trackerMonthly}
          rows={trackerRows}
          currentMonth={currentMonth}
        />
      )}

      <ContributionPanel goalId={goal.id} contributions={contributions} today={getSASTToday()} />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-lg font-semibold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
