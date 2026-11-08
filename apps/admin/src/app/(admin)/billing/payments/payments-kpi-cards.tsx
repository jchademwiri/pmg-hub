'use client';

import * as React from 'react';
import { Download, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { formatZAR } from '@/lib/format';

interface PaymentsKpiCardsProps {
  globalReceived: number;
  globalAllocated: number;
  globalUnallocated: number;
  totalCount: number;
  currentMonthReceived: number;
  divisionId?: string;
}

export function PaymentsKpiCards({
  globalReceived,
  globalAllocated,
  globalUnallocated,
  totalCount,
  currentMonthReceived,
  divisionId,
}: PaymentsKpiCardsProps) {
  const allocationRate = globalReceived > 0 ? (globalAllocated / globalReceived) * 100 : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Received */}
      <BillingKpiCard
        title="Received (FY)"
        value={formatZAR(globalReceived)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{totalCount}</span> entries FY
            {currentMonthReceived > 0 && (
              <span className="hidden sm:inline"> · MTD: {formatZAR(currentMonthReceived)}</span>
            )}
          </span>
        }
        icon={Download}
        variant="emerald"
        href={`/billing/payments${divisionId ? `?divisionId=${divisionId}` : ''}`}
        tooltip="Total cash received this fiscal year"
      />

      {/* 2. Allocated */}
      <BillingKpiCard
        title="Allocated"
        value={formatZAR(globalAllocated)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{allocationRate.toFixed(0)}%</span>{' '}
            matched to invoices
          </span>
        }
        icon={CheckCircle2}
        variant="blue"
        tooltip="Payments matched against client invoices"
      />

      {/* 3. Unallocated */}
      <BillingKpiCard
        title="Unallocated"
        value={formatZAR(globalUnallocated)}
        subtitle={
          <span>
            {globalUnallocated > 0 ? 'Pending allocation' : 'All clear'} ·{' '}
            <span className="font-semibold text-foreground/80">
              {(100 - allocationRate).toFixed(0)}%
            </span>{' '}
            unmatched
          </span>
        }
        icon={AlertCircle}
        variant={globalUnallocated > 0 ? 'amber' : 'emerald'}
        tooltip="Customer deposits awaiting invoice allocation"
      />

      {/* 4. Allocation Rate */}
      <BillingKpiCard
        title="Allocation Rate"
        value={`${allocationRate.toFixed(1)}%`}
        subtitle={<span>Reconciliation efficiency</span>}
        icon={TrendingUp}
        variant="violet"
        progress={{
          value: allocationRate,
          colorClass: 'bg-violet-500',
        }}
        tooltip="Reconciliation efficiency rate (Allocated / Received)"
      />
    </div>
  );
}
