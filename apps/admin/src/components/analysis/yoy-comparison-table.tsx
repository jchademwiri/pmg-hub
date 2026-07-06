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
}

export function YoYComparisonTable({ data }: YoYComparisonTableProps) {
  // Assuming data is sorted with current year first
  const current = data[0];
  const prior = data[1];
  const prior2 = data[2];

  if (!current) return null;

  const rows = [
    { label: 'Total Income', key: 'totalIncome', isCurrency: true, colorClass: 'text-emerald-600 dark:text-emerald-500 font-medium' },
    { label: 'Total Expenses', key: 'totalExpenses', isCurrency: true, colorClass: 'text-muted-foreground' },
    { label: 'Net Profit Pool', key: 'netProfit', isCurrency: true, colorClass: 'text-emerald-600 dark:text-emerald-500 font-bold' },
    { label: 'Total Invoiced', key: 'totalInvoiced', isCurrency: true, colorClass: 'text-emerald-600 dark:text-emerald-500 font-medium' },
    { label: 'Average Invoice', key: 'averageInvoice', isCurrency: true, colorClass: 'text-emerald-600 dark:text-emerald-500 font-medium' },
    { label: 'Average Transaction', key: 'averageTransaction', isCurrency: true, colorClass: 'text-emerald-600 dark:text-emerald-500 font-medium' },
    { label: 'Quotes Issued', key: 'quotesIssued', isCurrency: false },
    { label: 'Quote Conversion Rate', key: 'quoteConversionRate', isCurrency: false, isPercent: true },
  ];

  const getTrendIcon = (currentVal: number, priorVal: number) => {
    if (currentVal > priorVal) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (currentVal < priorVal) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground py-4">Metric</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">FY {current.year}</TableHead>
            {prior && <TableHead className="text-right font-semibold text-foreground py-4">FY {prior.year}</TableHead>}
            {prior2 && <TableHead className="text-right font-semibold text-foreground py-4">FY {prior2.year}</TableHead>}
            <TableHead className="text-right font-semibold text-foreground py-4">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow 
              key={row.key}
              className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            >
              <TableCell className="font-medium py-4">{row.label}</TableCell>
              
              <TableCell className={`text-right ${row.colorClass || ''}`}>
                {row.isCurrency 
                  ? formatZAR(current[row.key as keyof typeof current])
                  : row.isPercent 
                    ? `${(current[row.key as keyof typeof current] as number).toFixed(1)}%`
                    : current[row.key as keyof typeof current]
                }
              </TableCell>

              {prior && (
                <TableCell className="text-right text-muted-foreground">
                  {row.isCurrency 
                    ? formatZAR(prior[row.key as keyof typeof prior])
                    : row.isPercent 
                      ? `${(prior[row.key as keyof typeof prior] as number).toFixed(1)}%`
                      : prior[row.key as keyof typeof prior]
                  }
                </TableCell>
              )}

              {prior2 && (
                <TableCell className="text-right text-muted-foreground">
                  {row.isCurrency 
                    ? formatZAR(prior2[row.key as keyof typeof prior2])
                    : row.isPercent 
                      ? `${(prior2[row.key as keyof typeof prior2] as number).toFixed(1)}%`
                      : prior2[row.key as keyof typeof prior2]
                  }
                </TableCell>
              )}

              <TableCell className="text-right flex justify-end items-center h-full py-4">
                {prior ? getTrendIcon(
                  current[row.key as keyof typeof current] as number, 
                  prior[row.key as keyof typeof prior] as number
                ) : <Minus className="h-4 w-4 text-muted-foreground" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
