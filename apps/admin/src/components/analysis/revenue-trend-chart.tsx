'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label
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
    <div className="w-full h-[400px] min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            dataKey="month" 
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
          >
            <Label value="Month" offset={-15} position="insideBottom" fill="#94a3b8" style={{ fontSize: 12, fontWeight: 500 }} />
          </XAxis>
          <YAxis 
            tickFormatter={(value) => `R${value / 1000}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
          >
            <Label value="Revenue (ZAR)" angle={-90} position="insideLeft" offset={10} fill="#94a3b8" style={{ textAnchor: 'middle', fontSize: 12, fontWeight: 500 }} />
          </YAxis>
          <Tooltip
            formatter={(value: any) => formatZAR(Number(value) || 0)}
            cursor={false}
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
          
          <Line 
            type="monotone" 
            name={`FY ${currentYear}`} 
            dataKey={currentKey} 
            stroke="#10b981" 
            strokeWidth={3}
            activeDot={{ r: 6 }} 
            connectNulls={true}
          />
          <Line 
            type="monotone" 
            name={`FY ${currentYear - 1}`} 
            dataKey={priorKey} 
            stroke="#94a3b8" 
            strokeWidth={2}
            strokeDasharray="5 5"
            connectNulls={true}
          />
          <Line 
            type="monotone" 
            name={`FY ${currentYear - 2}`} 
            dataKey={prior2Key} 
            stroke="#475569" 
            strokeWidth={2}
            strokeDasharray="3 3"
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
