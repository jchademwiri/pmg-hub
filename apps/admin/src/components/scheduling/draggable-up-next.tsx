'use client';

import type { TenderScheduleEntry } from '@pmg/db';
import { CalendarDays, ListOrdered } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge';

interface ClientSummary {
  id: string;
  name: string;
  businessName: string | null;
  email: string | null;
}

interface DraggableUpNextProps {
  tenders: TenderScheduleEntry[];
  clients: ClientSummary[];
  onStatusChange: (id: string, status: string) => Promise<string | undefined>;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a);
  const end = new Date(b);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function DraggableUpNext({ tenders, clients, onStatusChange }: DraggableUpNextProps) {
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  if (tenders.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-muted-foreground" />
            <CardTitle>Up Next</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">No upcoming tenders</p>
            <p className="text-xs text-muted-foreground">
              Add a tender to build the automatic queue.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-muted-foreground" />
          <CardTitle>Up Next ({tenders.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {tenders.map((tender, index) => {
          const client = clientMap.get(tender.clientId);
          const bufferGap = daysBetween(tender.targetCompletionDate, tender.closingDate);
          const daysToClose = daysBetween(
            new Date().toISOString().split('T')[0],
            tender.closingDate,
          );

          return (
            <div
              key={tender.id}
              className="flex items-center justify-between border-b py-3 last:border-0"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-medium tabular-nums">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{tender.tenderReference}</p>
                    {tender.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  {client && (
                    <p className="truncate text-xs text-muted-foreground leading-tight">
                      {client.name}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDate(tender.startDate)} → {formatDate(tender.targetCompletionDate)}
                    </span>
                    <span>{tender.effortDays}d effort</span>
                    <span className={bufferGap < tender.bufferDays ? 'text-amber-500' : ''}>
                      {Math.max(0, bufferGap)}d buffer
                    </span>
                    <span className={daysToClose <= 7 ? 'text-amber-500 font-medium' : ''}>
                      closes {formatDate(tender.closingDate)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <TenderRiskBadge tender={tender} />
                {tender.status === 'planned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(tender.id, 'in_progress')}
                  >
                    Start
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
