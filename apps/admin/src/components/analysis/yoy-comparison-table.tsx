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
import { cn } from '@/lib/utils';

interface YoYComparisonTableProps {
  data: {
    year: number;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalInvoiced: number;
    averageInvoice: number;
    averageTransaction: number;
    quotesIssued: number;
    quoteConversionRate: number;
  }[];
  className?: string;
}

export function YoYComparisonTable({ data, className }: YoYComparisonTableProps) {
  // Assuming data is sorted with current year first
  const current = data[0];
  const prior = data[1];
  const prior2 = data[2];

  if (!current) return null;

  const rows = [
    {
      label: 'Total Revenue',
      key: 'totalInvoiced',
      isCurrency: true,
      colorClass: 'text-blue-600 dark:text-blue-400 font-medium',
    },
    {
      label: 'Total Income',
      key: 'totalIncome',
      isCurrency: true,
      colorClass: 'text-emerald-600 dark:text-emerald-500 font-medium',
    },
    {
      label: 'Total Expenses',
      key: 'totalExpenses',
      isCurrency: true,
      colorClass: 'text-muted-foreground',
    },
    {
      label: 'Net Profit',
      key: 'netProfit',
      isCurrency: true,
      colorClass: 'text-emerald-600 dark:text-emerald-500 font-bold',
    },
  ];

  const getTrendIcon = (currentVal: number, priorVal: number) => {
    if (currentVal > priorVal) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (currentVal < priorVal) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-blue-500" />;
  };

  const renderCell = (row: (typeof rows)[number], record: (typeof data)[number]) => {
    const value = record[row.key as keyof typeof record];
    if (row.isCurrency) return formatZAR(value as number);
    return value;
  };

  return (
    <div className={cn('rounded-xl border shadow-sm overflow-hidden bg-card', className)}>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground py-4">Metric</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">
              FY {current.year}
            </TableHead>
            {prior && (
              <TableHead className="text-right font-semibold text-foreground py-4">
                FY {prior.year}
              </TableHead>
            )}
            {prior2 && (
              <TableHead className="text-right font-semibold text-foreground py-4">
                FY {prior2.year}
              </TableHead>
            )}
            <TableHead className="text-right font-semibold text-foreground py-4">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.label}
              className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            >
              <TableCell className="font-medium py-4 text-foreground">{row.label}</TableCell>
              <TableCell className={cn('text-right py-4 tabular-nums', row.colorClass)}>
                {renderCell(row, current)}
              </TableCell>
              {prior && (
                <TableCell className="text-right py-4 text-muted-foreground tabular-nums">
                  {renderCell(row, prior)}
                </TableCell>
              )}
              {prior2 && (
                <TableCell className="text-right py-4 text-muted-foreground tabular-nums">
                  {renderCell(row, prior2)}
                </TableCell>
              )}
              <TableCell className="py-4">
                <div className="flex items-center justify-end">
                  {prior ? getTrendIcon(Number(current[row.key as keyof typeof current]), Number(prior[row.key as keyof typeof prior])) : <span className="text-muted-foreground">—</span>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
