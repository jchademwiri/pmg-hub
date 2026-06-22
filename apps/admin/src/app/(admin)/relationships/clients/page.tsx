import type { Metadata } from 'next';
import { getClientsWithIncomeCount, getAllDivisions } from '@pmg/db';
import { createClient, deleteClient, toggleClientActive } from '@/app/actions/clients';
import ClientsPageClient from './clients-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const [clients, divisions] = await Promise.all([
    getClientsWithIncomeCount(),
    getAllDivisions(),
  ]);

  return (
    <ClientsPageClient
      clients={clients}
      divisions={divisions}
      createAction={createClient}
      deleteAction={deleteClient}
      toggleActiveAction={toggleClientActive}
    />
  );
}
