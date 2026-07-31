'use client';

import { useMemo } from 'react';
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

interface MonthlyRevenueRow {
  month: string;
  monthIndex: number;
  [year: number]: number | string;
}

interface RevenueTrendChartProps {
  data: MonthlyRevenueRow[];
  currentYear: number;
}

export function RevenueTrendChart({ data, currentYear }: RevenueTrendChartProps) {
  const currentKey = String(currentYear);
  const priorKey = String(currentYear - 1);
  const prior2Key = String(currentYear - 2);

  // Sanitize data: for current year, future months should be null so the line ends gracefully at current month instead of plunging to 0
  const processedData = useMemo(() => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1; // 1 to 12
    const activeFY = nowMonth < 3 ? nowYear - 1 : nowYear;

    if (currentYear !== activeFY) {
      return data;
    }

    const nowOffset = nowMonth >= 3 ? nowMonth - 3 : nowMonth + 9;

    return data.map((row) => {
      const rowOffset = row.monthIndex >= 3 ? row.monthIndex - 3 : row.monthIndex + 9;
      if (rowOffset > nowOffset) {
        return {
          ...row,
          [currentKey]: null,
        };
      }
      return row;
    });
  }, [data, currentYear, currentKey]);

  return (
    <div className="w-full h-[400px] min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            left: 30,
            bottom: 25,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
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
            formatter={(value: any) => (value === null || value === undefined ? '—' : formatZAR(Number(value) || 0))}
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
            connectNulls={false}
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
