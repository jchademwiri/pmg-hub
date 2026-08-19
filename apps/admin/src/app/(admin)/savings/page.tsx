import type { Metadata } from 'next';
import Link from 'next/link';
import { PiggyBank, Target, Wallet, CheckCircle2 } from 'lucide-react';
import { getAllSavingsGoals } from '@pmg/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { GoalFormDialog } from '@/components/savings/goal-form-dialog';
import { computeProgress, computeSavingRate } from '@/lib/savings';
import { formatZAR, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Savings Goals' };

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  saving: 'default',
  purchased: 'secondary',
  cancelled: 'outline',
};

export default async function SavingsPage() {
  const goals = await getAllSavingsGoals().catch((e) => {
    console.error('getAllSavingsGoals failed:', e);
    return [];
  });

  const active = goals.filter((g) => g.status === 'saving');
  const totalSaved = active.reduce((s, g) => s + g.saved, 0);
  const totalTarget = active.reduce((s, g) => s + Number(g.targetAmount), 0);
  const purchased = goals.filter((g) => g.status === 'purchased').length;

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Savings Goals"
        description="Put money aside for what the business needs next"
        actions={<GoalFormDialog />}
      />

      {goals.length === 0 ? (
        <EmptyState
          title="No savings goals yet"
          message="Create a goal for something you want to buy, then add what you put away as you go."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total saved
                </CardTitle>
                <Wallet className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatZAR(totalSaved)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {active.length} active {active.length === 1 ? 'goal' : 'goals'}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Still to go
                </CardTitle>
                <Target className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatZAR(Math.max(0, totalTarget - totalSaved))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Of {formatZAR(totalTarget)} targeted
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Purchased
                </CardTitle>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {purchased}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Goals reached and bought</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {goals.map((g) => {
              const target = Number(g.targetAmount);
              const progress = computeProgress(g.saved, target);
              const rate = computeSavingRate(
                g.saved,
                target,
                g.firstContribution,
                g.lastContribution,
              );

              return (
                <Link key={g.id} href={`/savings/${g.id}`} className="group">
                  <Card className="h-full shadow-sm transition-colors group-hover:border-primary/40">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{g.name}</CardTitle>
                          {g.vendor && (
                            <p className="text-xs text-muted-foreground mt-0.5">{g.vendor}</p>
                          )}
                        </div>
                        <Badge
                          variant={statusVariant[g.status] ?? 'outline'}
                          className="shrink-0 capitalize"
                        >
                          {g.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-2xl font-bold tabular-nums">
                          {formatZAR(g.saved)}
                        </span>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          of {formatZAR(target)}
                        </span>
                      </div>

                      <Progress
                        value={progress.fraction * 100}
                        indicatorClassName="bg-emerald-500"
                      />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{progress.percent.toFixed(0)}% funded</span>
                        {progress.isFunded ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            Target reached
                          </span>
                        ) : (
                          <span>{formatZAR(progress.remaining)} to go</span>
                        )}
                      </div>

                      {g.status === 'saving' && rate.projectedDate && (
                        <p className="text-xs text-muted-foreground border-t pt-3">
                          At {formatZAR(rate.perMonth)}/month, on track for{' '}
                          <span className="font-medium text-foreground">
                            {fmtDate(rate.projectedDate)}
                          </span>
                        </p>
                      )}
                      {g.status === 'saving' && !rate.projectedDate && !progress.isFunded && (
                        <p className="text-xs text-muted-foreground border-t pt-3">
                          <PiggyBank className="inline size-3.5 mr-1 -mt-0.5" />
                          Add a contribution to project a date
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
