'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClickableTableRow } from '@/components/ui/clickable-table-row';
import { formatZAR } from '@/lib/format';
import type { LunoAccountRow } from '@pmg/db';

/** Formats a Luno decimal balance to 8 decimal places. */
function formatBalance(balance: string): string {
  const n = parseFloat(balance);
  return Number.isFinite(n) ? n.toFixed(8) : balance;
}

export function LunoAccountsTable({ accounts }: { accounts: LunoAccountRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Value (ZAR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <ClickableTableRow
              key={account.accountId}
              href={`/assets/luno/${account.accountId}`}
              className="transition-colors hover:bg-muted/40"
            >
              <TableCell>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {account.asset}
                </span>
              </TableCell>
              <TableCell className="font-medium">{account.name ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                {formatBalance(account.balance)}
              </TableCell>
              <TableCell
                className="text-right tabular-nums text-sm"
                title={
                  account.zarValue == null && /^[A-Z0-9]+x$/i.test(account.asset)
                    ? 'Tokenised stock — Luno exposes no ZAR price, units only'
                    : undefined
                }
              >
                {account.zarValue != null ? formatZAR(account.zarValue) : '—'}
              </TableCell>
            </ClickableTableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
