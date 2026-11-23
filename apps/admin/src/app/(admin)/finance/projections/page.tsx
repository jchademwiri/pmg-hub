import type { Metadata } from 'next';
import {
  getBudgetVsActualsForFiscalYear,
  getCurrentFiscalYear,
  getGovernanceOverview,
} from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR, getSASTToday } from '@/lib/format';
import { ProjectionsClient } from './projections-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Projections & Budgets' };

interface ProjectionsPageProps {
  searchParams: Promise<{ fy?: string; tab?: string }>;
}

export default async function ProjectionsPage({ searchParams }: ProjectionsPageProps) {
  const { fy, tab } = await searchParams;
  const today = getSASTToday();
  const currentFy = getCurrentFiscalYear(today);
  // Default to the current South African financial year unless user selects another fiscal year
  const parsedFy = fy ? parseInt(fy, 10) : currentFy;
  const fiscalYear =
    Number.isInteger(parsedFy) && parsedFy >= 2027 && parsedFy <= 2040 ? parsedFy : currentFy;
  const activeTab = tab === 'dividends' || tab === 'tax' ? tab : 'budgets';

  const [overview, governance] = await Promise.all([
    getBudgetVsActualsForFiscalYear(fiscalYear),
    getGovernanceOverview(fiscalYear),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal
        value={`${formatZAR(overview.totals.actualRevenue)} / ${formatZAR(overview.totals.revenueTarget)} (${overview.totals.revenueAttainmentPercent.toFixed(1)}%)`}
        variant={overview.totals.actualProfit >= 0 ? 'green' : 'red'}
      />

      <div>
        <h2 className="text-lg font-semibold">Projections, Dividends &amp; Tax Governance</h2>
        <p className="text-sm text-muted-foreground">
          Seasonalized monthly budgets, 2-Gate quarterly distributions (Companies Act s46), and SARS
          tax provisioning.
        </p>
      </div>

      <ProjectionsClient
        overview={overview}
        governance={governance}
        activeTab={activeTab}
        today={getSASTToday()}
      />
    </div>
  );
}
