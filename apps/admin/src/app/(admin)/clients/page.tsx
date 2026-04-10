import type { Metadata } from 'next'
import { getClientsWithIncomeCount } from '@pmg/db'
import { createClient, deleteClient, toggleClientActive } from '@/app/actions/clients'
import { ClientAddForm } from '@/components/clients/client-add-form'
import { ClientsTable } from '@/components/clients/clients-table'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const clients = await getClientsWithIncomeCount()

  return (
    <div className="flex flex-col gap-6">
      <ClientAddForm createAction={createClient} />

      {clients.length === 0 ? (
        <EmptyState message="No clients yet." ctaLabel="Add Client" ctaHref="#client-add-form" />
      ) : (
        <ClientsTable clients={clients} deleteAction={deleteClient} toggleActiveAction={toggleClientActive} />
      )}
    </div>
  )
}

