'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatZAR, fmtMonthYear } from '@/lib/format'
import type { MonthlyRevenueByDivision } from '@/lib/financial'

const CHART_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

type Props = { series: MonthlyRevenueByDivision[]; divisions: string[] }

export function RevenueByDivisionChart({ series, divisions }: Props) {
  const [monthRange, setMonthRange] = React.useState('6')

  const filteredSeries = React.useMemo(() => {
    const months = parseInt(monthRange, 10)
    return series.slice(-months)
  }, [series, monthRange])

  const config: ChartConfig = Object.fromEntries(
    divisions.map((d, i) => [d, { label: d, color: CHART_TOKENS[i % 5] }])
  )

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Revenue by Division</CardTitle>
          <CardDescription>Stacked area - monthly revenue per division</CardDescription>
        </div>
        <Select value={monthRange} onValueChange={setMonthRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 6 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="6" className="rounded-lg">Last 6 months</SelectItem>
            <SelectItem value="3" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="1" className="rounded-lg">Last month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {series.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No data for the last 6 months.</p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
            <AreaChart data={filteredSeries}>
              <defs>
                {divisions.map((d, i) => (
                  <linearGradient key={d} id={`fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_TOKENS[i % 5]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={CHART_TOKENS[i % 5]} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(v) => fmtMonthYear(v, { short: true })}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => fmtMonthYear(value)}
                    formatter={(v) => formatZAR(Number(v))}
                    indicator="dot"
                  />
                }
              />
              {divisions.map((d, i) => (
                <Area
                  key={d}
                  type="natural"
                  dataKey={d}
                  stackId="a"
                  stroke={CHART_TOKENS[i % 5]}
                  fill={`url(#fill-${i})`}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
