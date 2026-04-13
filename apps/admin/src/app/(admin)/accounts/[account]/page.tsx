import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getWithdrawalsByAccount,
  getWithdrawalsByAccountYTDSpecific,
  getAllIncome,
  getYTDSummary,
} from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { ACCOUNT_KEYS, ACCOUNT_LABELS } from '@/lib/accounts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface AccountHistoryPageProps {
  params: Promise<{ account: string }>;
}

export async function generateMetadata({ params }: AccountHistoryPageProps): Promise<Metadata> {
  const { account } = await params;
  const label = ACCOUNT_LABELS[account];
  return { title: label ? `${label} Statement` : 'Account Statement' };
}

type StatementEntry = {
  date: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  balance: number;
};

export default async function AccountHistoryPage({ params }: AccountHistoryPageProps) {
  const { account } = await params;

  if (!(ACCOUNT_KEYS as readonly string[]).includes(account)) notFound();

  const label = ACCOUNT_LABELS[account]!;

  const [withdrawalsAll, withdrawalsYTD, incomeEntries, ytd] = await Promise.all([
    getWithdrawalsByAccount(account),
    getWithdrawalsByAccountYTDSpecific(account),
    getAllIncome(),
    getYTDSummary(),
  ]);

  // Compute this account's effective rate against total revenue
  // so each income entry gets a proportional credit that sums to YTD earned.
  const totalRevenue = ytd.revenue;
  const accountEarned: Record<string, number> = {
    salary: ytd.salary,
    pmg_share: ytd.pmgShare,
    reinvest: ytd.reinvest,
    reserve: ytd.reserve,
    flex: ytd.flex,
  };
  const earned = accountEarned[account] ?? 0;
  // effective rate = earned / revenue (avoids per-tx expense allocation complexity)
  const effectiveRate = totalRevenue > 0 ? earned / totalRevenue : 0;

  // Build raw events sorted ascending by date (oldest first for running balance)
  type RawEvent = { date: string; type: 'credit' | 'debit'; description: string; amount: number };
  const events: RawEvent[] = [];

  for (const entry of incomeEntries.data) {
    const credit = Number(entry.amount) * effectiveRate;
    if (credit <= 0) continue;
    events.push({
      date: entry.date,
      type: 'credit',
      description: `Allocated Income — ${entry.clientName ?? entry.divisionName}${entry.description ? ` · ${entry.description}` : ''}`,
      amount: credit,
    });
  }

  for (const w of withdrawalsAll) {
    events.push({
      date: w.date,
      type: 'debit',
      description: w.description ?? `${label} withdrawal`,
      amount: Number(w.amount),
    });
  }

  // Sort ascending by date for running balance calculation
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Build statement with running balance
  let running = 0;
  const statement: StatementEntry[] = events.map((e) => {
    running = e.type === 'credit' ? running + e.amount : running - e.amount;
    return { ...e, balance: running };
  });

  // Reverse for display (newest first)
  const displayRows = [...statement].reverse();

  const currentBalance = running;
  const totalWithdrawnYTD = withdrawalsYTD.reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/accounts"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Accounts
        </Link>
        <h1 className="text-xl font-semibold">{label} Statement</h1>
        <span
          className={`ml-auto text-base font-bold tabular-nums ${currentBalance < 0 ? 'text-red-500' : ''}`}
        >
          {formatZAR(currentBalance)}
        </span>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="rounded-lg border px-4 py-2 flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Allocated YTD</span>
          <span className="font-semibold tabular-nums">{formatZAR(earned)}</span>
        </div>
        <div className="rounded-lg border px-4 py-2 flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Withdrawn YTD</span>
          <span className="font-semibold tabular-nums text-amber-500">
            {formatZAR(totalWithdrawnYTD)}
          </span>
        </div>
        <div className="rounded-lg border px-4 py-2 flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span
            className={`font-semibold tabular-nums ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}
          >
            {formatZAR(currentBalance)}
          </span>
        </div>
      </div>

      {displayRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground text-sm">{row.date}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.type === 'credit'
                        ? 'bg-green-500/15 text-green-500'
                        : 'bg-amber-500/15 text-amber-500'
                    }`}
                  >
                    {row.type === 'credit' ? 'Credit' : 'Debit'}
                  </span>
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums font-medium ${row.type === 'debit' ? 'text-amber-500' : 'text-green-500'}`}
                >
                  {row.type === 'debit' ? '−' : '+'}
                  {formatZAR(row.amount)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${row.balance < 0 ? 'text-red-500' : ''}`}
                >
                  {formatZAR(row.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
