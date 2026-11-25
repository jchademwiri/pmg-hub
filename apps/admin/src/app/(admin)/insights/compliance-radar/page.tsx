import type { Metadata } from 'next';
import { getUpcomingExpirationsGlobal, db, clients, asc } from '@pmg/db';
import { differenceInDays, format } from 'date-fns';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSASTToday, fmtDateLong } from '@/lib/format';
import { getStatutoryDeadlines } from '@/lib/compliance/statutory-calendar';
import { AddComplianceRecordDialog } from './add-compliance-record-dialog';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Compliance Radar | PMG Hub',
};

export const dynamic = 'force-dynamic';

export default async function ComplianceRadarPage() {
  const [records, allClients] = await Promise.all([
    getUpcomingExpirationsGlobal(),
    db
      .select({ id: clients.id, name: clients.name, businessName: clients.businessName })
      .from(clients)
      .orderBy(asc(clients.name)),
  ]);

  const todayStr = getSASTToday();
  const statutoryDeadlines = getStatutoryDeadlines(todayStr);

  const clientMap = new Map(allClients.map((c) => [c.id, c.businessName || c.name]));
  const today = new Date();

  const expired = [];
  const critical = [];
  const upcoming = [];

  for (const record of records) {
    const expDate = new Date(record.expiryDate);
    const daysLeft = differenceInDays(expDate, today);

    if (daysLeft < 0) {
      expired.push({ ...record, daysLeft });
    } else if (daysLeft <= 14) {
      critical.push({ ...record, daysLeft });
    } else {
      upcoming.push({ ...record, daysLeft });
    }
  }

  const DocumentRow = ({ record }: { record: any }) => {
    const clientName = clientMap.get(record.clientId) || 'Unknown Client';
    const docName = record.documentType === 'CUSTOM' ? record.customName : record.documentType;
    let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'outline';
    let statusText = `${record.daysLeft} days left`;

    if (record.daysLeft < 0) {
      badgeVariant = 'destructive';
      statusText = 'Expired';
    } else if (record.daysLeft <= 14) {
      badgeVariant = 'destructive';
      statusText = `Expiring (${record.daysLeft} days)`;
    } else {
      badgeVariant = 'secondary';
      statusText = `Expiring (${record.daysLeft} days)`;
    }

    return (
      <TableRow>
        <TableCell className="font-semibold py-4">
          <Link
            href={`/relationships/clients/${record.clientId}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {clientName}
          </Link>
        </TableCell>
        <TableCell className="py-4">{docName}</TableCell>
        <TableCell className="py-4">{format(new Date(record.expiryDate), 'dd MMM yyyy')}</TableCell>
        <TableCell className="py-4">
          <Badge variant={badgeVariant}>{statusText}</Badge>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Compliance Radar"
        description="Monitor upcoming expirations across all clients globally."
        actions={<AddComplianceRecordDialog clients={allClients} />}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expired.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical (≤ 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{critical.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Expiring within 2 weeks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming (≤ 60 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">On the radar for renewal</p>
          </CardContent>
        </Card>
      </div>

      {/* Statutory SARS & CIPC Deadlines Card */}
      <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Statutory SARS &amp; CIPC Deadlines</CardTitle>
            <CardDescription>
              Playhouse Media Group (Pty) Ltd annual filing &amp; provisional tax calendar (Feb
              FY-end).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/finance/projections?tab=tax">Open SBC Tax &amp; 1030 Reserve</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground py-3">Obligation</TableHead>
                <TableHead className="font-semibold text-foreground py-3">Authority</TableHead>
                <TableHead className="font-semibold text-foreground py-3">Due Date</TableHead>
                <TableHead className="font-semibold text-foreground py-3">Countdown</TableHead>
                <TableHead className="font-semibold text-foreground py-3 text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statutoryDeadlines.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="py-3">
                    <div className="font-medium text-sm">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {d.authority}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-sm whitespace-nowrap">
                    {fmtDateLong(d.dueDate)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant={
                        d.severity === 'overdue' || d.severity === 'critical'
                          ? 'destructive'
                          : d.severity === 'upcoming'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {d.daysLeft < 0
                        ? `Overdue (${Math.abs(d.daysLeft)}d)`
                        : `${d.daysLeft} days left`}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <Button variant="ghost" size="sm" asChild className="text-xs">
                      <Link href={d.actionHref}>{d.actionLabel}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Expiration Watchlist</CardTitle>
          <CardDescription>
            All documents expiring within the next 60 days, and documents that are already expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground py-4">Client</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Document</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Expiry Date</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-32">
                    No compliance documents are expiring soon.
                  </TableCell>
                </TableRow>
              )}
              {expired.map((r) => (
                <DocumentRow key={r.id} record={r} />
              ))}
              {critical.map((r) => (
                <DocumentRow key={r.id} record={r} />
              ))}
              {upcoming.map((r) => (
                <DocumentRow key={r.id} record={r} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
