import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllClients } from '@pmg/db'
import { getAllTenderScheduleEntries } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { ScheduleListClient } from './schedule-list-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Schedule List' }

export default async function ScheduleListPage() {
  const [entries, clients] = await Promise.all([
    getAllTenderScheduleEntries(),
    getAllClients(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${entries.length} total entries`} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Schedule List</h2>
          <p className="text-sm text-muted-foreground">
            Full list of all tender schedule entries with filtering and search
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/scheduling">
            <Plus className="size-4" />
            Back to Overview
          </Link>
        </Button>
      </div>

      <ScheduleListClient entries={entries} clients={clients} />
    </div>
  )
}
