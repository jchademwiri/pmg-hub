'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR } from '@/lib/format';
import { SendOverdueRemindersButton } from '@/components/billing/send-overdue-reminders-button';
import type { ClientAgingRow, AgingRow } from '@pmg/db';

interface AgingReportClientProps {
  clientAging: ClientAgingRow[];
  globalAging: AgingRow[];
}

type SortField = 'name' | 'totalOutstanding' | 'current' | 'bucket_1_14' | 'bucket_15_30' | 'bucket_31_60' | 'bucket_61_plus';
type SortOrder = 'asc' | 'desc';

export function AgingReportClient({ clientAging, globalAging }: AgingReportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortField, setSortField] = React.useState<SortField>('totalOutstanding');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
  const [activeBucket, setActiveBucket] = React.useState<string | null>(filterParam);


  // Totals
  const totalAR = React.useMemo(() => clientAging.reduce((s, c) => s + c.totalOutstanding, 0), [clientAging]);
  const totalCurrent = React.useMemo(() => globalAging.find(b => b.bucket === 'current')?.total ?? 0, [globalAging]);
  const totalOverdue = React.useMemo(() => totalAR - totalCurrent, [totalAR, totalCurrent]);

  // Handle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Search & Filter
  const filteredClients = React.useMemo(() => {
    return clientAging.filter((client) => {
      const nameMatch = (client.businessName ?? client.clientName)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      if (!nameMatch) return false;

      if (activeBucket) {
        if (activeBucket === 'current') return client.current > 0;
        if (activeBucket === '1_14') return client.bucket_1_14 > 0;
        if (activeBucket === '15_30') return client.bucket_15_30 > 0;
        if (activeBucket === '31_60') return client.bucket_31_60 > 0;
        if (activeBucket === '61_plus') return client.bucket_61_plus > 0;
      }

      return true;
    });
  }, [clientAging, searchTerm, activeBucket]);

  // Sort Clients
  const sortedClients = React.useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'name') {
        valA = (a.businessName ?? a.clientName).toLowerCase();
        valB = (b.businessName ?? b.clientName).toLowerCase();
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredClients, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 size-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 size-3 text-foreground" />
    ) : (
      <ArrowDown className="ml-1 size-3 text-foreground" />
    );
  };

  // Segment proportions for horizontal bar
  const segments = React.useMemo(() => {
    return globalAging.map((bucket) => {
      const percent = totalAR > 0 ? (bucket.total / totalAR) * 100 : 0;
      return {
        ...bucket,
        percent,
      };
    });
  }, [globalAging, totalAR]);

  const bucketColors: Record<string, string> = {
    current: 'bg-emerald-500 dark:bg-emerald-600',
    '1_14': 'bg-amber-400 dark:bg-amber-500',
    '15_30': 'bg-orange-500 dark:bg-orange-600',
    '31_60': 'bg-rose-500 dark:bg-rose-600',
    '61_plus': 'bg-red-600 dark:bg-red-700',
  };

  const bucketBorderColors: Record<string, string> = {
    current: 'border-emerald-500/20 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5',
    '1_14': 'border-amber-500/20 text-amber-700 dark:text-amber-400 bg-amber-500/5',
    '15_30': 'border-orange-500/20 text-orange-700 dark:text-orange-400 bg-orange-500/5',
    '31_60': 'border-rose-500/20 text-rose-700 dark:text-rose-400 bg-rose-500/5',
    '61_plus': 'border-red-500/20 text-red-700 dark:text-red-400 bg-red-500/5',
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total AR Outstanding</p>
            <p className="text-2xl font-bold mt-2 tabular-nums text-foreground">{formatZAR(totalAR)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current (Within Terms)</p>
            <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600">{formatZAR(totalCurrent)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Delinquent AR</p>
            <p className={`text-2xl font-bold mt-2 tabular-nums ${totalOverdue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatZAR(totalOverdue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Proportions Bar */}
      <Card className="shadow-none p-5 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aging Distribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ratio of receivables per aging category</p>
        </div>
        
        {totalAR > 0 ? (
          <div className="space-y-3">
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
              {segments.map((segment) => {
                if (segment.percent === 0) return null;
                return (
                  <div
                    key={segment.bucket}
                    style={{ width: `${segment.percent}%` }}
                    className={`${bucketColors[segment.bucket]} transition-all duration-300`}
                    title={`${segment.label}: ${formatZAR(segment.total)} (${Math.round(segment.percent)}%)`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              {segments.map((segment) => {
                const isActive = activeBucket === segment.bucket;
                const isAnyActive = activeBucket !== null;
                const opacityClass = isAnyActive && !isActive ? 'opacity-40 hover:opacity-75' : 'opacity-100';
                const borderClass = isActive
                  ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-sm'
                  : 'hover:scale-[1.01]';
                
                return (
                  <button
                    key={segment.bucket}
                    onClick={() => setActiveBucket(isActive ? null : segment.bucket)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all duration-200 cursor-pointer ${bucketBorderColors[segment.bucket]} ${borderClass} ${opacityClass}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`size-2.5 rounded-full ${bucketColors[segment.bucket]} shrink-0`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {segment.label}
                      </span>
                    </div>
                    <p className="text-sm font-bold tabular-nums mt-1">{formatZAR(segment.total)}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{Math.round(segment.percent)}% of total</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">No outstanding invoices.</div>
        )}
      </Card>

      {/* Client Table Section */}
      <Card className="shadow-none">
        <CardHeader className="border-b px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Client Aging Breakdown</CardTitle>
            {activeBucket && (
              <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in duration-200">
                Filtered: {segments.find(s => s.bucket === activeBucket)?.label}
                <button
                  onClick={() => setActiveBucket(null)}
                  className="hover:text-foreground font-bold ml-1 text-sm leading-none"
                  title="Clear Filter"
                >
                  &times;
                </button>
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 h-9 shadow-none text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedClients.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No clients found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <button onClick={() => handleSort('name')} className="group flex items-center hover:text-foreground font-semibold">
                        Client
                        <SortIcon field="name" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('totalOutstanding')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        Outstanding
                        <SortIcon field="totalOutstanding" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('current')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        Current
                        <SortIcon field="current" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('bucket_1_14')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        1–14 Days
                        <SortIcon field="bucket_1_14" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('bucket_15_30')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        15–30 Days
                        <SortIcon field="bucket_15_30" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('bucket_31_60')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        31–60 Days
                        <SortIcon field="bucket_31_60" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('bucket_61_plus')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        61+ Days
                        <SortIcon field="bucket_61_plus" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map((client) => {
                    const hasOverdue = client.bucket_1_14 > 0 || client.bucket_15_30 > 0 || client.bucket_31_60 > 0 || client.bucket_61_plus > 0;
                    return (
                      <TableRow
                        key={client.clientId}
                        className="cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        onClick={() => router.push(`/billing/aging/${client.clientId}`)}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/billing/aging/${client.clientId}`);
                          }
                        }}
                      >
                        <TableCell className="font-medium text-primary hover:underline">
                          {client.businessName || client.clientName}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatZAR(client.totalOutstanding)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">
                          {client.current > 0 ? formatZAR(client.current) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">
                          {client.bucket_1_14 > 0 ? formatZAR(client.bucket_1_14) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-600">
                          {client.bucket_15_30 > 0 ? formatZAR(client.bucket_15_30) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600">
                          {client.bucket_31_60 > 0 ? formatZAR(client.bucket_31_60) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600 font-semibold">
                          {client.bucket_61_plus > 0 ? formatZAR(client.bucket_61_plus) : '—'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <Button asChild size="icon" variant="ghost" className="size-8" title="View Statement">
                              <Link href={`/billing/statements/${client.clientId}`}>
                                <FileText className="size-4 text-muted-foreground" />
                              </Link>
                            </Button>
                            {hasOverdue ? (
                              <SendOverdueRemindersButton
                                clientId={client.clientId}
                                trigger={
                                  <Button size="icon" variant="ghost" className="size-8" title="Send Overdue Reminder">
                                    <Mail className="size-4 text-red-500" />
                                  </Button>
                                }
                              />
                            ) : (
                              <Button size="icon" variant="ghost" className="size-8 opacity-40 cursor-not-allowed" disabled title="No Overdue Balance">
                                <Mail className="size-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
