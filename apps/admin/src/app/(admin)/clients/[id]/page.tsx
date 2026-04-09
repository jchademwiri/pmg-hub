import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClientById, getAllIncome } from '@pmg/db'
import { updateClient } from '@/app/actions/clients'
import { ClientEditForm } from '@/components/clients/client-edit-form'
import { formatZAR } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const client = await getClientById(id)
  return { title: client ? `${client.businessName ?? client.name}` : 'Client' }
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params
  const [client, incomeEntries] = await Promise.all([
    getClientById(id),
    getAllIncome({ clientId: id }),
  ])
  if (!client) notFound()

  const totalIncome = incomeEntries.sum

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Clients
        </Link>
        <h1 className="text-2xl font-semibold">
          {client.businessName ?? client.name}
        </h1>
        <Badge variant={client.isActive ? 'default' : 'secondary'}>
          {client.isActive ? 'Active' : 'Disabled'}
        </Badge>
      </div>

      {/* Edit form */}
      <section className="rounded-lg border p-5 flex flex-col gap-4">
        <h2 className="text-base font-medium">Client Details</h2>
        <ClientEditForm
          client={client}
          updateAction={updateClient.bind(null, id)}
        />
      </section>

      {/* Income summary */}
      <section className="rounded-lg border p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Income History</h2>
          <span className="text-sm font-semibold text-muted-foreground">
            Total: {formatZAR(totalIncome)}
          </span>
        </div>

        {incomeEntries.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No income records for this client yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeEntries.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.divisionName}</TableCell>
                  <TableCell>{entry.description ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-green-500">
                    +{formatZAR(Number(entry.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
