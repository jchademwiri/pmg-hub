'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
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
import type { MonthlyBudgetChartRow } from '@/lib/financial'

type Props = { data: MonthlyBudgetChartRow[] }

export function RevenueByDivisionChart({ data }: Props) {
  const [monthRange, setMonthRange] = React.useState('6')

  const filteredSeries = React.useMemo(() => {
    const months = parseInt(monthRange, 10)
    return data.slice(-months)
  }, [data, monthRange])

  const config: ChartConfig = {
    revenue: { label: 'Revenue', color: 'oklch(0.72 0.16 150)' },
    invoiced: { label: 'Invoiced', color: 'var(--chart-1)' },
    expenses: { label: 'Expenses', color: 'var(--chart-expense)' },
  }

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Revenue, Invoiced, and Expenses</CardTitle>
          <CardDescription>Monthly payments received, invoices raised, and expenses incurred</CardDescription>
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
        {data.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">
            No revenue, invoiced, or expense data for this period.
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
            <BarChart data={filteredSeries}>
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
                    indicator="dashed"
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="invoiced" fill="var(--color-invoiced)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
