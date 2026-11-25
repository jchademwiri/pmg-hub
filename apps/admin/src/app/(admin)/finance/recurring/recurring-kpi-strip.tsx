'use client';

import React from 'react';
import { ArrowDownLeft, TrendingDown, Scale, AlertTriangle, CalendarClock } from 'lucide-react';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { formatZAR } from '@/lib/format';
import type { RecurringKpis } from './recurring-utils';

interface RecurringKpiStripProps {
  kpis: RecurringKpis;
}

export function RecurringKpiStrip({ kpis }: RecurringKpiStripProps) {
  const isSurplus = kpis.netMonthly >= 0;
  const hasOverdue = kpis.overdueOutCount > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <BillingKpiCard
        title="Monthly Retainers (In)"
        value={formatZAR(kpis.monthlyIn)}
        subtitle={
          kpis.periodicInCount > 0
            ? `${kpis.activeInCount} active (${kpis.periodicInCount} non-monthly normalized)`
            : `${kpis.activeInCount} active client retainer${kpis.activeInCount === 1 ? '' : 's'}`
        }
        icon={ArrowDownLeft}
        variant="emerald"
        valueClassName="text-emerald-700 dark:text-emerald-400"
      />

      <BillingKpiCard
        title="Monthly Costs (Out)"
        value={formatZAR(kpis.monthlyOut)}
        subtitle={`${kpis.ownOutCount} Own / Internal · ${kpis.clientOutCount} Client-linked`}
        icon={TrendingDown}
        variant="rose"
        valueClassName="text-rose-700 dark:text-rose-400"
      />

      <BillingKpiCard
        title="Net Monthly Baseline"
        value={formatZAR(kpis.netMonthly)}
        subtitle={`${isSurplus ? 'Surplus' : 'Deficit'} · ${formatZAR(kpis.dueThisMonthInTotal)} billing due this month`}
        icon={Scale}
        variant={isSurplus ? 'blue' : 'amber'}
        valueClassName={
          isSurplus ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'
        }
      />

      <BillingKpiCard
        title={hasOverdue ? 'Overdue Renewals' : 'Due Soon (≤ 14 Days)'}
        value={
          hasOverdue
            ? `${kpis.overdueOutCount} (${formatZAR(kpis.overdueOutTotal)})`
            : `${kpis.dueSoonOutCount} (${formatZAR(kpis.dueSoonOutTotal)})`
        }
        subtitle={
          hasOverdue
            ? `${kpis.dueSoonOutCount} more due within 14 days`
            : `${kpis.dueThisMonthOutCount} total scheduled this month (${formatZAR(kpis.dueThisMonthOutTotal)})`
        }
        icon={hasOverdue ? AlertTriangle : CalendarClock}
        variant={hasOverdue ? 'rose' : 'amber'}
        valueClassName={hasOverdue ? 'text-rose-600 dark:text-rose-400' : undefined}
      />
    </div>
  );
}
