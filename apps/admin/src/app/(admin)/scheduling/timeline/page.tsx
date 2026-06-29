import type { Metadata } from 'next'
import { getActiveTenderScheduleEntries, getAllClients, getTendersProgressMap } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { TimelineClient } from './timeline-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Project Schedule Timeline' }

export default async function SchedulingTimelinePage() {
  const [activeEntries, clients] = await Promise.all([
    getActiveTenderScheduleEntries(),
    getAllClients(),
  ])

  const progressMap = await getTendersProgressMap(activeEntries.map((e) => e.id))
  const progressObj = Object.fromEntries(progressMap.entries())

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${activeEntries.length} active`} />

      <TimelineClient
        entries={activeEntries}
        clients={clients}
        progressMap={progressObj}
      />
    </div>
  )
}
