import type { Metadata } from 'next'
import { getAnalysisOverview, getAllSnapshots } from '@pmg/db'
import { getSASTParts, formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { InsightsOverviewClient } from './insights-overview-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Reports & Insights | PMG Hub' }

export default async function InsightsOverviewPage() {
  const { year, month, day } = getSASTParts()
  
  let defaultYear = year
  if (month < 2) defaultYear = year - 1

  const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const [overviewResult, snapshotsResult] = await Promise.allSettled([
    getAnalysisOverview(defaultYear, currentDateStr),
    getAllSnapshots(),
  ])

  const overviewStatus = overviewResult.status
  const snapshotsStatus = snapshotsResult.status

  const overviewData = overviewResult.status === 'fulfilled' ? overviewResult.value : null
  const snapshots = snapshotsResult.status === 'fulfilled' ? snapshotsResult.value : []

  const totalValue = overviewStatus === 'fulfilled' && overviewData
    ? `YTD Revenue: ${formatZAR(overviewData.ytd?.currentRevenue ?? 0)}`
    : 'YTD Revenue: Unavailable'

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={totalValue} />

      <div>
        <h2 className="text-lg font-semibold">Reports & Insights Overview</h2>
        <p className="text-sm text-muted-foreground">
          Centralized business intelligence, performance analysis, custom reports, and compliance monitoring.
        </p>
      </div>

      <InsightsOverviewClient
        overviewData={overviewData}
        overviewStatus={overviewStatus}
        snapshotCount={snapshots.length}
        snapshotsStatus={snapshotsStatus}
      />
    </div>
  )
}
