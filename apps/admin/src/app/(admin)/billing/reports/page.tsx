import type { Metadata } from 'next';
import {
  getAllClients,
  getAllDivisions,
  getAllExpenseCategories,
  getOrganisationSettings,
} from '@pmg/db';
import { buildOrgProps } from '@/lib/client-billing-helpers';
import { ReportsTemplateClient, type ReportModuleType } from './reports-template-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reports' };

interface ReportsPageProps {
  searchParams: Promise<{
    type?: string;
    clientId?: string;
    divisionId?: string;
    status?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }>;
}

export default async function ReportsTemplatePage({ searchParams }: ReportsPageProps) {
  const { type, clientId, divisionId, status, category, startDate, endDate, groupBy } =
    await searchParams;

  const initialType: ReportModuleType =
    type === 'payments' || type === 'expenses' || type === 'aging' ? type : 'invoices';

  const [clients, divisions, categoryObjects, orgSettings] = await Promise.all([
    getAllClients(),
    getAllDivisions(),
    getAllExpenseCategories(),
    getOrganisationSettings(),
  ]);

  const categories = categoryObjects.map((c) => c.name);
  const org = buildOrgProps('Playhouse Media Group (Pty) Ltd', null, orgSettings);

  return (
    <ReportsTemplateClient
      org={org}
      clients={clients}
      divisions={divisions}
      categories={categories}
      initialType={initialType}
      initialClientId={clientId || 'all'}
      initialDivisionId={divisionId || 'all'}
      initialStatus={status || 'all_active'}
      initialCategory={category || 'all'}
      initialStartDate={startDate || ''}
      initialEndDate={endDate || ''}
      initialGroupBy={groupBy === 'client' ? 'client' : 'none'}
    />
  );
}
