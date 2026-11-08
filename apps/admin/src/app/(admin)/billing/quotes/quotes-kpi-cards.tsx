'use client';

import * as React from 'react';
import { FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { formatZAR } from '@/lib/format';

interface QuotesKpiCardsProps {
  totalQuoted: number;
  totalAccepted: number;
  totalPending: number;
  totalCount: number;
  acceptedCount: number;
  pendingCount: number;
  currentMonthQuoted: number;
  activeStatus?: string;
  divisionId?: string;
}

export function QuotesKpiCards({
  totalQuoted,
  totalAccepted,
  totalPending,
  totalCount,
  acceptedCount,
  pendingCount,
  currentMonthQuoted,
  activeStatus,
  divisionId,
}: QuotesKpiCardsProps) {
  const conversionRate = totalQuoted > 0 ? (totalAccepted / totalQuoted) * 100 : 0;
  const avgQuoteValue = totalCount > 0 ? totalQuoted / totalCount : 0;

  function buildHref(statusTarget?: string) {
    const params = new URLSearchParams();
    if (divisionId) params.set('divisionId', divisionId);
    if (statusTarget && statusTarget !== activeStatus) {
      params.set('status', statusTarget);
    }
    const qs = params.toString();
    return `/billing/quotes${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Total Quoted */}
      <BillingKpiCard
        title="Quoted (FY)"
        value={formatZAR(totalQuoted)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{totalCount}</span> quotes FY
            {currentMonthQuoted > 0 && (
              <span className="hidden sm:inline"> · MTD: {formatZAR(currentMonthQuoted)}</span>
            )}
          </span>
        }
        icon={FileText}
        variant="blue"
        href={buildHref(undefined)}
        isActive={!activeStatus}
        activeLabel="All quotes"
        tooltip="Click to view all quotations"
      />

      {/* 2. Accepted / Converted */}
      <BillingKpiCard
        title="Accepted"
        value={formatZAR(totalAccepted)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{acceptedCount}</span> converted
            {totalQuoted > 0 && (
              <span className="hidden sm:inline"> · {conversionRate.toFixed(0)}% of pipeline</span>
            )}
          </span>
        }
        icon={CheckCircle2}
        variant="emerald"
        href={buildHref('accepted')}
        isActive={activeStatus === 'accepted'}
        activeLabel="Filtered"
        tooltip="Click to filter accepted quotes"
      />

      {/* 3. Pending Decisions */}
      <BillingKpiCard
        title="Pending"
        value={formatZAR(totalPending)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{pendingCount}</span> awaiting
            response
          </span>
        }
        icon={Clock}
        variant="amber"
        href={buildHref('sent')}
        isActive={activeStatus === 'sent'}
        activeLabel="Filtered"
        tooltip="Click to filter sent quotes awaiting client response"
      />

      {/* 4. Win / Conversion Rate */}
      <BillingKpiCard
        title="Win Rate"
        value={`${conversionRate.toFixed(1)}%`}
        subtitle={
          <span>
            Avg:{' '}
            <span className="font-semibold text-foreground/80">{formatZAR(avgQuoteValue)}</span>
            <span className="hidden sm:inline">
              {' '}
              · {acceptedCount}/{totalCount} won
            </span>
          </span>
        }
        icon={TrendingUp}
        variant="violet"
        progress={{
          value: conversionRate,
          colorClass: 'bg-violet-500',
        }}
        tooltip="Quote conversion rate by value (Accepted / Quoted)"
      />
    </div>
  );
}
