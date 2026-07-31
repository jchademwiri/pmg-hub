import type { Metadata } from 'next';
import { getUpcomingExpirationsGlobal, db, clients } from '@pmg/db';
import { differenceInDays, format } from 'date-fns';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Compliance Radar | PMG Hub',
};

export const dynamic = 'force-dynamic';

export default async function ComplianceRadarPage() {
  const [records, allClients] = await Promise.all([
    getUpcomingExpirationsGlobal(),
    db.select({ id: clients.id, name: clients.name }).from(clients)
  ]);

  const clientMap = new Map(allClients.map(c => [c.id, c.name]));
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
    let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "outline";
    let statusText = `${record.daysLeft} days left`;
    
    if (record.daysLeft < 0) {
      badgeVariant = "destructive";
      statusText = "Expired";
    } else if (record.daysLeft <= 14) {
      badgeVariant = "destructive";
      statusText = `Expiring (${record.daysLeft} days)`;
    } else {
      badgeVariant = "secondary";
      statusText = `Expiring (${record.daysLeft} days)`;
    }

    return (
      <TableRow>
        <TableCell className="font-semibold py-4">
          <Link href={`/relationships/clients/${record.clientId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {clientName}
          </Link>
        </TableCell>
        <TableCell className="py-4">{docName}</TableCell>
        <TableCell className="py-4">{format(new Date(record.expiryDate), 'dd MMM yyyy')}</TableCell>
        <TableCell className="py-4"><Badge variant={badgeVariant}>{statusText}</Badge></TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Compliance Radar"
        description="Monitor upcoming expirations across all clients globally."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expired.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical (≤ 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{critical.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Expiring within 2 weeks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming (≤ 60 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">On the radar for renewal</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Expiration Watchlist</CardTitle>
          <CardDescription>All documents expiring within the next 60 days, and documents that are already expired.</CardDescription>
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
              {expired.map(r => <DocumentRow key={r.id} record={r} />)}
              {critical.map(r => <DocumentRow key={r.id} record={r} />)}
              {upcoming.map(r => <DocumentRow key={r.id} record={r} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
