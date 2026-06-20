'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZAR, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ClientMetricStripProps {
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueBalance: number;
  healthScore: string;          // 'Excellent' | 'Good' | 'At Risk' | 'Critical'
  avgDaysToPay: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  onFilterChange?: (filter: 'all' | 'paid' | 'outstanding' | 'overdue') => void;
  activeFilter?: 'all' | 'paid' | 'outstanding' | 'overdue';
  agingBuckets?: {
    current: number;
    bucket_1_14: number;
    bucket_15_30: number;
    bucket_31_60: number;
    bucket_61_plus: number;
  };
}

export function ClientMetricStrip({
  totalInvoiced,
  totalPaid,
  outstandingBalance,
  overdueBalance,
  healthScore,
  avgDaysToPay,
  lastPaymentDate,
  lastPaymentAmount,
  onFilterChange,
  activeFilter = 'all',
  agingBuckets,
}: ClientMetricStripProps) {
  const tiles = [
    {
      key: 'all' as const,
      label: 'Total Invoiced',
      value: formatZAR(totalInvoiced),
      activeClass: '',
      valueClass: '',
    },
    {
      key: 'paid' as const,
      label: 'Total Paid',
      value: formatZAR(totalPaid),
      activeClass: 'ring-1 ring-green-500/30',
      valueClass: 'text-green-600 dark:text-green-400',
    },
    {
      key: 'outstanding' as const,
      label: 'Outstanding',
      value: formatZAR(outstandingBalance),
      activeClass: 'ring-1 ring-amber-500/30',
      valueClass: outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : '',
    },
    {
      key: 'overdue' as const,
      label: 'Overdue',
      value: formatZAR(overdueBalance),
      activeClass: 'ring-1 ring-red-500/30',
      valueClass: overdueBalance > 0 ? 'text-red-600 dark:text-red-400' : '',
    },
  ];

  const healthBadgeClass = {
    'Excellent': 'bg-green-500 text-white hover:bg-green-500',
    'Good': 'bg-blue-500 text-white hover:bg-blue-500',
    'At Risk': 'bg-orange-500 text-white hover:bg-orange-500',
    'Critical': 'bg-red-500 text-white hover:bg-red-500',
  }[healthScore] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="flex flex-col gap-3">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Card
            key={tile.key}
            onClick={() => onFilterChange?.(tile.key)}
            className={cn(
              'shadow-sm border-muted-foreground/10 bg-card transition-all duration-150',
              onFilterChange && 'cursor-pointer hover:border-muted-foreground/30',
              activeFilter === tile.key && tile.activeClass,
            )}
          >
            <CardHeader className="p-3 pb-1">
              <CardDescription className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {tile.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <span className={cn('text-base font-bold tabular-nums', tile.valueClass)}>
                {tile.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground px-0.5">
        <span className="flex items-center gap-1.5">
          Health:
          <Badge className={cn('text-[10px] px-1.5 py-0 font-semibold', healthBadgeClass)}>
            {healthScore}
          </Badge>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          Avg Pay: <span className="font-semibold text-foreground">
            {avgDaysToPay > 0 ? `${avgDaysToPay} days` : 'Immediate'}
          </span>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          Last Payment:{' '}
          <span className="font-semibold text-foreground">
            {lastPaymentDate
              ? `${fmtDate(lastPaymentDate)}${lastPaymentAmount ? ` · ${formatZAR(lastPaymentAmount)}` : ''}`
              : 'None recorded'}
          </span>
        </span>
      </div>

      {/* Visual Buckets Card if outstanding/overdue exists */}
      {(outstandingBalance > 0 || overdueBalance > 0) && agingBuckets && (
        <Card className="shadow-none bg-muted/20 border border-muted-foreground/10 p-3.5 mt-1.5 rounded-xl">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Accounts Receivable Ageing Breakdown
              </span>
            </div>
            
            {/* Visual proportions bar */}
            <div className="h-1.5 w-full flex bg-muted rounded-full overflow-hidden">
              {(() => {
                const total = outstandingBalance + overdueBalance;
                const segments = [
                  { bucket: 'current', label: 'Current', total: agingBuckets.current, colorClass: 'bg-emerald-500' },
                  { bucket: '1_14', label: '1–14 Days', total: agingBuckets.bucket_1_14, colorClass: 'bg-amber-400' },
                  { bucket: '15_30', label: '15–30 Days', total: agingBuckets.bucket_15_30, colorClass: 'bg-orange-500' },
                  { bucket: '31_60', label: '31–60 Days', total: agingBuckets.bucket_31_60, colorClass: 'bg-rose-500' },
                  { bucket: '61_plus', label: '61+ Days', total: agingBuckets.bucket_61_plus, colorClass: 'bg-red-600' },
                ];
                return segments.map((seg) => {
                  const percent = total > 0 ? (seg.total / total) * 100 : 0;
                  if (percent === 0) return null;
                  return (
                    <div
                      key={seg.bucket}
                      style={{ width: `${percent}%` }}
                      className={`${seg.colorClass} transition-all duration-300`}
                      title={`${seg.label}: ${formatZAR(seg.total)} (${Math.round(percent)}%)`}
                    />
                  );
                });
              })()}
            </div>

            {/* Legend with values */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
              {[
                { label: 'Current', total: agingBuckets.current, colorClass: 'text-emerald-600 font-semibold' },
                { label: '1–14 Days', total: agingBuckets.bucket_1_14, colorClass: 'text-amber-600 font-semibold' },
                { label: '15–30 Days', total: agingBuckets.bucket_15_30, colorClass: 'text-orange-600 font-semibold' },
                { label: '31–60 Days', total: agingBuckets.bucket_31_60, colorClass: 'text-rose-600 font-semibold' },
                { label: '61+ Days', total: agingBuckets.bucket_61_plus, colorClass: 'text-red-600 font-semibold' },
              ].map((seg, idx) => (
                <div key={idx} className="flex justify-between items-center sm:block">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{seg.label}</span>
                  <p className={cn('tabular-nums sm:mt-0.5', seg.total > 0 ? seg.colorClass : 'text-muted-foreground/35')}>
                    {seg.total > 0 ? formatZAR(seg.total) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
