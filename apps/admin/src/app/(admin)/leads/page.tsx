import type { Metadata } from 'next'
import {
  getAllLeads,
  getLeadCountsByStatus,
  getAllDivisions,
  getDistinctLeadSources,
} from '@pmg/db'
import { LeadStatusTabs } from '@/components/leads/lead-status-tabs'
import { LeadsFilterBar } from '@/components/leads/leads-filter-bar'
import { LeadsTable } from '@/components/leads/leads-table'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Leads' }

interface LeadsPageProps {
  searchParams: Promise<{ status?: string; divisionId?: string; source?: string }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { status, divisionId, source } = await searchParams

  const [entries, counts, divisions, sources] = await Promise.all([
    getAllLeads({ status, divisionId, source }),
    getLeadCountsByStatus(),
    getAllDivisions(),
    getDistinctLeadSources(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Leads</h1>

      <LeadStatusTabs
        counts={counts}
        currentStatus={status}
        currentDivisionId={divisionId}
        currentSource={source}
      />

      <LeadsFilterBar
        divisions={divisions}
        sources={sources}
        currentDivisionId={divisionId}
        currentSource={source}
        currentStatus={status}
      />

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No leads match the current filters.
        </p>
      ) : (
        <LeadsTable entries={entries} />
      )}
    </div>
  )
}
