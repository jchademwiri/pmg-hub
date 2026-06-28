import type { Metadata } from 'next'
import { getAllClients, getAllDivisions } from '@pmg/db'
import { getActiveTenderScheduleEntries, getCurrentWorkload, getTendersAtRisk, detectOverlaps } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { SchedulingOverviewClient } from '@/components/scheduling/scheduling-overview-shell'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Scheduling' }

export default async function SchedulingPage() {
  const [workload, allEntries, atRiskTenders, overlaps, clients, divisions] = await Promise.all([
    getCurrentWorkload(),
    getActiveTenderScheduleEntries(),
    getTendersAtRisk(),
    detectOverlaps(),
    getAllClients(),
    getAllDivisions(),
  ])

  const totalActive = workload.planned.length + (workload.inProgress ? 1 : 0)
  const upcomingEntries = allEntries
    .filter((e) => e.status === 'planned' || e.status === 'in_progress')
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${totalActive} active project${totalActive !== 1 ? 's' : ''}`} />

      <SchedulingOverviewClient
        inProgress={workload.inProgress}
        planned={workload.planned}
        allEntries={allEntries}
        atRiskTenders={atRiskTenders}
        overlaps={overlaps}
        clients={clients}
        divisions={divisions}
        upcomingTenders={upcomingEntries}
      />
    </div>
  )
}
