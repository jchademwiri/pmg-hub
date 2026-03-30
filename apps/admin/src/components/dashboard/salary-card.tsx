import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { formatZAR } from '@/lib/financial'
import { AlertTriangle } from 'lucide-react'

type SalaryCardProps = {
  salary: number
  profitPool: number
}

export function SalaryCard({ salary, profitPool }: SalaryCardProps) {
  const isNegative = profitPool < 0

  if (isNegative) {
    return (
      <Card className="rounded-xl border border-red-500/30 bg-red-500/5 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-red-400 text-sm font-normal flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Profit Pool Warning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-400 text-3xl font-bold">{formatZAR(salary)}</p>
          <CardDescription className="text-red-400/70 text-xs mt-1">
            Profit pool is negative ({formatZAR(profitPool)}). Salary allocation reflects a loss.
          </CardDescription>
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-red-300 text-xs leading-relaxed">
              Expenses exceed net revenue after PMG share. Review expenses or accelerate
              income before withdrawing salary.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border border-chart-1/40 bg-chart-1/10 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-chart-1 text-sm font-normal">
          Recommended Owner Salary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-chart-1 text-3xl font-bold">{formatZAR(salary)}</p>
        <CardDescription className="text-chart-1/70 text-xs mt-1">
          35% of profit pool · calculated, not guessed
        </CardDescription>
        <div className="mt-3 rounded-lg bg-chart-1/10 border border-chart-1/20 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-chart-1/60">Profit pool</span>
            <span className="text-chart-1/80 font-medium tabular-nums">{formatZAR(profitPool)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-chart-1/60">Safe to withdraw</span>
            <span className="text-chart-1 font-semibold tabular-nums">{formatZAR(salary)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}