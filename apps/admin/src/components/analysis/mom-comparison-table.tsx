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
import { TrendingUp, TrendingDown, Minus, ArrowDownLeft, Sparkles } from 'lucide-react';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';

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
      {/* YTD Totals & Run-Rate Forecast Header Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <BillingKpiCard
          title="YTD Cash Income"
          value={formatZAR(totalReceived)}
          subtitle={<span>Avg {formatZAR(avgReceived)}/mo</span>}
          icon={ArrowDownLeft}
          variant="emerald"
          tooltip="Total cash received from clients in this financial year"
        />

        <BillingKpiCard
          title="YTD Expenses"
          value={formatZAR(totalExpenses)}
          subtitle={<span>Avg {formatZAR(avgExpenses)}/mo</span>}
          icon={TrendingDown}
          variant="rose"
          tooltip="Total operating expenses recorded in this financial year"
        />

        <BillingKpiCard
          title="YTD Net Profit"
          value={formatZAR(totalProfit)}
          badge={`${totalReceived > 0 ? ((totalProfit / totalReceived) * 100).toFixed(1) : '0'}% margin`}
          subtitle={<span>Avg {formatZAR(avgProfit)}/mo</span>}
          icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
          variant={totalProfit >= 0 ? 'emerald' : 'rose'}
          tooltip="Net cash operating profit (Income − Expenses)"
        />

        <BillingKpiCard
          title={`FY ${year} Run-Rate`}
          value={formatZAR(forecast)}
          badge="Projection"
          subtitle={<span>Estimated annual revenue run-rate</span>}
          icon={Sparkles}
          variant="violet"
          tooltip="Projected full-year revenue based on current average monthly run-rate"
        />
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
