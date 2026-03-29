import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { formatZAR } from '@/lib/financial'

type SalaryCardProps = { salary: number }

export function SalaryCard({ salary }: SalaryCardProps) {
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
      </CardContent>
    </Card>
  )
}
