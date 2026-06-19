'use client';

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { formatZAR } from '@/lib/format';
import { ShieldCheck, Clock, AlertTriangle, AlertCircle, LucideIcon } from 'lucide-react';
import type { AgingRow } from '@pmg/db';

interface AgingReportGridProps {
  data: AgingRow[];
}

interface BucketTheme {
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: LucideIcon;
}

const BUCKET_THEMES: Record<string, BucketTheme> = {
  current: {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/5',
    borderClass: 'border-emerald-500/20',
    icon: ShieldCheck,
  },
  '1_14': {
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/20',
    icon: Clock,
  },
  '15_30': {
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-500/5',
    borderClass: 'border-orange-500/20',
    icon: Clock,
  },
  '31_60': {
    colorClass: 'text-rose-500 dark:text-rose-400',
    bgClass: 'bg-rose-500/5',
    borderClass: 'border-rose-500/20',
    icon: AlertTriangle,
  },
  '61_plus': {
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/5',
    borderClass: 'border-red-500/20',
    icon: AlertCircle,
  },
};

export function AgingReportGrid({ data = [] }: AgingReportGridProps) {
  const totalOutstanding = data.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Accounts Receivable Ageing
        </h3>
        <span className="text-xs text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full font-medium">
          Total Expected: <span className="font-bold text-emerald-600">{formatZAR(totalOutstanding)}</span>
        </span>
      </div>

      {/* Grid of 5 Buckets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.map((r) => {
          const theme = BUCKET_THEMES[r.bucket] || BUCKET_THEMES.current;
          const Icon = theme.icon;
          const hasTotal = r.total > 0;

          return (
            <Card
              key={r.bucket}
              size="sm"
              className={`rounded-xl border transition-all duration-200 hover:shadow-sm ${theme.borderClass} ${theme.bgClass} shadow-none`}
            >
              <CardHeader className="pb-1.5 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.colorClass} opacity-85`}>
                    {r.label}
                  </span>
                  <Icon className={`size-3.5 ${theme.colorClass}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-4 pt-1 px-4 space-y-1">
                <p className={`text-2xl font-bold tabular-nums tracking-tight ${hasTotal ? theme.colorClass : 'text-muted-foreground/40'}`}>
                  {formatZAR(r.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className={hasTotal ? 'font-medium text-foreground/75' : 'opacity-55'}>
                    {r.count} {r.count === 1 ? 'invoice' : 'invoices'}
                  </span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
