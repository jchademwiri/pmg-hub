'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
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
    <div className="w-full h-[400px] min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 30,
            bottom: 25,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
          <XAxis 
            dataKey="name" 
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          >
            <Label value="Division" offset={-15} position="insideBottom" fill="hsl(var(--muted-foreground))" style={{ fontSize: 12, fontWeight: 500 }} />
          </XAxis>
          <YAxis 
            tickFormatter={(value) => `R${value / 1000}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          >
            <Label value="Amount (ZAR)" angle={-90} position="insideLeft" offset={10} fill="hsl(var(--muted-foreground))" style={{ textAnchor: 'middle', fontSize: 12, fontWeight: 500 }} />
          </YAxis>
          <Tooltip
            formatter={(value: any) => formatZAR(Number(value) || 0)}
            cursor={{ fill: 'transparent' }}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--muted)/0.75)', 
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            itemStyle={{ fontWeight: 500 }}
          />
          <Legend verticalAlign="top" height={36} />
          
          <Bar 
            name="Actual Income" 
            dataKey="totalIncome" 
            fill="#10b981" 
            radius={[4, 4, 0, 0]} 
          />
          <Bar 
            name="Total Invoiced" 
            dataKey="totalInvoiced" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]} 
          />
          <Bar 
            name="Total Quote Value" 
            dataKey="totalQuoteValue" 
            fill="#f59e0b" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
