'use client';

import { format, differenceInCalendarDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteComplianceRecord } from '@/app/actions/compliance';
import { ComplianceFormDialog } from './compliance-form-dialog';
import { useTransition } from 'react';
import { toast } from 'sonner';

export function ComplianceTable({ clientId, records }: { clientId: string; records: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      startTransition(async () => {
        const result = await deleteComplianceRecord(id, clientId);
        if (result.error) toast.error(result.error);
        else toast.success('Record deleted');
      });
    }
  };

  const today = new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Compliance Documents</CardTitle>
          <ComplianceFormDialog clientId={clientId} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                    No compliance records found.
                  </TableCell>
                </TableRow>
              )}
              {records.map((record) => {
                const expiryDate = new Date(`${record.expiryDate}T00:00:00`);
                const daysLeft = differenceInCalendarDays(expiryDate, today);
                
                let badgeClassName = "bg-green-500/10 text-green-700 dark:text-green-500 border-green-500/20";
                let statusText = `${daysLeft} days left`;
                
                if (daysLeft < 0) {
                  badgeClassName = "bg-red-500/10 text-red-700 dark:text-red-500 border-red-500/20";
                  statusText = "Expired";
                } else if (daysLeft <= 30) {
                  badgeClassName = "bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/20";
                  statusText = `Expiring (${daysLeft} days)`;
                }

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.documentType === 'CUSTOM' ? record.customName : record.documentType}
                    </TableCell>
                    <TableCell>{format(expiryDate, 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeClassName}>{statusText}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{record.uploadedBy}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ComplianceFormDialog clientId={clientId} record={record} />
                        <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleDelete(record.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
