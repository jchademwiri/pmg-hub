'use client';

import * as React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Formats a balance value with exactly two decimal places.
 * Extracted as a named export so it can be unit/property-tested without
 * mounting the chart.
 */
export function balanceFormatter(value: number): string {
  return value.toFixed(2);
}

interface BalancePoint {
  date: string;
  balance: number;
}

interface LunoChartProps {
  accountId: string;
}

type ChartState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; data: BalancePoint[] };

const CHART_HEIGHT = '400px';

function Centered({ message }: { message: string }) {
  return (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-dashed border-border/70">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const balance = payload[0]?.value;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">
        Balance:{' '}
        <span className="text-foreground font-medium">
          {balance != null ? balanceFormatter(Number(balance)) : '—'}
        </span>
      </p>
    </div>
  );
}

export function LunoChart({ accountId }: LunoChartProps) {
  const [state, setState] = React.useState<ChartState>(() =>
    accountId ? { status: 'loading' } : { status: 'idle' },
  );

  // Reset to 'loading' synchronously during render when accountId changes -
  // React's recommended "adjust state when a prop changes" pattern - rather
  // than via setState inside the effect below, which only needs to own the
  // actual async fetch now.
  const [prevAccountId, setPrevAccountId] = React.useState(accountId);
  if (accountId && accountId !== prevAccountId) {
    setPrevAccountId(accountId);
    setState({ status: 'loading' });
  }

  React.useEffect(() => {
    // No setState here: the "no account" case is rendered directly from the
    // `accountId` prop below, not from `state` - so there is nothing to
    // synchronize when it's absent.
    if (!accountId) {
      return;
    }

    // Guards every setState below, not just the abort path: aborting a fetch
    // that has already resolved (its promise settled just as this account
    // changed again) is a no-op, so the abort signal alone doesn't stop a
    // stale response from landing after a newer request. Without this flag a
    // slow response for a previous account could overwrite the current
    // account's chart with the wrong data.
    let isCurrent = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    (async () => {
      try {
        const res = await fetch(`/api/luno/history/${accountId}`, { signal: controller.signal });
        const body = (await res.json().catch(() => null)) as {
          data?: BalancePoint[];
          error?: string;
        } | null;

        if (!isCurrent) return;

        if (!res.ok) {
          setState({ status: 'error', message: body?.error ?? 'Failed to load portfolio data.' });
          return;
        }

        const data = body?.data ?? [];
        if (data.length === 0) {
          setState({ status: 'empty' });
          return;
        }

        setState({ status: 'ready', data });
      } catch {
        // Timeout (abort) and network failures share the same safe fallback.
        if (isCurrent) {
          setState({ status: 'error', message: 'Failed to load portfolio data.' });
        }
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [accountId]);

  if (!accountId) {
    return <Centered message="No account selected." />;
  }

  // Unreachable past the accountId guard above (the effect never sets
  // 'idle' now), but keeping the branch is cheap correctness insurance if
  // that ever changes.
  if (state.status === 'idle' || state.status === 'loading') {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (state.status === 'error') {
    return <Centered message={state.message} />;
  }

  if (state.status === 'empty') {
    return <Centered message="No transaction history available." />;
  }

  const lastPoint = state.data[state.data.length - 1];

  return (
    <div className="h-[400px] w-full" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={state.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.6}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={balanceFormatter}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)' }} />
          <Line
            type="stepAfter"
            dataKey="balance"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          {lastPoint && (
            <ReferenceDot
              x={lastPoint.date}
              y={lastPoint.balance}
              r={4}
              fill="var(--chart-1)"
              stroke="none"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
