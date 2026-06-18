import type { Metadata } from 'next'
import { getJournalEntries, getAllAccountingPeriods } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { postJournalEntry, voidJournalEntry } from '@/app/actions/accounting'
import { JournalsClient } from './journals-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Journal Entries' }

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; period?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = 20

  const [result, allPeriods] = await Promise.all([
    getJournalEntries({ page, pageSize, status: params.status, period: params.period }),
    getAllAccountingPeriods(),
  ])

  const periods = allPeriods.map((p) => p.period)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${result.total} entries`} />

      <div>
        <h2 className="text-lg font-semibold">Journal Entries</h2>
        <p className="text-sm text-muted-foreground">
          Record and review double-entry journal entries with balanced debits and credits.
        </p>
      </div>

      <JournalsClient
        data={result.data}
        total={result.total}
        currentPage={page}
        pageSize={pageSize}
        filters={{
          status: params.status,
          period: params.period,
        }}
        periods={periods}
        postAction={postJournalEntry}
        voidAction={voidJournalEntry}
      />
    </div>
  )
}
