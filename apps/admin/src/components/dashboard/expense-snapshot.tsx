import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'

type ExpenseSnapshotProps = {
  expensesByDivision: { divisionId?: string; divisionName: string; total: number }[]
  totalExpenses: number
}

const DIVISION_COLORS: Record<string, string> = {
  'Playhouse Media Group': 'bg-chart-1',
  'Tender Edge Solutions':  'bg-chart-2',
  'Apex Web Solutions':     'bg-chart-3',
}

const DEFAULT_COLORS = ['bg-chart-4', 'bg-chart-5', 'bg-muted-foreground/40']

export function ExpenseSnapshot({ expensesByDivision, totalExpenses }: ExpenseSnapshotProps) {
  if (!expensesByDivision.length || totalExpenses === 0) return null

  // Sort descending
  const sorted = [...expensesByDivision].sort((a, b) => b.total - a.total)

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground text-sm font-medium">
            Expense Breakdown by Division
          </CardTitle>
          <span className="text-xs text-red-600 tabular-nums font-medium">
            {formatZAR(totalExpenses)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Stacked proportion bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full gap-0.5">
            {sorted.map((div, i) => {
              const pct = (div.total / totalExpenses) * 100
              const colorClass =
                DIVISION_COLORS[div.divisionName] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
              return (
                <div
                  key={div.divisionName}
                  className={`${colorClass} rounded-full`}
                  style={{ width: `${pct}%` }}
                  title={`${div.divisionName}: ${formatZAR(div.total)}`}
                />
              )
            })}
          </div>

          {/* Division rows */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sorted.map((div, i) => {
              const pct = Math.round((div.total / totalExpenses) * 100)
              const colorClass =
                DIVISION_COLORS[div.divisionName] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]

              const content = (
                <div
                  className={`rounded-lg bg-muted/30 border border-border/50 p-3 transition-all duration-200 ${
                    div.divisionId
                      ? 'group-hover:scale-[1.01] group-hover:bg-muted/50 group-hover:border-primary/20 group-hover:shadow-sm'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${colorClass}`} />
                    <span className={`text-xs text-muted-foreground truncate ${div.divisionId ? 'group-hover:text-primary transition-colors' : ''}`}>
                      {div.divisionName}
                    </span>
                  </div>
                  <p className="text-red-600 text-base font-semibold tabular-nums">
                    {formatZAR(div.total)}
                  </p>
                  <p className="text-muted-foreground/60 text-xs">{pct}% of total</p>
                </div>
              )

              if (div.divisionId) {
                return (
                  <Link
                    key={div.divisionName}
                    href={`/finance/expenses?divisionId=${div.divisionId}`}
                    className="block group"
                  >
                    {content}
                  </Link>
                )
              }

              return (
                <div key={div.divisionName} className="block">
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}