import type { Metadata } from 'next';
import { getClientsWithIncomeCount, getAllDivisions, getClientAgingReport } from '@pmg/db';
import { createClient, deleteClient, toggleClientActive } from '@/app/actions/clients';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import ClientsPageClient, { type ClientBalanceSummary } from './clients-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const [clients, divisions, agingRows] = await Promise.all([
    getClientsWithIncomeCount(),
    getAllDivisions(),
    getClientAgingReport(),
  ]);

  const balancesByClient: Record<string, ClientBalanceSummary> = {};
  for (const row of agingRows) {
    const overdue = row.bucket_1_14 + row.bucket_15_30 + row.bucket_31_60 + row.bucket_61_plus;
    balancesByClient[row.clientId] = {
      outstanding: row.totalOutstanding,
      overdue,
    };
  }

  const activeCount = clients.filter((c) => c.isActive).length;

  return (
    <>
      <SetPageTotal value={`${activeCount} active`} />
      <ClientsPageClient
        clients={clients}
        divisions={divisions}
        balancesByClient={balancesByClient}
        createAction={createClient}
        deleteAction={deleteClient}
        toggleActiveAction={toggleClientActive}
      />
    </>
  );
}
