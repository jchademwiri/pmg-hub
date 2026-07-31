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
  momGrowth: number;
}

interface MoMComparisonTableProps {
  data: MonthFinancialRow[];
  year: number;
  className?: string;
}

export function MoMComparisonTable({ data, year, className }: MoMComparisonTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex h-[300px] items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-sm", className)}>
        No monthly financial data available for FY {year}.
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border shadow-sm overflow-hidden bg-card", className)}>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground py-4">Month</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Invoiced</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Cash Income</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Expenses</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Net Profit</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">MoM Growth</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const isPositiveProfit = row.netProfit >= 0;
            const isPositiveGrowth = row.momGrowth > 0;
            const isNegativeGrowth = row.momGrowth < 0;

            return (
              <TableRow 
                key={row.period}
                className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
              >
                <TableCell className="font-medium py-4">
                  {row.monthLabel}
                </TableCell>
                
                <TableCell className="text-right py-4 font-medium text-blue-600 dark:text-blue-400">
                  {formatZAR(row.invoiced)}
                </TableCell>
                
                <TableCell className="text-right py-4 font-medium text-emerald-600 dark:text-emerald-500">
                  {formatZAR(row.received)}
                </TableCell>
                
                <TableCell className="text-right py-4 text-muted-foreground">
                  {formatZAR(row.expenses)}
                </TableCell>
                
                <TableCell className={`text-right font-semibold py-4 ${isPositiveProfit ? 'text-emerald-600 dark:text-emerald-500' : 'text-destructive'}`}>
                  {formatZAR(row.netProfit)}
                </TableCell>
                
                <TableCell className="py-4">
                  <div className="flex items-center justify-end gap-1.5 font-medium text-sm">
                    {isPositiveGrowth && (
                      <>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-500">+{row.momGrowth.toFixed(1)}%</span>
                      </>
                    )}
                    {isNegativeGrowth && (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">{row.momGrowth.toFixed(1)}%</span>
                      </>
                    )}
                    {!isPositiveGrowth && !isNegativeGrowth && (
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
  );
}
