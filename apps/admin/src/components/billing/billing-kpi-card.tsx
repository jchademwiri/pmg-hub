import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BillingKpiVariant =
  'blue' | 'emerald' | 'amber' | 'violet' | 'red' | 'zinc' | 'primary';

export interface BillingKpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon: LucideIcon;
  variant?: BillingKpiVariant;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  activeLabel?: string;
  progress?: {
    value: number;
    colorClass?: string;
  };
  className?: string;
  valueClassName?: string;
  tooltip?: string;
}

const VARIANT_STYLES: Record<
  BillingKpiVariant,
  {
    iconBg: string;
    iconColor: string;
    activeRing: string;
    activeBorder: string;
    progressBar: string;
  }
> = {
  blue: {
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    activeRing: 'ring-blue-500/30',
    activeBorder: 'border-blue-500/50',
    progressBar: 'bg-blue-500',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    activeRing: 'ring-emerald-500/30',
    activeBorder: 'border-emerald-500/50',
    progressBar: 'bg-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    activeRing: 'ring-amber-500/30',
    activeBorder: 'border-amber-500/50',
    progressBar: 'bg-amber-500',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    activeRing: 'ring-violet-500/30',
    activeBorder: 'border-violet-500/50',
    progressBar: 'bg-violet-500',
  },
  red: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-600 dark:text-red-400',
    activeRing: 'ring-red-500/30',
    activeBorder: 'border-red-500/50',
    progressBar: 'bg-red-500',
  },
  zinc: {
    iconBg: 'bg-zinc-500/10',
    iconColor: 'text-zinc-600 dark:text-zinc-400',
    activeRing: 'ring-zinc-500/30',
    activeBorder: 'border-zinc-500/50',
    progressBar: 'bg-zinc-500',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    activeRing: 'ring-primary/30',
    activeBorder: 'border-primary/50',
    progressBar: 'bg-primary',
  },
};

export function BillingKpiCard({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  variant = 'primary',
  href,
  onClick,
  isActive = false,
  activeLabel = 'Active filter',
  progress,
  className,
  valueClassName,
  tooltip,
}: BillingKpiCardProps) {
  const vStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  const isInteractive = Boolean(href || onClick);

  const cardContent = (
    <div
      className={cn(
        'group relative flex h-full min-h-[118px] md:min-h-[128px] flex-col justify-between overflow-hidden rounded-xl border bg-card p-4 md:p-5 shadow-sm transition-all duration-200',
        isInteractive &&
          'cursor-pointer hover:border-border/80 hover:shadow-md hover:translate-y-[-1px]',
        isActive &&
          cn('ring-2 ring-offset-1 ring-offset-background', vStyle.activeRing, vStyle.activeBorder),
        className,
      )}
      title={tooltip}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-muted/80 border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 shrink-0 tabular-nums">
              {badge}
            </span>
          )}
          {isActive && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary shrink-0">
              {activeLabel}
            </span>
          )}
        </div>
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
            vStyle.iconBg,
            vStyle.iconColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* Main value & bottom micro-metrics */}
      <div className="mt-auto pt-2 md:pt-3">
        <div
          className={cn(
            'text-lg sm:text-xl md:text-2xl font-bold tracking-tight tabular-nums text-foreground truncate',
            valueClassName,
          )}
        >
          {value}
        </div>

        {/* Progress bar if supplied */}
        {progress !== undefined && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progress.colorClass ?? vStyle.progressBar,
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
            />
          </div>
        )}

        {/* Subtitle / micro metrics */}
        {subtitle && (
          <div className="mt-1.5 text-[11px] md:text-xs text-muted-foreground line-clamp-1 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        {cardContent}
      </button>
    );
  }

  return cardContent;
}
