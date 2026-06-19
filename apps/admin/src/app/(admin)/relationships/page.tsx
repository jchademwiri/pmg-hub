import type { Metadata } from 'next'
import { getAllClients, getAllDivisions, getDivisionsWithStats, getLeadCountsByStatus, getClientsWithBillingActivity } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { RelationshipsOverviewClient } from './relationships-overview-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Relationships' }

export default async function RelationshipsOverviewPage() {
  const [clients, divisions, divisionsWithStats, leadCounts, clientActivity] = await Promise.all([
    getAllClients(),
    getAllDivisions(),
    getDivisionsWithStats(),
    getLeadCountsByStatus(),
    getClientsWithBillingActivity(),
  ])

  // Get top 3 profitable clients based on totalPaid (income received)
  const topClients = [...clientActivity]
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${clients.length} clients, ${leadCounts.all} leads`} />

      <div>
        <h2 className="text-lg font-semibold">Relationships Overview</h2>
        <p className="text-sm text-muted-foreground">
          Client, lead, and division relationship management.
        </p>
      </div>

      <RelationshipsOverviewClient
        clientCount={clients.length}
        divisionCount={divisions.length}
        leadCounts={leadCounts}
        divisions={divisionsWithStats}
        topClients={topClients}
      />
    </div>
  )
}
