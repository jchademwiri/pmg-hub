'use client';

import { useState } from 'react';
import { SankeyDiagram } from '@/components/reports/sankey-diagram';
import { ProfitPoolChart } from '@/components/reports/profit-pool-chart';
import { FinancialDrilldownSheet } from '@/components/insights/financial-drilldown-sheet';
import type { DrilldownType } from '@/app/actions/drilldown';
import type { MonthlyFinancials, BucketBalances } from '@/lib/financial';

interface AnalysisProfitTabProps {
  revenue: number;
  expenses: number;
  pmgShare: number;
  profitPool: number;
  ledgerBalances?: BucketBalances;
  monthlyFinancials: MonthlyFinancials[];
  currentPeriod: string;
}

const nodeToDrillType: Record<string, DrilldownType> = {
  gross: 'revenue',
  net: 'revenue',
  pmg: 'pmg_share',
  expenses: 'expenses',
  pool: 'revenue',
};

export function AnalysisProfitTab({
  revenue,
  expenses,
  pmgShare,
  profitPool,
  ledgerBalances,
  monthlyFinancials,
  currentPeriod,
}: AnalysisProfitTabProps) {
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillPeriod, setDrillPeriod] = useState<string | null>(null);
  const [drillType, setDrillType] = useState<DrilldownType | null>(null);

  const openDrill = (type: DrilldownType, period: string) => {
    setDrillType(type);
    setDrillPeriod(period);
    setDrillOpen(true);
  };

  return (
    <>
      <FinancialDrilldownSheet
        open={drillOpen}
        onOpenChange={setDrillOpen}
        period={drillPeriod}
        drillType={drillType}
      />
      <div className="grid grid-cols-1 gap-6 min-h-[400px]">
        <SankeyDiagram
          revenue={revenue}
          expenses={expenses}
          pmgShare={pmgShare}
          profitPool={profitPool}
          ledgerBalances={ledgerBalances}
          onNodeClick={(nodeId) => {
            const type = nodeToDrillType[nodeId];
            if (type) openDrill(type, currentPeriod);
          }}
        />
        <ProfitPoolChart
          data={monthlyFinancials.map((m) => ({
            period: m.month,
            profit: m.revenue - m.expenses,
          }))}
        />
      </div>
    </>
  );
}
