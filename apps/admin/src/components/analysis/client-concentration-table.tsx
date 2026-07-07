import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR } from '@/lib/format';
import { AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ClientConcentrationTableProps {
  data: {
    id: string;
    name: string;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    percentage: number;
  }[];
}

export function ClientConcentrationTable({ data }: ClientConcentrationTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-sm">
        No client data available for the selected year.
      </div>
    );
  }

  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground py-4">Client</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Total Income</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Total Expenses</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Net Profit</TableHead>
            <TableHead className="text-right font-semibold text-foreground py-4">Concentration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((client) => {
            const isHighRisk = client.percentage > 25;
            return (
              <TableRow 
                key={client.id}
                className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
              >
                <TableCell className="font-medium py-4">
                  <div className="flex items-center gap-2">
                    {client.name}
                    {isHighRisk && (
                      <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-500" title="High concentration risk">
                        <AlertCircle className="h-3 w-3" />
                        <span>High Risk</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right py-4 font-medium text-emerald-600 dark:text-emerald-500">{formatZAR(client.totalIncome)}</TableCell>
                <TableCell className="text-right text-muted-foreground py-4">{formatZAR(client.totalExpenses)}</TableCell>
                <TableCell className={`text-right font-medium py-4 ${client.netProfit < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-500'}`}>
                  {formatZAR(client.netProfit)}
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center justify-end gap-3">
                    <span className="font-medium text-sm w-12 text-right">
                      {client.percentage.toFixed(1)}%
                    </span>
                    <Progress 
                      value={client.percentage} 
                      className={`h-2 w-24 ${isHighRisk ? '[&>div]:bg-amber-500' : ''}`}
                    />
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
