import type { Metadata } from 'next';
import { getBudgetVsActualsForFiscalYear } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { ProjectionsClient } from './projections-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Projections & Budgets' };

interface ProjectionsPageProps {
  searchParams: Promise<{ fy?: string }>;
}

export default async function ProjectionsPage({ searchParams }: ProjectionsPageProps) {
  const { fy } = await searchParams;
  // Default to FY2027/28 (ending year 2028) unless user selects another fiscal year
  const parsedFy = fy ? parseInt(fy, 10) : 2028;
  const fiscalYear =
    Number.isInteger(parsedFy) && parsedFy >= 2024 && parsedFy <= 2040 ? parsedFy : 2028;

  const overview = await getBudgetVsActualsForFiscalYear(fiscalYear);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal
        value={`Target ${formatZAR(overview.totals.revenueTarget)}`}
        variant={overview.totals.actualProfit >= 0 ? 'green' : 'red'}
      />

      <div>
        <h2 className="text-lg font-semibold">Projections &amp; Budgets</h2>
        <p className="text-sm text-muted-foreground">
          Seasonalized monthly revenue targets, operating budgets, and live vs. closed actuals
          across South African financial years.
        </p>
      </div>

      <ProjectionsClient overview={overview} />
    </div>
  );
}
