'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatZAR } from '@/lib/format';

interface DivisionPerformanceChartProps {
  data: {
    id: string;
    name: string;
    totalIncome: number;
    totalQuoteValue: number;
    quoteCount: number;
    wonCount: number;
    conversionRate: number;
  }[];
}

export function DivisionPerformanceChart({ data }: DivisionPerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
        <XAxis 
          dataKey="name" 
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          tickFormatter={(value) => `R${value / 1000}k`}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          formatter={(value: any) => formatZAR(Number(value) || 0)}
          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
        />
        <Legend verticalAlign="top" height={36} />
        
        <Bar 
          name="Actual Income" 
          dataKey="totalIncome" 
          fill="hsl(var(--primary))" 
          radius={[4, 4, 0, 0]} 
        />
        <Bar 
          name="Total Quote Value" 
          dataKey="totalQuoteValue" 
          fill="hsl(var(--muted))" 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
