import type { Metadata } from 'next'
import { getAllClients, getAllDivisions, getDivisionsWithStats, getLeadCountsByStatus, getAllLeads } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { RelationshipsOverviewClient } from './relationships-overview-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Relationships' }

export default async function RelationshipsOverviewPage() {
  const [clients, divisions, divisionsWithStats, leadCounts, allLeads] = await Promise.all([
    getAllClients(),
    getAllDivisions(),
    getDivisionsWithStats(),
    getLeadCountsByStatus(),
    getAllLeads(),
  ])

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
        recentLeads={allLeads.slice(0, 5)}
      />
    </div>
  )
}
