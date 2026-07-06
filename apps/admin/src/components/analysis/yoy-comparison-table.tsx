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
    { label: 'Total Income', key: 'totalIncome', isCurrency: true },
    { label: 'Total Expenses', key: 'totalExpenses', isCurrency: true },
    { label: 'Net Profit Pool', key: 'netProfit', isCurrency: true },
    { label: 'Total Invoiced', key: 'totalInvoiced', isCurrency: true },
    { label: 'Average Invoice', key: 'averageInvoice', isCurrency: true },
    { label: 'Average Transaction', key: 'averageTransaction', isCurrency: true },
    { label: 'Quotes Issued', key: 'quotesIssued', isCurrency: false },
    { label: 'Quote Conversion Rate', key: 'quoteConversionRate', isCurrency: false, isPercent: true },
  ];

  const getTrendIcon = (currentVal: number, priorVal: number) => {
    if (currentVal > priorVal) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (currentVal < priorVal) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">FY {current.year}</TableHead>
            {prior && <TableHead className="text-right">FY {prior.year}</TableHead>}
            {prior2 && <TableHead className="text-right">FY {prior2.year}</TableHead>}
            <TableHead className="text-right">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-medium">{row.label}</TableCell>
              
              <TableCell className="text-right">
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

              <TableCell className="text-right flex justify-end items-center h-full pt-4">
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
