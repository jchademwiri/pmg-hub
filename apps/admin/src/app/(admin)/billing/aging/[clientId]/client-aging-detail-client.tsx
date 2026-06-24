'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, FileText, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR, fmtDate, getSASTParts } from '@/lib/format';
import { SendOverdueRemindersButton } from '@/components/billing/send-overdue-reminders-button';
import type { OutstandingInvoiceRow } from '@pmg/db';

interface ClientAgingDetailClientProps {
  client: {
    id: string;
    name: string;
    businessName: string | null;
    email: string | null;
    phone: string | null;
  };
  invoices: OutstandingInvoiceRow[];
  totalOutstanding: number;
}

type SortField = 'invoiceDate' | 'documentNumber' | 'dueDate' | 'daysPastDue' | 'total' | 'outstanding';
type SortOrder = 'asc' | 'desc';

function SortIcon({ field, currentField, order }: { field: SortField; currentField: SortField; order: SortOrder }) {
  if (currentField !== field) return <ArrowUpDown className="ml-1 size-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
  return order === 'asc' ? (
    <ArrowUp className="ml-1 size-3 text-foreground" />
  ) : (
    <ArrowDown className="ml-1 size-3 text-foreground" />
  );
}

export function ClientAgingDetailClient({ client, invoices, totalOutstanding }: ClientAgingDetailClientProps) {
  const [sortField, setSortField] = React.useState<SortField>('daysPastDue');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
  const [activeBucket, setActiveBucket] = React.useState<string | null>(null);

  const today = React.useMemo(() => {
    const { year, month, day } = getSASTParts();
    return new Date(year, month, day);
  }, []);

  const getDaysPastDue = React.useCallback((dueDateStr: string | null): number => {
    if (!dueDateStr) return 0;
    const dueDate = new Date(`${dueDateStr}T00:00:00`);
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const tod = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (due >= tod) return 0;
    const diffTime = tod.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [today]);

  const invoiceData = React.useMemo(() => {
    return invoices.map((inv) => {
      const outstanding = Number(inv.total) - Number(inv.allocatedAmount);
      const daysPastDue = getDaysPastDue(inv.dueDate);
      return {
        ...inv,
        outstanding,
        daysPastDue,
      };
    });
  }, [invoices, getDaysPastDue]);

  const { current, bucket_1_14, bucket_15_30, bucket_31_60, bucket_61_plus } = React.useMemo(() => {
    let current = 0;
    let bucket_1_14 = 0;
    let bucket_15_30 = 0;
    let bucket_31_60 = 0;
    let bucket_61_plus = 0;

    invoiceData.forEach((inv) => {
      if (inv.daysPastDue <= 0) {
        current += inv.outstanding;
      } else if (inv.daysPastDue <= 14) {
        bucket_1_14 += inv.outstanding;
      } else if (inv.daysPastDue <= 30) {
        bucket_15_30 += inv.outstanding;
      } else if (inv.daysPastDue <= 60) {
        bucket_31_60 += inv.outstanding;
      } else {
        bucket_61_plus += inv.outstanding;
      }
    });

    return {
      current,
      bucket_1_14,
      bucket_15_30,
      bucket_31_60,
      bucket_61_plus,
    };
  }, [invoiceData]);

  const bucketColors: Record<string, string> = {
    current: 'bg-emerald-500 dark:bg-emerald-600',
    '1_14': 'bg-amber-400 dark:bg-amber-500',
    '15_30': 'bg-orange-500 dark:bg-orange-600',
    '31_60': 'bg-rose-500 dark:bg-rose-600',
    '61_plus': 'bg-red-600 dark:bg-red-700',
  };

  const segments = React.useMemo(() => {
    const buckets = [
      { bucket: 'current', label: 'Current', total: current },
      { bucket: '1_14', label: '1–14 Days', total: bucket_1_14 },
      { bucket: '15_30', label: '15–30 Days', total: bucket_15_30 },
      { bucket: '31_60', label: '31–60 Days', total: bucket_31_60 },
      { bucket: '61_plus', label: '61+ Days', total: bucket_61_plus },
    ];
    return buckets.map((b) => ({
      ...b,
      percent: totalOutstanding > 0 ? (b.total / totalOutstanding) * 100 : 0,
    }));
  }, [current, bucket_1_14, bucket_15_30, bucket_31_60, bucket_61_plus, totalOutstanding]);

  // Handle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter Invoices by Active Bucket
  const filteredInvoices = React.useMemo(() => {
    return invoiceData.filter((inv) => {
      if (!activeBucket) return true;
      if (activeBucket === 'current') return inv.daysPastDue <= 0;
      if (activeBucket === '1_14') return inv.daysPastDue >= 1 && inv.daysPastDue <= 14;
      if (activeBucket === '15_30') return inv.daysPastDue >= 15 && inv.daysPastDue <= 30;
      if (activeBucket === '31_60') return inv.daysPastDue >= 31 && inv.daysPastDue <= 60;
      if (activeBucket === '61_plus') return inv.daysPastDue >= 61;
      return true;
    });
  }, [invoiceData, activeBucket]);

  // Sort Invoices
  const sortedInvoices = React.useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'documentNumber') {
        valA = a.documentNumber.toLowerCase();
        valB = b.documentNumber.toLowerCase();
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredInvoices, sortField, sortOrder]);

  const overdueInvoices = invoiceData.filter(inv => inv.daysPastDue > 0);

  return (
    <div className="space-y-6">
      {/* Client Aging Summary Row */}
      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20 select-none">
                  <TableHead
                    onClick={() => setActiveBucket(null)}
                    className="text-center font-semibold h-10 cursor-pointer hover:text-foreground transition-colors"
                  >
                    Outstanding
                  </TableHead>
                  <TableHead
                    onClick={() => setActiveBucket(activeBucket === 'current' ? null : 'current')}
                    className={`text-center font-semibold h-10 cursor-pointer transition-colors ${activeBucket === 'current' ? 'text-foreground font-bold bg-muted/30' : 'hover:text-foreground'}`}
                  >
                    Current
                  </TableHead>
                  <TableHead
                    onClick={() => setActiveBucket(activeBucket === '1_14' ? null : '1_14')}
                    className={`text-center font-semibold h-10 cursor-pointer transition-colors ${activeBucket === '1_14' ? 'text-foreground font-bold bg-muted/30' : 'hover:text-foreground'}`}
                  >
                    1–14 Days
                  </TableHead>
                  <TableHead
                    onClick={() => setActiveBucket(activeBucket === '15_30' ? null : '15_30')}
                    className={`text-center font-semibold h-10 cursor-pointer transition-colors ${activeBucket === '15_30' ? 'text-foreground font-bold bg-muted/30' : 'hover:text-foreground'}`}
                  >
                    15–30 Days
                  </TableHead>
                  <TableHead
                    onClick={() => setActiveBucket(activeBucket === '31_60' ? null : '31_60')}
                    className={`text-center font-semibold h-10 cursor-pointer transition-colors ${activeBucket === '31_60' ? 'text-foreground font-bold bg-muted/30' : 'hover:text-foreground'}`}
                  >
                    31–60 Days
                  </TableHead>
                  <TableHead
                    onClick={() => setActiveBucket(activeBucket === '61_plus' ? null : '61_plus')}
                    className={`text-center font-semibold h-10 cursor-pointer transition-colors ${activeBucket === '61_plus' ? 'text-foreground font-bold bg-muted/30' : 'hover:text-foreground'}`}
                  >
                    61+ Days
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent text-center font-medium tabular-nums select-none">
                  <TableCell
                    onClick={() => setActiveBucket(null)}
                    className={`font-bold text-base h-12 cursor-pointer transition-colors ${!activeBucket ? 'bg-muted/10' : 'opacity-50 hover:opacity-100'}`}
                  >
                    {formatZAR(totalOutstanding)}
                  </TableCell>
                  <TableCell
                    onClick={() => setActiveBucket(activeBucket === 'current' ? null : 'current')}
                    className={`text-emerald-600 h-12 cursor-pointer transition-colors ${activeBucket === 'current' ? 'bg-emerald-500/10 font-bold' : activeBucket ? 'opacity-50 hover:opacity-100' : ''}`}
                  >
                    {current > 0 ? formatZAR(current) : '—'}
                  </TableCell>
                  <TableCell
                    onClick={() => setActiveBucket(activeBucket === '1_14' ? null : '1_14')}
                    className={`text-amber-600 h-12 cursor-pointer transition-colors ${activeBucket === '1_14' ? 'bg-amber-500/10 font-bold' : activeBucket ? 'opacity-50 hover:opacity-100' : ''}`}
                  >
                    {bucket_1_14 > 0 ? formatZAR(bucket_1_14) : '—'}
                  </TableCell>
                  <TableCell
                    onClick={() => setActiveBucket(activeBucket === '15_30' ? null : '15_30')}
                    className={`text-orange-600 h-12 cursor-pointer transition-colors ${activeBucket === '15_30' ? 'bg-orange-500/10 font-bold' : activeBucket ? 'opacity-50 hover:opacity-100' : ''}`}
                  >
                    {bucket_15_30 > 0 ? formatZAR(bucket_15_30) : '—'}
                  </TableCell>
                  <TableCell
                    onClick={() => setActiveBucket(activeBucket === '31_60' ? null : '31_60')}
                    className={`text-rose-600 h-12 cursor-pointer transition-colors ${activeBucket === '31_60' ? 'bg-rose-500/10 font-bold' : activeBucket ? 'opacity-50 hover:opacity-100' : ''}`}
                  >
                    {bucket_31_60 > 0 ? formatZAR(bucket_31_60) : '—'}
                  </TableCell>
                  <TableCell
                    onClick={() => setActiveBucket(activeBucket === '61_plus' ? null : '61_plus')}
                    className={`text-red-600 font-semibold h-12 cursor-pointer transition-colors ${activeBucket === '61_plus' ? 'bg-red-500/10 font-bold' : activeBucket ? 'opacity-50 hover:opacity-100' : ''}`}
                  >
                    {bucket_61_plus > 0 ? formatZAR(bucket_61_plus) : '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {totalOutstanding > 0 && (
            <div className="h-1.5 w-full flex bg-muted overflow-hidden rounded-b-xl">
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
          )}
        </CardContent>
      </Card>

      {/* Invoice Breakdown List */}
      <Card className="shadow-none">
        <CardHeader className="border-b px-5 py-4 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Unpaid Invoices</CardTitle>
            {activeBucket && (
              <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in duration-200">
                Filtered: {activeBucket === 'current' ? 'Current' : activeBucket === '1_14' ? '1–14 Days' : activeBucket === '15_30' ? '15–30 Days' : activeBucket === '31_60' ? '31–60 Days' : '61+ Days'}
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
          <div className="flex items-center gap-2">
            {overdueInvoices.length > 0 && (
              <SendOverdueRemindersButton
                clientId={client.id}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                    <Mail className="size-3.5" />
                    Send Overdue Reminder
                  </Button>
                }
              />
            )}
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/billing/statements/${client.id}`}>
                <FileText className="size-3.5" />
                View Full Statement
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedInvoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">All caught up! No outstanding invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button onClick={() => handleSort('invoiceDate')} className="group flex items-center hover:text-foreground font-semibold">
                        Invoice Date
                        <SortIcon field="invoiceDate" currentField={sortField} order={sortOrder} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort('documentNumber')} className="group flex items-center hover:text-foreground font-semibold">
                        Invoice #
                        <SortIcon field="documentNumber" currentField={sortField} order={sortOrder} />
                      </button>
                    </TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>
                      <button onClick={() => handleSort('dueDate')} className="group flex items-center hover:text-foreground font-semibold">
                        Due Date
                        <SortIcon field="dueDate" currentField={sortField} order={sortOrder} />
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <button onClick={() => handleSort('daysPastDue')} className="group mx-auto flex items-center hover:text-foreground font-semibold">
                        Days Overdue
                        <SortIcon field="daysPastDue" currentField={sortField} order={sortOrder} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('total')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        Total Amount
                        <SortIcon field="total" currentField={sortField} order={sortOrder} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort('outstanding')} className="group ml-auto flex items-center hover:text-foreground font-semibold">
                        Unpaid Balance
                        <SortIcon field="outstanding" currentField={sortField} order={sortOrder} />
                      </button>
                    </TableHead>
                    <TableHead className="w-[80px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.map((inv) => {
                    const isOverdue = inv.daysPastDue > 0;
                    const isCritical = inv.daysPastDue > 60;
                    const isWarning = inv.daysPastDue > 30;

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="tabular-nums">
                          {fmtDate(inv.invoiceDate)}
                        </TableCell>
                        <TableCell className="font-mono text-[13px] font-medium text-primary hover:underline">
                          <Link href={`/billing/invoices/${inv.id}`}>
                            {inv.documentNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {inv.reference || '—'}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {fmtDate(inv.dueDate)}
                        </TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">
                          {isOverdue ? (
                            <span className={isCritical ? 'text-red-600 font-bold' : isWarning ? 'text-rose-500' : 'text-amber-500'}>
                              {inv.daysPastDue} days
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-normal">Current</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatZAR(Number(inv.total))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">
                          {Number(inv.allocatedAmount) > 0 ? formatZAR(Number(inv.allocatedAmount)) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-red-600">
                          {formatZAR(inv.outstanding)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button asChild size="icon" variant="ghost" className="size-8" title="View Invoice Detail">
                              <Link href={`/billing/invoices/${inv.id}`}>
                                <FileText className="size-4 text-muted-foreground" />
                              </Link>
                            </Button>
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
