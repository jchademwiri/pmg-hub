import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { getClientsWithIncomeCount } from '@pmg/db';
import { createClient, deleteClient, toggleClientActive } from '@/app/actions/clients';
import { ClientAddForm } from '@/components/clients/client-add-form';
import { ClientsTable } from '@/components/clients/clients-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const clients = await getClientsWithIncomeCount();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Clients</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Client
        </Button>
      </div>

      <ClientAddForm createAction={createClient} />

      {clients.length === 0 ? (
        <EmptyState message="No clients yet." ctaLabel="Add Client" ctaHref="#client-add-form" />
      ) : (
        <ClientsTable
          clients={clients}
          deleteAction={deleteClient}
          toggleActiveAction={toggleClientActive}
        />
      )}
    </div>
  );
}
