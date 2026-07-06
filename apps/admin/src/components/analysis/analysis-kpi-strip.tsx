'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatZAR } from '@/lib/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalysisKpiStripProps {
  overview: {
    ytd: { currentRevenue: number; priorRevenue: number; growthRatePercent: number };
    averages: { currentAvgInvoice: number; priorAvgInvoice: number; currentAvgTransaction: number };
    pipeline: { totalPotential: number };
  };
}

export function AnalysisKpiStrip({ overview }: AnalysisKpiStripProps) {
  const { growthRatePercent } = overview.ytd;
  
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
            <div className="text-2xl font-bold">{formatZAR(overview.averages.currentAvgInvoice)}</div>
            <p className="text-xs text-muted-foreground">
              vs {formatZAR(overview.averages.priorAvgInvoice)} last year
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
            <div className="text-2xl font-bold">{formatZAR(overview.averages.currentAvgTransaction)}</div>
            <p className="text-xs text-muted-foreground">
              Cash receipt size
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
            <div className="text-2xl font-bold">{formatZAR(overview.pipeline.totalPotential)}</div>
            <p className="text-xs text-muted-foreground">
              AR + Quotes (weighted)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
