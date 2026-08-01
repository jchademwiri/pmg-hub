'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatZAR } from '@/lib/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  let statusColor = 'text-blue-500';
  let statusText = 'STABLE';
  
  if (growthRatePercent >= 5) {
    StatusIcon = TrendingUp;
    statusColor = 'text-emerald-500';
    statusText = 'GROWING';
  } else if (growthRatePercent <= -5) {
    StatusIcon = TrendingDown;
    statusColor = 'text-red-500';
    statusText = 'DECLINING';
  }

  const priorInv = ov.averages.priorAvgInvoice ?? 0;
  const priorTx = ov.averages.priorAvgTransaction ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Growth Status (YTD)</h3>
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          </div>
          <div className="flex flex-col gap-1">
            <div className={`text-2xl font-bold ${statusColor}`}>{statusText}</div>
            <p className="text-xs text-muted-foreground">
              {growthRatePercent > 0 ? '+' : ''}{growthRatePercent.toFixed(1)}% YoY
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Avg Invoice</h3>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{formatZAR(ov.averages.currentAvgInvoice)}</div>
            <p className="text-xs text-muted-foreground">
              vs {formatZAR(priorInv)} prior month
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Avg Transaction</h3>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{formatZAR(ov.averages.currentAvgTransaction)}</div>
            <p className="text-xs text-muted-foreground">
              vs {formatZAR(priorTx)} prior month
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Potential Pipeline</h3>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{formatZAR(ov.pipeline.totalPotential)}</div>
            <p className="text-xs text-muted-foreground">
              AR + Accepted Quotes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
