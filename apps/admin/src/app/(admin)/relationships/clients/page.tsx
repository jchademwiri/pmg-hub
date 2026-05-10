import type { Metadata } from 'next';
import { getClientsWithIncomeCount } from '@pmg/db';
import { createClient, deleteClient, toggleClientActive } from '@/app/actions/clients';
import ClientsPageClient from './clients-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const clients = await getClientsWithIncomeCount();

  return (
    <ClientsPageClient
      clients={clients}
      createAction={createClient}
      deleteAction={deleteClient}
      toggleActiveAction={toggleClientActive}
    />
  );
}
