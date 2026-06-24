import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Schedule List' }

export default function ScheduleListPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Schedule List</h2>
        <p className="text-sm text-muted-foreground">Full list of all tender schedule entries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            A full filterable and searchable list view of all tender schedule entries will be
            available here in a future update. For now, use the Scheduling Overview page to see your
            active tenders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Planned features: pagination, advanced filtering by status/priority/date range, search by
            client or reference, bulk archive, and CSV export.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
