import type { Metadata } from 'next'
import { getAllClients } from '@pmg/db'
import { getAllTenderScheduleEntries } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { TimelineClient } from './timeline-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Timeline' }

export default async function TimelinePage() {
  const [entries, clients] = await Promise.all([
    getAllTenderScheduleEntries(),
    getAllClients(),
  ])

  const activeEntries = entries.filter(
    (e) => e.status !== 'cancelled' && e.status !== 'submitted',
  )

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${activeEntries.length} active`} />

      <div>
        <h2 className="text-lg font-semibold">Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Visual timeline of tender schedules — bars show your working window, markers show closing dates
        </p>
      </div>

      <TimelineClient entries={activeEntries} clients={clients} />
    </div>
  )
}
