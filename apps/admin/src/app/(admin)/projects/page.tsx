import type { Metadata } from 'next'
import { getAllClients, getAllDivisions } from '@pmg/db'
import { getActiveProjectScheduleEntries, getCurrentWorkload, getProjectsAtRisk, detectOverlaps, getProjectsProgressMap } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { ProjectOverviewClient } from '@/components/projects/project-overview-shell'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Projects' }

export default async function SchedulingPage() {
  const [workload, allEntries, atRiskTenders, overlaps, clients, divisions] = await Promise.all([
    getCurrentWorkload(),
    getActiveProjectScheduleEntries(),
    getProjectsAtRisk(),
    detectOverlaps(),
    getAllClients(),
    getAllDivisions(),
  ])

  const totalActive = workload.planned.length + workload.inProgress.length
  const upcomingEntries = allEntries
    .filter((e) => e.status === 'planned' || e.status === 'in_progress')
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))
    .slice(0, 5)

  // Fetch progress map for all active and upcoming projects
  const activeIds = [
    ...workload.inProgress.map((p) => p.id),
    ...workload.planned.map((p) => p.id),
    ...upcomingEntries.map((u) => u.id),
  ]
  const progressMap = await getProjectsProgressMap(activeIds)
  const progressObj = Object.fromEntries(progressMap.entries())

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${totalActive} active project${totalActive !== 1 ? 's' : ''}`} />

      <ProjectOverviewClient
        inProgress={workload.inProgress}
        planned={workload.planned}
        allEntries={allEntries}
        atRiskTenders={atRiskTenders}
        overlaps={overlaps}
        clients={clients}
        divisions={divisions}
        upcomingTenders={upcomingEntries}
        progressMap={progressObj}
      />
    </div>
  )
}
