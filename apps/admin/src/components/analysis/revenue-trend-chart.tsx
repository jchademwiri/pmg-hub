'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatZAR } from '@/lib/format';

interface RevenueTrendChartProps {
  data: any[];
  currentYear: number;
}

export function RevenueTrendChart({ data, currentYear }: RevenueTrendChartProps) {
  const currentKey = String(currentYear);
  const priorKey = String(currentYear - 1);
  const prior2Key = String(currentYear - 2);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
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
          dataKey="month" 
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
        
        <Line 
          type="monotone" 
          name={`FY ${currentYear}`} 
          dataKey={currentKey} 
          stroke="hsl(var(--primary))" 
          strokeWidth={3}
          activeDot={{ r: 6 }} 
        />
        <Line 
          type="monotone" 
          name={`FY ${currentYear - 1}`} 
          dataKey={priorKey} 
          stroke="hsl(var(--muted-foreground))" 
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <Line 
          type="monotone" 
          name={`FY ${currentYear - 2}`} 
          dataKey={prior2Key} 
          stroke="hsl(var(--muted-foreground)/0.5)" 
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
