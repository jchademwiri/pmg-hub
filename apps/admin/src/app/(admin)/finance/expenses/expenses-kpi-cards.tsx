'use client';

import * as React from 'react';
import { Receipt, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { formatZAR } from '@/lib/format';

interface ExpensesKpiCardsProps {
  globalTotal: number;
  globalCategorized: number;
  globalUncategorized: number;
  totalCount: number;
  categorizedCount: number;
  uncategorizedCount: number;
  currentCategory?: string;
  divisionId?: string;
  clientId?: string;
}

export function ExpensesKpiCards({
  globalTotal,
  globalCategorized,
  globalUncategorized,
  totalCount,
  categorizedCount,
  uncategorizedCount,
  currentCategory,
  divisionId,
  clientId,
}: ExpensesKpiCardsProps) {
  const categorizationRate = globalTotal > 0 ? (globalCategorized / globalTotal) * 100 : 100;

  function buildHref(categoryTarget?: string) {
    const params = new URLSearchParams();
    if (divisionId) params.set('divisionId', divisionId);
    if (clientId) params.set('clientId', clientId);
    if (categoryTarget && categoryTarget !== currentCategory) {
      params.set('category', categoryTarget);
    }
    const qs = params.toString();
    return `/finance/expenses${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Total Expenses */}
      <BillingKpiCard
        title="Total Expenses"
        value={formatZAR(globalTotal)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{totalCount}</span> expenses FY
          </span>
        }
        icon={Receipt}
        variant="blue"
        href={buildHref(undefined)}
        isActive={!currentCategory}
        activeLabel="All expenses"
        tooltip="Click to view all expenses"
      />

      {/* 2. Categorized */}
      <BillingKpiCard
        title="Categorized"
        value={formatZAR(globalCategorized)}
        badge={`${categorizationRate.toFixed(0)}%`}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{categorizedCount}</span> classified
            items
          </span>
        }
        icon={CheckCircle2}
        variant="emerald"
        tooltip="Expenses with valid categories assigned"
      />

      {/* 3. Uncategorized */}
      <BillingKpiCard
        title="Uncategorized"
        value={formatZAR(globalUncategorized)}
        badge={
          uncategorizedCount > 0
            ? `${uncategorizedCount} item${uncategorizedCount === 1 ? '' : 's'}`
            : undefined
        }
        subtitle={
          <span>{globalUncategorized > 0 ? 'Requires classification' : 'Fully classified'}</span>
        }
        icon={AlertCircle}
        variant={globalUncategorized > 0 ? 'amber' : 'emerald'}
        href={buildHref('Uncategorized')}
        isActive={currentCategory === 'Uncategorized'}
        activeLabel="Filtered"
        tooltip="Click to filter uncategorized expenses"
      />

      {/* 4. Categorization Rate */}
      <BillingKpiCard
        title="Audit Health"
        value={`${categorizationRate.toFixed(0)}%`}
        subtitle={
          <span>{categorizationRate >= 95 ? 'Strong classification' : 'Needs audit & review'}</span>
        }
        icon={ShieldCheck}
        variant={categorizationRate >= 95 ? 'emerald' : 'amber'}
        progress={{
          value: categorizationRate,
          colorClass: categorizationRate >= 95 ? 'bg-emerald-500' : 'bg-amber-500',
        }}
        tooltip="Percentage of expenses properly classified"
      />
    </div>
  );
}
