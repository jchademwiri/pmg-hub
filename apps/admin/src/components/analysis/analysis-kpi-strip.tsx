'use client';

import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { formatZAR } from '@/lib/format';
import { TrendingUp, TrendingDown, Minus, Receipt, ArrowDownLeft, Sparkles } from 'lucide-react';

export interface AnalysisKpiData {
  ytd: { currentRevenue: number; priorRevenue: number; growthRatePercent: number };
  averages: {
    currentAvgInvoice: number;
    priorAvgInvoice: number;
    invoiceMomGrowth?: number;
    currentAvgTransaction: number;
    priorAvgTransaction?: number;
    transactionMomGrowth?: number;
  };
  pipeline: { totalPotential: number };
}

export interface AnalysisKpiStripProps {
  overview?: AnalysisKpiData;
  data?: AnalysisKpiData;
}

export function AnalysisKpiStrip({ overview, data }: AnalysisKpiStripProps) {
  const ov = overview ?? data;
  if (!ov) return null;

  const { growthRatePercent } = ov.ytd;

  let StatusIcon = Minus;
  let statusText = 'STABLE';
  let statusVariant: 'emerald' | 'rose' | 'blue' = 'blue';

  if (growthRatePercent >= 5) {
    StatusIcon = TrendingUp;
    statusText = 'GROWING';
    statusVariant = 'emerald';
  } else if (growthRatePercent <= -5) {
    StatusIcon = TrendingDown;
    statusText = 'DECLINING';
    statusVariant = 'rose';
  }

  const priorInv = ov.averages.priorAvgInvoice ?? 0;
  const priorTx = ov.averages.priorAvgTransaction ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Growth Status */}
      <BillingKpiCard
        title="Growth Status (YTD)"
        value={statusText}
        badge={`${growthRatePercent > 0 ? '+' : ''}${growthRatePercent.toFixed(1)}% YoY`}
        subtitle={<span>Annualized revenue trajectory</span>}
        icon={StatusIcon}
        variant={statusVariant}
        tooltip="Year-over-year revenue growth performance"
      />

      {/* 2. Avg Invoice */}
      <BillingKpiCard
        title="Avg Invoice Value"
        value={formatZAR(ov.averages.currentAvgInvoice)}
        subtitle={<span>vs {formatZAR(priorInv)} prior month</span>}
        icon={Receipt}
        variant="emerald"
        tooltip="Average billed amount per invoice issued"
      />

      {/* 3. Avg Transaction */}
      <BillingKpiCard
        title="Avg Transaction"
        value={formatZAR(ov.averages.currentAvgTransaction)}
        subtitle={<span>vs {formatZAR(priorTx)} prior month</span>}
        icon={ArrowDownLeft}
        variant="blue"
        tooltip="Average cash received per client payment transaction"
      />

      {/* 4. Potential Pipeline */}
      <BillingKpiCard
        title="Potential Pipeline"
        value={formatZAR(ov.pipeline.totalPotential)}
        badge="Open pipeline"
        subtitle={<span>Unbilled AR & accepted quotes</span>}
        icon={Sparkles}
        variant="violet"
        tooltip="Total value of outstanding accounts receivable and accepted quotes"
      />
    </div>
  );
}
