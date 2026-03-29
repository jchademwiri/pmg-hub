import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AllocationTooltipBar } from '@/components/dashboard/allocation-tooltip-bar'
import { formatZAR, type FinancialSummary } from '@/lib/financial'

type AllocationBarProps = { summary: FinancialSummary }

const ALLOCATIONS = [
  { key: 'salary',   label: 'Salary',   pct: 35, color: 'bg-chart-1' },
  { key: 'reinvest', label: 'Reinvest', pct: 30, color: 'bg-chart-2' },
  { key: 'reserve',  label: 'Reserve',  pct: 30, color: 'bg-chart-3' },
  { key: 'flex',     label: 'Flex',     pct: 5,  color: 'bg-chart-4' },
] as const

export function AllocationBar({ summary }: AllocationBarProps) {
  const allocations = ALLOCATIONS.map(item => ({
    ...item,
    amount: summary[item.key as keyof FinancialSummary] as number,
  }))

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          Profit Pool Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AllocationTooltipBar allocations={allocations} />
        <div className="grid grid-cols-2 gap-3">
          {allocations.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${item.color}`} />
                <span className="text-muted-foreground text-xs">{item.label} {item.pct}%</span>
              </div>
              <span className="text-foreground text-xs font-medium">{formatZAR(item.amount)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
