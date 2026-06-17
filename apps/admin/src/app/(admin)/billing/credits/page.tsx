import type { Metadata } from 'next';
import { getDb, getAllClients, getAllDivisions, creditNotes, creditApplications, eq, sql, and, desc } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { CreditsClient } from './credits-client';
import { SetPageTotal } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Credit Management' };

export default async function CreditsPage() {
  const db = getDb();

  // Fetch all credit notes with client and division info
  const notes = await db
    .select({
      id: creditNotes.id,
      documentNumber: creditNotes.documentNumber,
      status: creditNotes.status,
      type: creditNotes.type,
      reason: creditNotes.reason,
      amount: creditNotes.amount,
      amountRemaining: creditNotes.amountRemaining,
      createdAt: creditNotes.createdAt,
      expiresAt: creditNotes.expiresAt,
      clientId: creditNotes.clientId,
      divisionId: creditNotes.divisionId,
    })
    .from(creditNotes)
    .orderBy(desc(creditNotes.createdAt));

  // Calculate totals
  let activeCredit = 0;
  let expiredCredit = 0;
  let totalIssued = 0;

  const creditNotesList = notes.map((note) => {
    const amount = parseFloat(note.amount);
    const remaining = parseFloat(note.amountRemaining);
    totalIssued += amount;

    if (note.status === 'active' || note.status === 'partially_applied') {
      activeCredit += remaining;
    } else if (note.status === 'expired') {
      expiredCredit += remaining;
    }

    return {
      id: note.id,
      documentNumber: note.documentNumber,
      status: note.status,
      type: note.type,
      reason: note.reason,
      amount,
      amountRemaining: remaining,
      createdAt: note.createdAt?.toISOString() ?? '',
      expiresAt: note.expiresAt?.toISOString() ?? null,
      clientId: note.clientId,
      divisionId: note.divisionId,
    };
  });

  // Fetch clients and divisions for display
  const [clients, divisions] = await Promise.all([getAllClients(), getAllDivisions()]);

  const totalCredit = activeCredit + expiredCredit;

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(activeCredit)} variant="green" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Credit Management</h2>
          <p className="text-sm text-muted-foreground">Monitor client credits, credit notes, and credit balances</p>
        </div>
      </div>

      {/* Credits Client Component */}
      <CreditsClient
        creditNotes={creditNotesList}
        clients={clients}
        divisions={divisions}
        activeCredit={activeCredit}
        expiredCredit={expiredCredit}
        totalIssued={totalIssued}
        totalCredit={totalCredit}
      />
    </div>
  );
}
