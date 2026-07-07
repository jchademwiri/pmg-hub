import type { Metadata } from 'next'
import { getActiveChartAccounts, db, divisions, eq } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { createJournalEntry } from '@/app/actions/accounting'
import { JournalEntryForm } from './journal-entry-form'
import { BackButton } from '@/components/ui/back-button'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New Journal Entry' }

export default async function NewJournalEntryPage() {
  const accounts = await getActiveChartAccounts()
  const activeDivisions = await db.select().from(divisions).where(eq(divisions.isActive, true))

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/accounting/journals" label="Journals" />
      <SetPageTotal value="New entry" />

      <div>
        <h2 className="text-lg font-semibold">New Journal Entry</h2>
        <p className="text-sm text-muted-foreground">
          Create a balanced double-entry journal entry. Total debits must equal total credits.
        </p>
      </div>

      <JournalEntryForm
        accounts={accounts}
        divisions={activeDivisions}
        createAction={createJournalEntry}
      />
    </div>
  )
}
