import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClientById } from '@pmg/db'
import { updateClient } from '@/app/actions/clients'
import { ClientEditForm } from '@/components/clients/client-edit-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Edit Client' }

interface EditClientPageProps {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params
  const client = await getClientById(id)
  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Clients
        </Link>
        <h1 className="text-2xl font-semibold">Edit Client</h1>
      </div>

      <ClientEditForm
        client={client}
        updateAction={updateClient.bind(null, id)}
      />
    </div>
  )
}
