import * as React from 'react';
import { getPortalSessionOrRedirect } from '@/lib/portal-session';
import { getDb, creditNotes, eq, desc } from '@pmg/db';
import { Card, CardContent } from '@/components/ui/card';
import { PiggyBank } from 'lucide-react';

function formatCurrency(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
}

function formatDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function CreditNotesPage() {
  const { client } = await getPortalSessionOrRedirect();
  const db = getDb();

  // Fetch credit notes
  const allCredits = await db
    .select()
    .from(creditNotes)
    .where(eq(creditNotes.clientId, client.id))
    .orderBy(desc(creditNotes.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Credit Notes</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review credits issued and applied to your account.
        </p>
      </div>

      <Card className="bg-[#0a0f1d] border-white/5">
        <CardContent className="p-0">
          {allCredits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PiggyBank className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-white">No credit notes found</p>
              <p className="text-xs text-muted-foreground mt-1">
                You do not have any credit notes on your account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-white/[0.01]">
                    <th className="px-6 py-3">Credit Note #</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Original Amount</th>
                    <th className="px-6 py-3 text-right">Remaining Balance</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {allCredits.map((credit) => (
                    <tr key={credit.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{credit.documentNumber}</td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(credit.createdAt)}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {formatCurrency(credit.amount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        {formatCurrency(credit.amountRemaining ?? '0.00')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          credit.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/10 text-muted-foreground'
                        }`}>
                          {credit.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
