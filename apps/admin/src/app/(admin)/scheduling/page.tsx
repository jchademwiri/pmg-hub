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

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${totalActive} active tender${totalActive !== 1 ? 's' : ''}`} />

      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold">Tender Scheduling</h2>
        <p className="text-sm text-muted-foreground">
          Plan, track, and manage tender preparation deadlines
        </p>
      </div>

      <SchedulingOverviewClient
        inProgress={workload.inProgress}
        planned={workload.planned}
        allEntries={allEntries}
        atRiskTenders={atRiskTenders}
        overlaps={overlaps}
        clients={clients}
        divisions={divisions}
      />
    </div>
  )
}
