import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getClientsWithBillingActivity, getStatementPeriodDates } from '@pmg/db';
import { formatZAR, fmtDate } from '@/lib/format';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { SendOverdueRemindersButton } from '@/components/billing/send-overdue-reminders-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Statements' };

export default async function StatementsPage() {
  const now = new Date();
  const currentFY = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

  const { endDate: asOfDate } = getStatementPeriodDates({ monthPeriod: 'current' });
  const clients = await getClientsWithBillingActivity({ year: currentFY, asOfDate });

  const totalOutstanding = clients.reduce((s, c) => s + c.totalOutstanding, 0);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalOutstanding)} variant="amber" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Statements</h2>
          <p className="text-sm text-muted-foreground">View account statements per client</p>
        </div>
        <div className="flex items-center gap-2">
          <SendOverdueRemindersButton />
        </div>
      </div>

      {/* Clients table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Statements</CardTitle>
          <CardDescription>Select a client to view their full account statement</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="px-6 pb-4">
              <EmptyState message="No client statements available yet. Statements are generated from invoices." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/billing/statements/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.businessName ?? client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatZAR(client.totalInvoiced)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-green-600 dark:text-green-400">
                      {formatZAR(client.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      <span
                        className={
                          client.totalOutstanding > 0
                            ? 'text-red-500'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatZAR(client.totalOutstanding)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(client.lastActivityDate)}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/billing/statements/${client.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
