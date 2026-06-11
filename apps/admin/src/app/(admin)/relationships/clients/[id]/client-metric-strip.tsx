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
    </div>
  );
}
