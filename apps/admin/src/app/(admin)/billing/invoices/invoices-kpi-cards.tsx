'use client';

import * as React from 'react';
import { Receipt, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { formatZAR } from '@/lib/format';

interface InvoicesKpiCardsProps {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalCount: number;
  currentMonthInvoiced: number;
  fullyPaidCount?: number;
  partiallyPaidCount?: number;
  outstandingCount?: number;
  activeStatus?: string;
  divisionId?: string;
}

export function InvoicesKpiCards({
  totalInvoiced,
  totalPaid,
  totalOutstanding,
  totalCount,
  currentMonthInvoiced,
  fullyPaidCount = 0,
  partiallyPaidCount = 0,
  outstandingCount = 0,
  activeStatus,
  divisionId,
}: InvoicesKpiCardsProps) {
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
  const avgInvoiceValue = totalCount > 0 ? totalInvoiced / totalCount : 0;

  function buildHref(statusTarget?: string) {
    const params = new URLSearchParams();
    if (divisionId) params.set('divisionId', divisionId);
    if (statusTarget && statusTarget !== activeStatus) {
      params.set('status', statusTarget);
    }
    const qs = params.toString();
    return `/billing/invoices${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Total Invoiced */}
      <BillingKpiCard
        title="Invoiced (FY)"
        value={formatZAR(totalInvoiced)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{totalCount}</span> invoices FY
            {currentMonthInvoiced > 0 && (
              <span className="hidden sm:inline"> · MTD: {formatZAR(currentMonthInvoiced)}</span>
            )}
          </span>
        }
        icon={Receipt}
        variant="blue"
        href={buildHref(undefined)}
        isActive={!activeStatus}
        activeLabel="All invoices"
        tooltip="Click to view all invoices"
      />

      {/* 2. Collected */}
      <BillingKpiCard
        title="Collected"
        value={formatZAR(totalPaid)}
        badge={
          fullyPaidCount > 0 || partiallyPaidCount > 0
            ? `${fullyPaidCount} paid · ${partiallyPaidCount} partial`
            : undefined
        }
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{collectionRate.toFixed(0)}%</span>{' '}
            settled
            <span className="hidden sm:inline">
              {fullyPaidCount > 0 || partiallyPaidCount > 0
                ? ` · ${fullyPaidCount} fully paid, ${partiallyPaidCount} partial`
                : ' · Cash collected'}
            </span>
          </span>
        }
        icon={CheckCircle2}
        variant="emerald"
        href={buildHref('paid')}
        isActive={activeStatus === 'paid'}
        activeLabel="Filtered"
        tooltip="Click to filter paid invoices"
      />

      {/* 3. Outstanding */}
      <BillingKpiCard
        title="Outstanding"
        value={formatZAR(totalOutstanding)}
        badge={
          outstandingCount > 0
            ? `${outstandingCount} invoice${outstandingCount === 1 ? '' : 's'}`
            : undefined
        }
        subtitle={
          <span>
            {totalOutstanding > 0 ? 'Pending collection' : 'All clear'} ·{' '}
            <span className="font-semibold text-foreground/80">
              {(100 - collectionRate).toFixed(0)}%
            </span>{' '}
            due
          </span>
        }
        icon={Clock}
        variant={totalOutstanding > 0 ? 'amber' : 'emerald'}
        href={buildHref('only_outstanding')}
        isActive={activeStatus === 'only_outstanding'}
        activeLabel="Filtered"
        tooltip="Click to filter outstanding (unpaid / overdue) invoices"
      />

      {/* 4. Collection Rate */}
      <BillingKpiCard
        title="Collection Rate"
        value={`${collectionRate.toFixed(1)}%`}
        subtitle={
          <span>
            Avg:{' '}
            <span className="font-semibold text-foreground/80">{formatZAR(avgInvoiceValue)}</span>
          </span>
        }
        icon={TrendingUp}
        variant="violet"
        progress={{
          value: collectionRate,
          colorClass: 'bg-violet-500',
        }}
        tooltip="Invoice collection rate by value (Collected / Invoiced)"
      />
    </div>
  );
}
