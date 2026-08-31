import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatZAR } from '@/lib/format';

export type DivisionMetric = { label: string; value: number; colorClass: string };

export type DivisionBreakdownRow = {
  divisionId?: string;
  divisionName: string;
  metrics: DivisionMetric[];
  pct: number;
};

type DivisionBreakdownCardProps = {
  title: string;
  totals: DivisionMetric[];
  rows: DivisionBreakdownRow[];
  emptyMessage: string;
  dotColorFor?: (divisionName: string, index: number) => string;
};

export function DivisionBreakdownCard({
  title,
  totals,
  rows,
  emptyMessage,
  dotColorFor = () => 'bg-muted-foreground/40',
}: DivisionBreakdownCardProps) {
  if (rows.length === 0) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-card-foreground text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground/50 text-xs">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CardTitle className="text-card-foreground text-sm font-medium">{title}</CardTitle>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums font-medium">
            {totals.map((t, i) => (
              <span key={t.label} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground/40">|</span>}
                <span className="text-muted-foreground/70 font-normal">{t.label}</span>
                <span className={t.colorClass}>{formatZAR(t.value)}</span>
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rows.map((row, i) => {
            const dotColor = dotColorFor(row.divisionName, i);

            const content = (
              <div
                className={`rounded-lg bg-muted/30 border border-border/50 p-3 transition-all duration-200 ${
                  row.divisionId
                    ? 'group-hover:scale-[1.01] group-hover:bg-muted/50 group-hover:border-primary/20 group-hover:shadow-sm'
                    : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                  <span
                    className={`text-xs text-muted-foreground truncate ${
                      row.divisionId ? 'group-hover:text-primary transition-colors' : ''
                    }`}
                  >
                    {row.divisionName}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {row.metrics.map((m) => (
                    <div key={m.label} className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                        {m.label}
                      </span>
                      <span className={`text-sm font-semibold tabular-nums ${m.colorClass}`}>
                        {formatZAR(m.value)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground/60 text-[10px] mt-1.5">{row.pct}% of total</p>
              </div>
            );

            if (row.divisionId) {
              return (
                <Link
                  key={row.divisionName}
                  href={`/relationships/divisions/${row.divisionId}`}
                  className="block group"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={row.divisionName} className="block">
                {content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
