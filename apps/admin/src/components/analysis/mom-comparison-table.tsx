import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR } from '@/lib/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MonthFinancialRow {
  period: string;
  monthLabel: string;
  invoiced: number;
  received: number;
  expenses: number;
  netProfit: number;
  momGrowth: number | null;
}

interface MoMComparisonTableProps {
  data: MonthFinancialRow[];
  year: number;
  className?: string;
}

export function MoMComparisonTable({ data, year, className }: MoMComparisonTableProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          'flex h-[300px] items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-sm',
          className,
        )}
      >
        No monthly financial data available for FY {year}.
      </div>
    );
  }

  const activeMonths = Math.max(1, data.filter((r) => r.received > 0 || r.invoiced > 0).length);
  const totalReceived = data.reduce((s, r) => s + r.received, 0);
  const totalExpenses = data.reduce((s, r) => s + r.expenses, 0);
  const totalProfit = data.reduce((s, r) => s + r.netProfit, 0);
  const avgReceived = totalReceived / activeMonths;
  const avgExpenses = totalExpenses / activeMonths;
  const avgProfit = totalProfit / activeMonths;
  const remainingMonths = Math.max(0, 12 - activeMonths);
  const forecast = totalReceived + avgReceived * remainingMonths;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* YTD Totals & Run-Rate Forecast Header Cards (at the top) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            YTD Cash Income
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {formatZAR(totalReceived)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Avg {formatZAR(avgReceived)}/mo
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            YTD Expenses
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
            {formatZAR(totalExpenses)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Avg {formatZAR(avgExpenses)}/mo
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            YTD Net Profit
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
            {formatZAR(totalProfit)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Avg {formatZAR(avgProfit)}/mo
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Projected FY {year} Forecast
          </p>
          <p className="text-2xl font-bold text-primary tabular-nums mt-1">
            {formatZAR(forecast)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Estimated annual gross revenue run-rate
          </p>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-foreground py-4">Month</TableHead>
              <TableHead className="text-right font-semibold text-foreground py-4">
                Invoiced
              </TableHead>
              <TableHead className="text-right font-semibold text-foreground py-4">
                Cash Income
              </TableHead>
              <TableHead className="text-right font-semibold text-foreground py-4">
                Expenses
              </TableHead>
              <TableHead className="text-right font-semibold text-foreground py-4">
                Net Profit
              </TableHead>
              <TableHead className="text-right font-semibold text-foreground py-4">
                MoM Growth
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const isPositiveProfit = row.netProfit >= 0;
              const hasGrowth = row.momGrowth !== null;
              const isPositiveGrowth = hasGrowth && row.momGrowth! > 0;
              const isNegativeGrowth = hasGrowth && row.momGrowth! < 0;

              return (
                <TableRow
                  key={row.period}
                  className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <TableCell className="font-medium py-4">{row.monthLabel}</TableCell>

                  <TableCell className="text-right py-4 font-medium text-blue-600 dark:text-blue-400">
                    {formatZAR(row.invoiced)}
                  </TableCell>

                  <TableCell className="text-right py-4 font-medium text-emerald-600 dark:text-emerald-500">
                    {formatZAR(row.received)}
                  </TableCell>

                  <TableCell className="text-right py-4 text-muted-foreground">
                    {formatZAR(row.expenses)}
                  </TableCell>

                  <TableCell
                    className={`text-right font-semibold py-4 ${isPositiveProfit ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}`}
                  >
                    {formatZAR(row.netProfit)}
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center justify-end gap-1.5 font-medium text-sm">
                      {row.momGrowth === null && <span className="text-muted-foreground">—</span>}
                      {isPositiveGrowth && (
                        <>
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-500">
                            +{row.momGrowth!.toFixed(1)}%
                          </span>
                        </>
                      )}
                      {isNegativeGrowth && (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-red-500">{row.momGrowth!.toFixed(1)}%</span>
                        </>
                      )}
                      {hasGrowth && !isPositiveGrowth && !isNegativeGrowth && (
                        <>
                          <Minus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">0.0%</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
