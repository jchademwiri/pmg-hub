'use client';

import * as React from 'react';
import { Download, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { formatZAR } from '@/lib/format';

interface IncomeKpiCardsProps {
  globalReceived: number;
  globalAllocated: number;
  globalUnallocated: number;
  totalCount: number;
}

export function IncomeKpiCards({
  globalReceived,
  globalAllocated,
  globalUnallocated,
  totalCount,
}: IncomeKpiCardsProps) {
  const allocationRate = globalReceived > 0 ? (globalAllocated / globalReceived) * 100 : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Total Received */}
      <BillingKpiCard
        title="Total Received"
        value={formatZAR(globalReceived)}
        subtitle={
          <span>
            <span className="font-semibold text-foreground/80">{totalCount}</span> deposits FY
          </span>
        }
        icon={Download}
        variant="emerald"
        tooltip="Total cash receipts recorded for the financial year"
      />

      {/* 2. Total Allocated */}
      <BillingKpiCard
        title="Total Allocated"
        value={formatZAR(globalAllocated)}
        badge={`${allocationRate.toFixed(0)}%`}
        subtitle={<span>Matched to invoices</span>}
        icon={CheckCircle2}
        variant="blue"
        tooltip="Funds matched and applied to customer invoices"
      />

      {/* 3. Unallocated Deposits */}
      <BillingKpiCard
        title="Unallocated Deposits"
        value={formatZAR(globalUnallocated)}
        badge={globalUnallocated > 0 ? 'Requires matching' : undefined}
        subtitle={
          <span>{globalUnallocated > 0 ? 'Needs invoice allocation' : 'All funds matched'}</span>
        }
        icon={AlertCircle}
        variant={globalUnallocated > 0 ? 'amber' : 'emerald'}
        tooltip="Deposits not yet linked to an open customer invoice"
      />

      {/* 4. Allocation Rate */}
      <BillingKpiCard
        title="Allocation Rate"
        value={`${allocationRate.toFixed(0)}%`}
        subtitle={<span>{allocationRate >= 95 ? 'Strong matching rate' : 'Action required'}</span>}
        icon={ShieldCheck}
        variant={allocationRate >= 95 ? 'emerald' : 'amber'}
        progress={{
          value: allocationRate,
          colorClass: allocationRate >= 95 ? 'bg-emerald-500' : 'bg-amber-500',
        }}
        tooltip="Proportion of received funds allocated to invoices"
      />
    </div>
  );
}
