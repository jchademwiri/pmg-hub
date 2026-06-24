import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Timeline' }

export default function TimelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Timeline</h2>
        <p className="text-sm text-muted-foreground">Visual timeline of tender schedules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            A visual timeline / Gantt-style view of all tender schedules will be available here in a
            future update. Use the Scheduling Overview page to see your current workload and queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Planned features: horizontal bar chart showing tender date ranges, colour-coded by
            status, closing date markers, and overlap highlighting.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
